export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[9999] focus:rounded-md focus:bg-accent focus:px-4 focus:py-2 focus:text-white"
    >
      Skip to content
    </a>
  );
}
