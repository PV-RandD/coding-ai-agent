import { useMemo, useState, useCallback } from "react";
import ToastContext from "./toastContext.js";

let nextId = 1;

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message, type = "error", ms = 3000) => {
      const id = nextId++;
      setToasts((ts) => [...ts, { id, message, type }]);
      if (ms > 0) setTimeout(() => remove(id), ms);
    },
    [remove]
  );

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-3 py-2 rounded shadow text-sm ${
              t.type === "error"
                ? "bg-red-600 text-white"
                : t.type === "success"
                ? "text-black"
                : "bg-gray-700 text-white"
            }`}
            style={
              t.type === "success"
                ? { backgroundColor: "#19e3c2" }
                : {}
            }
            onClick={() => remove(t.id)}
            role="alert"
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
