import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * Move focus to `#main-content` whenever the route pathname changes.
 *
 * Skips the initial mount to avoid stealing focus on first page load.
 * The element receives `tabindex="-1"` so it can accept programmatic
 * focus without appearing in the normal tab order.
 *
 * @see https://github.com/ancillarypower/official-site/issues/149
 */
export function useFocusOnNavigate(): void {
  const { pathname } = useLocation();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const main = document.getElementById("main-content");
    if (main) {
      main.setAttribute("tabindex", "-1");
      main.focus({ preventScroll: true });
    }
  }, [pathname]);
}
