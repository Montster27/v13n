import React from 'react';

interface SandboxTestSession {
  id: string;
  storyletId: string;
  startTime: Date;
  currentState: SandboxGameState;
  history: SandboxAction[];
  isComplete: boolean;
}

interface SandboxGameState {
  currentStoryletId: string;
  completedStorylets: string[];
  resources: Record<string, number>;
  relationships: Record<string, number>;
  discoveredClues: string[];
  timeElapsed: number;
}

interface SandboxAction {
  id: string;
  type: 'choice_selected' | 'effect_applied' | 'storylet_changed';
  timestamp: Date;
  data: any;
  description: string;
}

interface SandboxControlsProps {
  onStop: () => void;
  onReset: () => void;
  session: SandboxTestSession | null;
  isRunning: boolean;
}

export const SandboxControls: React.FC<SandboxControlsProps> = ({
  onStop,
  onReset,
  session,
  isRunning
}) => {
  if (!session) return null;

  const sessionDuration = Math.floor((Date.now() - session.startTime.getTime()) / 1000);
  const minutes = Math.floor(sessionDuration / 60);
  const seconds = sessionDuration % 60;

  return (
    <div className="bg-base-200 p-4 rounded-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${isRunning ? 'bg-success animate-pulse' : 'bg-base-300'}`}></span>
            <span className="font-medium">
              {isRunning ? 'Testing Active' : 'Test Stopped'}
            </span>
          </div>
          
          <div className="text-sm text-base-content/70">
            Duration: {minutes}:{seconds.toString().padStart(2, '0')}
          </div>

          <div className="text-sm text-base-content/70">
            Actions: {session.history.length}
          </div>

          <div className="text-sm text-base-content/70">
            Completed: {session.currentState.completedStorylets.length} storylets
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="btn btn-sm btn-ghost"
            onClick={onReset}
            disabled={!isRunning}
          >
            🔄 Reset
          </button>
          
          <button
            className="btn btn-sm btn-error"
            onClick={onStop}
          >
            ⏹️ Stop Test
          </button>
        </div>
      </div>

      {session.history.length > 0 && (
        <div className="mt-3 pt-3 border-t border-base-300">
          <p className="text-sm font-medium mb-2">Recent Actions:</p>
          <div className="space-y-1">
            {session.history.slice(-3).map(action => (
              <div key={action.id} className="text-xs flex items-center gap-2">
                <span className="text-base-content/50">
                  {action.timestamp.toLocaleTimeString()}
                </span>
                <span 
                  className={`badge badge-xs ${
                    action.type === 'choice_selected' ? 'badge-primary' :
                    action.type === 'effect_applied' ? 'badge-info' :
                    'badge-secondary'
                  }`}
                >
                  {action.type.replace('_', ' ')}
                </span>
                <span>{action.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};