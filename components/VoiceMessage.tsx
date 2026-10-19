import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Loader2, Mic, Pause, Play, Send, Square, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { logger } from '../lib/logger';
import { useToast } from './Toast';
import { useLanguage } from '../contexts/LanguageContext';

const MAX_RECORDING_SECONDS = 120; // 2 minutos
const MAX_RECORDING_BYTES = 5 * 1024 * 1024; // 5 MB (limite do bucket)

interface VoiceMessageLabels {
  record: string;
  stop: string;
  cancel: string;
  send: string;
  sending: string;
  unsupported: string;
  permissionDenied: string;
  tooLarge: string;
  unavailable: string;
  sendFailed: string;
  storageUnavailable: string;
  pause: string;
  resume: string;
}

interface VoiceMessageComposerProps {
  labels: VoiceMessageLabels;
  onSend: (blob: Blob, durationSeconds: number) => Promise<void> | void;
  onActiveChange?: (active: boolean) => void;
  disabled?: boolean;
  className?: string;
  visible?: boolean;
}

export interface VoiceMessageComposerHandle {
  mainAction: () => Promise<void>;
}

export const VoiceMessageComposer = forwardRef<VoiceMessageComposerHandle, VoiceMessageComposerProps>(function VoiceMessageComposer({
  labels,
  onSend,
  onActiveChange,
  disabled = false,
  className = '',
  visible = true
}: VoiceMessageComposerProps, ref) {
  const { showToast } = useToast();
  const { t } = useLanguage();
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const activeSegmentStartedAtRef = useRef<number | null>(null);
  const recordedDurationMsRef = useRef(0);
  const discardRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [recorded, setRecorded] = useState<{ blob: Blob; durationSeconds: number } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [sending, setSending] = useState(false);

  const clearPreview = () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setPreviewUrl(null);
    setRecorded(null);
    onActiveChange?.(false);
  };

  const stopTracks = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  };

  const stopTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const elapsedDurationMs = () => recordedDurationMsRef.current
    + (activeSegmentStartedAtRef.current === null ? 0 : Date.now() - activeSegmentStartedAtRef.current);

  const startTimer = (recorder: MediaRecorder) => {
    stopTimer();
    timerRef.current = window.setInterval(() => {
      const duration = elapsedDurationMs();
      setElapsedSeconds(Math.floor(duration / 1000));
      if (duration >= MAX_RECORDING_SECONDS * 1000 && recorder.state === 'recording') {
        stopTimer();
        recorder.stop();
      }
    }, 250);
  };

  useEffect(() => () => {
    stopTimer();
    stopTracks();
    if (recorderRef.current?.state === 'recording' || recorderRef.current?.state === 'paused') {
      discardRef.current = true;
      recorderRef.current.stop();
    }
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      showToast(labels.unsupported, 'error');
      return;
    }

    try {
      // Mono + 16kHz + cancela eco/ruído → áudio de voz comprimido e leve
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,         // mono (metade do tamanho vs estéreo)
          sampleRate: 16000,       // 16 kHz — qualidade de voz ideal
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Preferir Opus (codec mais eficiente para voz)
      const mimeType = typeof MediaRecorder.isTypeSupported === 'function'
        ? [
            'audio/webm;codecs=opus',
            'audio/ogg;codecs=opus',
            'audio/mp4',
          ].find((type) => MediaRecorder.isTypeSupported(type))
        : undefined;

      // 24 kbps → 2 min ≈ 360 KB (vs ~2 MB sem limite de bitrate)
      const recorderOptions: MediaRecorderOptions = { audioBitsPerSecond: 24_000 };
      if (mimeType) recorderOptions.mimeType = mimeType;
      const recorder = new MediaRecorder(stream, recorderOptions);

      chunksRef.current = [];
      discardRef.current = false;
      setElapsedSeconds(0);
      setRecorded(null);
      recordedDurationMsRef.current = 0;
      activeSegmentStartedAtRef.current = Date.now();
      setRecording(true);
      setPaused(false);
      onActiveChange?.(true);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const durationMs = elapsedDurationMs();
        recordedDurationMsRef.current = durationMs;
        activeSegmentStartedAtRef.current = null;
        stopTimer();
        stopTracks();
        setRecording(false);
        setPaused(false);
        if (discardRef.current) {
          chunksRef.current = [];
          onActiveChange?.(false);
          return;
        }

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        chunksRef.current = [];
        const durationSeconds = Math.max(1, Math.round(durationMs / 1000));
        if (!blob.size) {
          onActiveChange?.(false);
          return;
        }
        if (blob.size > MAX_RECORDING_BYTES) {
          showToast(labels.tooLarge, 'error');
          onActiveChange?.(false);
          return;
        }

        const url = URL.createObjectURL(blob);
        previewUrlRef.current = url;
        setPreviewUrl(url);
        setRecorded({ blob, durationSeconds });
        onActiveChange?.(true);
      };
      recorder.start(250);
      startTimer(recorder);
    } catch (error) {
      logger.error('VoiceMessage', 'Could not start microphone recording:', error);
      stopTracks();
      setRecording(false);
      setPaused(false);
      onActiveChange?.(false);
      showToast(labels.permissionDenied, 'error');
    }
  };

  const cancelRecording = () => {
    discardRef.current = true;
    stopTimer();
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
    } else {
      stopTracks();
      setRecording(false);
      setPaused(false);
    }
    clearPreview();
  };

  const sendRecording = async () => {
    if (!recorded || sending || disabled) return;
    setSending(true);
    try {
      await onSend(recorded.blob, recorded.durationSeconds);
      clearPreview();
    } catch (error) {
      logger.error('VoiceMessage', 'Could not send recording:', error);
      const isStorageConfigIssue = error instanceof Error && /bucket|storage.*configured|not configured|Bucket not found/i.test(error.message);
      showToast(isStorageConfigIssue ? labels.storageUnavailable : labels.sendFailed, 'error');
    } finally {
      setSending(false);
    }
  };

  const pauseRecording = () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== 'recording') return;
    recordedDurationMsRef.current = elapsedDurationMs();
    activeSegmentStartedAtRef.current = null;
    recorder.pause();
    stopTimer();
    setElapsedSeconds(Math.floor(recordedDurationMsRef.current / 1000));
    setPaused(true);
  };

  const resumeRecording = () => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state !== 'paused') return;
    activeSegmentStartedAtRef.current = Date.now();
    recorder.resume();
    setPaused(false);
    startTimer(recorder);
  };

  const stopRecording = () => {
    const recorder = recorderRef.current;
    if (recorder && (recorder.state === 'recording' || recorder.state === 'paused')) recorder.stop();
  };

  useImperativeHandle(ref, () => ({
    mainAction: async () => {
      if (recorded) {
        await sendRecording();
      } else if (recording) {
        stopRecording();
      } else {
        await startRecording();
      }
    }
  }));

  const formatDuration = (seconds: number) =>
    `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

  if (recording) {
    return (
      <div className={`flex min-w-0 items-center gap-2 ${className}`}>
        <span className={`h-2 w-2 rounded-full bg-red-500 ${paused ? '' : 'animate-pulse'}`} />
        <span className="min-w-[38px] flex-1 text-sm tabular-nums text-gray-700 dark:text-gray-200">{formatDuration(elapsedSeconds)}</span>
        <button
          type="button"
          onClick={cancelRecording}
          disabled={disabled}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10 disabled:opacity-50"
          aria-label={labels.cancel}
          title={labels.cancel}
        >
          <Trash2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={paused ? resumeRecording : pauseRecording}
          disabled={disabled}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2481cc] text-white disabled:opacity-50"
          aria-label={paused ? labels.resume : labels.pause}
          title={paused ? labels.resume : labels.pause}
        >
          {paused ? <Play className="h-4 w-4 fill-current" /> : <Pause className="h-4 w-4 fill-current" />}
        </button>
        <button
          type="button"
          onClick={stopRecording}
          disabled={disabled}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2481cc] text-white disabled:opacity-50"
          aria-label={labels.stop}
          title={labels.stop}
        >
          <Square className="h-4 w-4 fill-current" />
        </button>
      </div>
    );
  }

  if (recorded && previewUrl) {
    return (
      <div className={`flex min-w-0 items-center gap-2 ${className}`}>
        <audio src={previewUrl} controls preload="metadata" className="h-9 min-w-0 flex-1" aria-label={labels.send} />
        <button
          type="button"
          onClick={clearPreview}
          disabled={sending || disabled}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/10 disabled:opacity-50"
          aria-label={labels.cancel}
          title={labels.cancel}
        >
          <Trash2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={sendRecording}
          disabled={sending || disabled}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#2481cc] text-white disabled:opacity-50"
          aria-label={sending ? labels.sending : labels.send}
          title={sending ? labels.sending : labels.send}
        >
          {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </button>
      </div>
    );
  }

  if (!visible) return null;
  return (
    <button
      type="button"
      onClick={startRecording}
      disabled={disabled}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#707579] transition-transform hover:bg-black/5 active:scale-90 disabled:opacity-50 dark:text-gray-300 dark:hover:bg-white/10 ${className} ${visible ? '' : 'hidden'}`}
      aria-label={labels.record}
      title={labels.record}
    >
      <Mic className="h-5 w-5" />
    </button>
  );
});

