import { create } from 'zustand';

interface GameState {
  // Core game state
  gameTime: number; // in minutes
  resources: {
    energy: number;
    social: number;
    knowledge: number;
    money: number;
  };
  
  // Feature flags and settings
  featureFlags: Record<string, boolean>;
  environment: 'development' | 'production' | 'desktop';
  
  // Save system
  currentSaveSlot: number | null;
  lastSavedAt: Date | null;
  
  // Actions
  advanceTime: (minutes: number) => void;
  updateResource: (resource: keyof GameState['resources'], value: number) => void;
  setResource: (resource: keyof GameState['resources'], value: number) => void;
  
  // Feature flags
  setFeatureFlag: (flag: string, enabled: boolean) => void;
  isFeatureEnabled: (flag: string) => boolean;
  
  // Environment
  setEnvironment: (env: GameState['environment']) => void;
  
  // Save system
  setSaveSlot: (slot: number | null) => void;
  updateLastSaved: () => void;
  
  // Utility
  resetGameState: () => void;
}

const initialResources = {
  energy: 100,
  social: 50,
  knowledge: 0,
  money: 100
};

export const useCoreGameStore = create<GameState>((set, get) => ({
  gameTime: 0,
  resources: { ...initialResources },
  featureFlags: {},
  environment: 'development',
  currentSaveSlot: null,
  lastSavedAt: null,
  
  advanceTime: (minutes) => set((state) => ({
    gameTime: state.gameTime + minutes
  })),
  
  updateResource: (resource, value) => set((state) => ({
    resources: {
      ...state.resources,
      [resource]: Math.max(0, state.resources[resource] + value)
    }
  })),
  
  setResource: (resource, value) => set((state) => ({
    resources: {
      ...state.resources,
      [resource]: Math.max(0, value)
    }
  })),
  
  setFeatureFlag: (flag, enabled) => set((state) => ({
    featureFlags: { ...state.featureFlags, [flag]: enabled }
  })),
  
  isFeatureEnabled: (flag) => get().featureFlags[flag] ?? false,
  
  setEnvironment: (env) => set({ environment: env }),
  
  setSaveSlot: (slot) => set({ currentSaveSlot: slot }),
  
  updateLastSaved: () => set({ lastSavedAt: new Date() }),
  
  resetGameState: () => set({
    gameTime: 0,
    resources: { ...initialResources },
    currentSaveSlot: null,
    lastSavedAt: null
  })
}));