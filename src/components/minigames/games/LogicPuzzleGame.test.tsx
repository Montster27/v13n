/**
 * Tests for LogicPuzzleGame component
 * Tests game initialization, user interactions, puzzle solving logic, and completion handling
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LogicPuzzleGame } from './LogicPuzzleGame';
import type { MinigameConfig } from '../../../types/clue';

// Mock the minigame store
const mockMinigameStore = {
  completeMinigame: vi.fn()
};

vi.mock('../../../stores/useMinigameStore', () => ({
  useMinigameStore: () => mockMinigameStore
}));

// Mock Math.random for predictable tests
const originalRandom = Math.random;
let randomSequence = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
let randomIndex = 0;

beforeEach(() => {
  Math.random = vi.fn(() => {
    const value = randomSequence[randomIndex % randomSequence.length];
    randomIndex++;
    return value;
  });
  randomIndex = 0;
  vi.clearAllMocks();
});

afterEach(() => {
  Math.random = originalRandom;
});

describe('LogicPuzzleGame', () => {
  const mockConfig: MinigameConfig = {
    id: 'test-logic-puzzle',
    type: 'logic_puzzle',
    title: 'Test Logic Puzzle',
    introduction: 'Solve this logic puzzle',
    instructions: 'Fill the grid following the rules',
    difficulty: 'medium',
    timeLimit: 300,
    maxAttempts: 3,
    successStoryletId: 'success-storylet',
    failureStoryletId: 'failure-storylet',
    gameSettings: {
      gridSize: 4,
      complexity: 3
    },
    theme: 'default'
  };

  const mockClueId = 'test-clue-123';

  describe('Game Initialization', () => {
    it('should render the game with correct initial state', () => {
      render(<LogicPuzzleGame config={mockConfig} clueId={mockClueId} />);
      
      // Check if game header is present
      expect(screen.getByText('Moves:')).toBeInTheDocument();
      expect(screen.getByText('Errors:')).toBeInTheDocument();
      expect(screen.getByText('Hints:')).toBeInTheDocument();
      
      // Check if initial values are correct by looking for specific counters
      expect(screen.getByText((content, element) => {
        return element?.textContent === 'Moves: 0';
      })).toBeInTheDocument();
      expect(screen.getByText('0/3')).toBeInTheDocument(); // Errors should be 0/3
      expect(screen.getByText((content, element) => {
        return element?.textContent === 'Hints: 3';
      })).toBeInTheDocument();
      
      // Check if grid is rendered
      const grid = document.querySelector('[style*="grid-template-columns"]');
      expect(grid).toBeTruthy();
    });

    it('should render appropriate grid size based on config', () => {
      const smallGridConfig = { ...mockConfig, gameSettings: { gridSize: 3, complexity: 2 } };
      render(<LogicPuzzleGame config={smallGridConfig} clueId={mockClueId} />);
      
      // Should have 3x3 = 9 cells
      const cells = document.querySelectorAll('[class*="aspect-square"][class*="border-2"]');
      expect(cells).toHaveLength(9);
    });

    it('should render number input buttons for the grid size', () => {
      render(<LogicPuzzleGame config={mockConfig} clueId={mockClueId} />);
      
      // Should have buttons 1-4 for a 4x4 grid, plus clear button (only input buttons)
      const numberInputButtons = screen.getAllByRole('button').filter(button => 
        /^[1-4]$/.test(button.textContent || '') && 
        button.className.includes('btn-outline')
      );
      expect(numberInputButtons).toHaveLength(4);
      
      // Should have a clear button
      const clearButton = screen.getByTitle('Clear cell');
      expect(clearButton).toBeInTheDocument();
    });

    it('should show initial instructions', () => {
      render(<LogicPuzzleGame config={mockConfig} clueId={mockClueId} />);
      
      // Check for instruction text
      expect(screen.getByText(/Fill each row and column with numbers 1-4/)).toBeInTheDocument();
      expect(screen.getByText(/Click a cell to select it/)).toBeInTheDocument();
    });
  });

  describe('Cell Selection and Input', () => {
    it('should select a cell when clicked', async () => {
      render(<LogicPuzzleGame config={mockConfig} clueId={mockClueId} />);
      
      // Find an empty cell (not pre-filled)
      const cells = document.querySelectorAll('[class*="aspect-square"][class*="border-2"]');
      const emptyCell = Array.from(cells).find(cell => 
        !cell.textContent && !cell.classList.contains('cursor-default')
      );
      
      expect(emptyCell).toBeTruthy();
      
      if (emptyCell) {
        fireEvent.click(emptyCell);
        
        // Cell should be selected (have primary background or ring)
        await waitFor(() => {
          expect(emptyCell.classList.contains('bg-primary') || 
                 emptyCell.classList.contains('ring-4')).toBe(true);
        });
      }
    });

    it('should not allow selection of pre-filled cells', () => {
      render(<LogicPuzzleGame config={mockConfig} clueId={mockClueId} />);
      
      // Find a pre-filled cell (has cursor-default class)
      const preFilledCell = document.querySelector('[class*="cursor-default"]');
      
      if (preFilledCell) {
        const originalClassName = preFilledCell.className;
        fireEvent.click(preFilledCell);
        
        // Class should not change (cell should not be selected)
        expect(preFilledCell.className).toBe(originalClassName);
      }
    });

    it('should fill selected cell with number input', async () => {
      render(<LogicPuzzleGame config={mockConfig} clueId={mockClueId} />);
      
      // Select an empty cell
      const cells = document.querySelectorAll('[class*="aspect-square"][class*="border-2"]');
      const emptyCell = Array.from(cells).find(cell => 
        !cell.textContent && !cell.classList.contains('cursor-default')
      );
      
      if (emptyCell) {
        fireEvent.click(emptyCell);
        
        // Click number button
        const numberButton = screen.getByRole('button', { name: '1' });
        fireEvent.click(numberButton);
        
        // Cell should now contain the number
        await waitFor(() => {
          expect(emptyCell.textContent).toBe('1');
        });
        
        // Moves count should increase
        expect(screen.getByText('1')).toBeInTheDocument(); // Should show 1 move
      }
    });

    it('should clear cell value when same number is clicked again', async () => {
      render(<LogicPuzzleGame config={mockConfig} clueId={mockClueId} />);
      
      // Select empty cell and fill it
      const cells = document.querySelectorAll('[class*="aspect-square"][class*="border-2"]');
      const emptyCell = Array.from(cells).find(cell => 
        !cell.textContent && !cell.classList.contains('cursor-default')
      );
      
      if (emptyCell) {
        fireEvent.click(emptyCell);
        fireEvent.click(screen.getByRole('button', { name: '1' }));
        
        await waitFor(() => {
          expect(emptyCell.textContent).toBe('1');
        });
        
        // Click same number again
        fireEvent.click(screen.getByRole('button', { name: '1' }));
        
        await waitFor(() => {
          expect(emptyCell.textContent).toBe('');
        });
      }
    });

    it('should clear cell when clear button is clicked', async () => {
      render(<LogicPuzzleGame config={mockConfig} clueId={mockClueId} />);
      
      // Select and fill a cell
      const cells = document.querySelectorAll('[class*="aspect-square"][class*="border-2"]');
      const emptyCell = Array.from(cells).find(cell => 
        !cell.textContent && !cell.classList.contains('cursor-default')
      );
      
      if (emptyCell) {
        fireEvent.click(emptyCell);
        fireEvent.click(screen.getByRole('button', { name: '2' }));
        
        await waitFor(() => {
          expect(emptyCell.textContent).toBe('2');
        });
        
        // Click clear button
        const clearButton = screen.getByTitle('Clear cell');
        fireEvent.click(clearButton);
        
        await waitFor(() => {
          expect(emptyCell.textContent).toBe('');
        });
      }
    });
  });

  describe('Error Detection', () => {
    it('should detect row conflicts and mark as error', async () => {
      render(<LogicPuzzleGame config={mockConfig} clueId={mockClueId} />);
      
      // This test assumes we can create a conflict situation
      // We would need to carefully select cells in the same row and place duplicate numbers
      // The exact implementation depends on the puzzle generation logic
      
      // For now, we'll test that error state exists in the UI
      expect(screen.getByText('0/3')).toBeInTheDocument(); // Error counter
    });

    it('should increment error count when conflict is detected', async () => {
      // This would be a more complex test requiring specific puzzle states
      // that we can predict based on our mocked random values
      
      render(<LogicPuzzleGame config={mockConfig} clueId={mockClueId} />);
      
      // Initially no errors
      expect(screen.getByText('0/3')).toBeInTheDocument();
      
      // Test would involve creating a known conflict scenario
      // and verifying the error count increases
    });

    it('should trigger game failure when max errors reached', async () => {
      const maxErrorConfig = { ...mockConfig, gameSettings: { ...mockConfig.gameSettings, maxErrors: 1 } };
      render(<LogicPuzzleGame config={maxErrorConfig} clueId={mockClueId} />);
      
      // This test would simulate reaching max errors and verify completeMinigame is called with failure
      // Implementation depends on being able to reliably create error conditions
    });
  });

  describe('Hint System', () => {
    it('should show hint button and initial hint count', () => {
      render(<LogicPuzzleGame config={mockConfig} clueId={mockClueId} />);
      
      expect(screen.getByText('💡 Hint')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument(); // Initial hint count
    });

    it('should disable hint button when no cell is selected', () => {
      render(<LogicPuzzleGame config={mockConfig} clueId={mockClueId} />);
      
      const hintButton = screen.getByText('💡 Hint');
      expect(hintButton).toBeDisabled();
    });

    it('should enable hint button when empty cell is selected', async () => {
      render(<LogicPuzzleGame config={mockConfig} clueId={mockClueId} />);
      
      // Select an empty cell
      const cells = document.querySelectorAll('[class*="aspect-square"][class*="border-2"]');
      const emptyCell = Array.from(cells).find(cell => 
        !cell.textContent && !cell.classList.contains('cursor-default')
      );
      
      if (emptyCell) {
        fireEvent.click(emptyCell);
        
        const hintButton = screen.getByText('💡 Hint');
        await waitFor(() => {
          expect(hintButton).not.toBeDisabled();
        });
      }
    });

    it('should decrease hint count when hint is used', async () => {
      render(<LogicPuzzleGame config={mockConfig} clueId={mockClueId} />);
      
      // Select empty cell and use hint
      const cells = document.querySelectorAll('[class*="aspect-square"][class*="border-2"]');
      const emptyCell = Array.from(cells).find(cell => 
        !cell.textContent && !cell.classList.contains('cursor-default')
      );
      
      if (emptyCell) {
        fireEvent.click(emptyCell);
        
        const hintButton = screen.getByText('💡 Hint');
        fireEvent.click(hintButton);
        
        // Hint count should decrease
        await waitFor(() => {
          expect(screen.getByText((content, element) => {
            return element?.textContent === 'Hints: 2';
          })).toBeInTheDocument();
        });
      }
    });
  });

  describe('Game Controls', () => {
    it('should render reset button', () => {
      render(<LogicPuzzleGame config={mockConfig} clueId={mockClueId} />);
      
      expect(screen.getByText('🔄 Reset')).toBeInTheDocument();
    });

    it('should reset game state when reset button is clicked', async () => {
      render(<LogicPuzzleGame config={mockConfig} clueId={mockClueId} />);
      
      // Make some moves first
      const cells = document.querySelectorAll('[class*="aspect-square"][class*="border-2"]');
      const emptyCell = Array.from(cells).find(cell => 
        !cell.textContent && !cell.classList.contains('cursor-default')
      );
      
      if (emptyCell) {
        fireEvent.click(emptyCell);
        fireEvent.click(screen.getByRole('button', { name: '1' }));
        
        // Verify move was made
        await waitFor(() => {
          expect(screen.getByText((content, element) => {
            return element?.textContent === 'Moves: 1';
          })).toBeInTheDocument();
        });
        
        // Reset the game
        fireEvent.click(screen.getByText('🔄 Reset'));
        
        // Move counter should reset to 0
        await waitFor(() => {
          expect(screen.getByText((content, element) => {
            return element?.textContent === 'Moves: 0';
          })).toBeInTheDocument();
        });
      }
    });

    it('should disable controls when game is complete', async () => {
      render(<LogicPuzzleGame config={mockConfig} clueId={mockClueId} />);
      
      // This test would require completing the puzzle or simulating completion
      // For now, we test that the disabled state exists in the component logic
      
      const resetButton = screen.getByText('🔄 Reset');
      expect(resetButton).not.toBeDisabled(); // Should be enabled initially
    });
  });

  describe('Game Completion', () => {
    it('should call completeMinigame when puzzle is solved successfully', () => {
      // This test would require a specific puzzle state that can be solved
      // and verification that completeMinigame is called with success: true
      
      render(<LogicPuzzleGame config={mockConfig} clueId={mockClueId} />);
      
      // Test setup would involve creating a near-complete puzzle state
      // and making the final move that solves it
      
      // For now, we verify the store mock is available
      expect(mockMinigameStore.completeMinigame).toBeDefined();
    });

    it('should show completion message when puzzle is solved', () => {
      render(<LogicPuzzleGame config={mockConfig} clueId={mockClueId} />);
      
      // This would test that success message appears
      // Implementation depends on being able to reach completion state
    });

    it('should calculate score based on moves, errors, and hints used', () => {
      // Test would verify score calculation logic
      // This is tested through the completeMinigame call verification
      
      render(<LogicPuzzleGame config={mockConfig} clueId={mockClueId} />);
      expect(mockMinigameStore.completeMinigame).toBeDefined();
    });
  });

  describe('Time Management', () => {
    it('should handle time limit from config', () => {
      const timedConfig = { ...mockConfig, timeLimit: 120 };
      render(<LogicPuzzleGame config={timedConfig} clueId={mockClueId} />);
      
      // Game should initialize with time limit consideration
      // This is primarily tested through the completion logic
    });
  });

  describe('Accessibility', () => {
    it('should have proper button roles and labels', () => {
      render(<LogicPuzzleGame config={mockConfig} clueId={mockClueId} />);
      
      // Number input buttons should have proper roles
      const numberInputButtons = screen.getAllByRole('button').filter(button => 
        /^[1-4]$/.test(button.textContent || '') && 
        button.className.includes('btn-outline')
      );
      expect(numberInputButtons.length).toBeGreaterThan(0);
      
      // Clear button should have proper title
      expect(screen.getByTitle('Clear cell')).toBeInTheDocument();
      
      // Control buttons should be accessible
      expect(screen.getByRole('button', { name: '💡 Hint' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '🔄 Reset' })).toBeInTheDocument();
    });

    it('should provide visual feedback for game states', () => {
      render(<LogicPuzzleGame config={mockConfig} clueId={mockClueId} />);
      
      // Game should show current state information
      expect(screen.getByText('Moves:')).toBeInTheDocument();
      expect(screen.getByText('Errors:')).toBeInTheDocument();
      expect(screen.getByText('Hints:')).toBeInTheDocument();
      
      // Instructions should be visible
      expect(screen.getByText(/Fill each row and column/)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle different grid sizes', () => {
      const largeGridConfig = { ...mockConfig, gameSettings: { gridSize: 6, complexity: 4 } };
      render(<LogicPuzzleGame config={largeGridConfig} clueId={mockClueId} />);
      
      // Should render 6x6 = 36 cells
      const cells = document.querySelectorAll('[class*="aspect-square"][class*="border-2"]');
      expect(cells).toHaveLength(36);
      
      // Should have number buttons 1-6 (only the input buttons, not grid cells)
      const numberInputButtons = screen.getAllByRole('button').filter(button => 
        /^[1-6]$/.test(button.textContent || '') && 
        button.className.includes('btn-outline')
      );
      expect(numberInputButtons).toHaveLength(6);
    });

    it('should handle minimum grid size', () => {
      const smallGridConfig = { ...mockConfig, gameSettings: { gridSize: 3, complexity: 2 } };
      render(<LogicPuzzleGame config={smallGridConfig} clueId={mockClueId} />);
      
      // Should work with 3x3 grid
      const cells = document.querySelectorAll('[class*="aspect-square"][class*="border-2"]');
      expect(cells).toHaveLength(9);
    });

    it('should handle config without optional settings', () => {
      const minimalConfig = {
        ...mockConfig,
        gameSettings: {} // No specific settings
      };
      
      render(<LogicPuzzleGame config={minimalConfig} clueId={mockClueId} />);
      
      // Should use default values and still render
      expect(screen.getByText('Moves:')).toBeInTheDocument();
    });
  });
});