import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { MinigameConfig, MinigameResult } from '../../../types/clue';
import { useMinigameStore } from '../../../stores/useMinigameStore';

interface PatternElement {
  id: string;
  shape: 'circle' | 'square' | 'triangle' | 'diamond';
  color: string;
  size: 'small' | 'medium' | 'large';
  position: { x: number; y: number };
  isCorrect: boolean;
  isSelected: boolean;
}

interface PatternRecognitionGameProps {
  config: MinigameConfig;
  clueId: string;
}

export const PatternRecognitionGame: React.FC<PatternRecognitionGameProps> = ({
  config,
  clueId
}) => {
  const { completeMinigame } = useMinigameStore();
  
  // Game state
  const [elements, setElements] = useState<PatternElement[]>([]);
  const [selectedElements, setSelectedElements] = useState<string[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [score, setScore] = useState(0);
  const [gamePhase, setGamePhase] = useState<'ready' | 'studying' | 'playing' | 'complete'>('ready');
  const [gameStartTime, setGameStartTime] = useState<Date>();
  const [mistakes, setMistakes] = useState(0);
  const [studyTimeRemaining, setStudyTimeRemaining] = useState(0);
  
  // Game settings from config
  const patternComplexity = config.gameSettings?.patternComplexity || 3;
  const distractors = config.gameSettings?.distractors || 5;
  const maxRounds = 5;
  const maxMistakes = 3;
  const studyTime = 5000; // 5 seconds to study the pattern
  
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const studyTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Shape and color options
  const shapes: PatternElement['shape'][] = ['circle', 'square', 'triangle', 'diamond'];
  const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#f97316'];
  const sizes: PatternElement['size'][] = ['small', 'medium', 'large'];

  // Generate random position within game area
  const generateRandomPosition = useCallback(() => {
    if (!gameAreaRef.current) return { x: 50, y: 50 };
    
    const rect = gameAreaRef.current.getBoundingClientRect();
    const padding = 40;
    
    return {
      x: Math.floor(Math.random() * (rect.width - padding * 2)) + padding,
      y: Math.floor(Math.random() * (rect.height - padding * 2)) + padding
    };
  }, []);

  // Generate pattern elements based on a rule
  const generatePattern = useCallback(() => {
    const newElements: PatternElement[] = [];
    const totalElements = patternComplexity + distractors;
    
    // Define the pattern rule (e.g., all red circles, or all large shapes)
    const patternRules = [
      { type: 'color', value: colors[Math.floor(Math.random() * colors.length)] },
      { type: 'shape', value: shapes[Math.floor(Math.random() * shapes.length)] },
      { type: 'size', value: sizes[Math.floor(Math.random() * sizes.length)] },
      { type: 'color-shape', color: colors[Math.floor(Math.random() * colors.length)], shape: shapes[Math.floor(Math.random() * shapes.length)] },
      { type: 'size-color', size: sizes[Math.floor(Math.random() * sizes.length)], color: colors[Math.floor(Math.random() * colors.length)] }
    ];
    
    const rule = patternRules[Math.floor(Math.random() * patternRules.length)];
    
    // Generate correct pattern elements
    for (let i = 0; i < patternComplexity; i++) {
      const element: PatternElement = {
        id: `element-${i}`,
        shape: rule.type.includes('shape') ? rule.shape || shapes[0] : shapes[Math.floor(Math.random() * shapes.length)],
        color: rule.type.includes('color') ? rule.color || rule.value : colors[Math.floor(Math.random() * colors.length)],
        size: rule.type.includes('size') ? rule.size || rule.value : sizes[Math.floor(Math.random() * sizes.length)],
        position: generateRandomPosition(),
        isCorrect: true,
        isSelected: false
      };
      
      // Apply single-property rules
      if (rule.type === 'color') element.color = rule.value;
      if (rule.type === 'shape') element.shape = rule.value as PatternElement['shape'];
      if (rule.type === 'size') element.size = rule.value as PatternElement['size'];
      
      newElements.push(element);
    }
    
    // Generate distractor elements
    for (let i = 0; i < distractors; i++) {
      let element: PatternElement;
      let attempts = 0;
      
      // Generate distractors that don't match the pattern
      do {
        element = {
          id: `distractor-${i}`,
          shape: shapes[Math.floor(Math.random() * shapes.length)],
          color: colors[Math.floor(Math.random() * colors.length)],
          size: sizes[Math.floor(Math.random() * sizes.length)],
          position: generateRandomPosition(),
          isCorrect: false,
          isSelected: false
        };
        attempts++;
      } while (attempts < 10 && matchesRule(element, rule));
      
      newElements.push(element);
    }
    
    // Shuffle elements
    for (let i = newElements.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newElements[i], newElements[j]] = [newElements[j], newElements[i]];
    }
    
    return newElements;
  }, [patternComplexity, distractors, colors, shapes, sizes, generateRandomPosition]);

  // Check if element matches the pattern rule
  const matchesRule = (element: PatternElement, rule: any): boolean => {
    switch (rule.type) {
      case 'color':
        return element.color === rule.value;
      case 'shape':
        return element.shape === rule.value;
      case 'size':
        return element.size === rule.value;
      case 'color-shape':
        return element.color === rule.color && element.shape === rule.shape;
      case 'size-color':
        return element.size === rule.size && element.color === rule.color;
      default:
        return false;
    }
  };

  // Start a new round
  const startRound = useCallback(() => {
    setGamePhase('studying');
    setSelectedElements([]);
    setStudyTimeRemaining(studyTime);
    
    const roundElements = generatePattern();
    setElements(roundElements);
    
    // Start study timer
    studyTimerRef.current = setInterval(() => {
      setStudyTimeRemaining(prev => {
        if (prev <= 100) {
          setGamePhase('playing');
          if (studyTimerRef.current) {
            clearInterval(studyTimerRef.current);
            studyTimerRef.current = null;
          }
          return 0;
        }
        return prev - 100;
      });
    }, 100);
  }, [generatePattern, studyTime]);

  // Start the game
  const startGame = useCallback(() => {
    setGameStartTime(new Date());
    setCurrentRound(1);
    setScore(0);
    setMistakes(0);
    startRound();
  }, [startRound]);

  // Handle element selection
  const handleElementSelect = useCallback((elementId: string) => {
    if (gamePhase !== 'playing') return;
    
    const element = elements.find(e => e.id === elementId);
    if (!element) return;
    
    const isAlreadySelected = selectedElements.includes(elementId);
    
    if (isAlreadySelected) {
      // Deselect element
      setSelectedElements(prev => prev.filter(id => id !== elementId));
      setElements(prev => prev.map(e => 
        e.id === elementId ? { ...e, isSelected: false } : e
      ));
    } else {
      // Select element
      if (element.isCorrect) {
        // Correct selection
        setSelectedElements(prev => [...prev, elementId]);
        setElements(prev => prev.map(e => 
          e.id === elementId ? { ...e, isSelected: true } : e
        ));
        setScore(prev => prev + 100);
      } else {
        // Incorrect selection
        setMistakes(prev => prev + 1);
        // Show brief error feedback
        setElements(prev => prev.map(e => 
          e.id === elementId ? { ...e, isSelected: true } : e
        ));
        setTimeout(() => {
          setElements(prev => prev.map(e => 
            e.id === elementId ? { ...e, isSelected: false } : e
          ));
        }, 500);
      }
    }
  }, [gamePhase, elements, selectedElements]);

  // Check if round is complete
  useEffect(() => {
    if (gamePhase === 'playing') {
      const correctElements = elements.filter(e => e.isCorrect);
      const selectedCorrectElements = selectedElements.filter(id => 
        elements.find(e => e.id === id)?.isCorrect
      );
      
      if (selectedCorrectElements.length === correctElements.length) {
        // Round complete
        const roundBonus = Math.max(0, 500 - mistakes * 100);
        setScore(prev => prev + roundBonus);
        
        if (currentRound >= maxRounds || mistakes >= maxMistakes) {
          // Game complete
          setGamePhase('complete');
        } else {
          // Next round
          setTimeout(() => {
            setCurrentRound(prev => prev + 1);
            startRound();
          }, 1000);
        }
      }
    }
  }, [gamePhase, elements, selectedElements, currentRound, maxRounds, mistakes, maxMistakes, startRound]);

  // Complete the minigame
  useEffect(() => {
    if (gamePhase === 'complete' && gameStartTime) {
      const timeSpent = Math.floor((Date.now() - gameStartTime.getTime()) / 1000);
      const accuracy = ((currentRound - 1) * patternComplexity + selectedElements.filter(id => 
        elements.find(e => e.id === id)?.isCorrect
      ).length) / (currentRound * patternComplexity) * 100;
      
      const success = currentRound >= maxRounds && mistakes < maxMistakes && accuracy >= 70;
      
      const result: MinigameResult = {
        clueId,
        minigameType: 'pattern_recognition',
        success,
        score: Math.floor(score),
        timeSpent,
        attemptsUsed: 1,
        triggeredStoryletId: success ? config.successStoryletId : config.failureStoryletId,
        completedAt: new Date(),
        details: {
          accuracy: Math.floor(accuracy),
          bonusPoints: Math.max(0, (currentRound - 1) * 100),
          perfectRounds: mistakes === 0 ? currentRound - 1 : 0
        }
      };
      
      completeMinigame(result);
    }
  }, [gamePhase, gameStartTime, currentRound, selectedElements, elements, mistakes, score, maxRounds, maxMistakes, patternComplexity, clueId, config, completeMinigame]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (studyTimerRef.current) {
        clearInterval(studyTimerRef.current);
      }
    };
  }, []);

  // Render shape
  const renderShape = (element: PatternElement, size: number) => {
    const baseProps = {
      fill: element.color,
      stroke: element.isSelected ? '#ffffff' : '#000000',
      strokeWidth: element.isSelected ? 3 : 1
    };
    
    switch (element.shape) {
      case 'circle':
        return <circle cx={size/2} cy={size/2} r={size/2 - 2} {...baseProps} />;
      case 'square':
        return <rect x={2} y={2} width={size-4} height={size-4} {...baseProps} />;
      case 'triangle':
        return <polygon points={`${size/2},2 2,${size-2} ${size-2},${size-2}`} {...baseProps} />;
      case 'diamond':
        return <polygon points={`${size/2},2 ${size-2},${size/2} ${size/2},${size-2} 2,${size/2}`} {...baseProps} />;
      default:
        return null;
    }
  };

  const getSizePixels = (size: PatternElement['size']) => {
    switch (size) {
      case 'small': return 30;
      case 'medium': return 45;
      case 'large': return 60;
      default: return 45;
    }
  };

  return (
    <div className="p-4 min-h-[500px] flex flex-col">
      {/* Game Status */}
      <div className="bg-base-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="text-sm">
              <span className="font-semibold">Round:</span>{' '}
              {currentRound}/{maxRounds}
            </div>
            <div className="text-sm">
              <span className="font-semibold">Mistakes:</span>{' '}
              <span className={mistakes >= maxMistakes ? 'text-error' : mistakes >= 2 ? 'text-warning' : ''}>
                {mistakes}/{maxMistakes}
              </span>
            </div>
            <div className="text-sm">
              <span className="font-semibold">Score:</span>{' '}
              <span className="text-primary font-bold">{score}</span>
            </div>
            {gamePhase === 'studying' && (
              <div className="text-sm">
                <span className="font-semibold">Study Time:</span>{' '}
                <span className="text-warning">{Math.ceil(studyTimeRemaining / 1000)}s</span>
              </div>
            )}
          </div>
          
          {gamePhase === 'ready' && (
            <button 
              onClick={startGame}
              className="btn btn-primary"
            >
              Start Game
            </button>
          )}
        </div>
      </div>

      {/* Game Area */}
      <div 
        ref={gameAreaRef}
        className="flex-1 relative bg-base-100 border-2 border-base-300 rounded-lg overflow-hidden"
        style={{ minHeight: '400px' }}
      >
        {gamePhase === 'ready' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="text-2xl font-bold">Pattern Recognition Challenge</div>
              <p className="text-base-content/70 max-w-md">
                Study the pattern, then identify all elements that belong to it. 
                Look for common properties like color, shape, or size.
              </p>
              <div className="text-sm opacity-60">
                Complexity: {patternComplexity} | Distractors: {distractors}
              </div>
              <div className="text-xs opacity-60 mt-2">
                Success requires completing all rounds with fewer than {maxMistakes} mistakes
              </div>
            </div>
          </div>
        )}

        {gamePhase === 'studying' && (
          <div className="absolute inset-0 bg-blue-50 bg-opacity-50">
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-primary text-primary-content px-4 py-2 rounded-full">
              Study the pattern! Time remaining: {Math.ceil(studyTimeRemaining / 1000)}s
            </div>
          </div>
        )}

        {gamePhase === 'playing' && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-secondary text-secondary-content px-4 py-2 rounded-full">
            Select all elements that match the pattern
          </div>
        )}

        {/* Render pattern elements */}
        {elements.map((element) => {
          const sizePixels = getSizePixels(element.size);
          return (
            <button
              key={element.id}
              className={`absolute transition-all duration-200 hover:scale-110 ${
                element.isSelected 
                  ? (element.isCorrect ? 'ring-4 ring-success' : 'ring-4 ring-error') 
                  : 'hover:ring-2 hover:ring-base-content'
              }`}
              style={{
                left: element.position.x - sizePixels/2,
                top: element.position.y - sizePixels/2,
                width: sizePixels,
                height: sizePixels
              }}
              onClick={() => handleElementSelect(element.id)}
              disabled={gamePhase !== 'playing'}
            >
              <svg width={sizePixels} height={sizePixels} className="w-full h-full">
                {renderShape(element, sizePixels)}
              </svg>
            </button>
          );
        })}

        {gamePhase === 'complete' && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-base-100 rounded-lg p-8 text-center space-y-4 max-w-md">
              <div className="text-2xl font-bold">
                {currentRound >= maxRounds && mistakes < maxMistakes ? (
                  <span className="text-success">Pattern Master!</span>
                ) : mistakes >= maxMistakes ? (
                  <span className="text-error">Too Many Mistakes</span>
                ) : (
                  <span className="text-warning">Good Effort</span>
                )}
              </div>
              
              <div className="space-y-2 text-sm">
                <div>Rounds Completed: <span className="font-bold">{currentRound - 1}/{maxRounds}</span></div>
                <div>Mistakes: <span className="font-bold">{mistakes}/{maxMistakes}</span></div>
                <div>Final Score: <span className="font-bold text-primary">{score}</span></div>
              </div>
              
              <div className="text-xs opacity-60">
                Success requires completing all rounds with fewer than {maxMistakes} mistakes
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 text-center text-sm opacity-70">
        <p>Study the pattern during the blue phase, then select matching elements.</p>
        <p>Look for common properties: same color, shape, size, or combinations.</p>
      </div>
    </div>
  );
};