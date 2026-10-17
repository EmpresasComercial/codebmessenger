import React from 'react';
import type { MouseEvent } from 'react';
import MessageLinkPreview from '../components/MessageLinkPreview';

const MESSAGE_URL_PATTERN = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
const TRAILING_URL_PUNCTUATION = /[.,;!?)}\]"']+$/;
const ALLOWED_MESSAGE_HOSTS = new Set(['telegramas.cc', 'www.telegramas.cc', 'me.telegramas.cc']);

export function normalizeAllowedMessageUrl(value: string): string | null {
  const cleanValue = value.trim().replace(TRAILING_URL_PUNCTUATION, '');
  const target = (cleanValue.startsWith('www.') ? `https://${cleanValue}` : cleanValue)
    .replace(/^https:\/\/telegramas\.ccsignup(?=\/|\?|$)/i, 'https://telegramas.cc/signup');
  try {
    const url = new URL(target);
    if (
      url.protocol === 'https:' &&
      ALLOWED_MESSAGE_HOSTS.has(url.hostname.toLowerCase())
    ) {
      return url.href;
    }
    return null;
  } catch {
    return null;
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
      <MessageLinkPreview
        href={href}
        host={host}
        isOutgoing={isOutgoing}
        onClick={handleClick}
      />
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className={`pointer-events-auto mt-1 break-all underline ${
          isOutgoing ? 'text-white' : 'text-[#2481cc] dark:text-[#52a6eb]'
        }`}
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
    const href = normalizeAllowedMessageUrl(candidate);
    if (!href) return <React.Fragment key={index}>{part}</React.Fragment>;

    const host = new URL(href).hostname.toLowerCase();
    return (
      <React.Fragment key={index}>
        <AllowedMessageLink
          href={href}
          label={href === candidate ? candidate : href}
          host={host}
          isOutgoing={isOutgoing}
          shouldSuppressOpen={shouldSuppressOpen}
        />
        {trailing}
      </React.Fragment>
    );
  });
}
