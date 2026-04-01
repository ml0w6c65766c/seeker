import { Search as SearchIcon, Rss, ShieldAlert, Users } from 'lucide-react';

const FEATURES = [
  {
    icon: Rss,
    title: 'Aggregated News',
    description: 'Cybersecurity news from multiple trusted sources,automatically aggregated and sorted.',
  },
  {
    icon: ShieldAlert,
    title: 'CVE Overview',
    description: 'Current vulnerabilities from NVD with filtering by severity.',
  },
  {
    icon: Users,
    title: 'Accessible to All',
    description: 'Whether IT professional or interested layperson, the information is clearly and understandably prepared.',
  },
];

export function AboutTab() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 shadow-lg">
          <SearchIcon className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Seeker</h1>
        <p className="mt-3 text-lg leading-relaxed text-muted-foreground max-w-2xl mx-auto">
          Seeker aggregates the most important cybersecurity news and vulnerability information
          in one place,clear, and free. <span className="font-semibold text-primary">My mission is to provide a platform where you can check in every morning or anytime and get all the latest news and info at a glance.</span>
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {FEATURES.map(f => (
          <div key={f.title} className="group rounded-xl border bg-card p-6 text-center transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/20">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <f.icon className="h-6 w-6 text-primary" />
            </div>
            <h3 className="mb-2 font-semibold text-card-foreground text-lg">{f.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-card-foreground flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-muted-foreground" />
          Note on Data Freshness
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          All displayed data comes directly from the respective official sources and is automatically
          updated at regular intervals. Availability depends on the reachability
          of the external services. Seeker assumes no liability for completeness or accuracy.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-card-foreground">How Seeker Works</h2>
        <div className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <div>
            <h3 className="font-medium text-card-foreground mb-1">Functionality</h3>
            <p>
              Seeker is a web application that collects cybersecurity news and vulnerability data from various trusted sources.
              It displays this information in organized tabs: News for articles and CVE for security vulnerabilities.
              Users can filter and search through the data, bookmark important items, and access original sources.
              The app updates automatically to show the latest information.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-card-foreground mb-1">Technologies Used</h3>
            <p>
              The website is built using modern web technologies. The main programming language is TypeScript, which is a version of JavaScript with added type safety.
              The user interface is created with React, a popular library for building interactive web apps.
              For styling, we use Tailwind CSS, which allows us to create a clean and responsive design.
              The app is bundled with Vite for fast development and building.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-card-foreground mb-1">Architecture</h3>
            <p>
              Seeker follows a simple client-side architecture. All the code runs in your web browser.
              When you open the app, it fetches data from external RSS feeds and APIs using special proxy services to avoid browser restrictions.
              The data is processed and displayed using React components. Services handle the data fetching logic,
              and components manage the user interface. Everything is stored locally in your browser for a smooth experience.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
