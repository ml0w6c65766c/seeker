const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');

const FEEDS = [
  { url: 'https://www.heise.de/security/rss/alert-news-atpm.xml', source: 'Heise Security' },
  { url: 'https://www.bleepingcomputer.com/feed/', source: 'BleepingComputer' },
  { url: 'https://feeds.feedburner.com/TheHackersNews', source: 'The Hacker News' },
];

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { type, source } = event.queryStringParameters || {};

    if (type === 'cves') {
      try {
        const nvdCves = await fetchNVD();
        console.log(`Fetched ${nvdCves.length} CVEs from NVD`);
        nvdCves.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(nvdCves)
        };
      } catch (error) {
        console.error('Error fetching CVEs:', error);
        return {
          statusCode: 500,
          headers,
          body: JSON.stringify({ error: error.message })
        };
      }
    } else {
      // Fetch RSS feeds (original functionality)
      const allNews = [];

      for (const feed of FEEDS) {
        try {
          console.log(`Fetching ${feed.source}: ${feed.url}`);
          const response = await fetch(feed.url, {
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; Seeker/1.0)'
            }
          });

          if (!response.ok) {
            console.warn(`Failed to fetch ${feed.source}: ${response.status}`);
            continue;
          }

          const xmlText = await response.text();

          // Parse XML to JSON
          const items = parseRSStoJSON(xmlText, feed.source);
          allNews.push(...items);

        } catch (error) {
          console.error(`Error fetching ${feed.source}:`, error.message);
          continue;
        }
      }

      // Sort by date (newest first)
      allNews.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(allNews)
      };
    }

  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};

async function fetchNVD() {
  try {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startDate = weekAgo.toISOString().slice(0, -5) + '.000';
    const endDate = now.toISOString().slice(0, -5) + '.000';

    const response = await fetch(
      `https://services.nvd.nist.gov/rest/json/cves/2.0?pubStartDate=${startDate}&pubEndDate=${endDate}&resultsPerPage=20`,
      { timeout: 15000 }
    );

    if (!response.ok) throw new Error(`NVD HTTP ${response.status}`);
    const data = await response.json();

    return (data.vulnerabilities || []).map((vuln) => {
      const cve = vuln.cve;
      const id = cve.id;
      const desc = cve.descriptions?.find((d) => d.lang === 'en')?.value ||
                   cve.descriptions?.[0]?.value || 'Keine Beschreibung';

      const metrics = cve.metrics?.cvssMetricV31?.[0] || cve.metrics?.cvssMetricV30?.[0] || cve.metrics?.cvssMetricV2?.[0];
      const cvssScore = metrics?.cvssData?.baseScore || null;

      return {
        id,
        title: id,
        description: desc.slice(0, 300),
        severity: mapCvssToSeverity(cvssScore),
        cvssScore,
        publishedAt: cve.published,
        source: 'NVD',
        link: `https://nvd.nist.gov/vuln/detail/${id}`,
      };
    });
  } catch (error) {
    console.error('Fehler beim Laden von NVD:', error);
    return [];
  }
}

function mapCvssToSeverity(score) {
  if (score === null) return 'UNKNOWN';
  if (score >= 9.0) return 'CRITICAL';
  if (score >= 7.0) return 'HIGH';
  if (score >= 4.0) return 'MEDIUM';
  return 'LOW';
}

function parseRSStoJSON(xmlText, source) {
  const items = [];
  const dom = new JSDOM(xmlText, { contentType: 'text/xml' });
  const document = dom.window.document;

  const itemElements = document.querySelectorAll('item');

  itemElements.forEach((item, index) => {
    try {
      const title = item.querySelector('title')?.textContent?.trim() || '';
      const link = item.querySelector('link')?.textContent?.trim() || '';
      const description = item.querySelector('description')?.textContent?.trim() || '';
      const pubDate = item.querySelector('pubDate')?.textContent?.trim() || '';

      if (title && link) {
        items.push({
          id: `${source}-${index}-${Date.now()}`,
          title,
          source,
          publishedAt: pubDate,
          description: description.replace(/<[^>]*>/g, ''), // Remove HTML tags
          link,
          isNew: false
        });
      }
    } catch (error) {
      console.warn(`Error parsing item from ${source}:`, error.message);
    }
  });

  return items;
}