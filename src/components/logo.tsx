import Link from "next/link";
import { defaultSettings } from "@/lib/site";

/**
 * Brand wordmark for the header/footer. The full logo image is used on the
 * homepage hero (see /public/logo.svg).
 */
export function Logo({
  name = defaultSettings.studioName,
  tagline,
  className = "",
}: {
  name?: string;
  tagline?: string;
  className?: string;
}) {
  return (
    <Link
      href="/"
      className={`group inline-flex flex-col leading-none ${className}`}
      aria-label={name}
    >
      <span className="font-serif text-2xl font-semibold tracking-[0.2em] text-pink-strong sm:text-[1.7rem]">
        {name}
      </span>
      {tagline ? (
        <span className="mt-1 text-[0.55rem] uppercase tracking-luxe text-ink-soft">
          {tagline}
        </span>
      ) : null}
    </Link>
  );
}
