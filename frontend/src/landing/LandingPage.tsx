import { AppHeader } from '../components/AppHeader';
import { AppFooter } from '../components/AppFooter';
import { Features } from './Features';
import { Hero } from './Hero';
import { HowItWorks } from './HowItWorks';
import { Pricing } from './Pricing';
import { SocialProof } from './SocialProof';

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 to-indigo-50">
      <a
        href="#main-content"
        className="absolute left-1/2 top-0 z-[100] -translate-x-1/2 -translate-y-full rounded-b-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-md transition focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
      >
        Skip to main content
      </a>
      <AppHeader />
      <main id="main-content" className="flex-1" tabIndex={-1} data-prerender-ready>
        <Hero />
        <Features />
        <HowItWorks />
        <SocialProof />
        <Pricing />
      </main>
      <AppFooter />
    </div>
  );
}
