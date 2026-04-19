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

// ── Medical Records — catalog types ────────────────────────────────────

export interface RecordSubcategory {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  sort_order: number;
}

export interface RecordCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  sort_order: number;
  subcategories: RecordSubcategory[];
}

export interface RecordTag {
  id: string;
  name: string;
  color: string | null;
}

export interface RecordDoctor {
  id: string;
  name: string;
  avatar_url: string | null;
}

export interface MedicalRecordCatalog {
  categories: RecordCategory[];
  tags: RecordTag[];
  doctors: RecordDoctor[];
}

export interface MedicalRecordFilters {
  patient_id?: string;
  category_id?: string;
  subcategory_id?: string;
  tag_ids?: string[];
  date_from?: string;
  date_to?: string;
  doctor_id?: string;
  has_appointment?: 0 | 1;
  visibility?: 'shared' | 'private';
  uploaded_by_me?: 1;
}

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
  doctor_id: string | null;
  clinic_id: string | null;
  appointment_id: string | null;
  specialty_id: string | null;
  // Legacy doctor-note fields
  title: string | null;
  notes: string | null;
  diagnosis: string | null;
  specialty_context: Record<string, unknown> | null;
  // Document-upload fields
  uploader_id: string | null;
  uploader_role: 'patient' | 'doctor' | null;
  category_id: string | null;
  subcategory_id: string | null;
  document_date: string | null;
  description: string | null;
  visibility: 'shared' | 'private';
  storage_path: string | null;
  file_type: string | null;
  file_size_kb: number | null;
  // Computed
  display_title: string;
  created_at: string;
  updated_at: string;
  // Relations
  doctor: { id: string; name: string; avatar_url: string | null } | null;
  patient: { id: string; name: string } | null;
  category: { id: string; name: string; slug: string; icon: string | null; color: string | null } | null;
  subcategory: { id: string; name: string; slug: string } | null;
  tags?: RecordTag[];
  vital_signs?: VitalSign[];
  files?: MedicalRecordFile[];
}

async function requestMultipart<T>(
  endpoint: string,
  token: string,
  formData: FormData,
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        // Do NOT set Content-Type — fetch sets it with boundary automatically for FormData
      },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) {
      throw new ApiError(data.message || 'Error en la solicitud', response.status, data.errors);
    }
    return data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('Error de conexión. Verifica tu red.', 0);
  }
}

export interface UploadDocumentPayload {
  patient_id: string;
  category_id: string;
  subcategory_id: string;
  document_date: string;   // YYYY-MM-DD
  description: string;
  visibility: 'shared' | 'private';
  /** URI from expo-document-picker or expo-image-picker */
  fileUri: string;
  fileName: string;
  fileMimeType: string;
  tag_ids?: string[];
  appointment_id?: string;
  doctor_id?: string;
}

