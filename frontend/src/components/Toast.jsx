import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { X, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLORS = {
  success: 'border-accent-green/30 bg-accent-green/10',
  error: 'border-accent-red/30 bg-accent-red/10',
  warning: 'border-accent-amber/30 bg-accent-amber/10',
  info: 'border-brand-400/30 bg-brand-500/10',
};

const ICON_COLORS = {
  success: 'text-accent-green',
  error: 'text-accent-red',
  warning: 'text-accent-amber',
  info: 'text-brand-300',
};

function Toast({ toast, onDismiss }) {
  const Icon = ICONS[toast.type] || Info;

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), toast.duration || 4000);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-xl border backdrop-blur-xl animate-slide-left
        ${COLORS[toast.type] || COLORS.info}`}
    >
      <Icon size={18} className={`mt-0.5 flex-shrink-0 ${ICON_COLORS[toast.type]}`} />
      <div className="flex-1 min-w-0">
        {toast.title && <p className="text-sm font-medium text-white">{toast.title}</p>}
        <p className="text-sm text-white/60">{toast.message}</p>
      </div>
      <button onClick={() => onDismiss(toast.id)} className="text-white/30 hover:text-white/60 transition-colors">
        <X size={14} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, ...toast }]);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (message, title) => addToast({ type: 'success', message, title }),
    error: (message, title) => addToast({ type: 'error', message, title }),
    warning: (message, title) => addToast({ type: 'warning', message, title }),
    info: (message, title) => addToast({ type: 'info', message, title }),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onDismiss={dismissToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
