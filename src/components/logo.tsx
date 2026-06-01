import Link from "next/link";
import { defaultSettings } from "@/lib/site";

/**
 * Wordmark logo. Renders the configurable studio name as an elegant serif
 * wordmark with a gold hairline tagline. If the client provides the silhouette
 * logo image, drop it at /public/logo.png and swap the wordmark for <Image>.
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
      className={`group inline-flex flex-col items-center leading-none ${className}`}
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
