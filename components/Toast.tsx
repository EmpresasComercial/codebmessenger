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
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 9999,
              pointerEvents: 'none',
            }}
          >
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.16, ease: 'easeOut' }}
            >
              <div
                style={{
                  maxWidth: 'min(85vw, 420px)',
                  padding: '12px 18px',
                  borderRadius: 6,
                  backgroundColor: '#ffffff',
                  color: '#111111',
                  border: '1px solid #d9d9d9',
                  userSelect: 'none',
                  textAlign: 'center',
                }}
              >
                <p
                  style={{
                    margin: 0,
                    color: '#111111',
                    fontSize: 12,
                    fontWeight: 400,
                    lineHeight: 1.4,
                    fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
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
