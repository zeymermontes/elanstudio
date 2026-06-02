import Link from "next/link";
import { defaultSettings } from "@/lib/site";

/**
 * Brand logo: the isotipo (silhouette icon, /public/isotipo.png) followed by the
 * configurable wordmark. The full logo (/public/logo.png) is used on the hero.
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
      className={`group inline-flex items-center gap-2.5 leading-none ${className}`}
      aria-label={name}
    >
      <img
        src="/isotipo.png"
        alt=""
        width={340}
        height={300}
        className="h-9 w-auto sm:h-10"
      />
      <span className="flex flex-col">
        <span className="font-serif text-lg font-semibold tracking-[0.15em] text-pink-strong sm:text-xl">
          {name}
        </span>
        {tagline ? (
          <span className="mt-1 text-[0.55rem] uppercase tracking-luxe text-ink-soft">
            {tagline}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
