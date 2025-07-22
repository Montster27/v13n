// Minigame state management with Zustand
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { db } from '../db/database';
import type { MinigameState, MinigameContext, MinigameEvent } from '../types/minigame';
import type { MinigameConfig, MinigameResult, MinigameAttempt } from '../types/clue';
import { useNarrativeStore } from './useNarrativeStore';

interface MinigameStore extends MinigameState {
  // State management
  context?: MinigameContext;
  error?: string;
  loading: boolean;
  
  // Minigame attempts history
  attempts: number;
  maxAttempts: number;
  attemptHistory: MinigameAttempt[];
  
  // Actions
  startMinigame: (clueId: string, config: MinigameConfig) => Promise<void>;
  completeMinigame: (result: MinigameResult) => Promise<void>;
  pauseMinigame: () => void;
  resumeMinigame: () => void;
  resetMinigame: () => void;
  exitMinigame: () => void;
  
  // Introduction and instructions flow
  showIntroduction: boolean;
  showInstructions: boolean;
  setShowIntroduction: (show: boolean) => void;
  setShowInstructions: (show: boolean) => void;
  
  // Timer management
  timeRemaining?: number;
  timerInterval?: number;
  startTimer: () => void;
  stopTimer: () => void;
  updateTimer: () => void;
  
  // History and analytics
  loadAttemptHistory: (clueId?: string) => Promise<void>;
  getAttemptStats: (clueId: string) => {
    totalAttempts: number;
    successRate: number;
    averageScore: number;
    bestScore: number;
    averageTime: number;
  };
  
  // Event system
  dispatchEvent: (event: MinigameEvent) => void;
}

