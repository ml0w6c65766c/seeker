interface RawNewsItem {
  id: string;
  title: string;
  source: string;
  publishedAt: string;
  description: string;
  link: string;
  isNew?: boolean;
}

interface FeedConfig {
  url: string;
  source: string;
}

const FEEDS: FeedConfig[] = [
  { url: 'https://www.heise.de/security/rss/alert-news-atpm.xml', source: 'Heise Security' },
  { url: 'https://www.bleepingcomputer.com/feed/', source: 'BleepingComputer' },
  { url: 'https://feeds.feedburner.com/TheHackersNews', source: 'The Hacker News' },
];

const CORS_PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
];

async function fetchWithProxy(url: string): Promise<string> {
  // Try direct fetch (may fail due CORS in browser)
  try {
    const normal = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (normal.ok) {
      const text = await normal.text();
      if (text && (text.includes('<rss') || text.includes('<feed') || text.includes('<channel') || text.includes('<entry'))) {
        return text;
      }
    }
  } catch (error) {
    console.debug('Direct fetch failed, using proxy:', error?.message || error);
  }

  // Fallback to CORS proxies
  for (const proxyFn of CORS_PROXIES) {
    const proxyUrl = proxyFn(url);
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(25000) });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const text = await response.text();
        if (!text || (!text.includes('<rss') && !text.includes('<feed') && !text.includes('<channel') && !text.includes('<entry'))) {
          throw new Error('Invalid RSS content from proxy');
        }

        console.log(`Proxy success: ${proxyUrl} (${attempt})`);
        return text;
      } catch (error) {
        console.warn(`Proxy attempt ${attempt} failed for ${proxyUrl}:`, error?.message || error);
        await new Promise(res => setTimeout(res, 1000 * attempt));
      }
    }
  }

  throw new Error(`Alle CORS-Proxies fehlgeschlagen für ${url}`);
}

function stripHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent?.trim() || '';
}

function timeAgo(date: Date): string {
  // Deutsche Zeitzone verwenden
  const now = new Date();
  const germanTime = new Date(now.toLocaleString("en-US", {timeZone: "Europe/Berlin"}));
  const germanDate = new Date(date.toLocaleString("en-US", {timeZone: "Europe/Berlin"}));

  const diffMs = germanTime.getTime() - germanDate.getTime();

  if (diffMs < 0) return 'gerade eben';

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'gerade eben';
  if (diffMinutes < 60) return `vor ${diffMinutes} Minuten`;
  if (diffHours < 24) return `vor ${diffHours} Stunden`;
  if (diffDays === 1) return 'vor 1 Tag';
  return `vor ${diffDays} Tagen`;
}

export { timeAgo };

function parseDate(dateStr: string | null | undefined): Date {
  if (!dateStr) return new Date();
  const parsed = new Date(dateStr);
  // Validate the date is real and not in the future
  if (isNaN(parsed.getTime())) {
    console.warn('Ungültiges Datum:', dateStr);
    return new Date();
  }

  // Konvertiere zu deutscher Zeitzone
  const germanTime = new Date(parsed.toLocaleString("en-US", {timeZone: "Europe/Berlin"}));
  return germanTime;
}

function isNewItem(publishedAt: Date): boolean {
  const now = new Date();
  const diffHours = (now.getTime() - publishedAt.getTime()) / (1000 * 60 * 60);
  return diffHours < 24;
}

async function fetchFeed(config: FeedConfig): Promise<NewsItem[]> {
  try {
    console.log(`Lade Feed: ${config.source} (${config.url})`);
    const text = await fetchWithProxy(config.url);

    // Check if response is JSON from Netlify Function
    if (text.startsWith('{') && text.includes('"items"')) {
      try {
        const jsonData = JSON.parse(text);
        if (jsonData.items && Array.isArray(jsonData.items)) {
          return jsonData.items.map((item: RawNewsItem) => ({
            ...item,
            publishedAt: new Date(item.publishedAt),
            isNew: isNewItem(item.publishedAt)
          }));
        }
      } catch (jsonError) {
        console.warn('JSON parsing failed, falling back to XML:', jsonError);
      }
    }

    // Fallback to XML parsing
    const xml = new DOMParser().parseFromString(text, 'text/xml');

    // Check for XML parse errors
    const parseError = xml.querySelector('parsererror');
    if (parseError) {
      console.error(`XML Parse-Fehler für ${config.source}:`, parseError.textContent);
      return [];
    }

    // Support both RSS <item> and Atom <entry>
    let items = xml.querySelectorAll('item');
    if (items.length === 0) {
      items = xml.querySelectorAll('entry');
    }

    if (items.length === 0) {
      console.warn(`${config.source}: Keine Artikel gefunden - möglicherweise ungültiges Format`);
      return [];
    }

    console.log(`${config.source}: ${items.length} Artikel gefunden`);

    return Array.from(items).map((item, i) => {
      const title = item.querySelector('title')?.textContent || 'Kein Titel';

      // Get link - handle both RSS and Atom formats
      let link = item.querySelector('link')?.textContent || '';
      if (!link) {
        link = item.querySelector('link')?.getAttribute('href') || '#';
      }

      // Try multiple date fields
      const pubDate = item.querySelector('pubDate')?.textContent;
      const published = item.querySelector('published')?.textContent;
      const updated = item.querySelector('updated')?.textContent;
      const dcDate = item.querySelector('date')?.textContent;
      const dateStr = pubDate || published || updated || dcDate;

      const parsedDate = parseDate(dateStr);

      const description = item.querySelector('description')?.textContent ||
                          item.querySelector('summary')?.textContent ||
                          item.querySelector('content')?.textContent || '';

      return {
        id: `${config.source}-${i}-${parsedDate.getTime()}`,
        title: stripHtml(title),
        source: config.source,
        publishedAt: parsedDate,
        description: stripHtml(description).slice(0, 200),
        link: link.trim(),
      };
    });
  } catch (error) {
    console.error(`Fehler beim Laden von ${config.source}:`, error);
    return [];
  }
}

