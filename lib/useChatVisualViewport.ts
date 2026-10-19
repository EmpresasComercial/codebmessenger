import { useEffect, useRef } from 'react';

export function useChatVisualViewport<T extends HTMLElement>() {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const previousHeight = container.style.height;
    const previousTransform = container.style.transform;
    let frame = 0;

    const syncViewport = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const viewport = window.visualViewport;
        const height = Math.round(viewport?.height ?? window.innerHeight);
        const offsetTop = Math.round(viewport?.offsetTop ?? 0);

        if (height > 0) container.style.height = `${height}px`;
        container.style.transform = `translate3d(0, ${offsetTop}px, 0)`;
      });
    };

    syncViewport();
    window.visualViewport?.addEventListener('resize', syncViewport);
    window.visualViewport?.addEventListener('scroll', syncViewport);
    window.addEventListener('resize', syncViewport);
    window.addEventListener('orientationchange', syncViewport);
    window.addEventListener('pageshow', syncViewport);
    window.addEventListener('focusin', syncViewport);
    window.addEventListener('focusout', syncViewport);

    return () => {
      cancelAnimationFrame(frame);
      window.visualViewport?.removeEventListener('resize', syncViewport);
      window.visualViewport?.removeEventListener('scroll', syncViewport);
      window.removeEventListener('resize', syncViewport);
      window.removeEventListener('orientationchange', syncViewport);
      window.removeEventListener('pageshow', syncViewport);
      window.removeEventListener('focusin', syncViewport);
      window.removeEventListener('focusout', syncViewport);
      container.style.height = previousHeight;
      container.style.transform = previousTransform;
    };
  }, []);

  return containerRef;
}
