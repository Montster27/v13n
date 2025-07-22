// Effect processing utilities for storylet choices
import type { StoryletEffect } from '../types/storylet';
import { useCharacterStore } from '../stores/useCharacterStore';
import { useClueStore } from '../stores/useClueStore';
import { useNarrativeStore } from '../stores/useNarrativeStore';
import { useCoreGameStore } from '../stores/useCoreGameStore';

export interface EffectProcessorContext {
  playerId?: string;
  currentStoryletId?: string;
  choiceId?: string;
  timestamp?: Date;
}

export interface EffectResult {
  success: boolean;
  message: string;
  error?: string;
  changes: {
    resources?: Record<string, number>;
    relationships?: { characterId: string; oldValue: number; newValue: number }[];
    cluesDiscovered?: string[];
    storyletsUnlocked?: string[];
    arcProgress?: { arcId: string; progress: number }[];
    timeAdvanced?: number;
  };
}

// Resource management integrated with useCoreGameStore

export const processStoryletEffect = async (
  effect: StoryletEffect,
  context: EffectProcessorContext = {}
): Promise<EffectResult> => {
  const result: EffectResult = {
    success: false,
    message: '',
    changes: {}
  };

  try {
    switch (effect.type) {
      case 'resource':
        await processResourceEffect(effect, result);
        break;
        
      case 'relationship':
        await processRelationshipEffect(effect, result);
        break;
        
      case 'clue_discovery':
        await processClueDiscoveryEffect(effect, result, context);
        break;
        
      case 'storylet_unlock':
        await processStoryletUnlockEffect(effect, result);
        break;
        
      case 'arc_progress':
        await processArcProgressEffect(effect, result);
        break;
        
      case 'time_advance':
        await processTimeAdvanceEffect(effect, result);
        break;
        
      default:
        result.error = `Unknown effect type: ${effect.type}`;
        return result;
    }
    
    result.success = true;
    
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Unknown error';
    result.success = false;
  }
  
  return result;
};

const processResourceEffect = async (
  effect: StoryletEffect,
  result: EffectResult
): Promise<void> => {
  const { target, value = 0, operator = '+' } = effect;
  
  const { resources, updateResource, setResource } = useCoreGameStore.getState();
  
  // Check if target is a valid resource in the core game store
  const validResources = ['energy', 'social', 'knowledge', 'money'] as const;
  const resourceKey = validResources.find(key => key === target);
  
  if (!resourceKey) {
    throw new Error(`Unknown resource: ${target}. Valid resources are: ${validResources.join(', ')}`);
  }
  
  const oldValue = resources[resourceKey];
  let newValue = oldValue;
  
  switch (operator) {
    case '+':
      updateResource(resourceKey, value);
      newValue = resources[resourceKey] + value;
      break;
    case '-':
      updateResource(resourceKey, -value);
      newValue = Math.max(0, resources[resourceKey] - value);
      break;
    case '=':
      setResource(resourceKey, value);
      newValue = Math.max(0, value);
      break;
    case '*':
      const multipliedValue = Math.max(0, resources[resourceKey] * value);
      setResource(resourceKey, multipliedValue);
      newValue = multipliedValue;
      break;
  }
  
  result.changes.resources = { [target]: newValue };
  result.message = `${target}: ${oldValue} → ${newValue} (${operator}${value})`;
};

const processRelationshipEffect = async (
  effect: StoryletEffect,
  result: EffectResult
): Promise<void> => {
  const { target: characterId, value = 0, operator = '+' } = effect;
  
  // Get character store instance
  const { getCharacter } = useCharacterStore.getState();
  const character = getCharacter(characterId);
  
  if (!character) {
    throw new Error(`Character not found: ${characterId}`);
  }
  
  // Find or create player relationship
  let playerRelationship = character.relationships.find(r => r.characterId === 'player');
  
  if (!playerRelationship) {
    // Create new relationship
    const { addRelationship } = useCharacterStore.getState();
    await addRelationship(characterId, {
      characterId: 'player',
      type: 'trust',
      value: 50,
      maxValue: 100,
      description: 'Relationship with player'
    });
    
    // Refetch character after adding relationship
    const updatedCharacter = getCharacter(characterId);
    playerRelationship = updatedCharacter?.relationships.find(r => r.characterId === 'player');
  }
  
  if (!playerRelationship) {
    throw new Error('Failed to create player relationship');
  }
  
  const oldValue = playerRelationship.value;
  let newValue = oldValue;
  
  switch (operator) {
    case '+':
      newValue = oldValue + value;
      break;
    case '-':
      newValue = oldValue - value;
      break;
    case '=':
      newValue = value;
      break;
    case '*':
      newValue = oldValue * value;
      break;
  }
  
  // Clamp to bounds
  const maxValue = playerRelationship.maxValue || 100;
  newValue = Math.max(0, Math.min(maxValue, newValue));
  
  // Update relationship
  const { updateRelationship } = useCharacterStore.getState();
  await updateRelationship(characterId, playerRelationship.id, {
    value: newValue,
    lastUpdated: new Date()
  });
  
  result.changes.relationships = [{
    characterId,
    oldValue,
    newValue
  }];
  
  const characterName = character.displayName || character.name;
  result.message = `${characterName} relationship: ${oldValue} → ${newValue}`;
};

