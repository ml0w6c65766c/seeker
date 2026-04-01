import { useEffect, useState, useCallback, useMemo } from 'react';
import { ExternalLink, RefreshCw, ShieldAlert, Search, Bookmark, BookmarkCheck } from 'lucide-react';
import { fetchAllCVEs, type CVEItem } from '@/services/cve-service';
import { timeAgo } from '@/services/rss-service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

const SEVERITY_STYLES: Record<string, string> = {
  CRITICAL: 'bg-severity-critical/10 text-severity-critical border-severity-critical/20',
  HIGH: 'bg-severity-high/10 text-severity-high border-severity-high/20',
  MEDIUM: 'bg-severity-medium/10 text-severity-medium border-severity-medium/20',
  LOW: 'bg-severity-low/10 text-severity-low border-severity-low/20',
  UNKNOWN: 'bg-secondary text-secondary-foreground',
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
      setError('Error loading CVEs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCVEs();
    const interval = setInterval(() => loadCVEs(true), 5 * 60 * 1000); // Alle 5 Minuten aktualisieren
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
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg border bg-card p-5">
            <Skeleton className="mb-2 h-5 w-1/2" />
            <Skeleton className="mb-3 h-4 w-full" />
            <Skeleton className="h-3 w-1/4" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-lg border bg-card p-12 text-center">
        <p className="text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={() => { setLoading(true); loadCVEs(true); }}>
          <RefreshCw className="mr-2 h-4 w-4" /> Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search CVE-ID or keyword..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={severityFilter}
            onChange={e => setSeverityFilter(e.target.value as SeverityFilter)}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
            <option value="UNKNOWN">Unknown</option>
          </select>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as SortBy)}
            className="rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="date">By Date</option>
            <option value="severity">By Severity</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filtered.length} results</p>
        <Button variant="ghost" size="sm" onClick={() => { setLoading(true); loadCVEs(true); }}>
          <RefreshCw className="mr-1 h-4 w-4" /> Refresh
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border bg-card p-12 text-center">
          <ShieldAlert className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">No CVEs found.</p>
        </div>
      ) : (
        filtered.map(cve => (
          <article
            key={cve.id}
            className="group animate-fade-in rounded-lg border bg-card p-5 transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={`border ${SEVERITY_STYLES[cve.severity]}`}>
                    {SEVERITY_LABELS[cve.severity]}
                    {cve.cvssScore !== null && ` (${cve.cvssScore})`}
                  </Badge>
                </div>
                <a
                  href={cve.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm font-semibold text-foreground transition-colors hover:text-primary"
                >
                  {cve.title}
                  <ExternalLink className="ml-1 inline h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
                </a>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {cve.description}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {timeAgo(cve.publishedAt)}
                </p>
              </div>
              <button
                onClick={() => toggleBookmark(cve.id)}
                className="mt-1 shrink-0 text-muted-foreground transition-colors hover:text-primary"
                aria-label="Lesezeichen"
              >
                {bookmarks.has(cve.id) ? (
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
