/**
 * Seed / sample content (Spanish). Used as the fallback dataset when Supabase
 * is not configured, and as the source for the SQL seed in the migration.
 * Keeping it here lets every page render with realistic data before the
 * backend is wired up.
 */
import type {
  Service,
  ClassType,
  Coach,
  Location,
  Package,
  ClassSession,
} from "./types";

export const services: Service[] = [
  {
    id: "svc-reformer",
    name: "Reformer",
    slug: "reformer",
    description:
      "Entrenamiento en máquina reformer: fuerza, control y precisión con bajo impacto.",
    order: 1,
  },
  {
    id: "svc-barre",
    name: "Barre",
    slug: "barre",
    description:
      "Técnica inspirada en el ballet para tonificar, alargar y mejorar la postura.",
    order: 2,
  },
  {
    id: "svc-mat",
    name: "Mat & Flow",
    slug: "mat",
    description:
      "Movilidad, estiramiento y respiración consciente para todos los niveles.",
    order: 3,
  },
];

export const classTypes: ClassType[] = [
  {
    id: "ct-reformer-flow",
    serviceId: "svc-reformer",
    name: "Reformer Flow",
    description:
      "Secuencias fluidas en reformer que combinan fuerza y estiramiento.",
    durationMin: 50,
    level: "Todos los niveles",
    defaultCapacity: 8,
    imageUrl: null,
  },
  {
    id: "ct-reformer-sculpt",
    serviceId: "svc-reformer",
    name: "Reformer Sculpt",
    description: "Trabajo de tonificación profunda con resistencia progresiva.",
    durationMin: 50,
    level: "Intermedio",
    defaultCapacity: 8,
    imageUrl: null,
  },
  {
    id: "ct-barre-sculpt",
    serviceId: "svc-barre",
    name: "Barre Sculpt",
    description: "Movimientos isométricos de ballet para esculpir y alargar.",
    durationMin: 45,
    level: "Todos los niveles",
    defaultCapacity: 12,
    imageUrl: null,
  },
  {
    id: "ct-mat-flow",
    serviceId: "svc-mat",
    name: "Mat & Flow",
    description: "Trabajo de core, movilidad y respiración.",
    durationMin: 50,
    level: "Principiante",
    defaultCapacity: 14,
    imageUrl: null,
  },
];

export const coaches: Coach[] = [
  {
    id: "coach-valentina",
    name: "Valentina Ríos",
    role: "Fundadora · Reformer",
    bio: "Instructora certificada con más de 10 años guiando a mujeres hacia una práctica fuerte y consciente.",
    specialties: ["Reformer", "Rehabilitación", "Pre/Postnatal"],
    photoUrl: null,
    instagram: "valentina.elan",
  },
  {
    id: "coach-camila",
    name: "Camila Duarte",
    role: "Co-fundadora · Barre",
    bio: "Bailarina profesional convertida en coach. Su clase de Barre es pura elegancia y disciplina.",
    specialties: ["Barre", "Flexibilidad", "Postura"],
    photoUrl: null,
    instagram: "camila.elan",
  },
  {
    id: "coach-renata",
    name: "Renata Solís",
    role: "Coach · Mat & Flow",
    bio: "Especialista en movilidad y respiración. Acompaña a principiantes con calidez y paciencia.",
    specialties: ["Mat & Flow", "Movilidad", "Respiración"],
    photoUrl: null,
    instagram: "renata.elan",
  },
];

export const locations: Location[] = [
  {
    id: "loc-polanco",
    name: "ÉLANSTUDIO Polanco",
    address: "Av. Presidente Masaryk 123, Polanco",
    city: "Ciudad de México",
    hours: "Lun–Vie 6:00–21:00 · Sáb 8:00–14:00",
    mapUrl: null,
    imageUrl: null,
  },
  {
    id: "loc-condesa",
    name: "ÉLANSTUDIO Condesa",
    address: "Av. Ámsterdam 45, Hipódromo Condesa",
    city: "Ciudad de México",
    hours: "Lun–Vie 7:00–20:00 · Sáb 9:00–13:00",
    mapUrl: null,
    imageUrl: null,
  },
];

export const packages: Package[] = [
  {
    id: "pkg-drop-in",
    name: "Clase individual",
    description: "Una clase para probar tu primera experiencia ÉLAN.",
    credits: 1,
    priceMxn: 350,
    validityDays: 30,
    featured: false,
    active: true,
    recurring: false,
  },
  {
    id: "pkg-5",
    name: "Paquete 5 clases",
    description: "Cinco clases para empezar a crear tu rutina.",
    credits: 5,
    priceMxn: 1550,
    validityDays: 60,
    featured: false,
    active: true,
    recurring: false,
  },
  {
    id: "pkg-10",
    name: "Paquete 10 clases",
    description: "Diez clases con la mejor relación valor–constancia.",
    credits: 10,
    priceMxn: 2800,
    validityDays: 90,
    featured: true,
    active: true,
    recurring: false,
  },
  {
    id: "pkg-unlimited",
    name: "Mensualidad ilimitada",
    description: "Un mes de clases ilimitadas para vivir ÉLAN por completo.",
    credits: 999,
    priceMxn: 4200,
    validityDays: 30,
    featured: false,
    active: true,
    recurring: true,
  },
];

/**
 * Generate a week of upcoming sessions starting today. Built dynamically so the
 * schedule is always "current" in the seed/fallback dataset.
 */
export function generateUpcomingSessions(daysAhead = 7): ClassSession[] {
  const sessions: ClassSession[] = [];
  const now = new Date();

  // (classTypeId, coachId, locationId, hour) templates per weekday
  const templates: Array<[string, string, string, number]> = [
    ["ct-reformer-flow", "coach-valentina", "loc-polanco", 7],
    ["ct-barre-sculpt", "coach-camila", "loc-condesa", 9],
    ["ct-mat-flow", "coach-renata", "loc-polanco", 11],
    ["ct-reformer-sculpt", "coach-valentina", "loc-polanco", 18],
    ["ct-barre-sculpt", "coach-camila", "loc-condesa", 19],
  ];

  for (let d = 0; d < daysAhead; d++) {
    const day = new Date(now);
    day.setDate(now.getDate() + d);
    if (day.getDay() === 0) continue; // closed Sundays

    templates.forEach(([classTypeId, coachId, locationId, hour], i) => {
      // Skip evening slots on Saturday
      if (day.getDay() === 6 && hour >= 18) return;

      const ct = classTypes.find((c) => c.id === classTypeId)!;
      const starts = new Date(day);
      starts.setHours(hour, 0, 0, 0);
      const ends = new Date(starts);
      ends.setMinutes(ends.getMinutes() + ct.durationMin);

      const capacity = ct.defaultCapacity;
      // Deterministic pseudo-booking so "spots left" varies but is stable.
      const booked = (d * 3 + i * 5) % (capacity + 1);

      sessions.push({
        id: `sess-${d}-${i}`,
        classTypeId,
        coachId,
        locationId,
        startsAt: starts.toISOString(),
        endsAt: ends.toISOString(),
        capacity,
        booked,
        status: "scheduled",
      });
    });
  }

  return sessions;
}
