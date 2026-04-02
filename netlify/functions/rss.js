import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

const FEEDS = [
  { url: 'https://www.heise.de/security/rss/alert-news-atpm.xml', source: 'Heise Security' },
  { url: 'https://www.bleepingcomputer.com/feed/', source: 'BleepingComputer' },
  { url: 'https://feeds.feedburner.com/TheHackersNews', source: 'The Hacker News' },
];

// Retry logic for feed fetching with exponential backoff
async function fetchFeedWithRetry(feed, attempt = 1) {
  const maxAttempts = 5; // Increased retries
  const baseDelay = 2000; // Increased base delay

  try {
    console.log(`Fetching ${feed.source}: ${feed.url} (attempt ${attempt}/${maxAttempts})`);
    const response = await fetch(feed.url, {
      timeout: 30000, // Increased timeout
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Seeker/1.0; +https://seeker.example.com)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const xmlText = await response.text();

    // Enhanced validation
    if (!xmlText || xmlText.trim().length === 0) {
      throw new Error('Empty response');
    }

    // Check for HTML error pages
    if (xmlText.includes('<html') && !xmlText.includes('<rss') && !xmlText.includes('<feed') && !xmlText.includes('<channel') && !xmlText.includes('<entry')) {
      throw new Error('Server returned HTML error page instead of RSS');
    }

    // Validate XML content more thoroughly
    if (!xmlText.includes('<rss') && !xmlText.includes('<feed') && !xmlText.includes('<channel') && !xmlText.includes('<entry')) {
      throw new Error('Response does not contain valid RSS/Atom elements');
    }

    // Parse XML to JSON
    const items = parseRSStoJSON(xmlText, feed.source);
    console.log(`✓ ${feed.source}: ${items.length} items fetched`);
    return items;

  } catch (error) {
    console.warn(`Error fetching ${feed.source}:`, error.message);
    
    if (attempt < maxAttempts) {
      const delay = baseDelay * attempt; // Exponential backoff
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
      return fetchFeedWithRetry(feed, attempt + 1);
    }
    
    throw error;
  }
}

export const handler = async (event, context) => {
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

      // Use Promise.allSettled for parallel fetching with better error handling
      const feedPromises = FEEDS.map(feed => fetchFeedWithRetry(feed));
      const results = await Promise.allSettled(feedPromises);

      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          allNews.push(...result.value);
        } else {
          console.error(`Failed to fetch ${FEEDS[index].source}:`, result.reason);
        }
      });

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
      { timeout: 20000 } // Increased timeout
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
    console.error('Fehler beim Laden von NVD:', error.message);
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
  try {
    const dom = new JSDOM(xmlText, { contentType: 'text/xml' });
    const document = dom.window.document;

    // Support both RSS <item> and Atom <entry>
    let itemElements = document.querySelectorAll('item');
    if (itemElements.length === 0) {
      itemElements = document.querySelectorAll('entry');
    }

    if (itemElements.length === 0) {
      console.warn(`${source}: No items/entries found in feed`);
      return items;
    }

    itemElements.forEach((item, index) => {
      try {
        const title = item.querySelector('title')?.textContent?.trim() || '';
        let link = item.querySelector('link')?.textContent?.trim() || '';
        
        // Handle Atom links (href attribute)
        if (!link) {
          link = item.querySelector('link')?.getAttribute('href')?.trim() || '';
        }

        const description = item.querySelector('description')?.textContent?.trim() ||
                           item.querySelector('summary')?.textContent?.trim() ||
                           item.querySelector('content')?.textContent?.trim() || '';
        const pubDate = item.querySelector('pubDate')?.textContent?.trim() ||
                       item.querySelector('published')?.textContent?.trim() ||
                       item.querySelector('updated')?.textContent?.trim() || '';

        // Validate required fields
        if (!title || !link) {
          console.debug(`${source}: Skipping item ${index} - missing title or link`);
          return;
        }

        // Parse date safely
        let parsedDate;
        try {
          parsedDate = pubDate ? new Date(pubDate) : new Date();
          if (isNaN(parsedDate.getTime())) {
            parsedDate = new Date();
          }
        } catch (dateError) {
          console.debug(`${source}: Invalid date for item ${index}, using current date`);
          parsedDate = new Date();
        }

        items.push({
          id: `${source}-${index}-${parsedDate.getTime()}`,
          title: title.substring(0, 200), // Limit title length
          source,
          publishedAt: parsedDate.toISOString(),
          description: description.replace(/<[^>]*>/g, '').substring(0, 500), // Strip HTML and limit length
          link,
          isNew: false
        });
      } catch (itemError) {
        console.warn(`Error parsing item ${index} from ${source}:`, itemError.message);
      }
    });

    console.log(`${source}: Successfully parsed ${items.length} items`);
  } catch (parseError) {
    console.error(`XML parsing failed for ${source}:`, parseError.message);
  }

  return items;
}