export interface NewsItem {
  id: string;
  title: string;
  source: string;
  publishedAt: Date;
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

// Multiple CORS proxies for reliability
const CORS_PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
];

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

async function fetchWithProxy(url: string): Promise<string> {
  for (const proxyFn of CORS_PROXIES) {
    try {
      const proxyUrl = proxyFn(url);
      const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) continue;
      const text = await response.text();
      // Check if the response is actually XML (not an error page)
      if (text.includes('<html') && !text.includes('<rss') && !text.includes('<feed') && !text.includes('<channel')) {
        console.warn(`Proxy returned HTML error for ${url}, trying next...`);
        continue;
      }
      return text;
    } catch (error) {
      console.warn(`Proxy failed for ${url}:`, error);
      continue;
    }
  }
  throw new Error(`Alle Proxies fehlgeschlagen für: ${url}`);
}

async function fetchFeed(config: FeedConfig): Promise<NewsItem[]> {
  try {
    console.log(`Lade Feed: ${config.source} (${config.url})`);
    const text = await fetchWithProxy(config.url);
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

      console.log(`  ${stripHtml(title).slice(0, 50)}... → ${dateStr} → ${parsedDate.toISOString()}`);

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
    console.error(`Feed Fehler: ${config.source}:`, error);
    return [];
  }
}

let cachedNews: NewsItem[] = [];
let lastFetch = 0;
const CACHE_DURATION = 0; // Kein Cache, immer aktuelle News laden

export async function fetchAllNews(force = false): Promise<NewsItem[]> {
  const now = Date.now();
  if (!force && cachedNews.length > 0 && now - lastFetch < CACHE_DURATION) {
    return cachedNews;
  }

  // Fetch all feeds in parallel, each with independent error handling
  const results = await Promise.all(FEEDS.map(feed => fetchFeed(feed)));
  const allNews = results.flat();
  
  // Sort by date, newest first
  allNews.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
  
  // Mark items as new if they weren't in the previous cache
  if (cachedNews.length > 0) {
    const oldIds = new Set(cachedNews.map(n => n.id));
    allNews.forEach(item => {
      item.isNew = !oldIds.has(item.id);
    });
  }

  console.log(`Gesamt: ${allNews.length} News geladen aus ${results.filter(r => r.length > 0).length}/${FEEDS.length} Feeds`);

  cachedNews = allNews;
  lastFetch = now;
  return allNews;
}
