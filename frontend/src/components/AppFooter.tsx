import { Link } from 'react-router-dom';

export function AppFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div>© {year} AI Blog Generator</div>
        <nav aria-label="Footer" className="flex gap-4">
          <Link to="/help/ai-detector-rules" className="hover:text-slate-700">
            AI Detector Rules
          </Link>
        </nav>
      </div>
    </footer>
  );
}
