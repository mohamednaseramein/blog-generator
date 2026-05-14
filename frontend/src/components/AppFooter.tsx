import { Link } from 'react-router-dom';

export function AppFooter() {
  const year = new Date().getFullYear();

  const linkClass = 'text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline';

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Product</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a href="#features" className={linkClass}>
                  Features
                </a>
              </li>
              <li>
                <a href="#how-it-works" className={linkClass}>
                  How it works
                </a>
              </li>
              <li>
                <a href="#pricing" className={linkClass}>
                  Pricing
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Resources</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <Link to="/help/ai-detector-rules" className={linkClass}>
                  AI Detector Rules
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Legal</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a href="mailto:hello@example.com?subject=Privacy%20policy%20request" className={linkClass}>
                  Privacy Policy (request by email)
                </a>
              </li>
              <li>
                <a href="mailto:hello@example.com?subject=Terms%20of%20service%20request" className={linkClass}>
                  Terms of Service (request by email)
                </a>
              </li>
              <li>
                <a href="mailto:hello@example.com?subject=Cookie%20policy%20request" className={linkClass}>
                  Cookie Policy (request by email)
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} AI Blog Generator</p>
          <p>
            Contact:{' '}
            <a href="mailto:hello@example.com" className={linkClass}>
              hello@example.com
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
