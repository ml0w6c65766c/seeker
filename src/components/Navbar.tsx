import { ExternalLink } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TABS = [
  { id: 'news', label: 'News' },
  { id: 'cves', label: 'CVEs' },
  { id: 'about', label: 'About' },
  { id: 'quellen', label: 'Sources' },
];

export function Navbar({ activeTab, onTabChange }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b bg-background">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <img
            src="logo.jpg"
            alt="Seeker Logo"
            className="h-8 w-8 rounded object-cover"
          />
          <span className="font-semibold tracking-tight text-foreground">Seeker</span>
        </div>

        <nav className="hidden md:flex items-center gap-0">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`px-4 py-4 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <a
            href="https://github.com/ml0w6c65766c/seeker"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex p-2 text-muted-foreground hover:text-foreground transition-colors"
            title="GitHub"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          <ThemeToggle />
          <button
            className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Menü"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="md:hidden border-t bg-background">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => { onTabChange(tab.id); setIsOpen(false); }}
              className={`block w-full px-4 py-3 text-left text-sm font-medium border-l-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-foreground text-foreground bg-muted/40'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
