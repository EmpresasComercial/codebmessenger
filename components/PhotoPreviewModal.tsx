import { useEffect, useRef, useState } from 'react';
import { Download, FileText, ImagePlus, LoaderCircle, X } from 'lucide-react';
import PdfFileIcon from './PdfFileIcon';

interface PhotoPreviewModalProps {
  file: File;
  type?: 'image' | 'document';
  translate: (key: PhotoPreviewTranslationKey) => string;
  disabled?: boolean;
  onCaptionChange?: (caption: string) => void;
  onReplace: (file: File) => void;
  onCancel: () => void;
  onSend: (imageDataUrl: string, caption: string) => Promise<void>;
}

export type PhotoPreviewTranslationKey =
  | 'group.photo_preview'
  | 'group.document_preview'
  | 'group.cancel_photo_preview'
  | 'group.cancel_document_preview'
  | 'group.replace_photo'
  | 'group.replace_document'
  | 'group.download_photo'
  | 'group.use_hd_quality'
  | 'group.use_standard_quality'
  | 'group.prepare_photo_failed'
  | 'group.prepare_document_failed'
  | 'group.add_caption'
  | 'group.send_photo'
  | 'group.send_document';

const readFileAsDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => typeof reader.result === 'string'
    ? resolve(reader.result)
    : reject(new Error('Could not read the selected file.'));
  reader.onerror = () => reject(reader.error ?? new Error('Could not read the selected file.'));
  reader.readAsDataURL(file);
});

const formatFileSize = (sizeBytes: number): string => {
  if (sizeBytes < 1024 * 1024) return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
};

const loadImage = (source: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('Could not load the selected image.'));
  image.src = source;
});

const renderImage = async (
  file: File,
  source: string,
  quality: 'standard' | 'hd'
): Promise<string> => {
  if (quality === 'hd') {
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('Could not read the original image.'));
      reader.onerror = () => reject(reader.error ?? new Error('Could not read the original image.'));
      reader.readAsDataURL(file);
    });
  }

  const bitmap = typeof createImageBitmap === 'function' ? await createImageBitmap(file) : null;
  const image = bitmap ?? await loadImage(source);
  const sourceWidth = 'naturalWidth' in image ? image.naturalWidth : image.width;
  const sourceHeight = 'naturalHeight' in image ? image.naturalHeight : image.height;
  const scale = Math.min(1, 1600 / Math.max(sourceWidth, sourceHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));

  try {
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not prepare the selected image.');

    if (file.type !== 'image/jpeg') {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(image, 0, 0, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.78);
    });
    if (!blob) throw new Error('Could not encode the selected image.');

    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('Could not read the prepared image.'));
      reader.onerror = () => reject(reader.error ?? new Error('Could not read the prepared image.'));
      reader.readAsDataURL(blob);
    });
  } finally {
    bitmap?.close();
  }
};

