import React from 'react';
import type { MouseEvent } from 'react';

const MESSAGE_URL_PATTERN = /https?:\/\/[^\s]+|www\.[^\s]+/gi;
const TRAILING_URL_PUNCTUATION = /[.,;!?)}\]"']+$/;

function isAllowedMessageUrl(value: string): boolean {
  const cleanValue = value.trim().replace(TRAILING_URL_PUNCTUATION, '');
  const target = cleanValue.startsWith('www.') ? `https://${cleanValue}` : cleanValue;
  try {
    const url = new URL(target);
    return url.protocol === 'https:' &&
      (url.hostname.toLowerCase() === 'telegramas.cc' || url.hostname.toLowerCase() === 'www.telegramas.cc');
  } catch {
    return false;
  }
}

interface AllowedMessageLinkProps {
  href: string;
  label: string;
  host: string;
  isOutgoing: boolean;
  shouldSuppressOpen: () => boolean;
  onOpen?: (event: MouseEvent<HTMLAnchorElement>, href: string) => void;
}

export function AllowedMessageLink({
  href,
  label,
  host,
  isOutgoing,
  shouldSuppressOpen,
  onOpen,
}: AllowedMessageLinkProps) {
  const linkColor = isOutgoing ? 'text-white' : 'text-[#2481cc] dark:text-[#52a6eb]';
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.stopPropagation();
    if (shouldSuppressOpen()) {
      event.preventDefault();
      return;
    }
    if (onOpen) {
      event.preventDefault();
      onOpen(event, href);
    }
  };

  return (
    <span className="my-1 inline-flex max-w-full flex-col align-top">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className={`max-w-full rounded-lg border-l-[3px] px-2.5 py-1.5 no-underline ${
          isOutgoing
            ? 'border-white/70 bg-black/10 text-white'
            : 'border-[#2481cc] bg-black/5 text-[#202020] dark:bg-white/5 dark:text-white'
        }`}
      >
        <span className="block truncate text-[14px] font-semibold">Business Messenger</span>
        <span className={`flex min-w-0 items-center gap-1 text-[13px] ${linkColor}`}>
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.07 0l-3 3A5 5 0 0 0 9 21.07l1.71-1.71" />
          </svg>
          <span className="truncate">{host}</span>
        </span>
      </a>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className={`mt-1 break-all underline ${linkColor}`}
      >
        {label}
      </a>
    </span>
  );
}

export function renderMessageWithAllowedLinks(
  text: string,
  isOutgoing = false,
  shouldSuppressOpen: () => boolean = () => false,
): React.ReactNode {
  return text.split(MESSAGE_URL_PATTERN).map((part, index) => {
    if (!part) return null;
    if (!/^(https?:\/\/|www\.)/i.test(part)) return part;

    const trailingMatch = part.match(new RegExp(`^(.+?)(${TRAILING_URL_PUNCTUATION.source})$`));
    const candidate = trailingMatch?.[1] ?? part;
    const trailing = trailingMatch?.[2] ?? '';
    if (!isAllowedMessageUrl(candidate)) return <React.Fragment key={index}>{part}</React.Fragment>;

    const href = candidate.startsWith('www.') ? `https://${candidate}` : candidate;
    const host = new URL(href).hostname.toLowerCase();
    return (
      <React.Fragment key={index}>
        <AllowedMessageLink
          href={href}
          label={candidate}
          host={host}
          isOutgoing={isOutgoing}
          shouldSuppressOpen={shouldSuppressOpen}
        />
        {trailing}
      </React.Fragment>
    );
  });
}
