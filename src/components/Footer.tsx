import { Heart } from 'lucide-react';

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-12 border-t border-border bg-muted/30">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          {/* Left side - GitHub link */}
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/ml0w6c65766c/seeker"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              GitHub
            </a>
          </div>

          {/* Center - Copyright */}
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>© {currentYear} Seeker made by M</span>
          </div>

          {/* Right side - Links */}
          <div className="flex items-center gap-4 text-sm">
            <a
              href="/"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Home
            </a>
            <a
              href="/#about"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              About
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