export const useMinigameStore = create<MinigameStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    currentClueId: undefined,
    currentConfig: undefined,
    isPlaying: false,
    isPaused: false,
    showIntroduction: true,
    showInstructions: false,
    attempts: 0,
    maxAttempts: 3,
    context: undefined,
    error: undefined,
    loading: false,
    attemptHistory: [],
    timeRemaining: undefined,
    timerInterval: undefined,
    
    // Start minigame sequence
    startMinigame: async (clueId: string, config: MinigameConfig) => {
      set({ loading: true, error: undefined });
      
      try {
        // Create context for the minigame
        const context: MinigameContext = {
          clueId,
          config,
          onComplete: get().completeMinigame,
          onExit: get().exitMinigame
        };
        
        set({
          currentClueId: clueId,
          currentConfig: config,
          context,
          maxAttempts: config.maxAttempts || 3,
          attempts: 0,
          showIntroduction: true,
          showInstructions: false,
          isPlaying: false,
          isPaused: false,
          timeRemaining: config.timeLimit,
          loading: false
        });
        
        // Load attempt history for this clue
        await get().loadAttemptHistory(clueId);
        
      } catch (error) {
        console.error('Failed to start minigame:', error);
        set({ error: 'Failed to start minigame', loading: false });
      }
    },
    
    // Complete minigame and handle results
    completeMinigame: async (result: MinigameResult) => {
      const { currentClueId } = get();
      
      if (!currentClueId) return;
      
      set({ loading: true });
      
      try {
        // Save attempt to database
        const attempt: Omit<MinigameAttempt, 'id'> = {
          clueId: currentClueId,
          playerId: 'player', // TODO: Get from user context
          result,
          timestamp: new Date()
        };
        
        await db.transaction('rw', [db.minigameAttempts], async () => {
          await db.minigameAttempts.add(attempt);
        });
        
        // Update attempt history
        const fullAttempt = { ...attempt, id: crypto.randomUUID() };
        set(state => ({
          attemptHistory: [...state.attemptHistory, fullAttempt],
          attempts: state.attempts + 1,
          isPlaying: false,
          loading: false
        }));
        
        // Trigger appropriate storylet based on result
        const { triggerStorylet } = useNarrativeStore.getState();
        await triggerStorylet(result.triggeredStoryletId, {
          minigameResult: result,
          clueId: currentClueId
        });
        
        // Auto-exit after completion
        setTimeout(() => {
          get().exitMinigame();
        }, 3000);
        
      } catch (error) {
        console.error('Failed to complete minigame:', error);
        set({ error: 'Failed to save minigame result', loading: false });
      }
    },
    
    // Pause minigame
    pauseMinigame: () => {
      const { timerInterval } = get();
      if (timerInterval) {
        clearInterval(timerInterval);
      }
      set({ isPaused: true, timerInterval: undefined });
    },
    
    // Resume minigame
    resumeMinigame: () => {
      set({ isPaused: false });
      get().startTimer();
    },
    
    // Reset current minigame
    resetMinigame: () => {
      const { timerInterval, currentConfig } = get();
      if (timerInterval) {
        clearInterval(timerInterval);
      }
      
      set({
        isPlaying: false,
        isPaused: false,
        showIntroduction: true,
        showInstructions: false,
        timeRemaining: currentConfig?.timeLimit,
        timerInterval: undefined
      });
    },
    
    // Exit minigame completely
    exitMinigame: () => {
      const { timerInterval } = get();
      if (timerInterval) {
        clearInterval(timerInterval);
      }
      
      set({
        currentClueId: undefined,
        currentConfig: undefined,
        context: undefined,
        isPlaying: false,
        isPaused: false,
        showIntroduction: true,
        showInstructions: false,
        attempts: 0,
        timeRemaining: undefined,
        timerInterval: undefined,
        error: undefined
      });
    },
    
    // Introduction flow
    setShowIntroduction: (show: boolean) => {
      set({ showIntroduction: show });
      if (!show) {
        set({ showInstructions: true });
      }
    },
    
    setShowInstructions: (show: boolean) => {
      set({ showInstructions: show });
      if (!show) {
        set({ isPlaying: true });
        get().startTimer();
      }
    },
    
    // Timer management
    startTimer: () => {
      const { timeRemaining, currentConfig } = get();
      if (!timeRemaining || !currentConfig?.timeLimit) return;
      
      const interval = setInterval(() => {
        get().updateTimer();
      }, 1000);
      
      set({ timerInterval: interval });
    },
    
    stopTimer: () => {
      const { timerInterval } = get();
      if (timerInterval) {
        clearInterval(timerInterval);
        set({ timerInterval: undefined });
      }
    },
    
    updateTimer: () => {
      const { timeRemaining } = get();
      if (!timeRemaining) return;
      
      const newTime = timeRemaining - 1;
      
      if (newTime <= 0) {
        // Time's up - trigger failure
        get().stopTimer();
        const { currentConfig, currentClueId } = get();
        if (currentConfig && currentClueId) {
          const failureResult: MinigameResult = {
            clueId: currentClueId,
            minigameType: currentConfig.type,
            success: false,
            score: 0,
            timeSpent: currentConfig.timeLimit || 0,
            attemptsUsed: get().attempts + 1,
            triggeredStoryletId: currentConfig.failureStoryletId,
            completedAt: new Date()
          };
          get().completeMinigame(failureResult);
        }
      } else {
        set({ timeRemaining: newTime });
      }
    },
    
    // Load attempt history
    loadAttemptHistory: async (clueId?: string) => {
      try {
        let attempts;
        if (clueId) {
          attempts = await db.minigameAttempts
            .where('clueId')
            .equals(clueId)
            .toArray();
        } else {
          attempts = await db.minigameAttempts
            .toArray();
        }
        
        set({ attemptHistory: attempts as MinigameAttempt[] });
      } catch (error) {
        console.error('Failed to load attempt history:', error);
      }
    },
    
    // Get statistics for a clue
    getAttemptStats: (clueId: string) => {
      const { attemptHistory } = get();
      const clueAttempts = attemptHistory.filter(a => a.clueId === clueId);
      
      if (clueAttempts.length === 0) {
        return {
          totalAttempts: 0,
          successRate: 0,
          averageScore: 0,
          bestScore: 0,
          averageTime: 0
        };
      }
      
      const successful = clueAttempts.filter(a => a.result.success);
      const scores = clueAttempts.map(a => a.result.score);
      const times = clueAttempts.map(a => a.result.timeSpent);
      
      return {
        totalAttempts: clueAttempts.length,
        successRate: (successful.length / clueAttempts.length) * 100,
        averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
        bestScore: Math.max(...scores),
        averageTime: times.reduce((a, b) => a + b, 0) / times.length
      };
    },
    
    // Event dispatch system
    dispatchEvent: (event: MinigameEvent) => {
      // Minigame event triggered
      
      switch (event.type) {
        case 'START':
          get().startMinigame(event.clueId, event.config);
          break;
        case 'COMPLETE':
          get().completeMinigame(event.result);
          break;
        case 'PAUSE':
          get().pauseMinigame();
          break;
        case 'RESUME':
          get().resumeMinigame();
          break;
        case 'RESET':
          get().resetMinigame();
          break;
        case 'EXIT':
          get().exitMinigame();
          break;
      }
    }
  }))
);

// Helper to trigger storylets (placeholder until we update narrative store)
declare global {
  interface Window {
    __triggerStorylet?: (id: string, context?: any) => Promise<void>;
  }
}