import React, { useState, useEffect, useCallback } from 'react';
import type { MinigameConfig, MinigameResult } from '../../../types/clue';
import { useMinigameStore } from '../../../stores/useMinigameStore';

interface LogicPuzzleCell {
  id: string;
  row: number;
  col: number;
  value: number | null;
  isGiven: boolean;
  isSelected: boolean;
  isError: boolean;
  possibleValues: number[];
}

interface LogicPuzzleGameProps {
  config: MinigameConfig;
  clueId: string;
}

export const LogicPuzzleGame: React.FC<LogicPuzzleGameProps> = ({
  config,
  clueId
}) => {
  const { completeMinigame } = useMinigameStore();
  
  // Game state
  const [grid, setGrid] = useState<LogicPuzzleCell[]>([]);
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  const [moves, setMoves] = useState(0);
  const [hints, setHints] = useState(3);
  const [gameStartTime, setGameStartTime] = useState<Date>();
  const [isGameComplete, setIsGameComplete] = useState(false);
  const [errors, setErrors] = useState(0);

  // Game settings from config
  const gridSize = config.gameSettings.gridSize || 4; // 4x4, 6x6, or 9x9
  const complexity = config.gameSettings.complexity || 3; // Number of pre-filled cells
  const maxErrors = 3;

  // Initialize game
  useEffect(() => {
    initializeGame();
    setGameStartTime(new Date());
  }, [config]);

  const initializeGame = () => {
    const puzzle = generateLogicPuzzle(gridSize, complexity);
    setGrid(puzzle);
    setSelectedCell(null);
    setMoves(0);
    setHints(3);
    setErrors(0);
    setIsGameComplete(false);
  };

  // Generate a logic puzzle (Latin Square variant)
  const generateLogicPuzzle = (size: number, difficulty: number): LogicPuzzleCell[] => {
    // Create a complete valid grid first
    const solution = generateCompleteSolution(size);
    
    // Remove some numbers based on difficulty
    const cellsToRemove = Math.floor((size * size) * (1 - (difficulty / 10)));
    const puzzleGrid = [...solution];
    
    // Randomly remove cells
    const cellsToEmpty = getRandomCells(size * size, cellsToRemove);
    cellsToEmpty.forEach(index => {
      puzzleGrid[index] = {
        ...puzzleGrid[index],
        value: null,
        isGiven: false,
        possibleValues: Array.from({ length: size }, (_, i) => i + 1)
      };
    });

    return puzzleGrid;
  };

  const generateCompleteSolution = (size: number): LogicPuzzleCell[] => {
    const grid: LogicPuzzleCell[] = [];
    
    // Create initial grid
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const id = `cell-${row}-${col}`;
        grid.push({
          id,
          row,
          col,
          value: ((row + col) % size) + 1, // Simple Latin square pattern
          isGiven: true,
          isSelected: false,
          isError: false,
          possibleValues: []
        });
      }
    }

    // Shuffle rows and columns to create variation
    return shuffleGrid(grid, size);
  };

  const shuffleGrid = (grid: LogicPuzzleCell[], size: number): LogicPuzzleCell[] => {
    // Simple shuffle by swapping some rows and columns
    const newGrid = [...grid];
    
    // Swap some rows
    for (let i = 0; i < 3; i++) {
      const row1 = Math.floor(Math.random() * size);
      const row2 = Math.floor(Math.random() * size);
      swapRows(newGrid, row1, row2, size);
    }
    
    // Swap some columns
    for (let i = 0; i < 3; i++) {
      const col1 = Math.floor(Math.random() * size);
      const col2 = Math.floor(Math.random() * size);
      swapColumns(newGrid, col1, col2, size);
    }
    
    return newGrid;
  };

  const swapRows = (grid: LogicPuzzleCell[], row1: number, row2: number, size: number) => {
    for (let col = 0; col < size; col++) {
      const index1 = row1 * size + col;
      const index2 = row2 * size + col;
      const temp = grid[index1].value;
      grid[index1].value = grid[index2].value;
      grid[index2].value = temp;
    }
  };

  const swapColumns = (grid: LogicPuzzleCell[], col1: number, col2: number, size: number) => {
    for (let row = 0; row < size; row++) {
      const index1 = row * size + col1;
      const index2 = row * size + col2;
      const temp = grid[index1].value;
      grid[index1].value = grid[index2].value;
      grid[index2].value = temp;
    }
  };

  const getRandomCells = (total: number, count: number): number[] => {
    const indices = Array.from({ length: total }, (_, i) => i);
    const selected: number[] = [];
    
    while (selected.length < count && indices.length > 0) {
      const randomIndex = Math.floor(Math.random() * indices.length);
      selected.push(indices.splice(randomIndex, 1)[0]);
    }
    
    return selected;
  };

  // Handle cell selection
  const handleCellClick = useCallback((cellId: string) => {
    const cell = grid.find(c => c.id === cellId);
    if (!cell || cell.isGiven) return;

    setSelectedCell(selectedCell === cellId ? null : cellId);
  }, [grid, selectedCell]);

  // Handle number input
  const handleNumberInput = useCallback((number: number) => {
    if (!selectedCell) return;

    const cellIndex = grid.findIndex(c => c.id === selectedCell);
    if (cellIndex === -1) return;

    const cell = grid[cellIndex];
    if (cell.isGiven) return;

    // Update cell value
    const newGrid = [...grid];
    newGrid[cellIndex] = {
      ...cell,
      value: cell.value === number ? null : number,
      isError: false
    };

    // Check for conflicts
    const hasConflict = checkForConflicts(newGrid[cellIndex], newGrid);
    if (hasConflict) {
      newGrid[cellIndex].isError = true;
      setErrors(prev => prev + 1);
      
      // Check if max errors reached
      if (errors + 1 >= maxErrors) {
        completeGame(false);
        return;
      }
    }

    setGrid(newGrid);
    setMoves(prev => prev + 1);

    // Check if puzzle is complete
    if (isPuzzleComplete(newGrid)) {
      completeGame(true);
    }
  }, [selectedCell, grid, errors]);

  const checkForConflicts = (cell: LogicPuzzleCell, currentGrid: LogicPuzzleCell[]): boolean => {
    if (!cell.value) return false;

    // Check row
    const rowCells = currentGrid.filter(c => c.row === cell.row && c.id !== cell.id);
    if (rowCells.some(c => c.value === cell.value)) return true;

    // Check column
    const colCells = currentGrid.filter(c => c.col === cell.col && c.id !== cell.id);
    if (colCells.some(c => c.value === cell.value)) return true;

    return false;
  };

  const isPuzzleComplete = (currentGrid: LogicPuzzleCell[]): boolean => {
    return currentGrid.every(cell => 
      cell.value !== null && !cell.isError
    );
  };

  const handleHint = () => {
    if (hints <= 0 || !selectedCell) return;

    const cellIndex = grid.findIndex(c => c.id === selectedCell);
    if (cellIndex === -1) return;

    const cell = grid[cellIndex];
    if (cell.isGiven || cell.value) return;

    // Find valid values for this cell
    const validValues = [];
    for (let num = 1; num <= gridSize; num++) {
      const testCell = { ...cell, value: num };
      if (!checkForConflicts(testCell, grid)) {
        validValues.push(num);
      }
    }

    if (validValues.length > 0) {
      const newGrid = [...grid];
      newGrid[cellIndex] = {
        ...cell,
        possibleValues: validValues
      };
      setGrid(newGrid);
      setHints(prev => prev - 1);
    }
  };

  const completeGame = (success: boolean) => {
    if (isGameComplete) return;
    
    setIsGameComplete(true);
    const endTime = new Date();
    const timeSpent = gameStartTime ? Math.floor((endTime.getTime() - gameStartTime.getTime()) / 1000) : 0;
    
    // Calculate score based on moves, time, and errors
    const totalCells = gridSize * gridSize;
    const filledCells = grid.filter(c => !c.isGiven).length;
    const efficiency = Math.max(0, ((filledCells / moves) * 100));
    const errorPenalty = errors * 10;
    const timePenalty = config.timeLimit ? Math.max(0, ((timeSpent - config.timeLimit) / config.timeLimit) * 20) : 0;
    const hintBonus = hints * 5;
    
    const score = Math.max(0, Math.round(efficiency - errorPenalty - timePenalty + hintBonus));

    const result: MinigameResult = {
      clueId,
      minigameType: config.type,
      success,
      score: success ? score : 0,
      timeSpent,
      attemptsUsed: 1,
      triggeredStoryletId: success ? config.successStoryletId : config.failureStoryletId,
      completedAt: endTime,
      details: {
        moves,
        accuracy: efficiency,
        bonusPoints: hintBonus,
        perfectRounds: errors === 0 ? 1 : 0
      }
    };

    // Show completion message briefly before triggering result
    setTimeout(() => {
      completeMinigame(result);
    }, 2000);
  };

  const getCellClassName = (cell: LogicPuzzleCell) => {
    let className = `
      aspect-square border-2 border-base-300 rounded-lg 
      flex items-center justify-center text-lg font-bold
      transition-all duration-200 cursor-pointer
      min-h-[50px] min-w-[50px]
    `;

    if (cell.isGiven) {
      className += ' bg-base-200 text-base-content font-extrabold cursor-default';
    } else if (cell.isSelected) {
      className += ' bg-primary text-primary-content ring-4 ring-primary ring-opacity-50';
    } else if (cell.isError) {
      className += ' bg-error text-error-content ring-2 ring-error';
    } else if (cell.value) {
      className += ' bg-base-100 text-base-content hover:bg-base-200';
    } else {
      className += ' bg-base-50 text-base-content hover:bg-base-100';
    }

    return className;
  };

  return (
    <div className="p-6 min-h-[500px]">
      {/* Game header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-4 text-sm">
          <div className="bg-base-200 px-3 py-2 rounded">
            <span className="font-semibold">Moves:</span> {moves}
          </div>
          <div className="bg-base-200 px-3 py-2 rounded">
            <span className="font-semibold">Errors:</span> {errors}/{maxErrors}
          </div>
          <div className="bg-base-200 px-3 py-2 rounded">
            <span className="font-semibold">Hints:</span> {hints}
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleHint}
            className="btn btn-ghost btn-sm"
            disabled={!selectedCell || hints <= 0 || isGameComplete}
          >
            💡 Hint
          </button>
          <button
            onClick={initializeGame}
            className="btn btn-ghost btn-sm"
            disabled={isGameComplete}
          >
            🔄 Reset
          </button>
        </div>
      </div>

      {/* Puzzle grid */}
      <div className="flex flex-col items-center space-y-6">
        <div 
          className="grid gap-1 p-4 bg-base-200 rounded-lg"
          style={{ 
            gridTemplateColumns: `repeat(${gridSize}, minmax(50px, 1fr))`,
            maxWidth: `${gridSize * 70}px`
          }}
        >
          {grid.map((cell) => (
            <button
              key={cell.id}
              onClick={() => handleCellClick(cell.id)}
              disabled={cell.isGiven || isGameComplete}
              className={getCellClassName(cell)}
            >
              {cell.value || ''}
            </button>
          ))}
        </div>

        {/* Number input buttons */}
        {!isGameComplete && (
          <div className="flex flex-wrap gap-2 justify-center">
            {Array.from({ length: gridSize }, (_, i) => i + 1).map(number => (
              <button
                key={number}
                onClick={() => handleNumberInput(number)}
                disabled={!selectedCell || isGameComplete}
                className="btn btn-outline btn-sm w-12 h-12"
              >
                {number}
              </button>
            ))}
            <button
              onClick={() => handleNumberInput(0)}
              disabled={!selectedCell || isGameComplete}
              className="btn btn-outline btn-sm w-12 h-12"
              title="Clear cell"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Game completion message */}
      {isGameComplete && (
        <div className="mt-6 text-center space-y-2">
          <div className={`text-xl font-bold ${errors < maxErrors ? 'text-success' : 'text-error'}`}>
            {errors < maxErrors ? '🎉 Puzzle Solved!' : '💥 Too Many Errors!'}
          </div>
          <div className="text-sm opacity-70">
            Completed in {moves} moves • {errors} errors • Score: {Math.max(0, Math.round(((gridSize * gridSize) / moves) * 100 - (errors * 10)))}%
          </div>
        </div>
      )}

      {/* Game instructions */}
      {!isGameComplete && moves === 0 && (
        <div className="mt-6 text-center space-y-2">
          <div className="text-sm opacity-60">
            💡 Fill each row and column with numbers 1-{gridSize} (no repeats)
          </div>
          <div className="text-xs opacity-50">
            Click a cell to select it, then click a number to fill it
          </div>
        </div>
      )}

      {/* Hint display */}
      {selectedCell && (
        (() => {
          const cell = grid.find(c => c.id === selectedCell);
          return cell && cell.possibleValues.length > 0 ? (
            <div className="mt-4 text-center">
              <div className="text-sm opacity-70">
                💡 Possible values: {cell.possibleValues.join(', ')}
              </div>
            </div>
          ) : null;
        })()
      )}
    </div>
  );
};