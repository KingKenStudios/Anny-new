/** Canonical ANNY voice roles. Female is the primary conversational voice. */
export type AnnyVoiceRole = 'female' | 'male';

export interface AnnyVoiceProfile {
  id: 'anny-female' | 'anny-male';
  role: AnnyVoiceRole;
  label: string;
  description: string;
  primary: boolean;
  manualSpeaker: boolean;
}

export const ANNY_VOICE_PROFILES: Record<AnnyVoiceRole, AnnyVoiceProfile> = {
  female: {
    id: 'anny-female',
    role: 'female',
    label: 'Female ANNY',
    description: 'Primary voice for automatic conversational responses.',
    primary: true,
    manualSpeaker: false,
  },
  male: {
    id: 'anny-male',
    role: 'male',
    label: 'Male ANNY',
    description: 'Selectable ANNY voice for conversation and speaker playback when chosen by the user.',
    primary: false,
    manualSpeaker: true,
  },
};

export const DEFAULT_ANNY_VOICE_ROLE: AnnyVoiceRole = 'female';
export const ANNY_VOICE_STORAGE_KEY = 'anny_voice_role';
