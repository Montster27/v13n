import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { MinigameConfig, MinigameResult } from '../../../types/clue';
import { useMinigameStore } from '../../../stores/useMinigameStore';

interface ReactionTimeTarget {
  id: string;
  x: number;
  y: number;
  isActive: boolean;
  appearTime: number;
  clickTime?: number;
  reactionTime?: number;
}

interface ReactionTimeGameProps {
  config: MinigameConfig;
  clueId: string;
}

export const ReactionTimeGame: React.FC<ReactionTimeGameProps> = ({
  config,
  clueId
}) => {
  const { completeMinigame } = useMinigameStore();
  
  // Game state
  const [targets, setTargets] = useState<ReactionTimeTarget[]>([]);
  const [currentTargetIndex, setCurrentTargetIndex] = useState(0);
  const [gamePhase, setGamePhase] = useState<'ready' | 'waiting' | 'active' | 'complete'>('ready');
  const [gameStartTime, setGameStartTime] = useState<Date>();
  const [reactionTimes, setReactionTimes] = useState<number[]>([]);
  const [missedTargets, setMissedTargets] = useState<number>(0);
  const [score, setScore] = useState(0);
  
  // Game settings from config
  const targetCount = config.gameSettings.targetCount || 8;
  const randomDelay = config.gameSettings.randomDelay !== false; // Default true
  const targetTimeout = 2000; // Time before target disappears
  const minDelay = 1000; // Minimum delay between targets
  const maxDelay = 3000; // Maximum delay between targets
  
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const targetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Generate random position for target
  const generateRandomPosition = useCallback(() => {
    if (!gameAreaRef.current) return { x: 50, y: 50 };
    
    const rect = gameAreaRef.current.getBoundingClientRect();
    const padding = 50; // Keep targets away from edges
    
    return {
      x: Math.floor(Math.random() * (rect.width - padding * 2)) + padding,
      y: Math.floor(Math.random() * (rect.height - padding * 2)) + padding
    };
  }, []);

  // Start the game
  const startGame = useCallback(() => {
    setGamePhase('waiting');
    setGameStartTime(new Date());
    setCurrentTargetIndex(0);
    setReactionTimes([]);
    setMissedTargets(0);
    setScore(0);
    setTargets([]);
    
    // Generate all targets upfront
    const newTargets: ReactionTimeTarget[] = [];
    for (let i = 0; i < targetCount; i++) {
      const position = generateRandomPosition();
      newTargets.push({
        id: `target-${i}`,
        x: position.x,
        y: position.y,
        isActive: false,
        appearTime: 0
      });
    }
    setTargets(newTargets);
    
    // Show first target after initial delay
    const initialDelay = randomDelay ? 
      Math.random() * (maxDelay - minDelay) + minDelay : 
      minDelay;
    
    timeoutRef.current = setTimeout(() => {
      showNextTarget(newTargets, 0);
    }, initialDelay);
  }, [targetCount, randomDelay, generateRandomPosition]);

  // Show the next target
  const showNextTarget = useCallback((targetList: ReactionTimeTarget[], index: number) => {
    if (index >= targetList.length) {
      // Game complete
      setGamePhase('complete');
      return;
    }

    const now = Date.now();
    const updatedTargets = targetList.map((target, i) => 
      i === index 
        ? { ...target, isActive: true, appearTime: now }
        : { ...target, isActive: false }
    );
    
    setTargets(updatedTargets);
    setCurrentTargetIndex(index);
    
    // Set timeout for target to disappear (missed target)
    targetTimeoutRef.current = setTimeout(() => {
      // Target was missed
      setMissedTargets(prev => prev + 1);
      
      // Move to next target
      const nextDelay = randomDelay ? 
        Math.random() * (maxDelay - minDelay) + minDelay : 
        minDelay;
      
      timeoutRef.current = setTimeout(() => {
        showNextTarget(updatedTargets, index + 1);
      }, nextDelay);
    }, targetTimeout);
    
  }, [randomDelay, targetTimeout, minDelay, maxDelay]);

  // Handle target click
  const handleTargetClick = useCallback((targetId: string) => {
    const target = targets.find(t => t.id === targetId);
    if (!target || !target.isActive) return;
    
    const clickTime = Date.now();
    const reactionTime = clickTime - target.appearTime;
    
    // Clear the timeout for this target
    if (targetTimeoutRef.current) {
      clearTimeout(targetTimeoutRef.current);
      targetTimeoutRef.current = null;
    }
    
    // Update target with click info
    const updatedTargets = targets.map(t => 
      t.id === targetId 
        ? { ...t, isActive: false, clickTime, reactionTime }
        : t
    );
    setTargets(updatedTargets);
    
    // Add reaction time to list
    setReactionTimes(prev => [...prev, reactionTime]);
    
    // Calculate score based on reaction time (faster = higher score)
    const maxPoints = 100;
    const reactionScore = Math.max(0, maxPoints - Math.floor(reactionTime / 10));
    setScore(prev => prev + reactionScore);
    
    // Move to next target after delay
    const nextDelay = randomDelay ? 
      Math.random() * (maxDelay - minDelay) + minDelay : 
      minDelay;
    
    timeoutRef.current = setTimeout(() => {
      showNextTarget(updatedTargets, currentTargetIndex + 1);
    }, nextDelay);
    
  }, [targets, currentTargetIndex, randomDelay, minDelay, maxDelay]);

  // Complete the minigame
  useEffect(() => {
    if (gamePhase === 'complete' && gameStartTime) {
      const timeSpent = Math.floor((Date.now() - gameStartTime.getTime()) / 1000);
      const averageReactionTime = reactionTimes.length > 0 
        ? reactionTimes.reduce((sum, time) => sum + time, 0) / reactionTimes.length 
        : 0;
      
      const hitTargets = reactionTimes.length;
      const accuracy = (hitTargets / targetCount) * 100;
      const success = accuracy >= 70 && averageReactionTime < 800; // Success criteria
      
      const result: MinigameResult = {
        clueId,
        minigameType: 'reaction_time',
        success,
        score: Math.floor(score),
        timeSpent,
        attemptsUsed: 1,
        triggeredStoryletId: success ? config.successStoryletId : config.failureStoryletId,
        completedAt: new Date(),
        details: {
          accuracy: Math.floor(accuracy),
          bonusPoints: hitTargets * 10,
          perfectRounds: reactionTimes.filter(time => time < 400).length // Under 400ms
        }
      };
      
      completeMinigame(result);
    }
  }, [gamePhase, gameStartTime, reactionTimes, score, targetCount, missedTargets, clueId, config, completeMinigame]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (targetTimeoutRef.current) clearTimeout(targetTimeoutRef.current);
    };
  }, []);

  // Calculate stats for display
  const averageReactionTime = reactionTimes.length > 0 
    ? Math.floor(reactionTimes.reduce((sum, time) => sum + time, 0) / reactionTimes.length)
    : 0;
  const hitTargets = reactionTimes.length;
  const accuracy = targetCount > 0 ? Math.floor((hitTargets / targetCount) * 100) : 0;

  return (
    <div className="p-4 min-h-[500px] flex flex-col">
      {/* Game Status */}
      <div className="bg-base-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="text-sm">
              <span className="font-semibold">Targets:</span>{' '}
              {hitTargets}/{targetCount}
            </div>
            <div className="text-sm">
              <span className="font-semibold">Missed:</span>{' '}
              <span className={missedTargets > 3 ? 'text-error' : ''}>{missedTargets}</span>
            </div>
            <div className="text-sm">
              <span className="font-semibold">Accuracy:</span>{' '}
              <span className={accuracy >= 70 ? 'text-success' : accuracy >= 50 ? 'text-warning' : 'text-error'}>
                {accuracy}%
              </span>
            </div>
            <div className="text-sm">
              <span className="font-semibold">Avg Time:</span>{' '}
              <span className={averageReactionTime < 400 ? 'text-success' : averageReactionTime < 600 ? 'text-warning' : 'text-error'}>
                {averageReactionTime}ms
              </span>
            </div>
            <div className="text-sm">
              <span className="font-semibold">Score:</span>{' '}
              <span className="text-primary font-bold">{score}</span>
            </div>
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
        className="flex-1 relative bg-base-100 border-2 border-base-300 rounded-lg overflow-hidden cursor-crosshair"
        style={{ minHeight: '400px' }}
      >
        {gamePhase === 'ready' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="text-2xl font-bold">Reaction Time Challenge</div>
              <p className="text-base-content/70 max-w-md">
                Click the targets as quickly as possible when they appear. 
                Fast reactions earn more points!
              </p>
              <div className="text-sm opacity-60">
                Targets: {targetCount} | Timeout: {targetTimeout/1000}s each
              </div>
            </div>
          </div>
        )}

        {gamePhase === 'waiting' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="text-lg font-semibold">Get Ready...</div>
              <p className="text-base-content/70">Target will appear soon</p>
            </div>
          </div>
        )}

        {/* Render targets */}
        {targets.map((target) => (
          <button
            key={target.id}
            className={`absolute w-16 h-16 rounded-full transition-all duration-200 flex items-center justify-center font-bold text-white shadow-lg ${
              target.isActive 
                ? 'bg-error scale-100 hover:scale-110 active:scale-95' 
                : 'bg-base-300 scale-0'
            }`}
            style={{
              left: target.x - 32, // Center the 64px button
              top: target.y - 32,
              transform: `translate(0, 0) scale(${target.isActive ? 1 : 0})`,
              pointerEvents: target.isActive ? 'auto' : 'none'
            }}
            onClick={() => handleTargetClick(target.id)}
            disabled={!target.isActive}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="6" fill="white" />
              <circle cx="12" cy="12" r="2" fill="currentColor" />
            </svg>
          </button>
        ))}

        {gamePhase === 'complete' && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-base-100 rounded-lg p-8 text-center space-y-4 max-w-md">
              <div className="text-2xl font-bold">
                {accuracy >= 70 && averageReactionTime < 800 ? (
                  <span className="text-success">Excellent Reflexes!</span>
                ) : accuracy >= 50 ? (
                  <span className="text-warning">Good Attempt</span>
                ) : (
                  <span className="text-error">Practice More</span>
                )}
              </div>
              
              <div className="space-y-2 text-sm">
                <div>Targets Hit: <span className="font-bold">{hitTargets}/{targetCount}</span></div>
                <div>Accuracy: <span className="font-bold">{accuracy}%</span></div>
                <div>Average Reaction: <span className="font-bold">{averageReactionTime}ms</span></div>
                <div>Final Score: <span className="font-bold text-primary">{score}</span></div>
                {reactionTimes.length > 0 && (
                  <div>Best Time: <span className="font-bold text-success">{Math.min(...reactionTimes)}ms</span></div>
                )}
              </div>
              
              <div className="text-xs opacity-60">
                Success requires 70% accuracy and &lt;800ms average reaction time
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-4 text-center text-sm opacity-70">
        <p>Click targets as quickly as possible. Each target disappears after {targetTimeout/1000} seconds.</p>
        <p>Faster reactions earn more points!</p>
      </div>
    </div>
  );
};