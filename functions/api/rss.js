const FEEDS = [
  { url: 'https://www.heise.de/security/rss/alert-news-atpm.xml', source: 'Heise Security' },
  { url: 'https://www.bleepingcomputer.com/feed/', source: 'BleepingComputer' },
  { url: 'https://feeds.feedburner.com/TheHackersNews', source: 'The Hacker News' },
];

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequest(context) {
  const { request } = context;

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  const url = new URL(request.url);
  const type = url.searchParams.get('type');

  try {
    if (type === 'cves') {
      const cves = await fetchNVD();
      cves.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
      return json(cves);
    }

    const results = await Promise.allSettled(FEEDS.map(feed => fetchFeed(feed)));
    const allNews = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value);
    allNews.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    return json(allNews);
  } catch (err) {
    return json({ error: err.message }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

async function fetchFeed(feed, attempt = 1) {
  try {
    const res = await fetch(feed.url, {
      signal: AbortSignal.timeout(12000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Seeker/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const xml = await res.text();
    return parseRSS(xml, feed.source);
  } catch (err) {
    if (attempt < 3) {
      await new Promise(r => setTimeout(r, 1000 * attempt));
      return fetchFeed(feed, attempt + 1);
    }
    console.error(`[rss] Failed: ${feed.source} – ${err.message}`);
    return [];
  }
}

// --- RSS/Atom parsing (no JSDOM, Web API safe) ---

function tagContent(xml, tag) {
  const cdata = xml.match(new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i'));
  if (cdata) return cdata[1].trim();
  const plain = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return plain ? plain[1].trim() : '';
}

function atomLinkHref(xml) {
  const m = xml.match(/<link[^>]+href=["']([^"']+)["'][^>]*\/?>/i);
  return m ? m[1].trim() : '';
}

function stripHtml(str) {
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseRSS(xml, source) {
  const rssItems = [...xml.matchAll(/<item[^>]*>([\s\S]*?)<\/item>/gi)];
  const atomItems = [...xml.matchAll(/<entry[^>]*>([\s\S]*?)<\/entry>/gi)];
  const raw = rssItems.length > 0 ? rssItems : atomItems;
  const items = [];

  for (let i = 0; i < raw.length; i++) {
    const c = raw[i][1];
    const title = stripHtml(tagContent(c, 'title'));
    const link = (tagContent(c, 'link') || atomLinkHref(c)).trim();
    if (!title || !link) continue;

    const dateStr = tagContent(c, 'pubDate') || tagContent(c, 'published') || tagContent(c, 'updated');
    const parsed = dateStr ? new Date(dateStr) : new Date();
    const publishedAt = isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();

    const description = stripHtml(
      tagContent(c, 'description') || tagContent(c, 'summary') || tagContent(c, 'content')
    ).substring(0, 500);

    items.push({
      id: `${source}-${i}-${new Date(publishedAt).getTime()}`,
      title: title.substring(0, 200),
      source,
      publishedAt,
      description,
      link,
      isNew: false,
    });
  }

  return items;
}

// --- NVD CVE fetch ---

async function fetchNVD() {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fmt = d => d.toISOString().slice(0, 19) + '.000';

  const res = await fetch(
    `https://services.nvd.nist.gov/rest/json/cves/2.0?pubStartDate=${fmt(weekAgo)}&pubEndDate=${fmt(now)}&resultsPerPage=20`,
    { signal: AbortSignal.timeout(20000) }
  );
  if (!res.ok) throw new Error(`NVD HTTP ${res.status}`);
  const data = await res.json();

  return (data.vulnerabilities || []).map(({ cve }) => {
    const desc = cve.descriptions?.find(d => d.lang === 'en')?.value || 'No description';
    const metrics = cve.metrics?.cvssMetricV31?.[0] ?? cve.metrics?.cvssMetricV30?.[0] ?? cve.metrics?.cvssMetricV2?.[0];
    const cvssScore = metrics?.cvssData?.baseScore ?? null;
    return {
      id: cve.id,
      title: cve.id,
      description: desc.slice(0, 300),
      severity: mapCvss(cvssScore),
      cvssScore,
      publishedAt: cve.published,
      source: 'NVD',
      link: `https://nvd.nist.gov/vuln/detail/${cve.id}`,
    };
  });
}

function mapCvss(score) {
  if (score === null) return 'UNKNOWN';
  if (score >= 9.0) return 'CRITICAL';
  if (score >= 7.0) return 'HIGH';
  if (score >= 4.0) return 'MEDIUM';
  return 'LOW';
}
