import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import ToastProvider from "./components/ToastProvider.jsx";

createRoot(document.getElementById("root")).render(
  <ToastProvider>
    <App />
  </ToastProvider>
);
