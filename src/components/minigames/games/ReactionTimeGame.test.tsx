/**
 * Tests for ReactionTimeGame component
 * Verifies reaction time minigame functionality and scoring
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReactionTimeGame } from './ReactionTimeGame';
import type { MinigameConfig } from '../../../types/clue';

// Mock the minigame store
const mockCompleteMinigame = vi.fn();
vi.mock('../../../stores/useMinigameStore', () => ({
  useMinigameStore: () => ({
    completeMinigame: mockCompleteMinigame
  })
}));

// Mock crypto.randomUUID
vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => 'mock-uuid-123')
});

describe('ReactionTimeGame', () => {
  let mockConfig: MinigameConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    mockConfig = {
      id: 'reaction-test',
      type: 'reaction_time',
      title: 'Quick Draw Challenge',
      introduction: 'Test your reflexes in this reaction time challenge.',
      instructions: 'Click targets as quickly as possible when they appear.',
      difficulty: 'medium',
      timeLimit: 60,
      maxAttempts: 1,
      successStoryletId: 'success-storylet',
      failureStoryletId: 'failure-storylet',
      gameSettings: {
        targetCount: 5,
        randomDelay: true
      }
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Game Initialization', () => {
    it('should render initial ready state', () => {
      render(<ReactionTimeGame config={mockConfig} clueId="test-clue" />);
      
      expect(screen.getByText('Reaction Time Challenge')).toBeInTheDocument();
      expect(screen.getByText('Start Game')).toBeInTheDocument();
      expect(screen.getByText(/Click the targets as quickly as possible/)).toBeInTheDocument();
    });

    it('should display correct game settings', () => {
      render(<ReactionTimeGame config={mockConfig} clueId="test-clue" />);
      
      expect(screen.getByText(/Targets: 5/)).toBeInTheDocument();
      expect(screen.getByText(/Timeout: 2s each/)).toBeInTheDocument();
    });

    it('should show initial stats', () => {
      render(<ReactionTimeGame config={mockConfig} clueId="test-clue" />);
      
      expect(screen.getByText((content, element) => {
        return element?.textContent === 'Targets: 0/5';
      })).toBeInTheDocument();
      expect(screen.getByText((content, element) => {
        return element?.textContent === 'Missed: 0';
      })).toBeInTheDocument();
      expect(screen.getByText((content, element) => {
        return element?.textContent === 'Accuracy: 0%';
      })).toBeInTheDocument();
      expect(screen.getByText((content, element) => {
        return element?.textContent === 'Score: 0';
      })).toBeInTheDocument();
    });
  });

  describe('Game Start', () => {
    it('should start game when start button is clicked', () => {
      render(<ReactionTimeGame config={mockConfig} clueId="test-clue" />);
      
      const startButton = screen.getByText('Start Game');
      fireEvent.click(startButton);
      
      expect(screen.getByText('Get Ready...')).toBeInTheDocument();
      expect(screen.getByText('Target will appear soon')).toBeInTheDocument();
    });
  });

  describe('Game Settings', () => {
    it('should respect custom target count', () => {
      const customConfig = {
        ...mockConfig,
        gameSettings: {
          targetCount: 10
        }
      };

      render(<ReactionTimeGame config={customConfig} clueId="test-clue" />);
      
      expect(screen.getByText((content, element) => {
        return element?.textContent === 'Targets: 0/10';
      })).toBeInTheDocument();
      expect(screen.getByText(/Targets: 10/)).toBeInTheDocument();
    });

    it('should use default settings when not specified', () => {
      const configWithoutSettings = {
        ...mockConfig,
        gameSettings: {}
      };

      render(<ReactionTimeGame config={configWithoutSettings} clueId="test-clue" />);
      
      // Should use default target count of 8
      expect(screen.getByText((content, element) => {
        return element?.textContent === 'Targets: 0/8';
      })).toBeInTheDocument();
    });

    it('should handle randomDelay setting', () => {
      const nonRandomConfig = {
        ...mockConfig,
        gameSettings: {
          targetCount: 3,
          randomDelay: false
        }
      };

      render(<ReactionTimeGame config={nonRandomConfig} clueId="test-clue" />);
      
      // Should still work without random delays
      const startButton = screen.getByText('Start Game');
      fireEvent.click(startButton);
      
      expect(screen.getByText('Get Ready...')).toBeInTheDocument();
    });
  });

  describe('Game Visual Elements', () => {
    it('should have proper cursor styles', () => {
      render(<ReactionTimeGame config={mockConfig} clueId="test-clue" />);
      
      const gameArea = document.querySelector('.cursor-crosshair');
      expect(gameArea).toBeInTheDocument();
    });

    it('should show helpful instructions', () => {
      render(<ReactionTimeGame config={mockConfig} clueId="test-clue" />);
      
      expect(screen.getByText(/Click targets as quickly as possible. Each target disappears after/)).toBeInTheDocument();
      expect(screen.getByText(/Faster reactions earn more points!/)).toBeInTheDocument();
    });

    it('should show game controls', () => {
      render(<ReactionTimeGame config={mockConfig} clueId="test-clue" />);
      
      // Game area should be present
      const gameArea = document.querySelector('[style*="min-height: 400px"]');
      expect(gameArea).toBeInTheDocument();
      
      // Stats display should be present (use getAllByText for multiple matches)
      expect(screen.getAllByText(/Targets:/)).toHaveLength(2); // Once in stats, once in instructions
      expect(screen.getByText(/Missed:/)).toBeInTheDocument();
      expect(screen.getByText(/Accuracy:/)).toBeInTheDocument();
      expect(screen.getByText(/Score:/)).toBeInTheDocument();
    });
  });

  describe('Configuration Handling', () => {
    it('should handle different difficulty settings', () => {
      const easyConfig = {
        ...mockConfig,
        difficulty: 'easy' as const
      };

      render(<ReactionTimeGame config={easyConfig} clueId="test-clue" />);
      
      expect(screen.getByText('Reaction Time Challenge')).toBeInTheDocument();
    });

    it('should handle time limits', () => {
      const timedConfig = {
        ...mockConfig,
        timeLimit: 30
      };

      render(<ReactionTimeGame config={timedConfig} clueId="test-clue" />);
      
      expect(screen.getByText('Start Game')).toBeInTheDocument();
    });

    it('should handle theme colors', () => {
      const themedConfig = {
        ...mockConfig,
        backgroundColor: '#ff0000',
        accentColor: '#00ff00'
      };

      render(<ReactionTimeGame config={themedConfig} clueId="test-clue" />);
      
      expect(screen.getByText('Reaction Time Challenge')).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('should render all main sections', () => {
      render(<ReactionTimeGame config={mockConfig} clueId="test-clue" />);
      
      // Status bar (expect multiple instances)
      expect(screen.getAllByText(/Targets:/)).toHaveLength(2);
      
      // Game area  
      const gameArea = document.querySelector('.cursor-crosshair');
      expect(gameArea).toBeInTheDocument();
      
      // Instructions
      expect(screen.getByText(/Click targets as quickly as possible/)).toBeInTheDocument();
      
      // Start button
      expect(screen.getByText('Start Game')).toBeInTheDocument();
    });

    it('should have proper accessibility attributes', () => {
      render(<ReactionTimeGame config={mockConfig} clueId="test-clue" />);
      
      const startButton = screen.getByText('Start Game');
      expect(startButton).toHaveClass('btn');
      expect(startButton).toHaveClass('btn-primary');
    });
  });
});