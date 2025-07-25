/**
 * Storylet Execution Engine
 * 
 * Handles the complete lifecycle of storylet execution including:
 * - Trigger evaluation
 * - Choice presentation and validation
 * - Effect application
 * - State management and persistence
 * - Integration with game systems
 */

import type { Storylet, StoryletChoice, StoryletEffect, StoryletTrigger } from '../types/storylet';
import type { Clue } from '../types/clue';
import { useCoreGameStore } from '../stores/useCoreGameStore';
import { useNarrativeStore } from '../stores/useNarrativeStore';

export interface ExecutionContext {
  resources: {
    energy: number;
    social: number;
    knowledge: number;
    money: number;
  };
  gameTime: number;
  discoveredClues: string[];
  completedStorylets: string[];
  relationships: Record<string, number>;
  currentStoryArc?: string;
  featureFlags: Record<string, boolean>;
  variables: Record<string, any>;
}

export interface ExecutionResult {
  success: boolean;
  storylet: Storylet;
  availableChoices: StoryletChoice[];
  appliedEffects: StoryletEffect[];
  nextStoryletId?: string;
  errors: string[];
  warnings: string[];
  executionTime: number;
  stateChanges: {
    resources?: Partial<ExecutionContext['resources']>;
    gameTime?: number;
    discoveredClues?: string[];
    completedStorylets?: string[];
    relationships?: Record<string, number>;
    variables?: Record<string, any>;
  };
}

export interface ChoiceExecutionResult {
  success: boolean;
  choice: StoryletChoice;
  appliedEffects: StoryletEffect[];
  nextStoryletId?: string;
  stateChanges: ExecutionResult['stateChanges'];
  errors: string[];
  warnings: string[];
}

export class StoryletExecutionEngine {
  private static instance: StoryletExecutionEngine;
  private executionHistory: ExecutionResult[] = [];
  private currentExecution?: ExecutionResult;

  private constructor() {}

  static getInstance(): StoryletExecutionEngine {
    if (!StoryletExecutionEngine.instance) {
      StoryletExecutionEngine.instance = new StoryletExecutionEngine();
    }
    return StoryletExecutionEngine.instance;
  }