export default function PhotoPreviewModal({
  file,
  type = 'image',
  translate,
  disabled = false,
  onCaptionChange,
  onReplace,
  onCancel,
  onSend,
}: PhotoPreviewModalProps) {
  const isDocument = type === 'document';
  const [caption, setCaption] = useState('');
  const [quality, setQuality] = useState<'standard' | 'hd'>('standard');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const onCancelRef = useRef(onCancel);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !disabled && !isSending) onCancelRef.current();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, isSending]);

  useEffect(() => {
    if (isDocument) return;
    const nextObjectUrl = URL.createObjectURL(file);
    setObjectUrl(nextObjectUrl);
    return () => URL.revokeObjectURL(nextObjectUrl);
  }, [file, isDocument]);

  const handleSend = async () => {
    if (disabled || isSending) return;
    setIsSending(true);
    setError(null);
    try {
      if (!isDocument && !objectUrl) return;
      const imageDataUrl = isDocument
        ? await readFileAsDataUrl(file)
        : await renderImage(file, objectUrl!, quality);
      await onSend(imageDataUrl, caption);
    } catch (sendError) {
      console.error(`[PhotoPreview] Could not prepare or send the ${isDocument ? 'document' : 'image'}:`, sendError);
      setError(translate(isDocument ? 'group.prepare_document_failed' : 'group.prepare_photo_failed'));
    } finally {
      setIsSending(false);
    }
  };

  const downloadOriginal = () => {
    if (!objectUrl) return;
    const downloadLink = document.createElement('a');
    downloadLink.href = objectUrl;
    downloadLink.download = file.name || 'imagem-do-chat';
    downloadLink.click();
  };

  const updateCaption = (nextCaption: string) => {
    setCaption(nextCaption);
    onCaptionChange?.(nextCaption);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={translate(isDocument ? 'group.document_preview' : 'group.photo_preview')}
      className="fixed inset-0 z-[500] flex h-[100dvh] flex-col bg-[#0b141a] text-white"
    >
      <header className="flex min-h-14 shrink-0 items-center justify-between gap-3 px-4 pb-1 pt-[max(8px,env(safe-area-inset-top,8px))]">
        <button
          type="button"
          onClick={onCancel}
          disabled={disabled || isSending}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50"
          aria-label={translate(isDocument ? 'group.cancel_document_preview' : 'group.cancel_photo_preview')}
        >
          <X className="h-[18px] w-[18px]" />
        </button>
        <span className="min-w-0 flex-1 truncate text-center text-sm text-white/75">{file.name}</span>
        <div className="flex shrink-0 items-center gap-1.5">
          <input
            ref={replaceInputRef}
            type="file"
            accept={isDocument ? 'application/pdf,.pdf' : 'image/*'}
            className="hidden"
            onChange={(event) => {
              const replacement = event.currentTarget.files?.[0];
              event.currentTarget.value = '';
              if (replacement) onReplace(replacement);
            }}
          />
          <button
            type="button"
            onClick={() => replaceInputRef.current?.click()}
            disabled={disabled || isSending}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50"
            aria-label={translate(isDocument ? 'group.replace_document' : 'group.replace_photo')}
            title={translate(isDocument ? 'group.replace_document' : 'group.replace_photo')}
          >
            {isDocument ? <FileText className="h-[18px] w-[18px]" /> : <ImagePlus className="h-[18px] w-[18px]" />}
          </button>
          {!isDocument && (
            <>
              <button
                type="button"
                onClick={downloadOriginal}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                aria-label={translate('group.download_photo')}
                title={translate('group.download_photo')}
              >
                <Download className="h-[18px] w-[18px]" />
              </button>
              <button
                type="button"
                onClick={() => setQuality((current) => current === 'standard' ? 'hd' : 'standard')}
                disabled={disabled || isSending}
                className="photo-preview-quality h-8 min-w-9 rounded-full px-2 text-xs font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50"
                data-selected={quality === 'hd'}
                style={quality === 'hd'
                  ? { backgroundColor: 'var(--app-theme-button, #2481cc)', color: '#ffffff' }
                  : undefined}
                aria-label={quality === 'hd' ? translate('group.use_standard_quality') : translate('group.use_hd_quality')}
              >
                HD
              </button>
            </>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 items-center justify-center px-4 py-3">
        {isDocument ? (
          <div className="flex max-w-full flex-col items-center gap-4 text-center">
            <PdfFileIcon className="h-24 w-24 rounded-[12px]" />
            <div className="max-w-full">
              <p className="max-w-[min(80vw,480px)] truncate text-base font-medium text-white">{file.name}</p>
              <p className="mt-1 text-sm text-white/60">{formatFileSize(file.size)}</p>
            </div>
          </div>
        ) : (
          <div className="relative flex max-h-full max-w-full items-center justify-center">
            <img
              src={objectUrl ?? undefined}
              alt={translate('group.photo_preview')}
              className="max-h-full max-w-full select-none object-contain"
              draggable={false}
            />
          </div>
        )}
      </div>

      <footer className="shrink-0 px-3 pb-[max(14px,env(safe-area-inset-bottom,14px))] pt-2">
        <div className="mx-auto flex w-full max-w-2xl items-end gap-2">
          <div className={`photo-preview-caption flex min-h-11 min-w-0 flex-1 items-center bg-[#202c33] px-3.5 py-2 transition-[border-radius] duration-150 ${caption.trim().length === 0 ? 'rounded-[22px]' : 'rounded-[12px]'}`}>
            <textarea
              id="photo-preview-caption"
              value={caption}
              onChange={(event) => {
                updateCaption(event.target.value);
                if (!CSS.supports('field-sizing', 'content')) {
                  event.currentTarget.style.height = 'auto';
                  event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 96)}px`;
                  event.currentTarget.style.overflowY = event.currentTarget.scrollHeight > 96 ? 'auto' : 'hidden';
                }
              }}
              placeholder={translate('group.add_caption')}
              rows={1}
              maxLength={2000}
              disabled={disabled || isSending}
              className="max-h-24 min-h-6 w-full resize-none overflow-y-auto bg-transparent text-[15px] leading-6 text-white outline-none placeholder:text-[#aebac1] [field-sizing:content]"
              aria-label={translate('group.add_caption')}
            />
          </div>
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={disabled || isSending}
            aria-busy={isSending}
            className="photo-preview-send mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition-transform active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-50"
            aria-label={translate(isDocument ? 'group.send_document' : 'group.send_photo')}
            title={translate(isDocument ? 'group.send_document' : 'group.send_photo')}
          >
            {isSending
              ? <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin" />
              : <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>}
          </button>
        </div>
        {error && <p role="alert" className="mx-auto mt-2 max-w-2xl px-2 text-sm text-red-300">{error}</p>}
      </footer>
    </div>
  );
}
