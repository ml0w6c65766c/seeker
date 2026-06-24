import { useEffect, useState, useCallback, useMemo } from 'react';
import { ExternalLink, RefreshCw, ShieldAlert, Search, Bookmark, BookmarkCheck } from 'lucide-react';
import { fetchAllCVEs, type CVEItem } from '@/services/cve-service';
import { timeAgo } from '@/services/rss-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

const SEVERITY_BAR: Record<string, string> = {
  CRITICAL: 'bg-severity-critical',
  HIGH: 'bg-severity-high',
  MEDIUM: 'bg-severity-medium',
  LOW: 'bg-severity-low',
  UNKNOWN: 'bg-muted-foreground/30',
};

const SEVERITY_TEXT: Record<string, string> = {
  CRITICAL: 'text-severity-critical',
  HIGH: 'text-severity-high',
  MEDIUM: 'text-severity-medium',
  LOW: 'text-severity-low',
  UNKNOWN: 'text-muted-foreground',
};

const SEVERITY_LABELS: Record<string, string> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
  UNKNOWN: 'Unknown',
};

type SortBy = 'date' | 'severity';
type SeverityFilter = 'ALL' | CVEItem['severity'];

const SEVERITY_ORDER: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, UNKNOWN: 0 };

export function CVEsTab() {
  const [cves, setCves] = useState<CVEItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('date');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('ALL');
  const [bookmarks, setBookmarks] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('cve-bookmarks');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const loadCVEs = useCallback(async (force = false) => {
    try {
      setError(null);
      const data = await fetchAllCVEs(force);
      setCves(data);
    } catch {
      setError('Fehler beim Laden der CVEs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCVEs();
    const interval = setInterval(() => loadCVEs(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadCVEs]);

  const filtered = useMemo(() => {
    let result = cves;
    if (severityFilter !== 'ALL') result = result.filter(c => c.severity === severityFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.id.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
      );
    }
    if (sortBy === 'severity') {
      result = [...result].sort((a, b) => (SEVERITY_ORDER[b.severity] || 0) - (SEVERITY_ORDER[a.severity] || 0));
    }
    return result;
  }, [cves, severityFilter, search, sortBy]);

  const toggleBookmark = (id: string) => {
    setBookmarks(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem('cve-bookmarks', JSON.stringify([...next]));
      return next;
    });
  };

  if (loading) {
    return (
      <div className="divide-y divide-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="py-4 flex gap-3">
            <div className="w-1 rounded-full bg-muted" />
            <div className="flex-1">
              <Skeleton className="mb-2 h-3 w-20" />
              <Skeleton className="mb-2 h-4 w-1/2" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <ShieldAlert className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">{error}</p>
        <Button variant="outline" size="sm" onClick={() => { setLoading(true); loadCVEs(true); }}>
          <RefreshCw className="mr-2 h-4 w-4" /> Erneut versuchen
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="CVE-ID oder Stichwort..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 rounded"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value as SeverityFilter)}
            className="rounded border bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="ALL">Alle Schweregrade</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
            <option value="UNKNOWN">Unknown</option>
          </select>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortBy)}
            className="rounded border bg-background px-3 py-2 text-sm text-foreground"
          >
            <option value="date">Nach Datum</option>
            <option value="severity">Nach Schwere</option>
          </select>
        </div>
        <Button variant="ghost" size="sm" onClick={() => { setLoading(true); loadCVEs(true); }}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} Ergebnisse</p>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-20 text-center">
          <ShieldAlert className="h-10 w-10 text-muted-foreground" />
          <p className="text-muted-foreground text-sm">Keine CVEs gefunden.</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {filtered.map(cve => (
            <article key={cve.id} className="group py-4 flex gap-3">
              <div className={`w-0.5 self-stretch rounded-full shrink-0 ${SEVERITY_BAR[cve.severity]}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-semibold ${SEVERITY_TEXT[cve.severity]}`}>
                    {SEVERITY_LABELS[cve.severity]}
                    {cve.cvssScore !== null && ` ${cve.cvssScore}`}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">{timeAgo(cve.publishedAt)}</span>
                </div>
                <a
                  href={cve.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm font-semibold text-foreground hover:text-primary transition-colors"
                >
                  {cve.title}
                  <ExternalLink className="ml-1 inline h-3 w-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                </a>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed line-clamp-2">
                  {cve.description}
                </p>
              </div>
              <button
                onClick={() => toggleBookmark(cve.id)}
                className="mt-0.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Lesezeichen"
              >
                {bookmarks.has(cve.id) ? (
                  <BookmarkCheck className="h-4 w-4 text-foreground" />
                ) : (
                  <Bookmark className="h-4 w-4" />
                )}
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
