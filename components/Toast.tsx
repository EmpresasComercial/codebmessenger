import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastOptions {
  title?: string;
  type?: ToastType;
}

interface ToastContextType {
  showToast: (message: string, typeOrOptions?: ToastType | ToastOptions) => void;
}

interface ToastState {
  id: number;
  message: string;
  type: ToastType;
  title?: string;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);
const AUTO_DISMISS_MS = 2200;

function isErrorMessage(msg: string): boolean {
  const normalized = msg
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
  return /bloquead|falh|erro|insuficiente|recusad|negad|invalid|incorret|proibid|nao autorizado|expirad/.test(normalized);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, typeOrOptions?: ToastType | ToastOptions) => {
    let type: ToastType = 'info';
    let title: string | undefined;

    if (typeof typeOrOptions === 'string') {
      type = typeOrOptions;
    } else if (typeOrOptions) {
      type = typeOrOptions.type ?? 'info';
      title = typeOrOptions.title;
    } else if (isErrorMessage(message)) {
      type = 'error';
    }

    setToast({
      id: Date.now() + Math.random(),
      message,
      type,
      title,
    });
  }, []);

  useEffect(() => {
    if (!toast) return;

    const timer = window.setTimeout(() => setToast(null), AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      <AnimatePresence>
        {toast && (
          <div
            role={toast.type === 'error' ? 'alert' : 'status'}
            aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
            style={{
              position: 'fixed',
              bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 9999,
              pointerEvents: 'none',
              width: 'max-content',
              maxWidth: 'calc(100vw - 32px)',
            }}
          >
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{
                opacity: { duration: 0.18, ease: 'easeOut' },
                y: { type: 'spring', stiffness: 420, damping: 30 },
                scale: { type: 'spring', stiffness: 420, damping: 30 },
              }}
            >
              <div
                style={{
                  maxWidth: 'min(85vw, 420px)',
                  padding: '10px 16px',
                  borderRadius: 9999,
                  backgroundColor: 'rgba(32, 33, 36, 0.88)',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
                  backdropFilter: 'blur(8px)',
                  userSelect: 'none',
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: '#ffffff',
                    fontSize: 13,
                    fontWeight: 400,
                    lineHeight: 1.4,
                    fontFamily: '"Times New Roman", Times, serif',
                  }}
                >
                  {toast.title && <strong className="mb-1 block font-semibold">{toast.title}</strong>}
                  {toast.message}
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return context;
}
