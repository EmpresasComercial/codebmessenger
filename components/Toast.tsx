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
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);
const AUTO_DISMISS_MS = 2200;

function cleanToastMessage(msg: string): string {
  if (!msg) return '';

  return msg
    .replace(/SEGURANÇA\s+Telegram Business\b[:\s]*/gi, '')
    .replace(/\bMICROSOFT\b[:\s]*/gi, '')
    .trim();
}

function isErrorMessage(msg: string): boolean {
  const lower = (msg || '').toLowerCase();
  return /bloquead|falh|erro|insuficiente|recusad|negad|inv[aá]lid|incorret|proibid|n[aã]o autorizado|expirad/.test(lower);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, typeOrOptions?: ToastType | ToastOptions) => {
    let type: ToastType = 'info';

    if (typeof typeOrOptions === 'string') {
      type = typeOrOptions;
    } else if (typeOrOptions) {
      type = typeOrOptions.type ?? 'info';
    }

    if (isErrorMessage(message) && type !== 'warning') {
      type = 'error';
    }

    setToast({
      id: Date.now() + Math.random(),
      message: cleanToastMessage(message),
      type,
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
            style={{
              position: 'fixed',
              top: 18,
              left: '50%',
              transform: 'translateX(-50%)',
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
                  padding: '10px 16px',
                  borderRadius: 999,
                  backgroundColor: '#ffffff',
                  color: '#111111',
                  border: '1px solid rgba(0, 0, 0, 0.05)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
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
