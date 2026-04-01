import { useEffect, useState, useCallback, useMemo } from 'react';
import { ExternalLink, RefreshCw, Newspaper, Bookmark, BookmarkCheck } from 'lucide-react';
import { fetchAllNews, timeAgo, type NewsItem } from '@/services/rss-service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const SOURCE_COLORS: Record<string, string> = {
  'Heise Security': 'bg-heise-tag/10 text-heise-tag',
  'BleepingComputer': 'bg-severity-high/10 text-severity-high',
  'The Hacker News': 'bg-severity-low/10 text-severity-low',
};

const ALL_SOURCES = ['Heise Security', 'BleepingComputer', 'The Hacker News'];

export function NewsTab() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [bookmarks, setBookmarks] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('news-bookmarks');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const loadNews = useCallback(async (force = false) => {
    try {
      setError(null);
      const data = await fetchAllNews(force);
      setNews(data);
      if (data.length === 0) {
        setError('Keine Feeds erreichbar. Bitte versuche es später erneut.');
      }
    } catch {
      setError('Fehler beim Laden der News.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNews();
    const interval = setInterval(() => loadNews(true), 60 * 1000); // Alle 60 Sekunden statt 5 Minuten
    return () => clearInterval(interval);
  }, [loadNews]);

  const toggleBookmark = (id: string) => {
    setBookmarks(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem('news-bookmarks', JSON.stringify([...next]));
      return next;
    });
  };

  const filtered = useMemo(() => {
    if (sourceFilter === 'ALL') return news;
    return news.filter(n => n.source === sourceFilter);
  }, [news, sourceFilter]);

  // Count per source for badges
  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    news.forEach(n => { counts[n.source] = (counts[n.source] || 0) + 1; });
    return counts;
  }, [news]);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-5">
            <Skeleton className="mb-2 h-5 w-3/4" />
            <Skeleton className="mb-3 h-4 w-full" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  if (error && news.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border bg-card p-12 text-center">
        <Newspaper className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={() => { setLoading(true); loadNews(true); }}>
          <RefreshCw className="mr-2 h-4 w-4" /> Erneut versuchen
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSourceFilter('ALL')}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              sourceFilter === 'ALL'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-accent'
            }`}
          >
            Alle ({news.length})
          </button>
          {ALL_SOURCES.map(source => (
            <button
              key={source}
              onClick={() => setSourceFilter(source)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                sourceFilter === source
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-accent'
              }`}
            >
              {source} ({sourceCounts[source] || 0})
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => { setLoading(true); loadNews(true); }}>
            <RefreshCw className="mr-1 h-4 w-4" /> Aktualisieren
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border bg-card p-12 text-center">
          <Newspaper className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Keine News aus dieser Quelle verfügbar.</p>
        </div>
      ) : (
        filtered.map(item => (
          <article
            key={item.id}
            className="group animate-fade-in rounded-lg border bg-card p-5 transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${SOURCE_COLORS[item.source] || 'bg-secondary text-secondary-foreground'}`}>
                    {item.source}
                  </span>
                  {item.isNew && (
                    <Badge className="bg-primary text-primary-foreground text-xs">Neu</Badge>
                  )}
                </div>
                <a
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base font-semibold text-foreground transition-colors hover:text-primary"
                >
                  {item.title}
                  <ExternalLink className="ml-1 inline h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                </a>
                {item.description && (
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  {timeAgo(item.publishedAt)}
                </p>
              </div>
              <button
                onClick={() => toggleBookmark(item.id)}
                className="mt-1 shrink-0 text-muted-foreground transition-colors hover:text-primary"
                aria-label="Lesezeichen"
              >
                {bookmarks.has(item.id) ? (
                  <BookmarkCheck className="h-5 w-5 text-primary" />
                ) : (
                  <Bookmark className="h-5 w-5" />
                )}
              </button>
            </div>
          </article>
        ))
      )}
    </div>
  );
}
