/** Shared page header: gold eyebrow, serif title, gold rule, optional intro. */
export function PageHeader({
  eyebrow,
  title,
  intro,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
}) {
  return (
    <header className="mx-auto max-w-2xl px-5 pt-16 pb-10 text-center sm:pt-20">
      {eyebrow ? (
        <p className="mb-3 text-[0.7rem] uppercase tracking-luxe text-gold">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="font-serif text-4xl font-light text-ink sm:text-6xl text-balance">
        {title}
      </h1>
      <div className="gold-rule mx-auto my-7 w-32" />
      {intro ? (
        <p className="text-base leading-relaxed text-ink-soft text-balance">
          {intro}
        </p>
      ) : null}
    </header>
  );
}
