/**
 * Domain types for ÉLANSTUDIO. These mirror the Supabase schema
 * (see supabase/migrations/0001_init.sql).
 */

export type Service = {
  id: string;
  name: string;
  slug: string;
  description: string;
  order: number;
};

export type ClassType = {
  id: string;
  serviceId: string;
  name: string;
  description: string;
  durationMin: number;
  level: "Principiante" | "Intermedio" | "Avanzado" | "Todos los niveles";
  defaultCapacity: number;
  imageUrl: string | null;
};

export type Coach = {
  id: string;
  name: string;
  role: string;
  bio: string;
  specialties: string[];
  photoUrl: string | null;
  instagram: string | null;
};

export type Location = {
  id: string;
  name: string;
  address: string;
  city: string;
  hours: string;
  mapUrl: string | null;
};

export type Package = {
  id: string;
  name: string;
  description: string;
  credits: number; // number of classes
  priceMxn: number; // price in MXN
  validityDays: number;
  featured: boolean;
  active: boolean;
};

export type ClassSession = {
  id: string;
  classTypeId: string;
  coachId: string;
  locationId: string;
  startsAt: string; // ISO
  endsAt: string; // ISO
  capacity: number;
  booked: number; // confirmed reservations
  status: "scheduled" | "cancelled";
};

/** A schedule session enriched with its related entities for display. */
export type SessionView = ClassSession & {
  classType: ClassType;
  coach: Coach;
  location: Location;
  spotsLeft: number;
};
