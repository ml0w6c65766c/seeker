import { Search } from 'lucide-react';
import { ExternalLink } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useState } from 'react';
import { Menu } from 'lucide-react';

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

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4 -ml-4">
          <img
            src="logo.jpg"
            alt="Seeker Logo"
            className="h-9 w-9 rounded-sm object-cover"
          />
          <span className="text-lg font-semibold text-foreground">Seeker</span>
        </div>

        <button
          className="md:hidden focus:outline-none"
          onClick={toggleMenu}
          aria-label="Toggle navigation menu"
        >
          <Menu className="h-6 w-6 text-foreground" />
        </button>

        <nav className="hidden md:flex items-center gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
          <div className="ml-2 border-l pl-2 flex items-center gap-2">
            <a
              href="https://github.com/ml0w6c65766c/seeker"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="View on GitHub"
            >
              <ExternalLink className="h-5 w-5" />
            </a>
            <ThemeToggle />
          </div>
        </nav>
      </div>

      <div
        className={`md:hidden ${isOpen ? 'block' : 'hidden'} bg-card p-4`}
      >
        <ul className="space-y-2">
          {TABS.map(tab => (
            <li key={tab.id}>
              <button
                onClick={() => {
                  onTabChange(tab.id);
                  setIsOpen(false);
                }}
                className={`block w-full text-left rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
