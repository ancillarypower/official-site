import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { HeroBanner } from "@/components/layout/HeroBanner";
import { ErrorBoundary } from "@/components/layout/ErrorBoundary";
import { SkipToContent } from "@/components/layout/SkipToContent";
import { Sidebar } from "@/components/layout/Sidebar";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

const ContentPage = lazy(() => import("@/pages/ContentPage"));
const ModelsPage = lazy(() => import("@/pages/ModelsPage"));
const StorePage = lazy(() => import("@/pages/StorePage"));
const AboutPage = lazy(() => import("@/pages/AboutPage"));
const LegalPage = lazy(() => import("@/pages/LegalPage"));

export default function App() {
  return (
    <ErrorBoundary>
      <div className="flex min-h-screen flex-col bg-surface-base text-primary">
        <SkipToContent />
        <Navbar />
        <div id="scalable-content" className="flex flex-1 flex-col">
          <HeroBanner />
          <main id="main-content" className="flex-1 px-6 py-10 md:px-12">
            <Suspense fallback={<LoadingSpinner />}>
              <Routes>
                <Route path="/" element={<ContentPage />} />
                <Route path="/models" element={<ModelsPage />} />
                <Route path="/store" element={<StorePage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/legal" element={<LegalPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </main>
          <Footer />
        </div>
        <Sidebar />
      </div>
    </ErrorBoundary>
  );
}
