import React, { useState } from 'react';
import { Card } from '../common/Card';
import type { Character } from '../../types/character';
import type { Clue } from '../../types/clue';

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

interface SandboxStateProps {
  session: SandboxTestSession;
  characters: Character[];
  clues: Clue[];
}

export const SandboxState: React.FC<SandboxStateProps> = ({
  session,
  characters,
  clues
}) => {
  const [activeTab, setActiveTab] = useState<'state' | 'history'>('state');

  const getCharacterName = (characterId: string) => {
    const character = characters.find(c => c.id === characterId);
    return character ? character.name : characterId;
  };

  const getClueName = (clueId: string) => {
    const clue = clues.find(c => c.id === clueId);
    return clue ? clue.title : clueId;
  };

  const formatActionTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString();
  };

  return (
    <Card title="Game State & History" className="h-full">
      <div className="h-full flex flex-col">
        {/* Tab Navigation */}
        <div className="tabs tabs-bordered mb-4">
          <button
            className={`tab ${activeTab === 'state' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('state')}
          >
            Current State
          </button>
          <button
            className={`tab ${activeTab === 'history' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            Action History ({session.history.length})
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'state' ? (
            <div className="space-y-4">
              {/* Current Status */}
              <div className="bg-base-200 p-3 rounded-lg">
                <h4 className="font-medium mb-2">Current Status</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-base-content/70">Current Storylet:</span>
                    <p className="font-mono text-xs">{session.currentState.currentStoryletId}</p>
                  </div>
                  <div>
                    <span className="text-base-content/70">Time Elapsed:</span>
                    <p>{session.currentState.timeElapsed} units</p>
                  </div>
                </div>
              </div>

              {/* Resources */}
              {Object.keys(session.currentState.resources).length > 0 && (
                <div className="bg-base-200 p-3 rounded-lg">
                  <h4 className="font-medium mb-2">Resources</h4>
                  <div className="space-y-2">
                    {Object.entries(session.currentState.resources).map(([resource, value]) => (
                      <div key={resource} className="flex items-center justify-between">
                        <span className="text-sm">{resource}</span>
                        <span className={`badge ${value >= 0 ? 'badge-success' : 'badge-error'}`}>
                          {value >= 0 ? '+' : ''}{value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Relationships */}
              {Object.keys(session.currentState.relationships).length > 0 && (
                <div className="bg-base-200 p-3 rounded-lg">
                  <h4 className="font-medium mb-2">Relationships</h4>
                  <div className="space-y-2">
                    {Object.entries(session.currentState.relationships).map(([characterId, value]) => (
                      <div key={characterId} className="flex items-center justify-between">
                        <span className="text-sm">{getCharacterName(characterId)}</span>
                        <div className="flex items-center gap-2">
                          <progress 
                            className={`progress w-16 ${
                              value >= 50 ? 'progress-success' :
                              value >= 0 ? 'progress-warning' : 
                              'progress-error'
                            }`}
                            value={Math.abs(value)} 
                            max="100"
                          ></progress>
                          <span className={`badge badge-sm ${
                            value >= 50 ? 'badge-success' :
                            value >= 0 ? 'badge-warning' : 
                            'badge-error'
                          }`}>
                            {value}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Discovered Clues */}
              {session.currentState.discoveredClues.length > 0 && (
                <div className="bg-base-200 p-3 rounded-lg">
                  <h4 className="font-medium mb-2">Discovered Clues</h4>
                  <div className="space-y-1">
                    {session.currentState.discoveredClues.map(clueId => (
                      <div key={clueId} className="flex items-center gap-2">
                        <span className="badge badge-info badge-xs"></span>
                        <span className="text-sm">{getClueName(clueId)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Completed Storylets */}
              {session.currentState.completedStorylets.length > 0 && (
                <div className="bg-base-200 p-3 rounded-lg">
                  <h4 className="font-medium mb-2">Completed Storylets</h4>
                  <div className="space-y-1">
                    {session.currentState.completedStorylets.map(storyletId => (
                      <div key={storyletId} className="flex items-center gap-2">
                        <span className="badge badge-success badge-xs"></span>
                        <span className="text-sm font-mono text-xs">{storyletId}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {session.history.length === 0 ? (
                <div className="text-center text-base-content/50 py-8">
                  No actions recorded yet
                </div>
              ) : (
                session.history.map(action => (
                  <div key={action.id} className="bg-base-200 p-3 rounded border-l-4 border-l-primary">
                    <div className="flex items-start justify-between mb-2">
                      <span className={`badge badge-sm ${
                        action.type === 'choice_selected' ? 'badge-primary' :
                        action.type === 'effect_applied' ? 'badge-info' :
                        'badge-secondary'
                      }`}>
                        {action.type.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-base-content/50">
                        {formatActionTime(action.timestamp)}
                      </span>
                    </div>
                    
                    <p className="text-sm font-medium mb-1">{action.description}</p>
                    
                    {action.data && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-base-content/70 hover:text-base-content">
                          View Details
                        </summary>
                        <pre className="mt-2 p-2 bg-base-300 rounded text-xs overflow-x-auto">
                          {JSON.stringify(action.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};