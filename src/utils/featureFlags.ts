// Feature flags configuration
export const FEATURE_FLAGS = {
  VISUAL_EDITOR: 'visual_editor',
  MINIGAME_INTEGRATION: 'minigame_integration',
  EXPORT_IMPORT: 'export_import',
  SANDBOX_MODE: 'sandbox_mode',
  DESKTOP_MODE: 'desktop_mode',
  ANALYTICS: 'analytics',
  MULTIPLAYER_SUPPORT: 'multiplayer_support',
  ADVANCED_CLUES: 'advanced_clues',
} as const;

export type FeatureFlag = typeof FEATURE_FLAGS[keyof typeof FEATURE_FLAGS];

// Default feature flag states
const defaultFlags: Record<FeatureFlag, boolean> = {
  [FEATURE_FLAGS.VISUAL_EDITOR]: false,
  [FEATURE_FLAGS.MINIGAME_INTEGRATION]: false,
  [FEATURE_FLAGS.EXPORT_IMPORT]: true,
  [FEATURE_FLAGS.SANDBOX_MODE]: true,
  [FEATURE_FLAGS.DESKTOP_MODE]: false,
  [FEATURE_FLAGS.ANALYTICS]: false,
  [FEATURE_FLAGS.MULTIPLAYER_SUPPORT]: false,
  [FEATURE_FLAGS.ADVANCED_CLUES]: true,
};

// Initialize feature flags from environment or localStorage
export const initializeFeatureFlags = () => {
  const storedFlags = localStorage.getItem('v13n_feature_flags');
  
  if (storedFlags) {
    try {
      const parsed = JSON.parse(storedFlags);
      return { ...defaultFlags, ...parsed };
    } catch (e) {
      console.error('Failed to parse feature flags from localStorage');
    }
  }
  
  // Check environment variables
  const envFlags: Partial<Record<FeatureFlag, boolean>> = {};
  
  if (import.meta.env.VITE_ENABLE_VISUAL_EDITOR === 'true') {
    envFlags[FEATURE_FLAGS.VISUAL_EDITOR] = true;
  }
  
  if (import.meta.env.VITE_ENABLE_DESKTOP_MODE === 'true') {
    envFlags[FEATURE_FLAGS.DESKTOP_MODE] = true;
  }
  
  return { ...defaultFlags, ...envFlags };
};

// Hook to use feature flags
import { useCoreGameStore } from '../stores/useCoreGameStore';

export const useFeatureFlag = (flag: FeatureFlag): boolean => {
  const isEnabled = useCoreGameStore(state => state.isFeatureEnabled);
  return isEnabled(flag);
};

// Environment detection
export const detectEnvironment = (): 'development' | 'production' | 'desktop' => {
  // Check if running in Tauri
  if (window.__TAURI__ !== undefined) {
    return 'desktop';
  }
  
  // Check if in development mode
  if (import.meta.env.DEV) {
    return 'development';
  }
  
  return 'production';
};

// Initialize environment in store
export const initializeEnvironment = () => {
  const store = useCoreGameStore.getState();
  const environment = detectEnvironment();
  store.setEnvironment(environment);
  
  // Initialize feature flags
  const flags = initializeFeatureFlags();
  Object.entries(flags).forEach(([flag, enabled]) => {
    store.setFeatureFlag(flag, Boolean(enabled));
  });
};

// Type augmentation for window object
declare global {
  interface Window {
    __TAURI__?: any;
  }
}