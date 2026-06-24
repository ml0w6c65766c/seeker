import { ExternalLink, Newspaper, Shield } from 'lucide-react';

const SOURCES = [
  {
    name: 'Heise Security',
    url: 'https://www.heise.de/security/',
    description: 'Deutschsprachiges IT-Sicherheitsportal mit aktuellen Berichten zu Schwachstellen, Angriffen und Datenschutz.',
    category: 'News',
  },
  {
    name: 'BleepingComputer',
    url: 'https://www.bleepingcomputer.com/',
    description: 'Englischsprachige Newsplattform für Cybersecurity, Technologie und Malware-Analysen.',
    category: 'News',
  },
  {
    name: 'The Hacker News',
    url: 'https://thehackernews.com/',
    description: 'Weltweit führende Cybersecurity-Newsplattform mit Fokus auf Bedrohungen und Sicherheitstrends.',
    category: 'News',
  },
  {
    name: 'NVD – National Vulnerability Database',
    url: 'https://nvd.nist.gov/',
    description: 'US-amerikanische Datenbank für standardisierte Schwachstelleninformationen (CVEs) mit CVSS-Bewertungen.',
    category: 'CVEs',
  },
];

export function SourcesTab() {
  const newsSources = SOURCES.filter(s => s.category === 'News');
  const cveSources = SOURCES.filter(s => s.category === 'CVEs');

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h2 className="flex items-center gap-2 font-semibold text-foreground mb-4">
          <Newspaper className="h-4 w-4" />
          News-Quellen
        </h2>
        <div className="divide-y divide-border border rounded">
          {newsSources.map(source => (
            <SourceRow key={source.name} {...source} />
          ))}
        </div>
      </div>
      <div>
        <h2 className="flex items-center gap-2 font-semibold text-foreground mb-4">
          <Shield className="h-4 w-4" />
          CVE-Quellen
        </h2>
        <div className="divide-y divide-border border rounded">
          {cveSources.map(source => (
            <SourceRow key={source.name} {...source} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SourceRow({ name, url, description }: { name: string; url: string; description: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start justify-between gap-4 px-4 py-4 hover:bg-muted/40 transition-colors"
    >
      <div>
        <h3 className="font-medium text-foreground group-hover:text-primary transition-colors mb-0.5">{name}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 shrink-0 mt-0.5 transition-opacity" />
    </a>
  );
}
