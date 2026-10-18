interface PdfFileIconProps {
  className?: string;
}

export default function PdfFileIcon({ className = 'h-full w-full rounded-[12px]' }: PdfFileIconProps) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d="M11 0h34l19 19v34a11 11 0 0 1-11 11H11A11 11 0 0 1 0 53V11A11 11 0 0 1 11 0Z" fill="#eef1f5" />
      <path d="M45 0v15a4 4 0 0 0 4 4h15" fill="#d6dce5" />
      <path
        d="M29 10c3.5 6.5-2.5 19.5-10 28-4.5 5-7.5 8.5-5.5 10.5 2.5 2.5 8.5-2 14.5-10 6-8 10.5-18 8.5-23.5-1-3-4.5-3.5-5.5-.5-1.5 4 3 13.5 8 19.5 4 5 10 8 13 6 2.5-1.5 1-4.5-3-5.5-6-1.5-17 1-27.5 5"
        fill="none"
        stroke="#ed1c2e"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M0 43h64v10a11 11 0 0 1-11 11H11A11 11 0 0 1 0 53V43Z" fill="#ed1c2e" />
      <text x="32" y="57" textAnchor="middle" fill="#fff" fontFamily="Arial, sans-serif" fontSize="14" fontWeight="700">PDF</text>
    </svg>
  );
}
