import React from 'react';
import { useMinigameStore } from '../../stores/useMinigameStore';
import { Card } from '../common/Card';

export const MinigameResults: React.FC = () => {
  const { attemptHistory, currentClueId } = useMinigameStore();
  
  // Get the most recent attempt for current clue
  const latestAttempt = attemptHistory
    .filter(attempt => attempt.clueId === currentClueId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

  if (!latestAttempt) {
    return (
      <div className="p-8 min-h-[500px] flex items-center justify-center">
        <div className="text-center text-base-content/70">
          No results available
        </div>
      </div>
    );
  }

  const { result } = latestAttempt;

  return (
    <div className="p-8 min-h-[500px] flex items-center justify-center">
      <Card className="max-w-lg mx-auto">
        <div className="text-center space-y-6">
          {/* Result status */}
          <div>
            <div className={`text-6xl mb-4 ${result.success ? 'text-success' : 'text-error'}`}>
              {result.success ? '🎉' : '😔'}
            </div>
            <h3 className={`text-2xl font-bold mb-2 ${result.success ? 'text-success' : 'text-error'}`}>
              {result.success ? 'Success!' : 'Better luck next time'}
            </h3>
            <p className="text-base-content/70">
              {result.success 
                ? 'You\'ve successfully completed the challenge!'
                : 'Don\'t worry, you can try again or explore other options.'
              }
            </p>
          </div>

          {/* Score and stats */}
          <div className="bg-base-200 rounded-lg p-4">
            <h4 className="font-semibold mb-3">Your Performance</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className={`text-2xl font-bold ${result.success ? 'text-success' : 'text-base-content'}`}>
                  {result.score}
                </div>
                <div className="text-sm opacity-70">Score</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-info">
                  {result.timeSpent}s
                </div>
                <div className="text-sm opacity-70">Time</div>
              </div>
              
              {result.details?.moves && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-warning">
                    {result.details.moves}
                  </div>
                  <div className="text-sm opacity-70">Moves</div>
                </div>
              )}
              
              {result.details?.accuracy && (
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent">
                    {Math.round(result.details.accuracy)}%
                  </div>
                  <div className="text-sm opacity-70">Accuracy</div>
                </div>
              )}
            </div>
          </div>

          {/* Next steps */}
          <div className={`p-4 rounded-lg ${result.success ? 'bg-success/10' : 'bg-error/10'}`}>
            <h4 className="font-semibold mb-2">What happens next?</h4>
            <p className="text-sm">
              {result.success 
                ? 'Your investigation continues with new insights from solving this challenge.'
                : 'Your approach didn\'t work out as expected. The story will continue with this outcome in mind.'
              }
            </p>
          </div>

          {/* Auto-continue message */}
          <div className="text-sm opacity-60">
            Returning to your investigation in a moment...
          </div>
        </div>
      </Card>
    </div>
  );
};