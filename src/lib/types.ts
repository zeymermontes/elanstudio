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
  imageUrl: string | null;
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
  recurring: boolean; // true = monthly subscription, false = one-time credits
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

/** A recurring weekly class (the schedule template). */
export type WeeklyClass = {
  id: string;
  classTypeId: string;
  coachId: string | null;
  locationId: string | null;
  weekday: number; // 0 = Sunday … 6 = Saturday
  startTime: string; // 'HH:MM'
  durationMin: number;
  capacity: number;
  active: boolean;
};

/** How to book a slot: a concrete (materialized) session, or a virtual
 * template+date that gets materialized on booking. */
export type ScheduleRef =
  | { kind: "session"; sessionId: string }
  | { kind: "weekly"; weeklyId: string; date: string };

/** A computed schedule entry (from template or materialized session). */
export type ScheduleSlot = {
  ref: ScheduleRef;
  classType: ClassType;
  coach: Coach | null;
  location: Location | null;
  startsAt: string; // ISO
  endsAt: string; // ISO
  capacity: number;
  booked: number;
  spotsLeft: number;
};
