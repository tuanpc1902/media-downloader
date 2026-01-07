import { memo } from 'react';

export const Footer = memo(function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-background-surface/95 dark:bg-background-surfaceDark/95 backdrop-blur-xl border-t border-border-light dark:border-border-dark py-6 sm:py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-text-secondary-light dark:text-text-secondary-dark">
          <div className="text-center sm:text-left">
            © {currentYear} Media Downloader. All rights reserved.
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#74B9FF] dark:hover:text-[#81CFE0] transition-colors font-medium"
            >
              GitHub
            </a>
            <a
              href="#"
              className="hover:text-[#74B9FF] dark:hover:text-[#81CFE0] transition-colors font-medium"
            >
              Documentation
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
});

