import { ExternalLink, Newspaper, Shield } from 'lucide-react';

const SOURCES = [
  {
    name: 'Heise Security',
    url: 'https://www.heise.de/security/',
    description: 'German-language IT security portal with current reports on vulnerabilities, attacks and data protection.',
    category: 'News',
  },
  {
    name: 'BleepingComputer',
    url: 'https://www.bleepingcomputer.com/',
    description: 'English-language news platform for cybersecurity, technology and malware analysis.',
    category: 'News',
  },
  {
    name: 'The Hacker News',
    url: 'https://thehackernews.com/',
    description: 'World-leading cybersecurity news platform focusing on threats and security trends.',
    category: 'News',
  },
  {
    name: 'BSI CERT-Bund',
    url: 'https://www.bsi.bund.de/DE/Themen/Unternehmen-und-Organisationen/Cyber-Sicherheitslage/Technische-Sicherheitshinweise/technische-sicherheitshinweise_node.html',
    description: 'The Computer Emergency Response Team of the Federal Office for Information Security (BSI).',
    category: 'CVEs',
  },
  {
    name: 'NVD – National Vulnerability Database',
    url: 'https://nvd.nist.gov/',
    description: 'The US database for standardized vulnerability information (CVEs) with CVSS ratings.',
    category: 'CVEs',
  },
  {
    name: 'CISA KEV – Known Exploited Vulnerabilities',
    url: 'https://www.cisa.gov/known-exploited-vulnerabilities-catalog',
    description: 'CISA catalog of actively exploited vulnerabilities that pose an immediate threat.',
    category: 'CVEs',
  },
];

export function SourcesTab() {
  const newsSource = SOURCES.filter(s => s.category === 'News');
  const cveSources = SOURCES.filter(s => s.category === 'CVEs');

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h2 className="mb-6 text-xl font-semibold text-foreground flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-primary" />
          News Sources
        </h2>
        <div className="space-y-4">
          {newsSource.map(source => (
            <SourceCard key={source.name} {...source} />
          ))}
        </div>
      </div>
      <div>
        <h2 className="mb-6 text-xl font-semibold text-foreground flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          CVE Sources
        </h2>
        <div className="space-y-4">
          {cveSources.map(source => (
            <SourceCard key={source.name} {...source} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SourceCard({ name, url, description }: { name: string; url: string; description: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl border bg-card p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/20"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-card-foreground group-hover:text-primary transition-colors text-lg">{name}</h3>
        <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
    </a>
  );
}
