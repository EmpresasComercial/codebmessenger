import { useEffect, useRef } from 'react';

export function useChatVisualViewport<T extends HTMLElement>() {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    const container = containerRef.current;
    const viewport = window.visualViewport;
    if (!container || !viewport) return;

    const previousHeight = container.style.height;
    const previousTransform = container.style.transform;
    let frame = 0;

    const syncViewport = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        container.style.height = `${Math.round(viewport.height)}px`;
        container.style.transform = `translate3d(0, ${Math.round(viewport.offsetTop)}px, 0)`;
      });
    };

    syncViewport();
    viewport.addEventListener('resize', syncViewport);
    viewport.addEventListener('scroll', syncViewport);
    window.addEventListener('resize', syncViewport);

    return () => {
      cancelAnimationFrame(frame);
      viewport.removeEventListener('resize', syncViewport);
      viewport.removeEventListener('scroll', syncViewport);
      window.removeEventListener('resize', syncViewport);
      container.style.height = previousHeight;
      container.style.transform = previousTransform;
    };
  }, []);

  return containerRef;
}
