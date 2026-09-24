import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { toast, Toaster } from "sonner";
import { I18nProvider } from "@/context/I18nContext";
import { zh } from "@/i18n/zh";
import { en } from "@/i18n/en";
import App from "@/App";
import "@/index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

window.addEventListener("unhandledrejection", (event) => {
  const storedLang = (() => {
    try {
      return localStorage.getItem("ap-lang");
    } catch {
      return null;
    }
  })();
  const isEn =
    storedLang === "en" || (!storedLang && !navigator.language.startsWith("zh"));
  const message =
    import.meta.env.DEV && event.reason instanceof Error
      ? event.reason.message
      : isEn
        ? en.error_unhandled
        : zh.error_unhandled;
  toast.error(message);
  console.error("[Unhandled Rejection]", event.reason);
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <I18nProvider>
          <App />
          <Toaster position="bottom-right" richColors />
        </I18nProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
