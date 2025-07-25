import React, { useState, useCallback } from 'react';
import { Card } from '../common/Card';
import type { StoryletChoice, StoryletEffect } from '../../types/storylet';

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

interface Storylet {
  id?: string;
  title: string;
  description: string;
  content: string;
  choices: StoryletChoice[];
  effects: StoryletEffect[];
  tags?: string[];
}

interface SandboxRunnerProps {
  storylet: Storylet;
  gameState: SandboxGameState;
  onActionExecuted: (action: SandboxAction, newState: SandboxGameState) => void;
}

export const SandboxRunner: React.FC<SandboxRunnerProps> = ({
  storylet,
  gameState,
  onActionExecuted
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const applyEffects = useCallback((effects: StoryletEffect[], currentState: SandboxGameState): SandboxGameState => {
    let newState = { ...currentState };

    effects.forEach(effect => {
      switch (effect.type) {
        case 'resource':
          newState.resources = { ...newState.resources };
          const currentResource = newState.resources[effect.target] || 0;
          switch (effect.operator) {
            case '+':
              newState.resources[effect.target] = currentResource + (effect.value || 0);
              break;
            case '-':
              newState.resources[effect.target] = currentResource - (effect.value || 0);
              break;
            case '=':
              newState.resources[effect.target] = effect.value || 0;
              break;
            case '*':
              newState.resources[effect.target] = currentResource * (effect.value || 1);
              break;
          }
          break;

        case 'relationship':
          newState.relationships = { ...newState.relationships };
          const currentRelationship = newState.relationships[effect.target] || 0;
          switch (effect.operator) {
            case '+':
              newState.relationships[effect.target] = Math.min(100, currentRelationship + (effect.value || 0));
              break;
            case '-':
              newState.relationships[effect.target] = Math.max(-100, currentRelationship - (effect.value || 0));
              break;
            case '=':
              newState.relationships[effect.target] = Math.max(-100, Math.min(100, effect.value || 0));
              break;
          }
          break;

        case 'clue_discovery':
          if (!newState.discoveredClues.includes(effect.target)) {
            newState.discoveredClues = [...newState.discoveredClues, effect.target];
          }
          break;

        case 'time_advance':
          newState.timeElapsed += effect.value || 1;
          break;

        case 'storylet_unlock':
          // In a real game, this would unlock storylets for future play
          break;

        case 'arc_progress':
          // In a real game, this would advance arc progress
          break;
      }
    });

    return newState;
  }, []);

  const executeChoice = useCallback(async (choice: StoryletChoice) => {
    if (isProcessing) return;
    
    setIsProcessing(true);

    try {
      // Create action for choice selection
      const choiceAction: SandboxAction = {
        id: crypto.randomUUID(),
        type: 'choice_selected',
        timestamp: new Date(),
        data: { choiceId: choice.id, choiceText: choice.text },
        description: `Selected choice: "${choice.text}"`
      };

      // Apply choice effects
      let newState = applyEffects(choice.effects, gameState);

      // Apply storylet effects
      newState = applyEffects(storylet.effects, newState);

      // Mark current storylet as completed
      if (!newState.completedStorylets.includes(storylet.id!)) {
        newState.completedStorylets = [...newState.completedStorylets, storylet.id!];
      }

      onActionExecuted(choiceAction, newState);

      // Create effect application action
      const effectAction: SandboxAction = {
        id: crypto.randomUUID(),
        type: 'effect_applied',
        timestamp: new Date(),
        data: { 
          choiceEffects: choice.effects,
          storyletEffects: storylet.effects
        },
        description: `Applied ${choice.effects.length + storylet.effects.length} effects`
      };

      onActionExecuted(effectAction, newState);

      // Handle next storylet if specified
      if (choice.nextStoryletId) {
        const nextStoryletAction: SandboxAction = {
          id: crypto.randomUUID(),
          type: 'storylet_changed',
          timestamp: new Date(),
          data: { 
            fromStoryletId: storylet.id,
            toStoryletId: choice.nextStoryletId
          },
          description: `Moved to next storylet: ${choice.nextStoryletId}`
        };

        const finalState = {
          ...newState,
          currentStoryletId: choice.nextStoryletId
        };

        onActionExecuted(nextStoryletAction, finalState);
      }

    } catch (error) {
      console.error('Error executing choice:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, gameState, storylet, onActionExecuted, applyEffects]);

  const isChoiceAvailable = useCallback((choice: StoryletChoice): boolean => {
    if (!choice.requirements) return true;

    return choice.requirements.every(trigger => {
      switch (trigger.type) {
        case 'resource':
          const resourceValue = gameState.resources[trigger.condition] || 0;
          switch (trigger.operator) {
            case '>': return resourceValue > (trigger.value || 0);
            case '<': return resourceValue < (trigger.value || 0);
            case '=': return resourceValue === (trigger.value || 0);
            case '>=': return resourceValue >= (trigger.value || 0);
            case '<=': return resourceValue <= (trigger.value || 0);
            case '!=': return resourceValue !== (trigger.value || 0);
            default: return true;
          }
        case 'relationship':
          const relationshipValue = gameState.relationships[trigger.condition] || 0;
          switch (trigger.operator) {
            case '>': return relationshipValue > (trigger.value || 0);
            case '<': return relationshipValue < (trigger.value || 0);
            case '=': return relationshipValue === (trigger.value || 0);
            case '>=': return relationshipValue >= (trigger.value || 0);
            case '<=': return relationshipValue <= (trigger.value || 0);
            case '!=': return relationshipValue !== (trigger.value || 0);
            default: return true;
          }
        case 'clue':
          return gameState.discoveredClues.includes(trigger.condition);
        case 'storylet_completion':
          return gameState.completedStorylets.includes(trigger.condition);
        default:
          return true;
      }
    });
  }, [gameState]);

  return (
    <Card title="Storylet Player" className="h-full">
      <div className="space-y-4 h-full flex flex-col">
        <div className="bg-base-200 p-4 rounded-lg">
          <h3 className="font-bold text-lg mb-2">{storylet.title}</h3>
          <p className="text-base-content/80 mb-3">{storylet.description}</p>
          <div className="prose prose-sm">
            <p>{storylet.content}</p>
          </div>
        </div>

        {storylet.effects.length > 0 && (
          <div className="bg-info/10 p-3 rounded border border-info/20">
            <h4 className="font-medium text-sm mb-2">Automatic Effects:</h4>
            <ul className="text-xs space-y-1">
              {storylet.effects.map((effect, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="badge badge-info badge-xs"></span>
                  {effect.description}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-3 flex-1">
          <h4 className="font-medium">Choices:</h4>
          {storylet.choices.map(choice => {
            const isAvailable = isChoiceAvailable(choice);
            return (
              <div 
                key={choice.id} 
                className={`border rounded-lg p-3 transition-colors ${
                  isAvailable 
                    ? 'border-base-300 hover:border-primary cursor-pointer' 
                    : 'border-error/30 bg-error/5 cursor-not-allowed'
                }`}
                onClick={() => isAvailable && !isProcessing && executeChoice(choice)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className={`font-medium ${!isAvailable ? 'text-error/70' : ''}`}>
                      {choice.text}
                    </p>
                    {choice.description && (
                      <p className={`text-sm mt-1 ${!isAvailable ? 'text-error/50' : 'text-base-content/70'}`}>
                        {choice.description}
                      </p>
                    )}
                    
                    {choice.effects.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium mb-1">Effects:</p>
                        <ul className="text-xs space-y-1">
                          {choice.effects.map((effect, index) => (
                            <li key={index} className="text-base-content/60">
                              • {effect.description}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {choice.requirements && choice.requirements.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium mb-1">Requirements:</p>
                        <ul className="text-xs space-y-1">
                          {choice.requirements.map((req, index) => (
                            <li 
                              key={index} 
                              className={`${isAvailable ? 'text-success' : 'text-error'}`}
                            >
                              • {req.description}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  {!isAvailable && (
                    <span className="badge badge-error badge-sm">Locked</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {isProcessing && (
          <div className="flex items-center justify-center p-4">
            <span className="loading loading-spinner loading-md"></span>
            <span className="ml-2">Processing choice...</span>
          </div>
        )}
      </div>
    </Card>
  );
};