  /**
   * Execute a storylet by ID with current game context
   */
  async executeStorylet(storyletId: string, additionalContext?: Partial<ExecutionContext>): Promise<ExecutionResult> {
    const startTime = performance.now();
    
    try {
      // Get storylet from narrative store
      const narrativeStore = useNarrativeStore.getState();
      const storylet = narrativeStore.getStorylet(storyletId);
      
      if (!storylet) {
        return {
          success: false,
          storylet: {} as Storylet,
          availableChoices: [],
          appliedEffects: [],
          errors: [`Storylet with ID "${storyletId}" not found`],
          warnings: [],
          executionTime: performance.now() - startTime,
          stateChanges: {}
        };
      }

      // Build execution context
      const context = this.buildExecutionContext(additionalContext);
      
      // Evaluate triggers
      const triggerResults = this.evaluateTriggers(storylet.triggers, context);
      if (!triggerResults.allMet) {
        return {
          success: false,
          storylet,
          availableChoices: [],
          appliedEffects: [],
          errors: [`Storylet triggers not met: ${triggerResults.failedTriggers.join(', ')}`],
          warnings: [],
          executionTime: performance.now() - startTime,
          stateChanges: {}
        };
      }

      // Apply storylet effects (entry effects)
      const effectResults = await this.applyEffects(storylet.effects, context);
      
      // Filter available choices based on requirements
      const availableChoices = this.filterAvailableChoices(storylet.choices, context);
      
      // Build result
      const result: ExecutionResult = {
        success: true,
        storylet,
        availableChoices,
        appliedEffects: effectResults.appliedEffects,
        errors: effectResults.errors,
        warnings: effectResults.warnings,
        executionTime: performance.now() - startTime,
        stateChanges: effectResults.stateChanges
      };

      // Store as current execution
      this.currentExecution = result;
      this.executionHistory.push(result);

      // Update narrative store with completion
      narrativeStore.setCurrentStorylet(storyletId);
      
      return result;
    } catch (error) {
      return {
        success: false,
        storylet: {} as Storylet,
        availableChoices: [],
        appliedEffects: [],
        errors: [`Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        executionTime: performance.now() - startTime,
        stateChanges: {}
      };
    }
  }

  /**
   * Execute a specific choice within the current storylet
   */
  async executeChoice(choiceId: string): Promise<ChoiceExecutionResult> {
    if (!this.currentExecution || !this.currentExecution.success) {
      return {
        success: false,
        choice: {} as StoryletChoice,
        appliedEffects: [],
        errors: ['No active storylet execution'],
        warnings: [],
        stateChanges: {}
      };
    }

    const choice = this.currentExecution.availableChoices.find(c => c.id === choiceId);
    if (!choice) {
      return {
        success: false,
        choice: {} as StoryletChoice,
        appliedEffects: [],
        errors: [`Choice with ID "${choiceId}" not found or not available`],
        warnings: [],
        stateChanges: {}
      };
    }

    try {
      // Build current context
      const context = this.buildExecutionContext();
      
      // Check choice requirements again (in case state changed)
      if (choice.requirements && !this.evaluateRequirements(choice.requirements, context)) {
        return {
          success: false,
          choice,
          appliedEffects: [],
          errors: ['Choice requirements no longer met'],
          warnings: [],
          stateChanges: {}
        };
      }

      // Apply choice effects
      const effectResults = await this.applyEffects(choice.effects, context);
      
      // Mark storylet as completed
      const narrativeStore = useNarrativeStore.getState();
      await narrativeStore.markStoryletCompleted(this.currentExecution.storylet.id!);

      const result: ChoiceExecutionResult = {
        success: true,
        choice,
        appliedEffects: effectResults.appliedEffects,
        nextStoryletId: choice.nextStoryletId,
        stateChanges: effectResults.stateChanges,
        errors: effectResults.errors,
        warnings: effectResults.warnings
      };

      // Clear current execution
      this.currentExecution = undefined;

      // Auto-execute next storylet if specified
      if (choice.nextStoryletId) {
        await this.executeStorylet(choice.nextStoryletId);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        choice,
        appliedEffects: [],
        errors: [`Choice execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        stateChanges: {}
      };
    }
  }

  /**
   * Build execution context from current game state
   */
  private buildExecutionContext(additionalContext?: Partial<ExecutionContext>): ExecutionContext {
    const gameStore = useCoreGameStore.getState();
    const narrativeStore = useNarrativeStore.getState();

    return {
      resources: { ...gameStore.resources },
      gameTime: gameStore.gameTime,
      discoveredClues: [], // TODO: Get from clue system
      completedStorylets: [], // TODO: Get from narrative progress
      relationships: {}, // TODO: Get from character system
      currentStoryArc: narrativeStore.currentStoryletId, // TODO: Get current arc
      featureFlags: { ...gameStore.featureFlags },
      variables: {}, // TODO: Get from variable system
      ...additionalContext
    };
  }

  /**
   * Evaluate storylet triggers against current context
   */
  private evaluateTriggers(triggers: StoryletTrigger[], context: ExecutionContext): { allMet: boolean; failedTriggers: string[] } {
    const failedTriggers: string[] = [];

    for (const trigger of triggers) {
      if (!this.evaluateTrigger(trigger, context)) {
        failedTriggers.push(trigger.description);
      }
    }

    return {
      allMet: failedTriggers.length === 0,
      failedTriggers
    };
  }

  /**
   * Evaluate a single trigger
   */
  private evaluateTrigger(trigger: StoryletTrigger, context: ExecutionContext): boolean {
    try {
      switch (trigger.type) {
        case 'resource':
          return this.evaluateResourceTrigger(trigger, context);
        case 'relationship':
          return this.evaluateRelationshipTrigger(trigger, context);
        case 'time':
          return this.evaluateTimeTrigger(trigger, context);
        case 'clue':
          return this.evaluateClueTrigger(trigger, context);
        case 'storylet_completion':
          return this.evaluateStoryletCompletionTrigger(trigger, context);
        case 'random':
          return this.evaluateRandomTrigger(trigger, context);
        default:
          console.warn(`Unknown trigger type: ${trigger.type}`);
          return false;
      }
    } catch (error) {
      console.error(`Error evaluating trigger ${trigger.id}:`, error);
      return false;
    }
  }

  private evaluateResourceTrigger(trigger: StoryletTrigger, context: ExecutionContext): boolean {
    const resourceName = trigger.condition as keyof ExecutionContext['resources'];
    const resourceValue = context.resources[resourceName];
    const targetValue = trigger.value || 0;
    const operator = trigger.operator || '>=';

    switch (operator) {
      case '>': return resourceValue > targetValue;
      case '<': return resourceValue < targetValue;
      case '=': return resourceValue === targetValue;
      case '>=': return resourceValue >= targetValue;
      case '<=': return resourceValue <= targetValue;
      case '!=': return resourceValue !== targetValue;
      default: return false;
    }
  }

  private evaluateRelationshipTrigger(trigger: StoryletTrigger, context: ExecutionContext): boolean {
    const characterId = trigger.condition;
    const relationshipValue = context.relationships[characterId] || 0;
    const targetValue = trigger.value || 0;
    const operator = trigger.operator || '>=';

    switch (operator) {
      case '>': return relationshipValue > targetValue;
      case '<': return relationshipValue < targetValue;
      case '=': return relationshipValue === targetValue;
      case '>=': return relationshipValue >= targetValue;
      case '<=': return relationshipValue <= targetValue;
      case '!=': return relationshipValue !== targetValue;
      default: return false;
    }
  }

  private evaluateTimeTrigger(trigger: StoryletTrigger, context: ExecutionContext): boolean {
    const targetTime = trigger.value || 0;
    const operator = trigger.operator || '>=';

    switch (operator) {
      case '>': return context.gameTime > targetTime;
      case '<': return context.gameTime < targetTime;
      case '=': return context.gameTime === targetTime;
      case '>=': return context.gameTime >= targetTime;
      case '<=': return context.gameTime <= targetTime;
      case '!=': return context.gameTime !== targetTime;
      default: return false;
    }
  }

  private evaluateClueTrigger(trigger: StoryletTrigger, context: ExecutionContext): boolean {
    const clueId = trigger.condition;
    return context.discoveredClues.includes(clueId);
  }

  private evaluateStoryletCompletionTrigger(trigger: StoryletTrigger, context: ExecutionContext): boolean {
    const storyletId = trigger.condition;
    return context.completedStorylets.includes(storyletId);
  }

  private evaluateRandomTrigger(trigger: StoryletTrigger, context: ExecutionContext): boolean {
    const probability = trigger.value || 50; // Default 50% chance
    return Math.random() * 100 < probability;
  }

  /**
   * Filter choices based on their requirements
   */
  private filterAvailableChoices(choices: StoryletChoice[], context: ExecutionContext): StoryletChoice[] {
    return choices.filter(choice => {
      // Check if choice is unlocked
      if (choice.unlocked === false) {
        return false;
      }

      // Check requirements
      if (choice.requirements && choice.requirements.length > 0) {
        return this.evaluateRequirements(choice.requirements, context);
      }

      // Check probability (for random choices)
      if (choice.probability !== undefined && choice.probability < 100) {
        return Math.random() * 100 < choice.probability;
      }

      return true;
    });
  }

  /**
   * Evaluate choice requirements
   */
  private evaluateRequirements(requirements: StoryletTrigger[], context: ExecutionContext): boolean {
    return requirements.every(req => this.evaluateTrigger(req, context));
  }

  /**
   * Apply effects to game state
   */
  private async applyEffects(effects: StoryletEffect[], context: ExecutionContext): Promise<{
    appliedEffects: StoryletEffect[];
    stateChanges: ExecutionResult['stateChanges'];
    errors: string[];
    warnings: string[];
  }> {
    const appliedEffects: StoryletEffect[] = [];
    const stateChanges: ExecutionResult['stateChanges'] = {};
    const errors: string[] = [];
    const warnings: string[] = [];

    const gameStore = useCoreGameStore.getState();
    const narrativeStore = useNarrativeStore.getState();

    for (const effect of effects) {
      try {
        switch (effect.type) {
          case 'resource':
            this.applyResourceEffect(effect, gameStore, stateChanges);
            appliedEffects.push(effect);
            break;

          case 'relationship':
            this.applyRelationshipEffect(effect, stateChanges);
            appliedEffects.push(effect);
            break;

          case 'clue_discovery':
            await this.applyClueDiscoveryEffect(effect, narrativeStore, stateChanges);
            appliedEffects.push(effect);
            break;

          case 'storylet_unlock':
            await this.applyStoryletUnlockEffect(effect, narrativeStore, stateChanges);
            appliedEffects.push(effect);
            break;

          case 'arc_progress':
            await this.applyArcProgressEffect(effect, narrativeStore, stateChanges);
            appliedEffects.push(effect);
            break;

          case 'time_advance':
            this.applyTimeAdvanceEffect(effect, gameStore, stateChanges);
            appliedEffects.push(effect);
            break;

          default:
            warnings.push(`Unknown effect type: ${effect.type}`);
        }
      } catch (error) {
        errors.push(`Failed to apply effect ${effect.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return { appliedEffects, stateChanges, errors, warnings };
  }

  private applyResourceEffect(effect: StoryletEffect, gameStore: ReturnType<typeof useCoreGameStore.getState>, stateChanges: ExecutionResult['stateChanges']): void {
    const resourceName = effect.target as keyof ExecutionContext['resources'];
    const value = effect.value || 0;
    const operator = effect.operator || '+';

    if (!stateChanges.resources) {
      stateChanges.resources = {};
    }

    switch (operator) {
      case '+':
        gameStore.updateResource(resourceName, value);
        stateChanges.resources[resourceName] = (stateChanges.resources[resourceName] || 0) + value;
        break;
      case '-':
        gameStore.updateResource(resourceName, -value);
        stateChanges.resources[resourceName] = (stateChanges.resources[resourceName] || 0) - value;
        break;
      case '=':
        gameStore.setResource(resourceName, value);
        stateChanges.resources[resourceName] = value;
        break;
      case '*':
        const currentValue = gameStore.resources[resourceName];
        const newValue = currentValue * value;
        gameStore.setResource(resourceName, newValue);
        stateChanges.resources[resourceName] = newValue;
        break;
    }
  }

  private applyRelationshipEffect(effect: StoryletEffect, stateChanges: ExecutionResult['stateChanges']): void {
    const characterId = effect.target;
    const value = effect.value || 0;
    const operator = effect.operator || '+';

    if (!stateChanges.relationships) {
      stateChanges.relationships = {};
    }

    // TODO: Integrate with character relationship system when available
    switch (operator) {
      case '+':
        stateChanges.relationships[characterId] = (stateChanges.relationships[characterId] || 0) + value;
        break;
      case '-':
        stateChanges.relationships[characterId] = (stateChanges.relationships[characterId] || 0) - value;
        break;
      case '=':
        stateChanges.relationships[characterId] = value;
        break;
      case '*':
        stateChanges.relationships[characterId] = (stateChanges.relationships[characterId] || 0) * value;
        break;
    }
  }

  private async applyClueDiscoveryEffect(effect: StoryletEffect, narrativeStore: ReturnType<typeof useNarrativeStore.getState>, stateChanges: ExecutionResult['stateChanges']): Promise<void> {
    const clueId = effect.target;
    
    if (!stateChanges.discoveredClues) {
      stateChanges.discoveredClues = [];
    }

    // TODO: Integrate with clue system when available
    stateChanges.discoveredClues.push(clueId);
  }

  private async applyStoryletUnlockEffect(effect: StoryletEffect, narrativeStore: ReturnType<typeof useNarrativeStore.getState>, stateChanges: ExecutionResult['stateChanges']): Promise<void> {
    const storyletId = effect.target;
    // TODO: Implement storylet unlocking mechanism
    console.log(`Unlocking storylet: ${storyletId}`);
  }

  private async applyArcProgressEffect(effect: StoryletEffect, narrativeStore: ReturnType<typeof useNarrativeStore.getState>, stateChanges: ExecutionResult['stateChanges']): Promise<void> {
    const arcId = effect.target;
    // TODO: Integrate with story arc progression system
    console.log(`Advancing arc progress: ${arcId}`);
  }

  private applyTimeAdvanceEffect(effect: StoryletEffect, gameStore: ReturnType<typeof useCoreGameStore.getState>, stateChanges: ExecutionResult['stateChanges']): void {
    const minutes = effect.value || 0;
    gameStore.advanceTime(minutes);
    stateChanges.gameTime = (stateChanges.gameTime || 0) + minutes;
  }

  /**
   * Get current execution status
   */
  getCurrentExecution(): ExecutionResult | undefined {
    return this.currentExecution;
  }

  /**
   * Get execution history
   */
  getExecutionHistory(): ExecutionResult[] {
    return [...this.executionHistory];
  }

  /**
   * Clear execution history
   */
  clearHistory(): void {
    this.executionHistory = [];
  }

  /**
   * Cancel current execution
   */
  cancelCurrentExecution(): void {
    this.currentExecution = undefined;
  }
}

// Export singleton instance
export const storyletEngine = StoryletExecutionEngine.getInstance();