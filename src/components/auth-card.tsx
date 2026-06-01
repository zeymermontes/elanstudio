import { Logo } from "@/components/logo";

/** Centered card shell for the auth pages. */
export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-5 py-16">
      <div className="surface-card rounded-3xl px-8 py-10 shadow-soft">
        <div className="mb-8 text-center">
          <Logo className="!items-center" />
          <h1 className="mt-6 font-serif text-3xl text-ink">{title}</h1>
          {subtitle ? (
            <p className="mt-2 text-sm text-ink-soft">{subtitle}</p>
          ) : null}
          <div className="gold-rule mx-auto mt-5 w-20" />
        </div>
        {children}
      </div>
    </div>
  );
}