let cachedNews: NewsItem[] = [];
let lastFetch = 0;
let isFetching = false;
let fetchPromise: Promise<NewsItem[]> | null = null;
const CACHE_DURATION = 60000; // 1 Minute Cache für bessere Performance
const BACKGROUND_REFRESH_THRESHOLD = 30000; // 30 Sekunden - wenn Cache älter, starte Hintergrund-Refresh

export async function fetchAllNews(force = false): Promise<NewsItem[]> {
  const now = Date.now();

  // Return cached data if still valid and not forced
  if (!force && cachedNews.length > 0 && now - lastFetch < CACHE_DURATION) {
    // Start background refresh if cache is getting old
    if (now - lastFetch > BACKGROUND_REFRESH_THRESHOLD && !isFetching) {
      console.log('Starte Hintergrund-Refresh für RSS-Feeds...');
      fetchAllNews(true).catch(error => console.warn('Hintergrund-Refresh fehlgeschlagen:', error));
    }
    return cachedNews;
  }

  // Prevent duplicate concurrent requests
  if (isFetching && fetchPromise) {
    console.log('Fetch bereits in Bearbeitung, warte auf Ergebnis...');
    return fetchPromise;
  }

  isFetching = true;

  fetchPromise = (async () => {
    try {
      console.log('Lade RSS-Feeds über Netlify-Funktion (Primary) ...');

      let allNews: NewsItem[] = [];
      try {
        const response = await fetch('/api/rss', {
          signal: AbortSignal.timeout(30000),
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          allNews = await response.json();
          console.log(`✓ Netlify API successful, got ${allNews.length} items`);
        } else {
          console.warn(`Netlify API returned ${response.status}, fallback to direct feed parsing.`);
        }
      } catch (fnError) {
        console.warn('Netlify API request failed, fallback to direct feed parsing:', fnError.message);
      }

      if (allNews.length === 0) {
        console.log('Fallback lädt Feeds einzeln mit CORS-Proxies ...');
        const results = await Promise.allSettled(FEEDS.map(feed => fetchFeed(feed)));
        allNews = results
          .filter((r): r is PromiseFulfilledResult<NewsItem[]> => r.status === 'fulfilled')
          .flatMap(r => r.value)
          .filter(item => item && item.title && item.link);

        const failedCount = results.filter(r => r.status === 'rejected').length;
        const successCount = results.filter(r => r.status === 'fulfilled' && r.value.length > 0).length;
        console.log(`Fallback Feeds geladen: ${allNews.length} aus ${successCount}/${FEEDS.length} (${failedCount} Fehler)`);
      }

      // Convert publishedAt strings to Date objects if needed
      allNews = allNews.map(item => ({
        ...item,
        publishedAt: item.publishedAt instanceof Date ? item.publishedAt : new Date(item.publishedAt)
      }));

      // Sort by date, newest first
      allNews.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

      // Mark items as new if they weren't in the previous cache
      if (cachedNews.length > 0) {
        const oldIds = new Set(cachedNews.map(n => n.id));
        allNews.forEach(item => {
          item.isNew = !oldIds.has(item.id);
        });
      }

      if (allNews.length === 0 && cachedNews.length > 0) {
        console.log('Keine aktuellen News konnten geladen werden, gebe Cache zurück.');
        return cachedNews;
      }

      cachedNews = allNews;
      lastFetch = now;
      console.log(`✓ Gesamt: ${allNews.length} News geladen`);
      return allNews;
    } catch (error) {
      console.error('Fehler beim Abrufen aller News:', error);
      if (cachedNews.length > 0) {
        console.log('Verwende gecachte Daten trotz Fehler');
        return cachedNews;
      }
      throw error;
    } finally {
      isFetching = false;
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}
