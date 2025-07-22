import React from 'react';
import type { MinigameConfig } from '../../types/clue';
import { Card } from '../common/Card';

interface MinigameInstructionsProps {
  config: MinigameConfig;
  onStart: () => void;
  onBack: () => void;
}

export const MinigameInstructions: React.FC<MinigameInstructionsProps> = ({
  config,
  onStart,
  onBack
}) => {
  // Parse instructions for different game types
  const getGameTypeIcon = () => {
    switch (config.type) {
      case 'memory_cards':
        return '🃏';
      case 'logic_puzzle':
        return '🧩';
      case 'sequence_match':
        return '🎯';
      case 'word_puzzle':
        return '📝';
      case 'reaction_time':
        return '⚡';
      case 'pattern_recognition':
        return '🔍';
      default:
        return '🎮';
    }
  };

  const getGameTypeDescription = () => {
    switch (config.type) {
      case 'memory_cards':
        return 'Test your memory by matching pairs of cards';
      case 'logic_puzzle':
        return 'Solve logical challenges using reasoning';
      case 'sequence_match':
        return 'Memorize and repeat sequences correctly';
      case 'word_puzzle':
        return 'Find words, solve anagrams, or complete phrases';
      case 'reaction_time':
        return 'React quickly to visual or audio cues';
      case 'pattern_recognition':
        return 'Identify patterns and relationships';
      default:
        return 'Complete the challenge to progress';
    }
  };

  return (
    <div className="p-8 min-h-[500px] flex items-center justify-center">
      <Card className="max-w-2xl mx-auto">
        <div className="space-y-6">
          {/* Game Type Header */}
          <div className="text-center">
            <div className="text-4xl mb-2">{getGameTypeIcon()}</div>
            <h3 className="text-2xl font-bold mb-2">How to Play</h3>
            <p className="text-base opacity-70">{getGameTypeDescription()}</p>
          </div>

          {/* Instructions */}
          <div className="bg-base-200 rounded-lg p-6">
            <h4 className="font-semibold mb-3">Instructions:</h4>
            <div className="space-y-3">
              {config.instructions.split('\n').filter(line => line.trim()).map((instruction, index) => (
                <div key={index} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-content rounded-full flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </span>
                  <p className="text-sm leading-relaxed">{instruction}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Game Settings Preview */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-base-200 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-primary">
                {config.difficulty.charAt(0).toUpperCase() + config.difficulty.slice(1)}
              </div>
              <div className="text-sm opacity-70">Difficulty</div>
            </div>
            
            {config.timeLimit && (
              <div className="bg-base-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-warning">
                  {Math.floor(config.timeLimit / 60)}:{(config.timeLimit % 60).toString().padStart(2, '0')}
                </div>
                <div className="text-sm opacity-70">Time Limit</div>
              </div>
            )}
            
            {config.maxAttempts && (
              <div className="bg-base-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-info">
                  {config.maxAttempts}
                </div>
                <div className="text-sm opacity-70">Max Attempts</div>
              </div>
            )}

            {/* Game-specific settings preview */}
            {config.type === 'memory_cards' && config.gameSettings.cardCount && (
              <div className="bg-base-200 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-accent">
                  {config.gameSettings.cardCount * 2}
                </div>
                <div className="text-sm opacity-70">Cards</div>
              </div>
            )}
          </div>

          {/* Success/Failure Info */}
          <div className="bg-gradient-to-r from-success/10 to-error/10 rounded-lg p-4">
            <h4 className="font-semibold mb-2">What happens next?</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-1">
                <div className="font-medium text-success">✅ Success</div>
                <div className="opacity-70">Continue with your investigation</div>
              </div>
              <div className="space-y-1">
                <div className="font-medium text-error">❌ Failure</div>
                <div className="opacity-70">Try a different approach</div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-4 justify-center pt-4">
            <button 
              onClick={onBack}
              className="btn btn-ghost"
            >
              Back to Intro
            </button>
            <button 
              onClick={onStart}
              className="btn btn-primary btn-lg"
            >
              Start Game
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};