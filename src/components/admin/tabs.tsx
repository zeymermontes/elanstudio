"use client";

import { useState, type ReactNode } from "react";

/**
 * Simple client-side tabs. Each tab's content is rendered on the server and
 * passed in as a node; inactive panels stay mounted (hidden) so form state and
 * scroll position are preserved when switching.
 */
export function Tabs({
  tabs,
}: {
  tabs: { key: string; label: string; content: ReactNode }[];
}) {
  const [active, setActive] = useState(tabs[0]?.key);

  return (
    <div>
      <div className="mb-8 flex gap-5 overflow-x-auto border-b border-line">
        {tabs.map((t) => {
          const on = t.key === active;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              className={`-mb-px shrink-0 whitespace-nowrap border-b-2 pb-3 text-sm uppercase tracking-[0.12em] transition-colors ${
                on
                  ? "border-pink text-pink-strong"
                  : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tabs.map((t) => (
        <div key={t.key} hidden={t.key !== active}>
          {t.content}
        </div>
      ))}
    </div>
  );
}