export const medicalApi = {
  async list(token: string, filters?: MedicalRecordFilters) {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v === undefined || v === null) return;
        if (Array.isArray(v)) {
          v.forEach((item) => params.append(`${k}[]`, item));
        } else {
          params.set(k, String(v));
        }
      });
    }
    const qs = params.toString();
    return request<{ status: string; data: MedicalRecord[] }>(
      `/medical-records${qs ? `?${qs}` : ''}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  },

  async show(token: string, id: string) {
    return request<{ status: string; data: MedicalRecord }>(`/medical-records/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async catalog(token: string) {
    return request<{ status: string; data: MedicalRecordCatalog }>('/medical-records/catalog', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  async uploadDocument(token: string, payload: UploadDocumentPayload) {
    const formData = new FormData();
    formData.append('patient_id', payload.patient_id);
    formData.append('category_id', payload.category_id);
    formData.append('subcategory_id', payload.subcategory_id);
    formData.append('document_date', payload.document_date);
    formData.append('description', payload.description);
    formData.append('visibility', payload.visibility);
    formData.append('file', {
      uri: payload.fileUri,
      name: payload.fileName,
      type: payload.fileMimeType,
    } as any);
    payload.tag_ids?.forEach((id) => formData.append('tag_ids[]', id));
    if (payload.appointment_id) formData.append('appointment_id', payload.appointment_id);
    if (payload.doctor_id) formData.append('doctor_id', payload.doctor_id);

    return requestMultipart<{ status: string; data: MedicalRecord }>(
      '/medical-records/upload',
      token,
      formData,
    );
  },

  async getDocumentSignedUrl(token: string, recordId: string) {
    return request<{ status: string; data: { url: string } }>(
      `/medical-records/${recordId}/signed-url`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
  },

  async getSignedUrl(token: string, recordId: string, fileId: string) {
    return request<{ status: string; data: { url: string; expires_in: number } }>(
      `/medical-records/${recordId}/files/${fileId}/signed-url`,
      { headers: { Authorization: `Bearer ${token}` } },
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

export interface Slot {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  branch_id: string;
}

export const appointmentApi = {
  async availableSlots(token: string, doctorProfileId: string, days = 30) {
    return request<{ status: string; data: Slot[] }>(
      `/appointments/slots?doctor_profile_id=${doctorProfileId}&days=${days}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
  },
  async book(token: string, payload: { slot_id: string; patient_notes?: string }) {
    return request<{ status: string; data: Appointment }>('/appointments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
  },
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
  async reschedule(token: string, id: string, newSlotId: string) {
    return request<{ status: string; data: Appointment }>(`/appointments/${id}/reschedule`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ new_slot_id: newSlotId }),
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
  async findRelationship(token: string, userId: string) {
    return request<{
      status: string;
      data: { relationship_id: string; other_party: { id: string; name: string; avatar_url: string | null } } | null;
    }>(`/chat/with/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  async startConversation(token: string, userId: string) {
    return request<{
      status: string;
      data: { relationship_id: string; other_party: { id: string; name: string; avatar_url: string | null } };
    }>(`/chat/with/${userId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

export const directoryApi = {
  async listDoctors(params?: { search?: string; specialty_id?: string; per_page?: number; page?: number }) {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.specialty_id) query.set('specialty_id', params.specialty_id);
    if (params?.per_page) query.set('per_page', String(params.per_page));
    if (params?.page) query.set('page', String(params.page));
    const qs = query.toString();
    return request<{
      status: string;
      data: {
        doctors: NearbyDoctor[];
        pagination: {
          current_page: number;
          per_page: number;
          total: number;
          last_page: number;
          from: number | null;
          to: number | null;
        };
      };
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

export interface DoctorClinicInfo {
  clinic_id: string;
  clinic_name: string;
  branch_id: string;
  branch_name: string;
  address: string;
}

export interface DoctorOffice {
  id: string;
  doctor_id: string;
  name: string;
  type: 'office' | 'home';
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Schedule {
  id: string;
  doctor_id: string;
  branch_id: string | null;
  office_id: string | null;
  day_of_week: string;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  is_active: boolean;
  created_at: string;
  branch?: { id: string; name: string; clinic_id: string } | null;
  office?: { id: string; name: string; type: string; address: string | null; city: string | null } | null;
}

export const officeApi = {
  async list(token: string) {
    return request<{ status: string; data: DoctorOffice[] }>('/doctor/offices', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  async create(token: string, payload: {
    name: string;
    type: 'office' | 'home';
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    phone?: string;
  }) {
    return request<{ status: string; data: DoctorOffice }>('/doctor/offices', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
  },
  async remove(token: string, officeId: string) {
    return request<{ status: string; data: null }>(`/doctor/offices/${officeId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

export const scheduleApi = {
  async clinicInfo(token: string) {
    return request<{ status: string; data: DoctorClinicInfo[] }>('/doctor/clinic-info', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  async list(token: string) {
    return request<{ status: string; data: Schedule[] }>('/doctor/schedules', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  async create(token: string, payload: {
    branch_id?: string | null;
    office_id?: string | null;
    day_of_week: string;
    start_time: string;
    end_time: string;
    slot_duration_minutes?: number;
  }) {
    return request<{ status: string; data: Schedule }>('/doctor/schedules', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
  },
  async remove(token: string, scheduleId: string) {
    return request<{ status: string; data: null }>(`/doctor/schedules/${scheduleId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  },
  async generateSlots(token: string, scheduleId: string, from: string, until: string) {
    return request<{ status: string; data: { generated: number } }>(
      `/doctor/schedules/${scheduleId}/generate-slots`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ from, until }),
      }
    );
  },
  async listSlots(token: string) {
    return request<{ status: string; data: Slot[] }>('/doctor/slots', {
      headers: { Authorization: `Bearer ${token}` },
    });
  },
};

export const passwordApi = {
  async requestReset(email: string) {
    return request<{ status: string; message: string; data?: { email: string; debug_code?: string } }>(
      '/password/forgot',
      {
        method: 'POST',
        body: JSON.stringify({ email }),
      }
    );
  },
  async resetPassword(email: string, code: string, password: string, password_confirmation: string) {
    return request<{ status: string; message: string }>(
      '/password/reset',
      {
        method: 'POST',
        body: JSON.stringify({ email, code, password, password_confirmation }),
      }
    );
  },
};