const processClueDiscoveryEffect = async (
  effect: StoryletEffect,
  result: EffectResult,
  context: EffectProcessorContext
): Promise<void> => {
  const { target: clueId } = effect;
  
  const { getClue, discoverClue } = useClueStore.getState();
  const clue = getClue(clueId);
  
  if (!clue) {
    throw new Error(`Clue not found: ${clueId}`);
  }
  
  if (clue.isDiscovered) {
    result.message = `Clue "${clue.title}" was already discovered`;
    return;
  }
  
  // Discover the clue
  await discoverClue(clueId, {
    discoveryMethod: 'storylet',
    discoveredBy: context.playerId || 'player',
    storyletId: context.currentStoryletId,
    discoveryContext: effect.description
  });
  
  result.changes.cluesDiscovered = [clueId];
  result.message = `Discovered clue: "${clue.title}"`;
  
  // Check if this clue unlocks any storylets
  const { storylets } = useNarrativeStore.getState();
  const unlockedStorylets = storylets.filter(s => 
    s.prerequisites?.some(prereq => prereq === clueId)
  );
  
  if (unlockedStorylets.length > 0) {
    result.changes.storyletsUnlocked = unlockedStorylets.map(s => s.id!);
    result.message += ` (Unlocked ${unlockedStorylets.length} storylets)`;
  }
};

const processStoryletUnlockEffect = async (
  effect: StoryletEffect,
  result: EffectResult
): Promise<void> => {
  const { target: storyletId } = effect;
  
  const { getStorylet } = useNarrativeStore.getState();
  const storylet = getStorylet(storyletId);
  
  if (!storylet) {
    throw new Error(`Storylet not found: ${storyletId}`);
  }
  
  // In a full implementation, this would update the storylet's unlock status
  // For now, we'll just record that it was unlocked
  result.changes.storyletsUnlocked = [storyletId];
  result.message = `Unlocked storylet: "${storylet.title}"`;
};

const processArcProgressEffect = async (
  effect: StoryletEffect,
  result: EffectResult
): Promise<void> => {
  const { target: arcId, value = 1 } = effect;
  
  const { getArc } = useNarrativeStore.getState();
  const arc = getArc(arcId);
  
  if (!arc) {
    throw new Error(`Arc not found: ${arcId}`);
  }
  
  // In a full implementation, this would update arc progress
  result.changes.arcProgress = [{
    arcId,
    progress: value
  }];
  
  result.message = `Advanced "${arc.name}" progress by ${value}`;
};

const processTimeAdvanceEffect = async (
  effect: StoryletEffect,
  result: EffectResult
): Promise<void> => {
  const { value = 1 } = effect;
  
  const { advanceTime } = useCoreGameStore.getState();
  advanceTime(value);
  
  result.changes.timeAdvanced = value;
  result.message = `Advanced time by ${value} minutes`;
};

// Batch process multiple effects
export const processStoryletEffects = async (
  effects: StoryletEffect[],
  context: EffectProcessorContext = {}
): Promise<EffectResult[]> => {
  const results: EffectResult[] = [];
  
  for (const effect of effects) {
    try {
      const result = await processStoryletEffect(effect, context);
      results.push(result);
      
    } catch (error) {
      // Effect processing failed - could be logged to error service in production
      results.push({
        success: false,
        message: '',
        error: error instanceof Error ? error.message : 'Unknown error',
        changes: {}
      });
    }
  }
  
  return results;
};

// Utility to get current resource values
export const getGameResources = (): Record<string, number> => {
  const { resources } = useCoreGameStore.getState();
  return { ...resources };
};

// Validate if effect can be processed
export const validateEffect = (effect: StoryletEffect): { valid: boolean; error?: string } => {
  if (!effect.target?.trim()) {
    return { valid: false, error: 'Effect target is required' };
  }
  
  if (effect.type === 'resource' && typeof effect.value !== 'number') {
    return { valid: false, error: 'Resource effects require a numeric value' };
  }
  
  if (effect.type === 'relationship' && typeof effect.value !== 'number') {
    return { valid: false, error: 'Relationship effects require a numeric value' };
  }
  
  return { valid: true };
};