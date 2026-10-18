import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Camera, FileText, Images, X } from 'lucide-react';
import { loadRecentImages, rememberRecentImage, type RecentImageRecord } from '../lib/recentImages';

type AttachmentPickerTranslationKey =
  | 'attachment.open'
  | 'attachment.close'
  | 'attachment.gallery'
  | 'attachment.camera'
  | 'attachment.document'
  | 'attachment.recent_empty'
  | 'attachment.recent_load_failed'
  | 'attachment.recent_save_failed';

interface ChatAttachmentPickerProps {
  translate: (key: AttachmentPickerTranslationKey) => string;
  maxImageSizeBytes: number;
  onClose: () => void;
  onSelectImage: (file: File) => void;
  onSelectDocument: (file: File) => void;
  onError: (message: string) => void;
}

interface RecentImage extends RecentImageRecord {
  objectUrl: string;
}

const pickerActions = [
  { key: 'gallery', Icon: Images, color: 'text-[#1685ef]', background: 'bg-[#eaf4ff]' },
  { key: 'camera', Icon: Camera, color: 'text-[#e83e8c]', background: 'bg-[#fff0f6]' },
  { key: 'document', Icon: FileText, color: 'text-[#7655dc]', background: 'bg-[#f1edff]' },
] as const;

export default function ChatAttachmentPicker({
  translate,
  maxImageSizeBytes,
  onClose,
  onSelectImage,
  onSelectDocument,
  onError,
}: ChatAttachmentPickerProps) {
  const [recentImages, setRecentImages] = useState<RecentImage[]>([]);
  const [recentLoadFailed, setRecentLoadFailed] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);
  const dragStartYRef = useRef<number | null>(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    let cancelled = false;
    let createdUrls: string[] = [];

    void loadRecentImages().then((records) => {
      if (cancelled) return;
      const images = records.map((record) => {
        const objectUrl = URL.createObjectURL(record.blob);
        createdUrls.push(objectUrl);
        return { ...record, objectUrl };
      });
      setRecentImages(images);
    }).catch((error: unknown) => {
      console.error('[ChatAttachmentPicker] Could not load recent images:', error);
      if (!cancelled) setRecentLoadFailed(true);
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelled = true;
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [translate]);

  const selectImage = (file: File) => {
    if (file.size <= maxImageSizeBytes) {
      void rememberRecentImage(file).catch((error: unknown) => {
        console.error('[ChatAttachmentPicker] Could not save a recent image:', error);
        onError(translate('attachment.recent_save_failed'));
      });
    }
    onSelectImage(file);
    onClose();
  };

  const selectFromInput = (event: ChangeEvent<HTMLInputElement>, isDocument: boolean) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;
    if (isDocument) {
      onSelectDocument(file);
      onClose();
      return;
    }
    selectImage(file);
  };

  return (
    <div
      role="presentation"
      className="chat-attachment-backdrop fixed inset-0 z-[300] flex items-end justify-center bg-black/35"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={translate('attachment.open')}
        className="chat-attachment-sheet flex h-[min(220px,45dvh)] w-full max-w-2xl flex-col overflow-hidden rounded-t-[22px] border border-black/5 bg-white pb-[max(8px,env(safe-area-inset-bottom,8px))] shadow-[0_-8px_36px_rgba(0,0,0,0.18)] dark:border-white/10 dark:bg-[#17212b]"
      >
        <div className="relative">
          <div
            className="mx-auto mt-2.5 h-1 w-10 touch-pan-y rounded-full bg-[#c7cbd0] dark:bg-[#53616e]"
            onTouchStart={(event) => { dragStartYRef.current = event.touches[0]?.clientY ?? null; }}
            onTouchEnd={(event) => {
              const startY = dragStartYRef.current;
              dragStartYRef.current = null;
              if (startY !== null && (event.changedTouches[0]?.clientY ?? startY) - startY > 48) onClose();
            }}
            onTouchCancel={() => { dragStartYRef.current = null; }}
          />
          <button
            type="button"
            onClick={onClose}
            className="chat-attachment-theme-focus absolute right-3 top-1 flex h-8 w-8 items-center justify-center rounded-full text-[#717980] transition-colors hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2481cc] dark:text-[#aab4bd] dark:hover:bg-white/10"
            aria-label={translate('attachment.close')}
            title={translate('attachment.close')}
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
        <div className="grid shrink-0 grid-cols-3 gap-1 px-3 pb-2 pt-3">
          {pickerActions.map(({ key, Icon, color, background }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                if (key === 'gallery') galleryInputRef.current?.click();
                if (key === 'camera') cameraInputRef.current?.click();
                if (key === 'document') documentInputRef.current?.click();
              }}
              className="chat-attachment-theme-focus flex min-w-0 flex-col items-center gap-1.5 rounded-xl px-1 py-1.5 text-center transition-colors hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2481cc] dark:hover:bg-white/5"
            >
              <span className={`chat-attachment-action-icon-bg flex h-11 w-11 items-center justify-center rounded-[15px] ${background}`}>
                <Icon aria-hidden="true" className={`chat-attachment-action-icon h-5 w-5 ${color}`} strokeWidth={2.1} />
              </span>
              <span className="w-full truncate text-[11px] font-medium text-[#454b50] dark:text-[#d5dbe0]">
                {translate(key === 'document' ? 'attachment.document' : `attachment.${key}`)}
              </span>
            </button>
          ))}
        </div>

        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => selectFromInput(event, false)}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => selectFromInput(event, false)}
        />
        <input
          ref={documentInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(event) => selectFromInput(event, true)}
        />

        <div className="min-h-0 flex-1 border-t border-[#eceff1] px-4 pt-2 dark:border-[#2b3946]">
          {recentLoadFailed ? (
            <p role="alert" className="py-3 text-center text-xs text-red-600 dark:text-red-300">
              {translate('attachment.recent_load_failed')}
            </p>
          ) : recentImages.length > 0 ? (
            <div className="grid grid-cols-4 gap-2 px-1 pb-1">
              {recentImages.map((image) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => selectImage(new File([image.blob], image.name, {
                    type: image.type,
                    lastModified: image.lastModified,
                  }))}
                  aria-label={image.name}
                  title={image.name}
                  className="aspect-square w-full max-w-[68px] overflow-hidden rounded-xl bg-[#eef0f2] ring-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2481cc] dark:bg-[#273441]"
                >
                  <img src={image.objectUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          ) : (
            <p className="py-3 text-center text-xs text-[#818990] dark:text-[#9aa7b2]">
              {translate('attachment.recent_empty')}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
