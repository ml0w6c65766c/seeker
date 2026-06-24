import { Search as SearchIcon, Rss, ShieldAlert, Users } from 'lucide-react';

const FEATURES = [
  {
    icon: Rss,
    title: 'Aggregierte News',
    description: 'Cybersecurity-News aus mehreren vertrauenswürdigen Quellen, automatisch aggregiert und sortiert.',
  },
  {
    icon: ShieldAlert,
    title: 'CVE-Übersicht',
    description: 'Aktuelle Schwachstellen aus der NVD mit Filterung nach Schweregrad.',
  },
  {
    icon: Users,
    title: 'Für alle zugänglich',
    description: 'Ob IT-Profi oder interessierter Laie – die Informationen sind klar und verständlich aufbereitet.',
  },
];

export function AboutTab() {
  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <div>
        <div className="flex items-center gap-3 mb-3">
          <SearchIcon className="h-6 w-6 text-foreground" />
          <h1 className="text-2xl font-bold text-foreground">Seeker</h1>
        </div>
        <p className="text-base leading-relaxed text-muted-foreground">
          Seeker bündelt die wichtigsten Cybersecurity-News und Schwachstellen-Informationen an einem Ort –
          übersichtlich und kostenlos. Ziel ist eine Plattform, bei der man morgens kurz vorbeischaut
          und alle relevanten Neuigkeiten auf einen Blick hat.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {FEATURES.map(f => (
          <div key={f.title} className="border rounded p-4">
            <f.icon className="h-5 w-5 text-foreground mb-2" />
            <h3 className="font-semibold text-foreground mb-1">{f.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        <div>
          <h2 className="font-semibold text-foreground mb-2">Datenaktualität</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Alle angezeigten Daten stammen direkt von den jeweiligen offiziellen Quellen und werden
            automatisch in regelmäßigen Abständen aktualisiert. Die Verfügbarkeit hängt von der
            Erreichbarkeit der externen Dienste ab. Seeker übernimmt keine Haftung für
            Vollständigkeit oder Richtigkeit.
          </p>
        </div>

        <div>
          <h2 className="font-semibold text-foreground mb-3">Wie Seeker funktioniert</h2>
          <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
            <div>
              <h3 className="font-medium text-foreground mb-1">Funktionsweise</h3>
              <p>
                Seeker ist eine Web-App, die Cybersecurity-News und Schwachstellendaten aus
                verschiedenen vertrauenswürdigen Quellen sammelt. Die Informationen werden in
                übersichtlichen Tabs angezeigt: News für Artikel, CVEs für Sicherheitslücken.
                Benutzer können filtern, suchen, Artikel bookmarken und direkt zu den
                Originalquellen navigieren.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-1">Technologien</h3>
              <p>
                TypeScript + React als Frontend-Stack, Tailwind CSS für das Styling, Vite als
                Build-Tool. RSS-Feeds werden über Netlify Functions serverseitig abgerufen,
                um CORS-Probleme zu vermeiden. CVE-Daten kommen direkt von der NVD-API (NIST).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
