import { useContext } from "react";
import ToastContext from "./toastContext.js";

export default function useToast() {
  return useContext(ToastContext);
}
