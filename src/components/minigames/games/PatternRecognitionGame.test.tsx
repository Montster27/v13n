/**
 * Tests for PatternRecognitionGame component
 * Verifies pattern recognition minigame functionality and scoring
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PatternRecognitionGame } from './PatternRecognitionGame';
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

describe('PatternRecognitionGame', () => {
  let mockConfig: MinigameConfig;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    mockConfig = {
      id: 'pattern-test',
      type: 'pattern_recognition',
      title: 'Pattern Master Challenge',
      introduction: 'Test your pattern recognition skills.',
      instructions: 'Identify elements that match the shown pattern.',
      difficulty: 'medium',
      timeLimit: 120,
      maxAttempts: 1,
      successStoryletId: 'success-storylet',
      failureStoryletId: 'failure-storylet',
      gameSettings: {
        patternComplexity: 3,
        distractors: 5
      }
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Game Initialization', () => {
    it('should render initial ready state', () => {
      render(<PatternRecognitionGame config={mockConfig} clueId="test-clue" />);
      
      expect(screen.getByText('Pattern Recognition Challenge')).toBeInTheDocument();
      expect(screen.getByText('Start Game')).toBeInTheDocument();
      expect(screen.getByText(/Study the pattern, then identify all elements/)).toBeInTheDocument();
    });

    it('should display correct game settings', () => {
      render(<PatternRecognitionGame config={mockConfig} clueId="test-clue" />);
      
      expect(screen.getByText(/Complexity: 3/)).toBeInTheDocument();
      expect(screen.getByText(/Distractors: 5/)).toBeInTheDocument();
    });

    it('should show initial stats', () => {
      render(<PatternRecognitionGame config={mockConfig} clueId="test-clue" />);
      
      expect(screen.getByText((content, element) => {
        return element?.textContent === 'Round: 1/5';
      })).toBeInTheDocument();
      expect(screen.getByText((content, element) => {
        return element?.textContent === 'Mistakes: 0/3';
      })).toBeInTheDocument();
      expect(screen.getByText((content, element) => {
        return element?.textContent === 'Score: 0';
      })).toBeInTheDocument();
    });
  });

  describe('Game Start', () => {
    it('should start game when start button is clicked', () => {
      render(<PatternRecognitionGame config={mockConfig} clueId="test-clue" />);
      
      const startButton = screen.getByText('Start Game');
      fireEvent.click(startButton);
      
      expect(screen.getByText(/Study the pattern!/)).toBeInTheDocument();
      expect(screen.getByText(/Time remaining:/)).toBeInTheDocument();
    });

    it('should show study timer when game starts', () => {
      render(<PatternRecognitionGame config={mockConfig} clueId="test-clue" />);
      
      const startButton = screen.getByText('Start Game');
      fireEvent.click(startButton);
      
      const studyTimeElements = screen.getAllByText((content, element) => {
        return element?.textContent?.includes('Study Time:') && element?.textContent?.includes('s');
      });
      expect(studyTimeElements.length).toBeGreaterThan(0);
    });
  });

  describe('Game Settings', () => {
    it('should respect custom complexity and distractors', () => {
      const customConfig = {
        ...mockConfig,
        gameSettings: {
          patternComplexity: 4,
          distractors: 8
        }
      };

      render(<PatternRecognitionGame config={customConfig} clueId="test-clue" />);
      
      expect(screen.getByText(/Complexity: 4/)).toBeInTheDocument();
      expect(screen.getByText(/Distractors: 8/)).toBeInTheDocument();
    });

    it('should use default settings when not specified', () => {
      const configWithoutSettings = {
        ...mockConfig,
        gameSettings: {}
      };

      render(<PatternRecognitionGame config={configWithoutSettings} clueId="test-clue" />);
      
      // Should use default complexity of 3 and distractors of 5
      expect(screen.getByText(/Complexity: 3/)).toBeInTheDocument();
      expect(screen.getByText(/Distractors: 5/)).toBeInTheDocument();
    });

    it('should handle different difficulty settings', () => {
      const expertConfig = {
        ...mockConfig,
        difficulty: 'expert' as const
      };

      render(<PatternRecognitionGame config={expertConfig} clueId="test-clue" />);
      
      expect(screen.getByText('Pattern Recognition Challenge')).toBeInTheDocument();
    });
  });

  describe('Game Visual Elements', () => {
    it('should show game controls and stats', () => {
      render(<PatternRecognitionGame config={mockConfig} clueId="test-clue" />);
      
      // Game area should be present
      const gameArea = document.querySelector('[style*="min-height: 400px"]');
      expect(gameArea).toBeInTheDocument();
      
      // Stats display should be present
      expect(screen.getByText(/Round:/)).toBeInTheDocument();
      expect(screen.getByText(/Mistakes:/)).toBeInTheDocument();
      expect(screen.getByText(/Score:/)).toBeInTheDocument();
    });

    it('should show helpful instructions', () => {
      render(<PatternRecognitionGame config={mockConfig} clueId="test-clue" />);
      
      expect(screen.getByText(/Study the pattern during the blue phase/)).toBeInTheDocument();
      expect(screen.getByText(/Look for common properties: same color, shape, size/)).toBeInTheDocument();
    });

    it('should have proper game area styling', () => {
      render(<PatternRecognitionGame config={mockConfig} clueId="test-clue" />);
      
      const gameArea = document.querySelector('.border-2.border-base-300.rounded-lg');
      expect(gameArea).toBeInTheDocument();
    });
  });

  describe('Round Progression', () => {
    it('should show correct round information', () => {
      render(<PatternRecognitionGame config={mockConfig} clueId="test-clue" />);
      
      // Should start at round 1/5
      expect(screen.getByText((content, element) => {
        return element?.textContent === 'Round: 1/5';
      })).toBeInTheDocument();
    });

    it('should track mistakes correctly', () => {
      render(<PatternRecognitionGame config={mockConfig} clueId="test-clue" />);
      
      // Should start with 0/3 mistakes
      expect(screen.getByText((content, element) => {
        return element?.textContent === 'Mistakes: 0/3';
      })).toBeInTheDocument();
    });

    it('should update score display', () => {
      render(<PatternRecognitionGame config={mockConfig} clueId="test-clue" />);
      
      // Should start with score 0
      expect(screen.getByText((content, element) => {
        return element?.textContent === 'Score: 0';
      })).toBeInTheDocument();
    });
  });

  describe('Configuration Handling', () => {
    it('should handle time limits', () => {
      const timedConfig = {
        ...mockConfig,
        timeLimit: 60
      };

      render(<PatternRecognitionGame config={timedConfig} clueId="test-clue" />);
      
      expect(screen.getByText('Start Game')).toBeInTheDocument();
    });

    it('should handle theme colors', () => {
      const themedConfig = {
        ...mockConfig,
        backgroundColor: '#ff0000',
        accentColor: '#00ff00'
      };

      render(<PatternRecognitionGame config={themedConfig} clueId="test-clue" />);
      
      expect(screen.getByText('Pattern Recognition Challenge')).toBeInTheDocument();
    });

    it('should handle max attempts', () => {
      const multiAttemptConfig = {
        ...mockConfig,
        maxAttempts: 3
      };

      render(<PatternRecognitionGame config={multiAttemptConfig} clueId="test-clue" />);
      
      expect(screen.getByText('Start Game')).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('should render all main sections', () => {
      render(<PatternRecognitionGame config={mockConfig} clueId="test-clue" />);
      
      // Status bar
      expect(screen.getByText(/Round:/)).toBeInTheDocument();
      
      // Game area  
      const gameArea = document.querySelector('[style*="min-height: 400px"]');
      expect(gameArea).toBeInTheDocument();
      
      // Instructions
      expect(screen.getByText(/Study the pattern during the blue phase/)).toBeInTheDocument();
      
      // Start button
      expect(screen.getByText('Start Game')).toBeInTheDocument();
    });

    it('should have proper accessibility attributes', () => {
      render(<PatternRecognitionGame config={mockConfig} clueId="test-clue" />);
      
      const startButton = screen.getByText('Start Game');
      expect(startButton).toHaveClass('btn');
      expect(startButton).toHaveClass('btn-primary');
    });

    it('should show success criteria in ready state', () => {
      render(<PatternRecognitionGame config={mockConfig} clueId="test-clue" />);
      
      const successElements = screen.getAllByText((content, element) => {
        return element?.textContent?.includes('Success requires completing all rounds with fewer than') && element?.textContent?.includes('mistakes');
      });
      expect(successElements.length).toBeGreaterThan(0);
    });
  });

  describe('Pattern Element Generation', () => {
    it('should create pattern elements when game starts', () => {
      render(<PatternRecognitionGame config={mockConfig} clueId="test-clue" />);
      
      const startButton = screen.getByText('Start Game');
      fireEvent.click(startButton);
      
      // Should have pattern elements (SVG shapes)
      const svgElements = document.querySelectorAll('svg');
      expect(svgElements.length).toBeGreaterThan(0);
    });

    it('should generate different shapes', () => {
      render(<PatternRecognitionGame config={mockConfig} clueId="test-clue" />);
      
      const startButton = screen.getByText('Start Game');
      fireEvent.click(startButton);
      
      // Should have buttons with SVG shapes
      const shapeButtons = document.querySelectorAll('button svg');
      expect(shapeButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Game Phases', () => {
    it('should transition from ready to studying phase', () => {
      render(<PatternRecognitionGame config={mockConfig} clueId="test-clue" />);
      
      const startButton = screen.getByText('Start Game');
      fireEvent.click(startButton);
      
      // Should be in studying phase
      const studyPhaseElements = screen.getAllByText((content, element) => {
        return element?.textContent?.includes('Study the pattern!') || false;
      });
      expect(studyPhaseElements.length).toBeGreaterThan(0);
    });

    it('should show study timer during studying phase', () => {
      render(<PatternRecognitionGame config={mockConfig} clueId="test-clue" />);
      
      const startButton = screen.getByText('Start Game');
      fireEvent.click(startButton);
      
      // Should show study time
      const studyTimeElements = screen.getAllByText((content, element) => {
        return element?.textContent?.includes('Study Time:') && element?.textContent?.includes('s');
      });
      expect(studyTimeElements.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing game settings gracefully', () => {
      const configWithoutGameSettings = {
        ...mockConfig,
        gameSettings: undefined as any
      };

      expect(() => {
        render(<PatternRecognitionGame config={configWithoutGameSettings} clueId="test-clue" />);
      }).not.toThrow();
    });

    it('should handle empty game settings', () => {
      const configWithEmptySettings = {
        ...mockConfig,
        gameSettings: {}
      };

      render(<PatternRecognitionGame config={configWithEmptySettings} clueId="test-clue" />);
      
      expect(screen.getByText('Pattern Recognition Challenge')).toBeInTheDocument();
    });
  });
});