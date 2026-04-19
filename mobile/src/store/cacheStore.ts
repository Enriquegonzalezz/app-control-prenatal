import { create } from 'zustand';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheSlot<T> {
  data: T;
  fetchedAt: number;
}

interface DoctorsMeta {
  currentPage: number;
  lastPage: number;
  total: number;
}

type CacheKey = 'conversations' | 'doctors' | 'appointments' | 'medicalRecords';

interface CacheState {
  conversations: CacheSlot<any[]> | null;
  doctors: CacheSlot<any[]> | null;
  doctorsMeta: DoctorsMeta | null;
  appointments: CacheSlot<any[]> | null;
  medicalRecords: CacheSlot<any[]> | null;

  setConversations: (data: any[]) => void;
  setDoctors: (data: any[], meta: DoctorsMeta) => void;
  appendDoctors: (data: any[], meta: DoctorsMeta) => void;
  setAppointments: (data: any[]) => void;
  setMedicalRecords: (data: any[]) => void;
  isStale: (key: CacheKey, ttlMs?: number) => boolean;
  invalidate: (key?: CacheKey) => void;
}

export const useCacheStore = create<CacheState>((set, get) => ({
  conversations: null,
  doctors: null,
  doctorsMeta: null,
  appointments: null,
  medicalRecords: null,

  setConversations: (data) =>
    set({ conversations: { data, fetchedAt: Date.now() } }),

  setDoctors: (data, meta) =>
    set({ doctors: { data, fetchedAt: Date.now() }, doctorsMeta: meta }),

  appendDoctors: (data, meta) =>
    set((s) => ({
      doctors: { data: [...(s.doctors?.data ?? []), ...data], fetchedAt: s.doctors?.fetchedAt ?? Date.now() },
      doctorsMeta: meta,
    })),

  setAppointments: (data) =>
    set({ appointments: { data, fetchedAt: Date.now() } }),

  setMedicalRecords: (data) =>
    set({ medicalRecords: { data, fetchedAt: Date.now() } }),

  isStale: (key, ttlMs = CACHE_TTL) => {
    const entry = get()[key];
    if (!entry) return true;
    return Date.now() - (entry as CacheSlot<any>).fetchedAt > ttlMs;
  },

  invalidate: (key) => {
    if (key) {
      if (key === 'doctors') {
        set({ doctors: null, doctorsMeta: null });
      } else {
        set({ [key]: null } as any);
      }
    } else {
      set({ conversations: null, doctors: null, doctorsMeta: null, appointments: null, medicalRecords: null });
    }
  },
}));
