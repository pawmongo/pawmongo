'use client';

import React, {useMemo, useSyncExternalStore} from 'react';

// Browser history owns routes; database and collection names need no generated Next.js pages.
const event = 'pawmongo:navigate';
function subscribe(notify: () => void) {
  window.addEventListener('popstate', notify);
  window.addEventListener(event, notify);
  return () => {
    window.removeEventListener('popstate', notify);
    window.removeEventListener(event, notify);
  };
}
function useLocation() {
  return useSyncExternalStore(subscribe, () => window.location.pathname + window.location.search, () => '/');
}
export function usePathname() {
  return useLocation().split('?')[0];
}
export function useSearchParams() {
  const location = useLocation();
  return useMemo(() => new URLSearchParams(location.includes('?') ? location.slice(location.indexOf('?') + 1) : ''), [location]);
}
export function useParams(): {database?: string; collection?: string} {
  const parts = usePathname().split('/');
  return {database: parts[1] === 'databases' ? parts[2] : undefined, collection: parts[3] === 'collections' ? parts[4] : undefined};
}
function navigate(href: string, replace = false) {
  const url = new URL(href, window.location.href);
  if (url.origin !== window.location.origin) { window.location.assign(url.href); return; }
  window.history[replace ? 'replaceState' : 'pushState'](null, '', url.pathname + url.search + url.hash);
  window.dispatchEvent(new Event(event));
}
const router = {push: (href: string) => navigate(href), replace: (href: string) => navigate(href, true), back: () => window.history.back()};
export function useRouter() { return router; }

export default function Link({href, onClick, children, ...props}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {href: string}) {
  return <a {...props} href={href} onClick={e => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || props.download || (props.target && props.target !== '_self') || href.startsWith('#')) return;
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) return;
    e.preventDefault();
    navigate(href);
  }}>{children}</a>;
}
