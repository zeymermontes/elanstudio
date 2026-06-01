import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Sparkles, HeartHandshake, Flower2 } from "lucide-react";
import { defaultSettings as s } from "@/lib/site";

const featuredClasses = [
  {
    name: "Reformer Pilates",
    desc: "Fuerza y control en máquina reformer. Tonifica con elegancia.",
    duration: "50 min",
  },
  {
    name: "Barre Sculpt",
    desc: "Inspirado en el ballet. Postura, equilibrio y líneas largas.",
    duration: "45 min",
  },
  {
    name: "Mat & Flow",
    desc: "Pilates en colchoneta y movilidad consciente para todos los niveles.",
    duration: "50 min",
  },
];

const values = [
  {
    icon: Sparkles,
    title: "Boutique & íntimo",
    desc: "Grupos reducidos y atención personalizada en cada sesión.",
  },
  {
    icon: HeartHandshake,
    title: "Diseñado para ti",
    desc: "Programas para todos los niveles, de principiante a avanzado.",
  },
  {
    icon: Flower2,
    title: "Un espacio sereno",
    desc: "Ambiente sobrio y luminoso, pensado para tu bienestar.",
  },
];

export default function Home() {
  return (
    <>
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-5 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <div className="mx-auto max-w-3xl text-center">
            <p className="mb-5 text-[0.7rem] uppercase tracking-luxe text-gold">
              Estudio boutique · Fitness & Pilates
            </p>
            <Image
              src="/logo.png"
              alt={s.studioName}
              width={540}
              height={434}
              priority
              className="mx-auto mb-6 h-auto w-72 sm:w-96"
            />
            <p className="mx-auto max-w-xl text-base leading-relaxed text-ink-soft text-balance">
              Bienvenida a {s.studioName}. Un espacio sereno donde la fuerza se
              encuentra con la elegancia. Reserva tu clase, elige tu paquete y
              déjate guiar.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/horarios"
                className="inline-flex items-center gap-2 rounded-full bg-pink px-8 py-3.5 text-sm uppercase tracking-[0.18em] text-white shadow-soft transition-colors hover:bg-pink-strong"
              >
                Reservar clase <ArrowRight size={16} strokeWidth={1.5} />
              </Link>
              <Link
                href="/paquetes"
                className="inline-flex items-center gap-2 rounded-full border border-gold/50 px-8 py-3.5 text-sm uppercase tracking-[0.18em] text-ink transition-colors hover:border-gold hover:text-pink-strong"
              >
                Ver paquetes
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Values ---------- */}
      <section className="mx-auto max-w-6xl px-5 py-6">
        <div className="grid gap-6 md:grid-cols-3">
          {values.map((v) => (
            <div
              key={v.title}
              className="surface-card rounded-2xl px-7 py-8 text-center shadow-soft"
            >
              <v.icon
                size={28}
                strokeWidth={1.25}
                className="mx-auto text-pink"
              />
              <h3 className="mt-4 font-serif text-2xl text-ink">{v.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                {v.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Featured classes ---------- */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <div className="mb-12 text-center">
          <p className="mb-3 text-[0.7rem] uppercase tracking-luxe text-gold">
            Nuestras clases
          </p>
          <h2 className="font-serif text-4xl font-light text-ink sm:text-5xl">
            Encuentra tu ritmo
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {featuredClasses.map((c) => (
            <article
              key={c.name}
              className="group surface-card overflow-hidden rounded-2xl shadow-soft"
            >
              <div className="flex h-44 items-center justify-center bg-gradient-to-br from-pink-soft to-cream">
                <span className="font-serif text-3xl text-pink-strong/70 italic">
                  {c.name.split(" ")[0]}
                </span>
              </div>
              <div className="px-6 py-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-2xl text-ink">{c.name}</h3>
                  <span className="text-[0.7rem] uppercase tracking-[0.15em] text-gold">
                    {c.duration}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                  {c.desc}
                </p>
              </div>
            </article>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            href="/clases"
            className="inline-flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-pink-strong transition-colors hover:text-ink"
          >
            Ver todas las clases <ArrowRight size={16} strokeWidth={1.5} />
          </Link>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="mx-auto max-w-6xl px-5 pb-8">
        <div className="surface-card relative overflow-hidden rounded-3xl px-8 py-16 text-center shadow-soft">
          <p className="mb-3 text-[0.7rem] uppercase tracking-luxe text-gold">
            Primera vez
          </p>
          <h2 className="font-serif text-4xl font-light text-ink sm:text-5xl text-balance">
            Tu primera clase te está esperando
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-ink-soft">
            Crea tu cuenta, compra un paquete y reserva tu lugar en segundos.
          </p>
          <Link
            href="/registro"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-pink px-8 py-3.5 text-sm uppercase tracking-[0.18em] text-white shadow-soft transition-colors hover:bg-pink-strong"
          >
            Crear mi cuenta <ArrowRight size={16} strokeWidth={1.5} />
          </Link>
        </div>
      </section>
    </>
  );
}
