import React, { useState, useEffect, useCallback } from 'react';
import type { MinigameConfig, MinigameResult } from '../../../types/clue';
import { useMinigameStore } from '../../../stores/useMinigameStore';

interface WordPuzzleCell {
  id: string;
  letter: string;
  isRevealed: boolean;
  isCorrect: boolean;
  wordIndex: number;
  letterIndex: number;
}

interface WordPuzzleWord {
  id: string;
  word: string;
  clue: string;
  direction: 'horizontal' | 'vertical';
  startRow: number;
  startCol: number;
  isComplete: boolean;
  letters: string[];
}

interface WordPuzzleGameProps {
  config: MinigameConfig;
  clueId: string;
}

export const WordPuzzleGame: React.FC<WordPuzzleGameProps> = ({
  config,
  clueId
}) => {
  const { completeMinigame } = useMinigameStore();
  
  // Game state
  const [grid, setGrid] = useState<WordPuzzleCell[][]>([]);
  const [words, setWords] = useState<WordPuzzleWord[]>([]);
  const [selectedCell, setSelectedCell] = useState<{row: number, col: number} | null>(null);
  const [currentInput, setCurrentInput] = useState('');
  const [gamePhase, setGamePhase] = useState<'playing' | 'complete'>('playing');
  const [mistakes, setMistakes] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [gameStartTime, setGameStartTime] = useState<Date>();

  // Game settings from config
  const gridSize = config.gameSettings.gridSize || 10;
  const maxMistakes = config.gameSettings.maxMistakes || 5;
  const maxHints = config.gameSettings.maxHints || 3;
  const difficulty = config.difficulty || 'medium';

  // Word sets based on difficulty
  const wordSets = {
    easy: [
      { word: 'CAT', clue: 'Feline pet' },
      { word: 'DOG', clue: 'Canine companion' },
      { word: 'SUN', clue: 'Bright star' },
      { word: 'TREE', clue: 'Tall plant with branches' },
      { word: 'BOOK', clue: 'Collection of pages' }
    ],
    medium: [
      { word: 'MYSTERY', clue: 'Unsolved puzzle' },
      { word: 'CLUE', clue: 'Hint or evidence' },
      { word: 'STORY', clue: 'Narrative tale' },
      { word: 'PUZZLE', clue: 'Brain teaser' },
      { word: 'DETECTIVE', clue: 'Crime investigator' },
      { word: 'SECRET', clue: 'Hidden information' }
    ],
    hard: [
      { word: 'INVESTIGATION', clue: 'Systematic inquiry' },
      { word: 'EVIDENCE', clue: 'Proof of facts' },
      { word: 'REVELATION', clue: 'Surprising discovery' },
      { word: 'CONSPIRACY', clue: 'Secret plot' },
      { word: 'PHENOMENON', clue: 'Observable occurrence' },
      { word: 'ANALYSIS', clue: 'Detailed examination' }
    ]
  };

  // Initialize game
  useEffect(() => {
    initializeGame();
    setGameStartTime(new Date());
  }, [config]);

  const initializeGame = () => {
    const selectedWords = selectWordsForDifficulty();
    const { grid: newGrid, words: placedWords } = generatePuzzleGrid(selectedWords);
    
    setGrid(newGrid);
    setWords(placedWords);
    setSelectedCell(null);
    setCurrentInput('');
    setGamePhase('playing');
    setMistakes(0);
    setHintsUsed(0);
  };

  const selectWordsForDifficulty = (): Array<{word: string, clue: string}> => {
    const wordSet = wordSets[difficulty] || wordSets.medium;
    const wordCount = difficulty === 'easy' ? 3 : difficulty === 'medium' ? 4 : 5;
    
    // Shuffle and take first N words
    const shuffled = [...wordSet].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, wordCount);
  };

  const generatePuzzleGrid = (selectedWords: Array<{word: string, clue: string}>) => {
    // Initialize empty grid
    const newGrid: WordPuzzleCell[][] = Array(gridSize).fill(null).map((_, row) =>
      Array(gridSize).fill(null).map((_, col) => ({
        id: `cell-${row}-${col}`,
        letter: '',
        isRevealed: false,
        isCorrect: false,
        wordIndex: -1,
        letterIndex: -1
      }))
    );

    const placedWords: WordPuzzleWord[] = [];

    // Simple word placement algorithm
    selectedWords.forEach((wordData, wordIndex) => {
      const word = wordData.word.toUpperCase();
      let placed = false;
      let attempts = 0;
      
      while (!placed && attempts < 50) {
        const direction = Math.random() > 0.5 ? 'horizontal' : 'vertical';
        const maxStartRow = direction === 'vertical' ? Math.max(0, gridSize - word.length) : gridSize - 1;
        const maxStartCol = direction === 'horizontal' ? Math.max(0, gridSize - word.length) : gridSize - 1;
        
        if (maxStartRow < 0 || maxStartCol < 0) {
          attempts++;
          continue; // Word too long for grid
        }
        
        const startRow = Math.floor(Math.random() * (maxStartRow + 1));
        const startCol = Math.floor(Math.random() * (maxStartCol + 1));
        
        // Check if word can be placed
        let canPlace = true;
        for (let i = 0; i < word.length; i++) {
          const row = direction === 'vertical' ? startRow + i : startRow;
          const col = direction === 'horizontal' ? startCol + i : startCol;
          
          // Bounds check
          if (row >= gridSize || col >= gridSize || row < 0 || col < 0) {
            canPlace = false;
            break;
          }
          
          if (newGrid[row][col].letter !== '' && newGrid[row][col].letter !== word[i]) {
            canPlace = false;
            break;
          }
        }
        
        if (canPlace) {
          // Place the word
          const wordLetters: string[] = [];
          for (let i = 0; i < word.length; i++) {
            const row = direction === 'vertical' ? startRow + i : startRow;
            const col = direction === 'horizontal' ? startCol + i : startCol;
            
            newGrid[row][col] = {
              ...newGrid[row][col],
              letter: word[i],
              wordIndex,
              letterIndex: i
            };
            wordLetters.push(word[i]);
          }
          
          placedWords.push({
            id: `word-${wordIndex}`,
            word,
            clue: wordData.clue,
            direction,
            startRow,
            startCol,
            isComplete: false,
            letters: wordLetters
          });
          
          placed = true;
        }
        attempts++;
      }
    });

    return { grid: newGrid, words: placedWords };
  };

  const handleCellClick = (row: number, col: number) => {
    if (gamePhase !== 'playing') return;
    if (grid[row][col].letter === '') return; // Only allow clicks on cells with letters
    
    setSelectedCell({ row, col });
    setCurrentInput('');
  };

  const handleInputChange = (value: string) => {
    if (gamePhase !== 'playing' || !selectedCell) return;
    
    const upperValue = value.toUpperCase();
    setCurrentInput(upperValue);
    
    // Auto-submit single character
    if (upperValue.length === 1) {
      submitLetter(upperValue);
    }
  };

  const submitLetter = (letter: string) => {
    if (!selectedCell || gamePhase !== 'playing') return;
    
    const { row, col } = selectedCell;
    const cell = grid[row][col];
    const correctLetter = cell.letter;
    
    if (letter === correctLetter) {
      // Correct letter
      setGrid(prev => prev.map((gridRow, r) =>
        gridRow.map((gridCell, c) => {
          if (r === row && c === col) {
            return { ...gridCell, isRevealed: true, isCorrect: true };
          }
          return gridCell;
        })
      ));
      
      // Check if word is complete
      checkWordCompletion(cell.wordIndex);
      
      // Move to next cell or clear selection
      setSelectedCell(null);
      setCurrentInput('');
    } else {
      // Incorrect letter
      const newMistakes = mistakes + 1;
      setMistakes(newMistakes);
      
      // Visual feedback for mistake
      setGrid(prev => prev.map((gridRow, r) =>
        gridRow.map((gridCell, c) => {
          if (r === row && c === col) {
            return { ...gridCell, isCorrect: false };
          }
          return gridCell;
        })
      ));
      
      // Clear incorrect feedback after delay
      setTimeout(() => {
        setGrid(prev => prev.map((gridRow, r) =>
          gridRow.map((gridCell, c) => {
            if (r === row && c === col && !gridCell.isRevealed) {
              return { ...gridCell, isCorrect: true };
            }
            return gridCell;
          })
        ));
      }, 1000);
      
      if (newMistakes >= maxMistakes) {
        completeGame(false);
      }
      
      setCurrentInput('');
    }
  };

  const checkWordCompletion = (wordIndex: number) => {
    const word = words[wordIndex];
    if (!word) return;
    
    let allRevealed = true;
    for (let i = 0; i < word.word.length; i++) {
      const row = word.direction === 'vertical' ? word.startRow + i : word.startRow;
      const col = word.direction === 'horizontal' ? word.startCol + i : word.startCol;
      
      if (!grid[row][col].isRevealed) {
        allRevealed = false;
        break;
      }
    }
    
    if (allRevealed) {
      setWords(prev => prev.map(w => 
        w.id === word.id ? { ...w, isComplete: true } : w
      ));
      
      // Check if all words are complete
      const updatedWords = words.map(w => 
        w.id === word.id ? { ...w, isComplete: true } : w
      );
      
      if (updatedWords.every(w => w.isComplete)) {
        setTimeout(() => completeGame(true), 500);
      }
    }
  };

  const useHint = () => {
    if (hintsUsed >= maxHints || gamePhase !== 'playing') return;
    
    // Find first unrevealed letter
    for (const word of words) {
      if (word.isComplete) continue;
      
      for (let i = 0; i < word.word.length; i++) {
        const row = word.direction === 'vertical' ? word.startRow + i : word.startRow;
        const col = word.direction === 'horizontal' ? word.startCol + i : word.startCol;
        
        if (!grid[row][col].isRevealed) {
          setGrid(prev => prev.map((gridRow, r) =>
            gridRow.map((gridCell, c) => {
              if (r === row && c === col) {
                return { ...gridCell, isRevealed: true, isCorrect: true };
              }
              return gridCell;
            })
          ));
          
          setHintsUsed(prev => prev + 1);
          checkWordCompletion(words.findIndex(w => w.id === word.id));
          return;
        }
      }
    }
  };

  const completeGame = (success: boolean) => {
    setGamePhase('complete');
    const endTime = new Date();
    const timeSpent = gameStartTime ? Math.floor((endTime.getTime() - gameStartTime.getTime()) / 1000) : 0;
    
    // Calculate score
    const completedWords = words.filter(w => w.isComplete).length;
    const totalWords = words.length;
    const completionBonus = (completedWords / totalWords) * 70;
    const mistakesPenalty = mistakes * 5;
    const hintsPenalty = hintsUsed * 10;
    const timeBonus = config.timeLimit ? Math.max(0, ((config.timeLimit - timeSpent) / config.timeLimit) * 20) : 0;
    
    const score = Math.max(0, Math.round(completionBonus - mistakesPenalty - hintsPenalty + timeBonus));

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
        wordsCompleted: completedWords,
        totalWords,
        mistakes,
        hintsUsed,
        accuracy: Math.max(0, 100 - (mistakes / Math.max(completedWords * words[0]?.word.length || 1, 1)) * 100),
        bonusPoints: timeBonus
      }
    };

    setTimeout(() => {
      completeMinigame(result);
    }, 2000);
  };

  const getCellClass = (cell: WordPuzzleCell, row: number, col: number) => {
    const baseClass = `
      w-8 h-8 border border-gray-300 flex items-center justify-center
      text-sm font-bold cursor-pointer transition-all duration-200
    `;
    
    const isEmpty = cell.letter === '';
    const isSelected = selectedCell?.row === row && selectedCell?.col === col;
    const isRevealed = cell.isRevealed;
    
    let bgClass = 'bg-white hover:bg-gray-50';
    if (isEmpty) {
      bgClass = 'bg-gray-100 cursor-default';
    } else if (isSelected) {
      bgClass = 'bg-blue-200 ring-2 ring-blue-400';
    } else if (isRevealed) {
      bgClass = 'bg-green-100';
    }
    
    if (!cell.isCorrect && !isEmpty) {
      bgClass += ' bg-red-100';
    }
    
    return `${baseClass} ${bgClass}`;
  };

  return (
    <div className="p-6 min-h-[500px]">
      {/* Game header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-4 text-sm">
          <div className="bg-base-200 px-3 py-2 rounded">
            <span className="font-semibold">Mistakes:</span> {mistakes}/{maxMistakes}
          </div>
          <div className="bg-base-200 px-3 py-2 rounded">
            <span className="font-semibold">Hints:</span> {hintsUsed}/{maxHints}
          </div>
          <div className="bg-base-200 px-3 py-2 rounded">
            <span className="font-semibold">Words:</span> {words.filter(w => w.isComplete).length}/{words.length}
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={useHint}
            className="btn btn-info btn-sm"
            disabled={hintsUsed >= maxHints || gamePhase !== 'playing'}
          >
            💡 Hint ({maxHints - hintsUsed} left)
          </button>
          <button
            onClick={initializeGame}
            className="btn btn-ghost btn-sm"
            disabled={gamePhase === 'complete'}
          >
            🔄 Reset
          </button>
        </div>
      </div>

      {/* Game status */}
      <div className="text-center mb-6">
        {gamePhase === 'playing' && (
          <div className="space-y-2">
            <div className="text-lg font-semibold">
              🔤 Word Puzzle Challenge
            </div>
            <div className="text-sm opacity-70">
              Click on letter cells and type the correct letter
            </div>
          </div>
        )}
        
        {gamePhase === 'complete' && (
          <div className="space-y-2">
            <div className={`text-xl font-bold ${mistakes < maxMistakes ? 'text-success' : 'text-error'}`}>
              {mistakes < maxMistakes ? '🎉 Puzzle Solved!' : '💥 Too Many Mistakes!'}
            </div>
            <div className="text-sm opacity-70">
              Completed {words.filter(w => w.isComplete).length} out of {words.length} words
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-6">
        {/* Puzzle grid */}
        <div className="flex-1">
          <div className="bg-white p-4 rounded-lg shadow-md inline-block">
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}>
              {grid.map((row, rowIndex) =>
                row.map((cell, colIndex) => (
                  <div
                    key={cell.id}
                    className={getCellClass(cell, rowIndex, colIndex)}
                    onClick={() => handleCellClick(rowIndex, colIndex)}
                  >
                    {cell.isRevealed ? cell.letter : (cell.letter ? '?' : '')}
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Input area */}
          {selectedCell && gamePhase === 'playing' && (
            <div className="mt-4 p-4 bg-base-200 rounded-lg">
              <div className="text-sm mb-2">
                Enter letter for position ({selectedCell.row + 1}, {selectedCell.col + 1}):
              </div>
              <input
                type="text"
                maxLength={1}
                value={currentInput}
                onChange={(e) => handleInputChange(e.target.value)}
                className="input input-bordered w-16 text-center text-lg font-bold"
                autoFocus
                placeholder="?"
              />
              <button
                onClick={() => submitLetter(currentInput)}
                className="btn btn-primary btn-sm ml-2"
                disabled={!currentInput}
              >
                Submit
              </button>
            </div>
          )}
        </div>

        {/* Word clues */}
        <div className="w-64">
          <div className="bg-base-200 p-4 rounded-lg">
            <div className="font-semibold mb-3">Word Clues:</div>
            <div className="space-y-3">
              {words.map((word, index) => (
                <div
                  key={word.id}
                  className={`p-3 rounded border-l-4 ${
                    word.isComplete 
                      ? 'border-green-500 bg-green-50' 
                      : 'border-blue-500 bg-white'
                  }`}
                >
                  <div className="font-medium text-sm">
                    {index + 1}. {word.direction === 'horizontal' ? '→' : '↓'} ({word.word.length} letters)
                  </div>
                  <div className="text-sm opacity-70 mt-1">
                    {word.clue}
                  </div>
                  {word.isComplete && (
                    <div className="text-green-600 font-bold text-sm mt-1">
                      ✓ {word.word}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Instructions */}
      {gamePhase === 'playing' && (
        <div className="mt-6 text-center space-y-2">
          <div className="text-sm opacity-60">
            💡 Click on any letter cell (marked with ?) to reveal and enter the correct letter
          </div>
          <div className="text-xs opacity-50">
            Use the word clues on the right to help solve the puzzle
          </div>
        </div>
      )}
    </div>
  );
};