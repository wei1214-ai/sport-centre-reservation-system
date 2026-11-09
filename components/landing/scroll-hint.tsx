"use client";

import { ArrowDown } from "lucide-react";
import * as React from "react";

/**
 * Floating scroll hint. Floats above the page (does not take layout space)
 * and hides once the user reaches the bottom of the page.
 */
export function ScrollHint() {
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    const update = () => {
      const doc = document.documentElement;
      const remaining = doc.scrollHeight - (window.scrollY + window.innerHeight);
      setVisible(remaining > 120);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <button
        type="button"
        aria-label="Scroll down"
        aria-hidden={!visible}
        tabIndex={visible ? 0 : -1}
        onClick={() =>
          window.scrollBy({ top: window.innerHeight * 0.85, behavior: "smooth" })
        }
        className={`animate-float pointer-events-auto inline-flex size-11 items-center justify-center rounded-full border border-white/70 bg-white/60 text-ink/60 shadow-[0_8px_24px_rgba(12,12,13,0.12)] backdrop-blur-md transition-colors hover:bg-white/85 hover:text-ink ${
          visible ? "" : "pointer-events-none"
        }`}
      >
        <ArrowDown className="size-4" />
      </button>
    </div>
  );
}
