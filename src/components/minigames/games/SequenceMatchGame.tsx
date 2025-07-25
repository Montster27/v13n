import React, { useState, useEffect, useCallback } from 'react';
import type { MinigameConfig, MinigameResult } from '../../../types/clue';
import { useMinigameStore } from '../../../stores/useMinigameStore';

interface SequenceStep {
  id: string;
  value: number;
  color: string;
  position: number;
  isActive: boolean;
  isPressed: boolean;
}

interface SequenceMatchGameProps {
  config: MinigameConfig;
  clueId: string;
}

export const SequenceMatchGame: React.FC<SequenceMatchGameProps> = ({
  config,
  clueId
}) => {
  const { completeMinigame } = useMinigameStore();
  
  // Game state
  const [sequence, setSequence] = useState<SequenceStep[]>([]);
  const [playerSequence, setPlayerSequence] = useState<number[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [gamePhase, setGamePhase] = useState<'showing' | 'waiting' | 'playing' | 'complete'>('waiting');
  const [round, setRound] = useState(1);
  const [mistakes, setMistakes] = useState(0);
  const [gameStartTime, setGameStartTime] = useState<Date>();

  // Game settings from config
  const maxRounds = 5;
  const sequenceLength = config.gameSettings.sequenceLength || 4;
  const showTime = config.gameSettings.showTime || 1000; // Time each step is shown
  const maxMistakes = 3;

  // Color palette for sequence steps
  const colors = [
    '#ef4444', // red
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // yellow
    '#8b5cf6', // purple
    '#f97316', // orange
    '#06b6d4', // cyan
    '#84cc16'  // lime
  ];

  // Initialize game
  useEffect(() => {
    initializeGame();
    setGameStartTime(new Date());
  }, [config]);

  const initializeGame = () => {
    generateNewSequence();
    setPlayerSequence([]);
    setCurrentStep(0);
    setGamePhase('waiting');
    setRound(1);
    setMistakes(0);
  };

  const generateNewSequence = useCallback(() => {
    // Generate sequence based on current round (progressively longer)
    const currentLength = Math.min(sequenceLength + round - 1, 8);
    const newSequence: SequenceStep[] = [];
    
    for (let i = 0; i < currentLength; i++) {
      const value = Math.floor(Math.random() * Math.min(4 + round, 8)); // More colors as rounds progress
      newSequence.push({
        id: `step-${i}`,
        value,
        color: colors[value],
        position: i,
        isActive: false,
        isPressed: false
      });
    }
    
    setSequence(newSequence);
  }, [round, sequenceLength]);

  const startSequenceDisplay = useCallback(() => {
    setGamePhase('showing');
    setCurrentStep(0);
    
    const showSequence = async () => {
      for (let i = 0; i < sequence.length; i++) {
        // Activate current step
        setSequence(prev => prev.map((step, index) => ({
          ...step,
          isActive: index === i
        })));
        
        await new Promise(resolve => setTimeout(resolve, showTime));
        
        // Deactivate step
        setSequence(prev => prev.map(step => ({
          ...step,
          isActive: false
        })));
        
        await new Promise(resolve => setTimeout(resolve, 200)); // Brief pause between steps
      }
      
      // Start player input phase
      setGamePhase('playing');
      setPlayerSequence([]);
    };
    
    showSequence();
  }, [sequence, showTime]);

  const handleColorPress = useCallback((colorValue: number) => {
    if (gamePhase !== 'playing') return;
    
    const newPlayerSequence = [...playerSequence, colorValue];
    setPlayerSequence(newPlayerSequence);
    
    // Visual feedback for button press
    const buttonId = `color-${colorValue}`;
    const button = document.getElementById(buttonId);
    if (button) {
      button.classList.add('scale-95');
      setTimeout(() => {
        button.classList.remove('scale-95');
      }, 150);
    }
    
    // Check if the step is correct
    const currentStepIndex = newPlayerSequence.length - 1;
    const correctValue = sequence[currentStepIndex]?.value;
    
    if (colorValue === correctValue) {
      // Correct step
      if (newPlayerSequence.length === sequence.length) {
        // Sequence completed successfully
        handleSequenceComplete();
      }
    } else {
      // Mistake made
      handleMistake();
    }
  }, [gamePhase, playerSequence, sequence]);

  const handleSequenceComplete = () => {
    if (round >= maxRounds) {
      // Game completed successfully
      completeGame(true);
    } else {
      // Next round
      setRound(prev => prev + 1);
      setGamePhase('waiting');
      setPlayerSequence([]);
      setTimeout(() => {
        generateNewSequence();
      }, 1000);
    }
  };

  const handleMistake = () => {
    const newMistakes = mistakes + 1;
    setMistakes(newMistakes);
    
    // Visual feedback for mistake
    document.body.classList.add('animate-pulse');
    setTimeout(() => {
      document.body.classList.remove('animate-pulse');
    }, 300);
    
    if (newMistakes >= maxMistakes) {
      // Game over
      completeGame(false);
    } else {
      // Reset current sequence attempt
      setPlayerSequence([]);
      setGamePhase('waiting');
      setTimeout(() => {
        startSequenceDisplay();
      }, 1000);
    }
  };

  const completeGame = (success: boolean) => {
    setGamePhase('complete');
    const endTime = new Date();
    const timeSpent = gameStartTime ? Math.floor((endTime.getTime() - gameStartTime.getTime()) / 1000) : 0;
    
    // Calculate score based on rounds completed, mistakes, and time
    const roundsCompleted = success ? maxRounds : round - 1;
    const roundBonus = (roundsCompleted / maxRounds) * 60;
    const mistakesPenalty = mistakes * 10;
    const timeBonus = config.timeLimit ? Math.max(0, ((config.timeLimit - timeSpent) / config.timeLimit) * 20) : 0;
    
    const score = Math.max(0, Math.round(roundBonus - mistakesPenalty + timeBonus));

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
        moves: roundsCompleted,
        accuracy: Math.max(0, 100 - (mistakes / Math.max(round, 1)) * 100),
        bonusPoints: timeBonus,
        perfectRounds: mistakes === 0 ? 1 : 0
      }
    };

    // Show completion message briefly before triggering result
    setTimeout(() => {
      completeMinigame(result);
    }, 2000);
  };

  // Effect to generate new sequence when round changes
  useEffect(() => {
    if (round > 1) {
      generateNewSequence();
    }
  }, [round, generateNewSequence]);

  const getColorButtonClass = (colorValue: number) => {
    const baseClass = `
      w-20 h-20 rounded-lg font-bold text-white text-lg
      transition-all duration-150 cursor-pointer
      hover:scale-105 active:scale-95
      flex items-center justify-center
      border-4 border-white/30
      shadow-lg
    `;
    
    return `${baseClass} ${gamePhase === 'playing' ? '' : 'cursor-not-allowed opacity-60'}`;
  };

  return (
    <div className="p-6 min-h-[500px]">
      {/* Game header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-4 text-sm">
          <div className="bg-base-200 px-3 py-2 rounded">
            <span className="font-semibold">Round:</span> {round}/{maxRounds}
          </div>
          <div className="bg-base-200 px-3 py-2 rounded">
            <span className="font-semibold">Mistakes:</span> {mistakes}/{maxMistakes}
          </div>
          <div className="bg-base-200 px-3 py-2 rounded">
            <span className="font-semibold">Sequence:</span> {playerSequence.length}/{sequence.length}
          </div>
        </div>
        
        <button
          onClick={initializeGame}
          className="btn btn-ghost btn-sm"
          disabled={gamePhase === 'complete'}
        >
          🔄 Reset
        </button>
      </div>

      {/* Game status and controls */}
      <div className="text-center mb-8">
        {gamePhase === 'waiting' && (
          <div className="space-y-4">
            <div className="text-xl font-bold">
              Round {round}
            </div>
            <div className="text-sm opacity-70">
              Watch the sequence, then repeat it
            </div>
            <button
              onClick={startSequenceDisplay}
              className="btn btn-primary"
            >
              Start Sequence
            </button>
          </div>
        )}
        
        {gamePhase === 'showing' && (
          <div className="space-y-2">
            <div className="text-lg font-semibold text-primary">
              👀 Watch the sequence!
            </div>
            <div className="text-sm opacity-70">
              Memorize the order of colors
            </div>
          </div>
        )}
        
        {gamePhase === 'playing' && (
          <div className="space-y-2">
            <div className="text-lg font-semibold text-success">
              🎯 Your turn!
            </div>
            <div className="text-sm opacity-70">
              Click the colors in the same order ({playerSequence.length}/{sequence.length})
            </div>
          </div>
        )}
        
        {gamePhase === 'complete' && (
          <div className="space-y-2">
            <div className={`text-xl font-bold ${mistakes < maxMistakes ? 'text-success' : 'text-error'}`}>
              {mistakes < maxMistakes ? '🎉 Sequence Mastered!' : '💥 Too Many Mistakes!'}
            </div>
            <div className="text-sm opacity-70">
              Completed {round - (mistakes >= maxMistakes ? 1 : 0)} out of {maxRounds} rounds
            </div>
          </div>
        )}
      </div>

      {/* Color buttons */}
      <div className="flex flex-wrap gap-4 justify-center mb-6">
        {colors.slice(0, Math.min(4 + round, 8)).map((color, index) => (
          <button
            key={index}
            id={`color-${index}`}
            onClick={() => handleColorPress(index)}
            disabled={gamePhase !== 'playing'}
            className={getColorButtonClass(index)}
            style={{ backgroundColor: color }}
          >
            {index + 1}
          </button>
        ))}
      </div>

      {/* Sequence display area */}
      <div className="bg-base-200 rounded-lg p-4 mb-6">
        <div className="text-center mb-4">
          <span className="font-semibold">Sequence Progress:</span>
        </div>
        
        <div className="flex flex-wrap gap-2 justify-center">
          {sequence.map((step, index) => (
            <div
              key={step.id}
              className={`
                w-8 h-8 rounded-full border-2 transition-all duration-300
                flex items-center justify-center text-white text-sm font-bold
                ${step.isActive 
                  ? 'ring-4 ring-white ring-opacity-70 scale-110' 
                  : ''
                }
                ${index < playerSequence.length 
                  ? 'border-green-400' 
                  : 'border-gray-400'
                }
              `}
              style={{ 
                backgroundColor: step.color,
                opacity: gamePhase === 'showing' || gamePhase === 'complete' ? 1 : 0.3
              }}
            >
              {index + 1}
            </div>
          ))}
        </div>
        
        {playerSequence.length > 0 && (
          <div className="mt-4 text-center text-sm opacity-70">
            Your sequence: {playerSequence.map(val => val + 1).join(' → ')}
          </div>
        )}
      </div>

      {/* Game instructions */}
      {gamePhase === 'waiting' && round === 1 && (
        <div className="text-center space-y-2">
          <div className="text-sm opacity-60">
            💡 Watch carefully as colors light up in sequence
          </div>
          <div className="text-xs opacity-50">
            Then click the colors in the same order to advance
          </div>
        </div>
      )}
    </div>
  );
};