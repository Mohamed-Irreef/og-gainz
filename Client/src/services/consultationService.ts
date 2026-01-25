import type { ConsultationLead } from '@/types';
import { apiJson, apiJsonNoCache } from './apiClient';

type ApiSuccess<T> = { status: 'success'; data: T; message?: string };
type ApiError = { status: 'error'; message?: string };

type SubmitConsultationResponse = ApiSuccess<{ id: string; isRead: boolean; createdAt: string }> | ApiError;

type AdminConsultation = {
  id: string;
  userId?: string;
  fullName: string;
  whatsappNumber: string;
  fitnessGoal: string;
  workRoutine: string;
  foodPreference: 'VEG' | 'NON_VEG' | 'EGGETARIAN';
  notes?: string;
  isRead: boolean;
  readAt?: string;
  readBy?: string;
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  createdAt: string;
  updatedAt: string;
};

type AdminListConsultationsResponse =
  | ApiSuccess<{ items: AdminConsultation[]; meta: { page: number; limit: number; total: number; hasNextPage: boolean } }>
  | ApiError;

type AdminGetConsultationResponse = ApiSuccess<AdminConsultation> | ApiError;
type AdminUnreadCountResponse = ApiSuccess<{ unread: number }> | ApiError;

const safeString = (v: unknown) => String(v || '').trim();

const mapFoodPreferenceToApi = (value: string): 'VEG' | 'NON_VEG' | 'EGGETARIAN' => {
  const v = safeString(value).toLowerCase();
  if (v === 'veg' || v === 'vegetarian') return 'VEG';
  if (v === 'non_veg' || v === 'non-veg' || v === 'non veg' || v === 'nonvegetarian' || v === 'non vegetarian') return 'NON_VEG';
  if (v === 'eggetarian' || v === 'egg') return 'EGGETARIAN';
  // Allow API-style input too
  if (v === 'non_veg'.toLowerCase()) return 'NON_VEG';
  if (v === 'non_veg') return 'NON_VEG';
  throw new Error('Invalid food preference');
};

const mapFoodPreferenceFromApi = (value: string) => {
  const v = safeString(value).toUpperCase();
  if (v === 'VEG') return 'veg';
  if (v === 'NON_VEG') return 'non_veg';
  if (v === 'EGGETARIAN') return 'eggetarian';
  return safeString(value).toLowerCase();
};

const toLead = (c: AdminConsultation): ConsultationLead => {
  return {
    id: safeString(c.id),
    name: safeString(c.fullName),
    phone: safeString(c.whatsappNumber),
    fitnessGoal: c.fitnessGoal as ConsultationLead['fitnessGoal'],
    workRoutine: c.workRoutine as ConsultationLead['workRoutine'],
    foodPreferences: mapFoodPreferenceFromApi(c.foodPreference),
    additionalNotes: c.notes,
    isContacted: Boolean(c.isRead),
    contactedAt: c.readAt,
    createdAt: c.createdAt,
  };
};

