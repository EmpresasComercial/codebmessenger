import type { MouseEventHandler } from 'react';

interface MessageLinkPreviewProps {
  href: string;
  host: string;
  isOutgoing: boolean;
  onClick: MouseEventHandler<HTMLAnchorElement>;
}

export default function MessageLinkPreview({
  href,
  host,
  isOutgoing,
  onClick,
}: MessageLinkPreviewProps) {
  const linkColor = isOutgoing ? 'text-white' : 'text-[#2481cc] dark:text-[#52a6eb]';

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={onClick}
      className={`pointer-events-auto max-w-full rounded-lg border-l-[3px] px-2.5 py-1.5 no-underline ${
        isOutgoing
          ? 'border-white/70 bg-black/10 text-white'
          : 'border-[#2481cc] bg-black/5 text-[#202020] dark:bg-white/5 dark:text-white'
      }`}
    >
      <span className="block truncate text-[14px] font-semibold">Teggram X</span>
      <span className={`flex min-w-0 items-center gap-1 text-[13px] ${linkColor}`}>
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.07 0l-3 3A5 5 0 0 0 9 21.07l1.71-1.71" />
        </svg>
        <span className="truncate">{host}</span>
      </span>
    </a>
  );
}