interface VoiceMessagePlayerProps {
  path?: string;
  unavailableLabel: string;
  isOutgoing?: boolean;
}

export function VoiceMessagePlayer({ path, unavailableLabel, isOutgoing = false }: VoiceMessagePlayerProps) {
  const { t } = useLanguage();
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [failed, setFailed]     = useState(false);
  const objectUrlRef             = useRef<string | null>(null);

  // Revoga blob URL ao desmontar para não vazar memória
  useEffect(() => () => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
  }, []);

  useEffect(() => {
    if (!path) return;
    let active      = true;
    let attempts    = 0;
    let retryTimer: number | null = null;

    const loadAudio = async () => {
      // 1. Validar acesso no servidor (RPC SECURITY DEFINER verifica participação)
      const { data: rpcData, error: rpcError } = await (supabase.rpc as any)(
        'getvoice',
        { p_path: path }
      );

      if (!active) return;

      if (rpcError || !rpcData?.success) {
        logger.error('VoiceMessage', 'Access denied by server:', rpcData?.message ?? rpcError);
        setFailed(true);
        return;
      }

      // 2. Gerar signed URL com TTL de 15 minutos (900s)
      const { data, error } = await supabase.storage
        .from('chat-voice-messages')
        .createSignedUrl(path, 900);

      if (!active) return;

      if (!error && data?.signedUrl) {
        setAudioUrl(data.signedUrl);
        return;
      }

      attempts += 1;
      if (attempts < 4) {
        retryTimer = window.setTimeout(loadAudio, attempts * 700);
      } else {
        logger.error('VoiceMessage', 'Could not load audio:', error);
        setFailed(true);
      }
    };

    setAudioUrl(null);
    setFailed(false);
    void loadAudio();
    return () => {
      active = false;
      if (retryTimer !== null) window.clearTimeout(retryTimer);
    };
  }, [path]);

  return (
    <div
      className="pointer-events-auto mb-1 flex min-w-[220px] max-w-[min(280px,70vw)] items-center"
      onClick={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
      onTouchEnd={(event) => event.stopPropagation()}
      onTouchCancel={(event) => event.stopPropagation()}
    >
      {audioUrl ? (
        <audio
          src={audioUrl}
          controls
          preload="metadata"
          controlsList="nodownload nofullscreen noremoteplayback"
          className={`h-10 w-full ${isOutgoing ? 'accent-[#2481cc]' : 'accent-gray-500'}`}
          aria-label={t('chat.voice_message')}
        />
      ) : (
        <span className="flex h-10 items-center gap-2 text-xs text-gray-500 dark:text-gray-300">
          {!failed && <Loader2 className="h-4 w-4 animate-spin" />}
          {failed ? unavailableLabel : '…'}
        </span>
      )}
    </div>
  );
}

