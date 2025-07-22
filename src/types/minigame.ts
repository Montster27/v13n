// Base minigame interface and plugin system
import type { MinigameConfig, MinigameResult } from './clue';

export interface MinigamePluginInterface {
  id: string;
  type: string;
  name: string;
  description: string;
  
  // Plugin lifecycle
  initialize: (config: MinigameConfig) => Promise<void>;
  start: () => Promise<void>;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  cleanup: () => void;
  
  // Game state
  isActive: boolean;
  isPaused: boolean;
  isCompleted: boolean;
  
  // Result handling
  getResult: () => MinigameResult | null;
  
  // Event callbacks
  onComplete: (result: MinigameResult) => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
}

export interface MinigameState {
  currentClueId?: string;
  currentConfig?: MinigameConfig;
  isPlaying: boolean;
  isPaused: boolean;
  showIntroduction: boolean;
  showInstructions: boolean;
  attempts: number;
  maxAttempts: number;
  startTime?: Date;
  timeLimit?: number;
  timeRemaining?: number;
}

// Minigame plugin registry
export interface MinigameRegistry {
  [key: string]: () => Promise<MinigamePluginInterface>;
}

// Minigame events
export type MinigameEvent = 
  | { type: 'START'; clueId: string; config: MinigameConfig }
  | { type: 'COMPLETE'; result: MinigameResult }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'RESET' }
  | { type: 'EXIT' };

export interface MinigameContext {
  clueId: string;
  config: MinigameConfig;
  onComplete: (result: MinigameResult) => void;
  onExit: () => void;
}