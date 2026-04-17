const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export interface NearbyDoctor {
  doctor_profile_id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  specialty: { id: string; name: string; slug: string };
  clinic: { id: string; name: string; logo_url: string | null };
  branch: { id: string; name: string; address: string; phone: string };
  distance_m: number | null;
  is_available: boolean;
  is_verified?: boolean;
  next_available_slot: string | null;
  consultation_fee: number | null;
  years_experience: number;
  bio: string | null;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers,
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(
        data.message || 'Error en la solicitud',
        response.status,
        data.errors
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError('Error de conexión. Verifica tu red.', 0);
  }
}

export const authApi = {
  async login(credentials: { email: string; password: string }) {
    return request<{
      status: string;
      message: string;
      data: {
        user: any;
        token: string;
        role: string;
      };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  async register(data: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    cedula: string;
    phone?: string;
  }) {
    return request<{
      status: string;
      message: string;
      data: {
        user: any;
        token: string;
        role: string;
      };
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async logout(token: string) {
    return request<{ status: string; message: string }>('/auth/logout', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  async getProfile(token: string) {
    return request<{
      status: string;
      data: any;
    }>('/user', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};

export interface VitalSign {
  id: string;
  recorded_at: string;
  weight_kg: number | null;
  height_cm: number | null;
  blood_pressure: string | null;
  heart_rate_bpm: number | null;
  temperature_c: number | null;
  oxygen_saturation: number | null;
}

export interface MedicalRecordFile {
  id: string;
  medical_record_id: string;
  file_name: string;
  mime_type: string;
  file_size_bytes: number;
  category: 'lab' | 'ultrasound' | 'prescription' | 'other';
}

export interface MedicalRecord {
  id: string;
  patient_id: string;
  doctor_id: string;
  clinic_id: string | null;
  appointment_id: string | null;
  specialty_id: string | null;
  title: string;
  notes: string | null;
  diagnosis: string | null;
  specialty_context: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  doctor: { id: string; name: string; email: string } | null;
  patient: { id: string; name: string; email: string } | null;
  specialty: { id: string; name: string; slug: string } | null;
  vital_signs?: VitalSign[];
  files?: MedicalRecordFile[];
}

export const medicalApi = {
  async list(token: string) {
    return request<{ status: string; data: MedicalRecord[] }>('/medical-records', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  async show(token: string, id: string) {
    return request<{ status: string; data: MedicalRecord }>(`/medical-records/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  async getSignedUrl(token: string, recordId: string, fileId: string) {
    return request<{ status: string; data: { url: string; expires_in: number } }>(
      `/medical-records/${recordId}/files/${fileId}/signed-url`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
  },
};

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  clinic_id: string | null;
  branch_id: string | null;
  slot_id: string | null;
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  scheduled_at: string;
  duration_minutes: number | null;
  consultation_fee: number | null;
  patient_notes: string | null;
  doctor_notes: string | null;
  cancelled_at: string | null;
  confirmed_at: string | null;
  completed_at: string | null;
  cancellation_reason: string | null;
  doctor: { id: string; name: string; avatar_url: string | null } | null;
  patient: { id: string; name: string; avatar_url: string | null } | null;
  clinic: { id: string; name: string; logo_url: string | null } | null;
  branch: { id: string; name: string; address: string } | null;
}

export interface ChatMessage {
  id: string;
  relationship_id: string;
  sender_id: string;
  sender: { id: string; name: string; avatar_url: string | null } | null;
  content: string;
  type: string;
  read_at: string | null;
  created_at: string;
}

export interface Conversation {
  relationship_id: string;
  other_party: { id: string; name: string; avatar_url: string | null };
  last_message: ChatMessage | null;
  unread_count: number;
}

export const appointmentApi = {
  async list(token: string, status?: string) {
    const q = status ? `?status=${status}` : '';
    return request<{ status: string; data: Appointment[] }>(`/appointments${q}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  async cancel(token: string, id: string, reason?: string) {
    return request<{ status: string; data: Appointment }>(`/appointments/${id}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reason: reason ?? null }),
    });
  },
  async confirm(token: string, id: string) {
    return request<{ status: string; data: Appointment }>(`/appointments/${id}/confirm`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  async complete(token: string, id: string, notes?: string) {
    return request<{ status: string; data: Appointment }>(`/appointments/${id}/complete`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ notes: notes ?? null }),
    });
  },
  async noShow(token: string, id: string) {
    return request<{ status: string; data: Appointment }>(`/appointments/${id}/no-show`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

export const chatApi = {
  async conversations(token: string) {
    return request<{ status: string; data: Conversation[] }>('/chat', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  async messages(token: string, relationshipId: string, limit = 50, beforeId?: string) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (beforeId) params.set('before_id', beforeId);
    return request<{ status: string; data: ChatMessage[] }>(
      `/chat/${relationshipId}/messages?${params}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
  },
  async send(token: string, relationshipId: string, content: string) {
    return request<{ status: string; data: ChatMessage }>(`/chat/${relationshipId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ content, type: 'text' }),
    });
  },
  async markRead(token: string, relationshipId: string) {
    return request<{ status: string; data: { updated: number } }>(`/chat/${relationshipId}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

export const directoryApi = {
  async listDoctors(params?: { search?: string; specialty_id?: string; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.specialty_id) query.set('specialty_id', params.specialty_id);
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return request<{
      status: string;
      data: { doctors: NearbyDoctor[]; meta: { count: number } };
    }>(`/doctors${qs ? `?${qs}` : ''}`);
  },
  async nearbyDoctors(params: {
    lat: number;
    lng: number;
    radius_m?: number;
    specialty_id?: string;
    limit?: number;
  }) {
    const query = new URLSearchParams({
      lat: String(params.lat),
      lng: String(params.lng),
      ...(params.radius_m ? { radius_m: String(params.radius_m) } : {}),
      ...(params.specialty_id ? { specialty_id: params.specialty_id } : {}),
      ...(params.limit ? { limit: String(params.limit) } : {}),
    });
    return request<{
      status: string;
      data: { doctors: NearbyDoctor[]; meta: { count: number; lat: number; lng: number; radius_m: number } };
    }>(`/doctors/nearby?${query}`);
  },
};
