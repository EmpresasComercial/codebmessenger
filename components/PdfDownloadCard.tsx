import React, { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { useToast } from './Toast';
import { useLanguage } from '../contexts/LanguageContext';
import { logger } from '../lib/logger';
import PdfFileIcon from './PdfFileIcon';

interface PdfDownloadCardProps {
  name: string;
  sizeBytes?: number;
  url?: string;
  resolveUrl?: () => Promise<string>;
  disabled?: boolean;
  compact?: boolean;
}

const getDataUrlSize = (url?: string) => {
  if (!url?.startsWith('data:')) return undefined;
  const commaIndex = url.indexOf(',');
  if (commaIndex < 0) return undefined;
  const header = url.slice(0, commaIndex);
  const data = url.slice(commaIndex + 1);
  if (header.includes(';base64')) return Math.floor(data.length * 3 / 4) - (data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0);
  try {
    return new TextEncoder().encode(decodeURIComponent(data)).length;
  } catch {
    return undefined;
  }
};

export const formatFileSize = (bytes?: number) => {
  if (!Number.isFinite(bytes) || bytes === undefined || bytes < 0) return 'Tamanho indisponível';
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    : `${bytes === 0 ? 0 : Math.max(1, Math.ceil(bytes / 1024))} KB`;
};

export default function PdfDownloadCard({
  name,
  sizeBytes,
  url,
  resolveUrl,
  disabled = false,
  compact = false,
}: PdfDownloadCardProps) {
  const { showToast } = useToast();
  const { t } = useLanguage();
  const [progress, setProgress] = useState<number | null>(null);
  const [downloadedBytes, setDownloadedBytes] = useState(0);
  const [indeterminate, setIndeterminate] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const downloadedObjectUrlRef = useRef<string | null>(null);
  const resolvedSize = sizeBytes ?? getDataUrlSize(url);
  const isDownloading = progress !== null && progress < 1;
  const sizeLabel = resolvedSize ? formatFileSize(resolvedSize) : t('pdf.size_unavailable');
  const circleLength = 2 * Math.PI * 26;

  useEffect(() => () => {
    const objectUrl = downloadedObjectUrlRef.current;
    if (objectUrl) window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  }, []);

  const handleDownload = async () => {
    if (downloaded && downloadedObjectUrlRef.current) {
      const anchor = document.createElement('a');
      anchor.href = downloadedObjectUrlRef.current;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      return;
    }
    if (isDownloading || disabled || (!url && !resolveUrl)) return;
    setProgress(0);
    setDownloadedBytes(0);
    setIndeterminate(true);
    try {
      const downloadUrl = resolveUrl ? await resolveUrl() : url!;
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error(`PDF download failed (${response.status}).`);

      const responseSize = Number(response.headers.get('content-length'));
      const totalBytes = responseSize > 0 ? responseSize : resolvedSize;
      setIndeterminate(!totalBytes);
      const chunks: Uint8Array[] = [];
      let receivedBytes = 0;
      let lastProgressUpdate = 0;

      if (response.body) {
        const reader = response.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          receivedBytes += value.length;
          const now = Date.now();
          if (totalBytes) {
            const nextProgress = Math.min(receivedBytes / totalBytes, 1);
            if (nextProgress === 1 || now - lastProgressUpdate >= 250) {
              setProgress(nextProgress);
              setDownloadedBytes(receivedBytes);
              lastProgressUpdate = now;
            }
          } else if (now - lastProgressUpdate >= 250) {
            setDownloadedBytes(receivedBytes);
            lastProgressUpdate = now;
          }
        }
        setDownloadedBytes(receivedBytes);
      } else {
        const buffer = await response.arrayBuffer();
        chunks.push(new Uint8Array(buffer));
        receivedBytes = buffer.byteLength;
        setDownloadedBytes(receivedBytes);
        setProgress(1);
      }

      if (!receivedBytes) throw new Error('Downloaded PDF is empty.');
      const blob = new Blob(chunks, { type: 'application/pdf' });
      const objectUrl = URL.createObjectURL(blob);
      downloadedObjectUrlRef.current = objectUrl;
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = name || 'documento.pdf';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setDownloaded(true);
      showToast(t('pdf.download_success'), 'success');
    } catch (error) {
      logger.error('PdfDownloadCard', 'Failed to download PDF:', error);
      showToast(t('pdf.download_failed'), 'error');
    } finally {
      setProgress(null);
      setIndeterminate(false);
    }
  };

  const iconSize = compact ? 'h-10 w-10' : 'h-12 w-12';
  const roundedShape = 'rounded-[12px]';
  const totalBytes = resolvedSize;
  const displayedBytes = totalBytes ? Math.min(downloadedBytes, totalBytes) : downloadedBytes;
  const megabytes = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1);

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={disabled || isDownloading || (!url && !resolveUrl)}
      aria-label={isDownloading
        ? t('pdf.downloading').replace('{name}', name)
        : t('pdf.download_button').replace('{name}', name).replace('{size}', sizeLabel)}
      className={`relative flex shrink-0 items-center justify-center overflow-hidden ${roundedShape} text-white transition-transform active:scale-95 disabled:cursor-default ${iconSize}`}
      title={disabled ? t('pdf.upload_pending') : t('pdf.download_title').replace('{name}', name)}
    >
      <PdfFileIcon />
      {!downloaded && (
        <span className={`absolute inset-0 flex flex-col items-center justify-center gap-0.5 ${roundedShape} bg-black/35`}>
          {!isDownloading && (
            <Download className={compact ? 'h-4 w-4' : 'h-[18px] w-[18px]'} strokeWidth={2.5} />
          )}
          {isDownloading && totalBytes ? (
            <span className="px-0.5 text-center text-[6px] font-semibold leading-tight">
              <span className="block">{megabytes(displayedBytes)} MB</span>
              <span className="block">{t('pdf.remaining_size').replace('{size}', megabytes(Math.max(totalBytes - displayedBytes, 0)))}</span>
            </span>
          ) : isDownloading ? (
            <span className="px-0.5 text-center text-[8px] font-semibold leading-tight">
              {megabytes(displayedBytes)} MB
            </span>
          ) : (
            <span className={`max-w-full truncate font-semibold leading-none ${compact ? 'text-[6px]' : 'text-[7px]'}`}>
              {sizeLabel}
            </span>
          )}
        </span>
      )}
      {isDownloading && (
        <svg className="absolute -inset-[3px] h-[calc(100%+6px)] w-[calc(100%+6px)] -rotate-90 overflow-visible" viewBox="0 0 60 60" aria-hidden="true">
          <g>
            <animateTransform attributeName="transform" type="rotate" from="0 30 30" to="360 30 30" dur="2.8s" repeatCount="indefinite" />
            <circle cx="30" cy="30" r="26" fill="none" stroke="rgba(36,129,204,0.25)" strokeWidth="3" />
          <circle
            cx="30"
            cy="30"
            r="26"
            fill="none"
            stroke="#2481cc"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={indeterminate ? `${circleLength * 0.28} ${circleLength}` : circleLength}
            strokeDashoffset={indeterminate ? 0 : circleLength * (1 - (progress || 0))}
            className="transition-[stroke-dashoffset] duration-[450ms] ease-out"
          />
          </g>
        </svg>
      )}
    </button>
  );
}
