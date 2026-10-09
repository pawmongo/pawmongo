'use client';

import React, { useEffect, useState, useRef, Suspense } from 'react';
import { usePathname, useSearchParams } from '@/lib/navigation';
import { useDatabase } from '@/context/DatabaseContext';
import { Loader2 } from 'lucide-react';

function GlobalLoaderContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isLoading, loadingMessage, theme } = useDatabase();
  const isDarkMode = theme === 'dark';

  const [routeLoading, setRouteLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const prevUrlRef = useRef(pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : ''));

  // When pathname or searchParams change, mark route as completed
  useEffect(() => {
    const currentUrl = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
    if (prevUrlRef.current !== currentUrl) {
      prevUrlRef.current = currentUrl;
      const t1 = setTimeout(() => {
        setProgress(100);
      }, 0);
      const t2 = setTimeout(() => {
        setRouteLoading(false);
        setProgress(0);
      }, 350);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [pathname, searchParams]);

  // Intercept click on links to show instant loader feedback
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a');
      if (!target) return;
      const href = target.getAttribute('href');
      // If it's an internal route link and not an anchor/hash or external link
      if (href && href.startsWith('/') && !href.startsWith('#') && !target.hasAttribute('download')) {
        const currentUrl = window.location.pathname + window.location.search;
        if (href !== currentUrl) {
          setRouteLoading(true);
          setProgress(35);
        }
      }
    };

    document.addEventListener('click', handleDocumentClick, { capture: true });
    return () => {
      document.removeEventListener('click', handleDocumentClick, { capture: true });
    };
  }, []);

  // Animate progress when routeLoading or isLoading is true
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    let finishTimeout: NodeJS.Timeout | undefined;

    if (routeLoading || isLoading) {
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev === 0) return 30;
          if (prev >= 88) return prev;
          const inc = Math.max(1.5, (90 - prev) * 0.15);
          return Math.min(88, prev + inc);
        });
      }, 100);
    } else {
      finishTimeout = setTimeout(() => {
        setProgress((prev) => (prev > 0 ? 100 : 0));
        const resetTimer = setTimeout(() => {
          setProgress(0);
        }, 300);
        return () => clearTimeout(resetTimer);
      }, 0);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (finishTimeout) clearTimeout(finishTimeout);
    };
  }, [routeLoading, isLoading]);

  const active = routeLoading || isLoading;
  const currentMsg = loadingMessage || (routeLoading ? 'Loading page...' : 'Processing...');

  return (
    <>
      {/* 1. Sleek Top Navigation & API Progress Bar */}
      <div
        className={`fixed top-0 left-0 right-0 z-[10000] h-[3px] pointer-events-none transition-opacity duration-300 ${
          active || progress > 0 ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div
          className={`h-full bg-gradient-to-r from-[#0062d2] via-[#0284c7] to-[#38bdf8] transition-all duration-300 ease-out shadow-[0_0_10px_rgba(2,132,199,0.7)] ${
            !active && progress === 0
              ? 'w-0'
              : progress >= 100
              ? 'w-full'
              : progress >= 75
              ? 'w-3/4'
              : progress >= 50
              ? 'w-1/2'
              : progress >= 25
              ? 'w-1/4'
              : 'w-1/6'
          }`}
        />
      </div>

      {/* 2. Full-Screen Interaction Blocking Overlay with Centered Loading Message */}
      {active && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-[2px] cursor-wait select-none pointer-events-auto animate-in fade-in duration-150"
          role="alert"
          aria-busy="true"
          aria-live="assertive"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onTouchStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          onKeyDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div
            className={`flex flex-col items-center justify-center p-6 sm:p-7 rounded-xl border shadow-2xl max-w-sm w-full mx-4 text-center transition-all animate-in zoom-in-95 duration-150 ${
              isDarkMode
                ? 'bg-[#0b1a24] border-[#1c2d38] text-white shadow-black/60'
                : 'bg-white border-[#d8e2dc] text-[#1c2d38] shadow-neutral-400/30'
            }`}
          >
            {/* Animated Circular Spinner */}
            <div className="relative mb-4 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full border-2 border-[#0062d2]/20 dark:border-[#38bdf8]/20 animate-pulse" />
              <Loader2 className="w-8 h-8 animate-spin text-[#0062d2] dark:text-[#38bdf8] absolute" />
            </div>

            {/* Centered Primary Loading Message */}
            <h3 className={`text-base font-semibold tracking-tight ${isDarkMode ? 'text-white' : 'text-[#1c2d38]'}`}>
              {currentMsg}
            </h3>

            {/* Helper Subtext */}
            <p className="text-xs text-[#8899a6] mt-1.5 font-sans">
              Please wait, updating data...
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export function GlobalLoader() {
  return (
    <Suspense fallback={null}>
      <GlobalLoaderContent />
    </Suspense>
  );
}
