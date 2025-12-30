export function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-4">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <div>
            © {new Date().getFullYear()} MediaDownloader. All rights reserved.
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            >
              GitHub
            </a>
            <a
              href="#"
              className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            >
              Documentation
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

