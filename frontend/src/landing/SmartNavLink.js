import { jsx as _jsx } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
/** Hash-only anchors use `<a>`; app routes use react-router `<Link>`. */
export function SmartNavLink({ href, className, children, onClick, 'aria-label': ariaLabel, }) {
    if (href.startsWith('#')) {
        return (_jsx("a", { href: href, className: className, onClick: onClick, "aria-label": ariaLabel, children: children }));
    }
    return (_jsx(Link, { to: href, className: className, onClick: onClick, "aria-label": ariaLabel, children: children }));
}
