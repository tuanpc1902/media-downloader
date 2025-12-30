import { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

let toastListeners: ((toasts: Toast[]) => void)[] = [];
let toasts: Toast[] = [];

export function showToast(message: string, type: ToastType = 'info') {
  const id = Math.random().toString(36).substring(7);
  toasts = [...toasts, { id, message, type }];
  toastListeners.forEach(listener => listener(toasts));

  // Auto remove after 5 seconds
  setTimeout(() => {
    removeToast(id);
  }, 5000);
}

function removeToast(id: string) {
  toasts = toasts.filter(t => t.id !== id);
  toastListeners.forEach(listener => listener(toasts));
}

export function ToastContainer() {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const listener = (newToasts: Toast[]) => {
      setCurrentToasts(newToasts);
    };
    toastListeners.push(listener);
    setCurrentToasts(toasts);

    return () => {
      toastListeners = toastListeners.filter(l => l !== listener);
    };
  }, []);

  if (currentToasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {currentToasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg
            min-w-[300px] max-w-md animate-in slide-in-from-right
            ${
              toast.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
                : toast.type === 'error'
                ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
            }
          `}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
          ) : toast.type === 'error' ? (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          ) : null}
          <p className="flex-1 text-sm font-medium">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

