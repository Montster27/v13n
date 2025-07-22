import React, { useEffect } from 'react';
import { useMinigameStore } from '../../stores/useMinigameStore';
import { MinigameIntroduction } from './MinigameIntroduction';
import { MinigameInstructions } from './MinigameInstructions';
import { MinigamePlayer } from './MinigamePlayer';
import { MinigameResults } from './MinigameResults';
import { Card } from '../common/Card';

interface MinigameContainerProps {
  clueId: string;
  onComplete?: () => void;
  onExit?: () => void;
}

export const MinigameContainer: React.FC<MinigameContainerProps> = ({
  clueId,
  onComplete,
  onExit
}) => {
  const {
    currentConfig,
    showIntroduction,
    showInstructions,
    isPlaying,
    timeRemaining,
    attempts,
    maxAttempts,
    error,
    loading,
    setShowIntroduction,
    setShowInstructions,
    exitMinigame
  } = useMinigameStore();

  // Exit handler
  const handleExit = () => {
    exitMinigame();
    onExit?.();
  };

  // Auto-exit on completion
  useEffect(() => {
    if (onComplete && !isPlaying && !showIntroduction && !showInstructions && currentConfig) {
      onComplete();
    }
  }, [isPlaying, showIntroduction, showInstructions, currentConfig, onComplete]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="p-8">
          <div className="flex items-center gap-4">
            <div className="loading loading-spinner loading-lg"></div>
            <span>Loading minigame...</span>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <Card className="p-8">
          <div className="text-center space-y-4">
            <div className="text-error text-lg font-semibold">Minigame Error</div>
            <p className="text-base-content/70">{error}</p>
            <button 
              onClick={handleExit}
              className="btn btn-primary"
            >
              Close
            </button>
          </div>
        </Card>
      </div>
    );
  }

  if (!currentConfig) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="w-full h-full max-w-4xl max-h-screen p-4 overflow-auto">
        {/* Header with game info and controls */}
        <div className="bg-base-100 rounded-t-lg p-4 border-b border-base-300">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">{currentConfig.title}</h2>
              <div className="flex items-center gap-4 text-sm opacity-70">
                <span>Difficulty: {currentConfig.difficulty}</span>
                <span>Attempts: {attempts}/{maxAttempts}</span>
                {timeRemaining && (
                  <span className={`${timeRemaining <= 30 ? 'text-error' : ''}`}>
                    Time: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              {isPlaying && (
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to exit? Progress will be lost.')) {
                      handleExit();
                    }
                  }}
                  className="btn btn-ghost btn-sm"
                >
                  Exit
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div 
          className="bg-base-100 rounded-b-lg overflow-hidden"
          style={{
            backgroundColor: currentConfig.backgroundColor || undefined,
            minHeight: '500px'
          }}
        >
          {showIntroduction && (
            <MinigameIntroduction 
              config={currentConfig}
              onContinue={() => setShowIntroduction(false)}
              onSkip={() => {
                setShowIntroduction(false);
                setShowInstructions(false);
              }}
            />
          )}
          
          {showInstructions && !showIntroduction && (
            <MinigameInstructions
              config={currentConfig}
              onStart={() => setShowInstructions(false)}
              onBack={() => setShowIntroduction(true)}
            />
          )}
          
          {isPlaying && !showIntroduction && !showInstructions && (
            <MinigamePlayer
              config={currentConfig}
              clueId={clueId}
            />
          )}
          
          {!isPlaying && !showIntroduction && !showInstructions && (
            <MinigameResults />
          )}
        </div>
      </div>
    </div>
  );
};