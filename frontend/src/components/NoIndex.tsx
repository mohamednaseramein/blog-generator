import { Helmet } from 'react-helmet-async';
import { Outlet } from 'react-router-dom';

/**
 * Emits `<meta name="robots" content="noindex, nofollow">`.
 *
 * Belt-and-suspenders alongside the `robots.txt` Disallow rules: `Disallow`
 * asks crawlers not to fetch a URL, but does not guarantee de-indexing of one
 * that is already known. `noindex` does. Used for authenticated/app routes and
 * the auth flow — surfaces that are functional but never a search landing.
 */
export function NoIndex() {
  return (
    <Helmet>
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
  );
}

/**
 * Route-layout element: applies {@link NoIndex} to every nested route.
 * Use as `<Route element={<NoIndexRoute />}>...</Route>`.
 */
export function NoIndexRoute() {
  return (
    <>
      <NoIndex />
      <Outlet />
    </>
  );
}
