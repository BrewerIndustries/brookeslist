export type Role = 'viewer' | 'editor' | 'admin';

export interface User {
  id: string;
  email: string;
  role: Role;
  display_name: string | null;
}

export interface Profile {
  id: string;
  name: string;
  birthday: string | null;
  sign: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  body_type: string | null;
  rating: number;
  notes: string | null;
  extra: Record<string, string>;
  created_at: number;
  updated_at: number;
}

export type Units = 'us' | 'metric';

export interface AppConfig {
  units: Units;
  body_types: string[];
  stat_presets: string[];
  rating_half_steps: boolean;
}

export const DEFAULT_CONFIG: AppConfig = {
  units: 'us',
  body_types: ['Slim', 'Athletic', 'Average', 'Curvy', 'Muscular', 'Plus-size', 'Petite', 'Tall'],
  stat_presets: ['Eyes', 'Hair', 'How we met', 'Occupation', 'Location'],
  rating_half_steps: true,
};

export interface ProfileCard extends Profile {
  photo_key: string | null;
}

export interface Photo {
  id: string;
  r2_key: string;
  content_type: string | null;
  sort_order: number;
  created_at: number;
}

export interface DateLog {
  id: string;
  profile_id: string;
  occurred_on: string | null;
  title: string | null;
  location: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: number;
}

export interface ProfileDetail {
  profile: Profile;
  photos: Photo[];
  dates: DateLog[];
}
