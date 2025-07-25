import React, { useState, useCallback } from 'react';
import { Card } from '../common/Card';
import { useNarrativeStore } from '../../stores/useNarrativeStore';
import { useCharacterStore } from '../../stores/useCharacterStore';
import { useClueStore } from '../../stores/useClueStore';
import { SandboxRunner } from './SandboxRunner';
import { SandboxControls } from './SandboxControls';
import { SandboxState } from './SandboxState';

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

export const StoryletSandbox: React.FC = () => {
  const { storylets } = useNarrativeStore();
  const { characters } = useCharacterStore();
  const { clues } = useClueStore();
  const [selectedStoryletId, setSelectedStoryletId] = useState<string>('');
  const [currentSession, setCurrentSession] = useState<SandboxTestSession | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const initializeGameState = useCallback((storyletId: string): SandboxGameState => {
    return {
      currentStoryletId: storyletId,
      completedStorylets: [],
      resources: {},
      relationships: {},
      discoveredClues: [],
      timeElapsed: 0
    };
  }, []);

  const startTest = useCallback(() => {
    if (!selectedStoryletId) return;

    const newSession: SandboxTestSession = {
      id: crypto.randomUUID(),
      storyletId: selectedStoryletId,
      startTime: new Date(),
      currentState: initializeGameState(selectedStoryletId),
      history: [],
      isComplete: false
    };

    setCurrentSession(newSession);
    setIsRunning(true);
  }, [selectedStoryletId, initializeGameState]);

  const stopTest = useCallback(() => {
    setIsRunning(false);
    setCurrentSession(null);
  }, []);

  const resetTest = useCallback(() => {
    if (currentSession) {
      setCurrentSession({
        ...currentSession,
        currentState: initializeGameState(currentSession.storyletId),
        history: [],
        isComplete: false
      });
    }
  }, [currentSession, initializeGameState]);

  const handleActionExecuted = useCallback((action: SandboxAction, newState: SandboxGameState) => {
    if (!currentSession) return;

    const updatedSession: SandboxTestSession = {
      ...currentSession,
      currentState: newState,
      history: [...currentSession.history, action]
    };

    setCurrentSession(updatedSession);
  }, [currentSession]);

  const availableStorylets = storylets.filter(s => s.status !== 'dev');
  const currentStorylet = storylets.find(s => s.id === currentSession?.currentState.currentStoryletId);

  return (
    <div className="h-full flex flex-col gap-4">
      <Card title="Storylet Sandbox Testing">
        <div className="space-y-4">
          {!isRunning ? (
            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Select Storylet to Test</span>
                </label>
                <select
                  className="select select-bordered w-full"
                  value={selectedStoryletId}
                  onChange={(e) => setSelectedStoryletId(e.target.value)}
                >
                  <option value="">Choose a storylet...</option>
                  {availableStorylets.map(storylet => (
                    <option key={storylet.id} value={storylet.id}>
                      {storylet.title} ({storylet.status})
                    </option>
                  ))}
                </select>
              </div>

              {selectedStoryletId && (
                <div className="bg-base-200 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Storylet Preview</h4>
                  {(() => {
                    const storylet = storylets.find(s => s.id === selectedStoryletId);
                    return storylet ? (
                      <div className="space-y-2 text-sm">
                        <p><strong>Title:</strong> {storylet.title}</p>
                        <p><strong>Description:</strong> {storylet.description}</p>
                        <p><strong>Choices:</strong> {storylet.choices?.length || 0}</p>
                        <p><strong>Effects:</strong> {storylet.effects?.length || 0}</p>
                        <p><strong>Prerequisites:</strong> {storylet.prerequisites?.length || 0}</p>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}

              <button
                className="btn btn-primary"
                onClick={startTest}
                disabled={!selectedStoryletId}
              >
                Start Sandbox Test
              </button>
            </div>
          ) : (
            <SandboxControls
              onStop={stopTest}
              onReset={resetTest}
              session={currentSession}
              isRunning={isRunning}
            />
          )}
        </div>
      </Card>

      {isRunning && currentSession && currentStorylet && (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-0">
          <SandboxRunner
            storylet={currentStorylet}
            gameState={currentSession.currentState}
            onActionExecuted={handleActionExecuted}
          />
          
          <SandboxState
            session={currentSession}
            characters={characters}
            clues={clues}
          />
        </div>
      )}
    </div>
  );
};