export const consultationService = {
  // Submit consultation request (user)
  async submitConsultation(data: Omit<ConsultationLead, 'id' | 'isContacted' | 'createdAt'>): Promise<ConsultationLead> {
    const payload = {
      fullName: safeString(data.name),
      whatsappNumber: safeString(data.phone),
      fitnessGoal: safeString(data.fitnessGoal),
      workRoutine: safeString(data.workRoutine),
      foodPreference: mapFoodPreferenceToApi(String(data.foodPreferences || '')),
      notes: safeString(data.additionalNotes) || undefined,
    };

    const res = await apiJson<SubmitConsultationResponse>('/consultations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (res.status !== 'success') throw new Error(res.message || 'Failed to submit consultation');

    return {
      id: res.data.id,
      name: payload.fullName,
      phone: payload.whatsappNumber,
      fitnessGoal: data.fitnessGoal,
      workRoutine: data.workRoutine,
      foodPreferences: data.foodPreferences,
      additionalNotes: data.additionalNotes,
      isContacted: false,
      createdAt: res.data.createdAt,
    };
  },

  // Get all consultations (admin)
  async getLeads(): Promise<ConsultationLead[]> {
    const res = await apiJsonNoCache<AdminListConsultationsResponse>('/admin/consultations?status=all&limit=200', {
      method: 'GET',
    });
    if (res.status !== 'success') throw new Error(res.message || 'Failed to load consultations');
    return (res.data.items || []).map(toLead);
  },

  // Get consultation by id (admin)
  async getLeadById(leadId: string): Promise<ConsultationLead | null> {
    const id = safeString(leadId);
    if (!id) return null;
    const res = await apiJsonNoCache<AdminGetConsultationResponse>(`/admin/consultations/${encodeURIComponent(id)}`, {
      method: 'GET',
    });
    if (res.status !== 'success') throw new Error(res.message || 'Failed to load consultation');
    return toLead(res.data);
  },

  // Mark consultation as read (admin)
  async markAsContacted(leadId: string): Promise<ConsultationLead | null> {
    const id = safeString(leadId);
    if (!id) return null;
    const res = await apiJson<AdminGetConsultationResponse>(`/admin/consultations/${encodeURIComponent(id)}/read`, {
      method: 'PATCH',
    });
    if (res.status !== 'success') throw new Error(res.message || 'Failed to mark as read');
    return toLead(res.data);
  },

  async getUnreadCount(): Promise<number> {
    const res = await apiJsonNoCache<AdminUnreadCountResponse>('/admin/consultations/unread-count', { method: 'GET' });
    if (res.status !== 'success') throw new Error(res.message || 'Failed to load unread count');
    return Number(res.data.unread || 0);
  },

  async archive(leadId: string): Promise<ConsultationLead | null> {
    const id = safeString(leadId);
    if (!id) return null;
    const res = await apiJson<AdminGetConsultationResponse>(`/admin/consultations/${encodeURIComponent(id)}/archive`, {
      method: 'PATCH',
    });
    if (res.status !== 'success') throw new Error(res.message || 'Failed to archive consultation');
    return toLead(res.data);
  },

  async unarchive(leadId: string): Promise<ConsultationLead | null> {
    const id = safeString(leadId);
    if (!id) return null;
    const res = await apiJson<AdminGetConsultationResponse>(`/admin/consultations/${encodeURIComponent(id)}/unarchive`, {
      method: 'PATCH',
    });
    if (res.status !== 'success') throw new Error(res.message || 'Failed to unarchive consultation');
    return toLead(res.data);
  },

  // Get fitness goal display text
  getFitnessGoalDisplay(goal: ConsultationLead['fitnessGoal']): string {
    const goals = {
      weight_loss: 'Weight Loss',
      muscle_gain: 'Muscle Gain',
      maintenance: 'Maintenance',
      athletic_performance: 'Athletic Performance',
      general_health: 'General Health',
    };
    return goals[goal];
  },

  // Get work routine display text
  getWorkRoutineDisplay(routine: ConsultationLead['workRoutine']): string {
    const routines = {
      sedentary: 'Sedentary (Desk job, minimal activity)',
      light_activity: 'Light Activity (Walking, light exercise)',
      moderate_activity: 'Moderate Activity (Regular exercise 3-4x/week)',
      very_active: 'Very Active (Daily intense exercise)',
      extremely_active: 'Extremely Active (Athlete-level training)',
    };
    return routines[routine];
  },

  // Get all fitness goal options
  getFitnessGoalOptions(): { value: ConsultationLead['fitnessGoal']; label: string }[] {
    return [
      { value: 'weight_loss', label: 'Weight Loss' },
      { value: 'muscle_gain', label: 'Muscle Gain' },
      { value: 'maintenance', label: 'Maintenance' },
      { value: 'athletic_performance', label: 'Athletic Performance' },
      { value: 'general_health', label: 'General Health' },
    ];
  },

  // Get all work routine options
  getWorkRoutineOptions(): { value: ConsultationLead['workRoutine']; label: string }[] {
    return [
      { value: 'sedentary', label: 'Sedentary (Desk job)' },
      { value: 'light_activity', label: 'Light Activity' },
      { value: 'moderate_activity', label: 'Moderate Activity' },
      { value: 'very_active', label: 'Very Active' },
      { value: 'extremely_active', label: 'Extremely Active' },
    ];
  },
};
