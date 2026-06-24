import { useEffect, useState, useCallback, useMemo } from 'react';
import { ExternalLink, RefreshCw, Newspaper, Bookmark, BookmarkCheck } from 'lucide-react';
import { fetchAllNews, timeAgo, type NewsItem } from '@/services/rss-service';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const SOURCE_COLORS: Record<string, string> = {
  'Heise Security': 'text-blue-600 dark:text-blue-400',
  'BleepingComputer': 'text-orange-600 dark:text-orange-400',
  'The Hacker News': 'text-emerald-600 dark:text-emerald-400',
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
      if (force) setLoading(true);
      const data = await fetchAllNews(force);
      setNews(data);
      if (data.length === 0) {
        setError('Keine Feeds erreichbar. Bitte versuche es später erneut.');
      }
    } catch (err) {
      console.error('Error loading news:', err);
      setError('Fehler beim Laden der News. Prüfe deine Internetverbindung.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNews();
    const interval = setInterval(() => loadNews(true), 5 * 60 * 1000);
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

  if (loading) {
    return (
      <div className="divide-y divide-border">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="py-4">
            <Skeleton className="mb-2 h-3 w-24" />
            <Skeleton className="mb-2 h-5 w-3/4" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (error && news.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <Newspaper className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" onClick={() => { setLoading(true); loadNews(true); }}>
          <RefreshCw className="mr-2 h-4 w-4" /> Erneut versuchen
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      <div className="flex items-center justify-between border-b border-border mb-0">
        <div className="flex items-center gap-0 -mb-px overflow-x-auto">
          <button
            onClick={() => setSourceFilter('ALL')}
            className={`px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              sourceFilter === 'ALL'
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Alle ({news.length})
          </button>
          {ALL_SOURCES.map(source => (
            <button
              key={source}
              onClick={() => setSourceFilter(source)}
              className={`px-3 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                sourceFilter === source
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {source.split(' ')[0]}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={() => { setLoading(true); loadNews(true); }} className="shrink-0">
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-20 text-center">
          <Newspaper className="h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">Keine Artikel in dieser Kategorie.</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {filtered.map(item => (
            <article key={item.id} className="group py-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold ${SOURCE_COLORS[item.source] || 'text-muted-foreground'}`}>
                      {item.source}
                    </span>
                    {item.isNew && (
                      <span className="text-xs font-medium text-primary">· Neu</span>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">{timeAgo(item.publishedAt)}</span>
                  </div>
                  <a
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-foreground hover:text-primary transition-colors leading-snug"
                  >
                    {item.title}
                    <ExternalLink className="ml-1 inline h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                  </a>
                  {item.description && (
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => toggleBookmark(item.id)}
                  className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Lesezeichen"
                >
                  {bookmarks.has(item.id) ? (
                    <BookmarkCheck className="h-4 w-4 text-foreground" />
                  ) : (
                    <Bookmark className="h-4 w-4" />
                  )}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
