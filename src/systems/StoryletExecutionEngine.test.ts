/**
 * Tests for Storylet Execution Engine
 * Validates core execution logic, trigger evaluation, and effect application
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { StoryletExecutionEngine, type ExecutionContext, type ExecutionResult } from './StoryletExecutionEngine';
import type { Storylet, StoryletTrigger, StoryletChoice, StoryletEffect } from '../types/storylet';

// Mock the stores
const mockGameStore = {
  resources: { energy: 100, social: 50, knowledge: 0, money: 200 },
  gameTime: 0,
  featureFlags: {},
  advanceTime: vi.fn(),
  updateResource: vi.fn(),
  setResource: vi.fn()
};

const mockNarrativeStore = {
  currentStoryletId: null,
  getStorylet: vi.fn(),
  setCurrentStorylet: vi.fn(),
  markStoryletCompleted: vi.fn()
};

// Mock the stores
vi.mock('../stores/useCoreGameStore', () => ({
  useCoreGameStore: {
    getState: () => mockGameStore
  }
}));

vi.mock('../stores/useNarrativeStore', () => ({
  useNarrativeStore: {
    getState: () => mockNarrativeStore
  }
}));

describe('StoryletExecutionEngine', () => {
  let engine: StoryletExecutionEngine;

  beforeEach(() => {
    engine = StoryletExecutionEngine.getInstance();
    vi.clearAllMocks();
    
    // Reset mock store states
    mockGameStore.resources = { energy: 100, social: 50, knowledge: 0, money: 200 };
    mockGameStore.gameTime = 0;
    mockGameStore.featureFlags = {};
    mockNarrativeStore.currentStoryletId = null;
  });

  afterEach(() => {
    engine.clearHistory();
    engine.cancelCurrentExecution();
  });

  describe('Basic Execution', () => {
    it('should execute a simple storylet successfully', async () => {
      const mockStorylet: Storylet = {
        id: 'test-storylet-1',
        title: 'Test Storylet',
        description: 'A test storylet',
        content: 'This is test content',
        triggers: [],
        choices: [
          {
            id: 'choice-1',
            text: 'Continue',
            effects: [],
            unlocked: true
          }
        ],
        effects: [],
        storyArc: 'test-arc',
        status: 'dev',
        tags: ['test'],
        priority: 1,
        estimatedPlayTime: 5
      };

      mockNarrativeStore.getStorylet.mockReturnValue(mockStorylet);

      const result = await engine.executeStorylet('test-storylet-1');

      expect(result.success).toBe(true);
      expect(result.storylet).toEqual(mockStorylet);
      expect(result.availableChoices).toHaveLength(1);
      expect(result.availableChoices[0].text).toBe('Continue');
      expect(result.errors).toHaveLength(0);
      expect(mockNarrativeStore.setCurrentStorylet).toHaveBeenCalledWith('test-storylet-1');
    });

    it('should fail when storylet is not found', async () => {
      mockNarrativeStore.getStorylet.mockReturnValue(undefined);

      const result = await engine.executeStorylet('non-existent');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Storylet with ID "non-existent" not found');
    });

    it('should handle storylet with no choices', async () => {
      const mockStorylet: Storylet = {
        id: 'no-choices',
        title: 'No Choices Storylet',
        description: 'A storylet with no choices',
        content: 'This storylet has no choices',
        triggers: [],
        choices: [],
        effects: [],
        status: 'dev',
        tags: [],
        priority: 1,
        estimatedPlayTime: 2
      };

      mockNarrativeStore.getStorylet.mockReturnValue(mockStorylet);

      const result = await engine.executeStorylet('no-choices');

      expect(result.success).toBe(true);
      expect(result.availableChoices).toHaveLength(0);
    });
  });

  describe('Trigger Evaluation', () => {
    it('should fail when resource trigger is not met', async () => {
      const mockStorylet: Storylet = {
        id: 'resource-trigger',
        title: 'Resource Trigger Test',
        description: 'Test resource triggers',
        content: 'This requires energy',
        triggers: [
          {
            id: 'energy-trigger',
            type: 'resource',
            condition: 'energy',
            value: 150,
            operator: '>=',
            description: 'Requires 150 energy'
          }
        ],
        choices: [],
        effects: [],
        status: 'dev',
        tags: [],
        priority: 1,
        estimatedPlayTime: 3
      };

      mockNarrativeStore.getStorylet.mockReturnValue(mockStorylet);

      const result = await engine.executeStorylet('resource-trigger');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Storylet triggers not met: Requires 150 energy');
    });

    it('should succeed when resource trigger is met', async () => {
      const mockStorylet: Storylet = {
        id: 'resource-trigger-met',
        title: 'Resource Trigger Met',
        description: 'Test met resource triggers',
        content: 'This requires energy and you have it',
        triggers: [
          {
            id: 'energy-trigger',
            type: 'resource',
            condition: 'energy',
            value: 50,
            operator: '>=',
            description: 'Requires 50 energy'
          }
        ],
        choices: [
          {
            id: 'choice-1',
            text: 'Use energy',
            effects: [],
            unlocked: true
          }
        ],
        effects: [],
        status: 'dev',
        tags: [],
        priority: 1,
        estimatedPlayTime: 3
      };

      mockNarrativeStore.getStorylet.mockReturnValue(mockStorylet);

      const result = await engine.executeStorylet('resource-trigger-met');

      expect(result.success).toBe(true);
      expect(result.availableChoices).toHaveLength(1);
    });

    it('should evaluate time triggers correctly', async () => {
      mockGameStore.gameTime = 120; // 2 hours

      const mockStorylet: Storylet = {
        id: 'time-trigger',
        title: 'Time Trigger Test',
        description: 'Test time triggers',
        content: 'This happens after some time',
        triggers: [
          {
            id: 'time-trigger',
            type: 'time',
            condition: 'gameTime',
            value: 100,
            operator: '>=',
            description: 'Requires 100 minutes'
          }
        ],
        choices: [],
        effects: [],
        status: 'dev',
        tags: [],
        priority: 1,
        estimatedPlayTime: 2
      };

      mockNarrativeStore.getStorylet.mockReturnValue(mockStorylet);

      const result = await engine.executeStorylet('time-trigger');

      expect(result.success).toBe(true);
    });

    it('should handle random triggers probabilistically', async () => {
      const mockStorylet: Storylet = {
        id: 'random-trigger',
        title: 'Random Trigger Test',
        description: 'Test random triggers',
        content: 'This might happen randomly',
        triggers: [
          {
            id: 'random-trigger',
            type: 'random',
            condition: 'random',
            value: 100, // 100% chance for predictable testing
            operator: '>=',
            description: 'Random event'
          }
        ],
        choices: [],
        effects: [],
        status: 'dev',
        tags: [],
        priority: 1,
        estimatedPlayTime: 1
      };

      mockNarrativeStore.getStorylet.mockReturnValue(mockStorylet);

      const result = await engine.executeStorylet('random-trigger');

      expect(result.success).toBe(true);
    });
  });

  describe('Effect Application', () => {
    it('should apply resource effects correctly', async () => {
      const mockStorylet: Storylet = {
        id: 'resource-effects',
        title: 'Resource Effects Test',
        description: 'Test resource effects',
        content: 'This changes resources',
        triggers: [],
        choices: [],
        effects: [
          {
            id: 'energy-effect',
            type: 'resource',
            target: 'energy',
            value: -20,
            operator: '+',
            description: 'Lose 20 energy'
          },
          {
            id: 'money-effect',
            type: 'resource',
            target: 'money',
            value: 50,
            operator: '+',
            description: 'Gain 50 money'
          }
        ],
        status: 'dev',
        tags: [],
        priority: 1,
        estimatedPlayTime: 3
      };

      mockNarrativeStore.getStorylet.mockReturnValue(mockStorylet);

      const result = await engine.executeStorylet('resource-effects');

      expect(result.success).toBe(true);
      expect(result.appliedEffects).toHaveLength(2);
      expect(mockGameStore.updateResource).toHaveBeenCalledWith('energy', -20);
      expect(mockGameStore.updateResource).toHaveBeenCalledWith('money', 50);
    });

    it('should apply time advance effects', async () => {
      const mockStorylet: Storylet = {
        id: 'time-effects',
        title: 'Time Effects Test',
        description: 'Test time effects',
        content: 'This advances time',
        triggers: [],
        choices: [],
        effects: [
          {
            id: 'time-effect',
            type: 'time_advance',
            target: 'gameTime',
            value: 30,
            operator: '+',
            description: 'Advance time by 30 minutes'
          }
        ],
        status: 'dev',
        tags: [],
        priority: 1,
        estimatedPlayTime: 5
      };

      mockNarrativeStore.getStorylet.mockReturnValue(mockStorylet);

      const result = await engine.executeStorylet('time-effects');

      expect(result.success).toBe(true);
      expect(mockGameStore.advanceTime).toHaveBeenCalledWith(30);
      expect(result.stateChanges.gameTime).toBe(30);
    });

    it('should handle multiple effects of different types', async () => {
      const mockStorylet: Storylet = {
        id: 'multiple-effects',
        title: 'Multiple Effects Test',
        description: 'Test multiple effects',
        content: 'This has multiple effects',
        triggers: [],
        choices: [],
        effects: [
          {
            id: 'energy-effect',
            type: 'resource',
            target: 'energy',
            value: -10,
            operator: '+',
            description: 'Lose energy'
          },
          {
            id: 'time-effect',
            type: 'time_advance',
            target: 'gameTime',
            value: 15,
            operator: '+',
            description: 'Advance time'
          },
          {
            id: 'relationship-effect',
            type: 'relationship',
            target: 'character-1',
            value: 5,
            operator: '+',
            description: 'Improve relationship'
          }
        ],
        status: 'dev',
        tags: [],
        priority: 1,
        estimatedPlayTime: 4
      };

      mockNarrativeStore.getStorylet.mockReturnValue(mockStorylet);

      const result = await engine.executeStorylet('multiple-effects');

      expect(result.success).toBe(true);
      expect(result.appliedEffects).toHaveLength(3);
      expect(result.stateChanges.resources?.energy).toBe(-10);
      expect(result.stateChanges.gameTime).toBe(15);
      expect(result.stateChanges.relationships?.['character-1']).toBe(5);
    });
  });

  describe('Choice Execution', () => {
    it('should execute a choice successfully', async () => {
      const mockStorylet: Storylet = {
        id: 'choice-test',
        title: 'Choice Test',
        description: 'Test choice execution',
        content: 'Make a choice',
        triggers: [],
        choices: [
          {
            id: 'test-choice',
            text: 'Test Choice',
            effects: [
              {
                id: 'choice-effect',
                type: 'resource',
                target: 'energy',
                value: -5,
                operator: '+',
                description: 'Choice effect'
              }
            ],
            unlocked: true
          }
        ],
        effects: [],
        status: 'dev',
        tags: [],
        priority: 1,
        estimatedPlayTime: 2
      };

      mockNarrativeStore.getStorylet.mockReturnValue(mockStorylet);

      // First execute the storylet
      const executeResult = await engine.executeStorylet('choice-test');
      expect(executeResult.success).toBe(true);

      // Then execute a choice
      const choiceResult = await engine.executeChoice('test-choice');

      expect(choiceResult.success).toBe(true);
      expect(choiceResult.choice.text).toBe('Test Choice');
      expect(choiceResult.appliedEffects).toHaveLength(1);
      expect(mockGameStore.updateResource).toHaveBeenCalledWith('energy', -5);
      expect(mockNarrativeStore.markStoryletCompleted).toHaveBeenCalledWith('choice-test');
    });

    it('should fail when no active execution exists', async () => {
      const choiceResult = await engine.executeChoice('non-existent-choice');

      expect(choiceResult.success).toBe(false);
      expect(choiceResult.errors).toContain('No active storylet execution');
    });

    it('should fail when choice is not found', async () => {
      const mockStorylet: Storylet = {
        id: 'choice-test-2',
        title: 'Choice Test 2',
        description: 'Test missing choice',
        content: 'No such choice',
        triggers: [],
        choices: [
          {
            id: 'existing-choice',
            text: 'Existing Choice',
            effects: [],
            unlocked: true
          }
        ],
        effects: [],
        status: 'dev',
        tags: [],
        priority: 1,
        estimatedPlayTime: 1
      };

      mockNarrativeStore.getStorylet.mockReturnValue(mockStorylet);

      // Execute storylet first
      await engine.executeStorylet('choice-test-2');

      // Try to execute non-existent choice
      const choiceResult = await engine.executeChoice('non-existent-choice');

      expect(choiceResult.success).toBe(false);
      expect(choiceResult.errors).toContain('Choice with ID "non-existent-choice" not found or not available');
    });
  });

  describe('Choice Filtering', () => {
    it('should filter choices based on requirements', async () => {
      const mockStorylet: Storylet = {
        id: 'filter-test',
        title: 'Filter Test',
        description: 'Test choice filtering',
        content: 'Some choices require conditions',
        triggers: [],
        choices: [
          {
            id: 'always-available',
            text: 'Always Available',
            effects: [],
            unlocked: true
          },
          {
            id: 'energy-required',
            text: 'Requires Energy',
            requirements: [
              {
                id: 'energy-req',
                type: 'resource',
                condition: 'energy',
                value: 200,
                operator: '>=',
                description: 'Need 200 energy'
              }
            ],
            effects: [],
            unlocked: true
          },
          {
            id: 'unlocked-false',
            text: 'Locked Choice',
            effects: [],
            unlocked: false
          }
        ],
        effects: [],
        status: 'dev',
        tags: [],
        priority: 1,
        estimatedPlayTime: 3
      };

      mockNarrativeStore.getStorylet.mockReturnValue(mockStorylet);

      const result = await engine.executeStorylet('filter-test');

      expect(result.success).toBe(true);
      expect(result.availableChoices).toHaveLength(1);
      expect(result.availableChoices[0].text).toBe('Always Available');
    });

    it('should handle probability-based choices', async () => {
      // Mock Math.random to return a predictable value
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.3); // 30%

      const mockStorylet: Storylet = {
        id: 'probability-test',
        title: 'Probability Test',
        description: 'Test probability choices',
        content: 'Some choices are random',
        triggers: [],
        choices: [
          {
            id: 'high-probability',
            text: 'High Probability (50%)',
            probability: 50,
            effects: [],
            unlocked: true
          },
          {
            id: 'low-probability',
            text: 'Low Probability (20%)',
            probability: 20,
            effects: [],
            unlocked: true
          }
        ],
        effects: [],
        status: 'dev',
        tags: [],
        priority: 1,
        estimatedPlayTime: 2
      };

      mockNarrativeStore.getStorylet.mockReturnValue(mockStorylet);

      const result = await engine.executeStorylet('probability-test');

      expect(result.success).toBe(true);
      // With 30% random value, only the 50% probability choice should be available
      expect(result.availableChoices).toHaveLength(1);
      expect(result.availableChoices[0].text).toBe('High Probability (50%)');

      // Restore original Math.random
      Math.random = originalRandom;
    });
  });

  describe('Execution History', () => {
    it('should track execution history', async () => {
      const mockStorylet: Storylet = {
        id: 'history-test',
        title: 'History Test',
        description: 'Test execution history',
        content: 'Track this execution',
        triggers: [],
        choices: [],
        effects: [],
        status: 'dev',
        tags: [],
        priority: 1,
        estimatedPlayTime: 1
      };

      mockNarrativeStore.getStorylet.mockReturnValue(mockStorylet);

      expect(engine.getExecutionHistory()).toHaveLength(0);

      await engine.executeStorylet('history-test');

      const history = engine.getExecutionHistory();
      expect(history).toHaveLength(1);
      expect(history[0].storylet.id).toBe('history-test');
    });

    it('should clear execution history when requested', async () => {
      const mockStorylet: Storylet = {
        id: 'clear-test',
        title: 'Clear Test',
        description: 'Test history clearing',
        content: 'Clear this execution',
        triggers: [],
        choices: [],
        effects: [],
        status: 'dev',
        tags: [],
        priority: 1,
        estimatedPlayTime: 1
      };

      mockNarrativeStore.getStorylet.mockReturnValue(mockStorylet);

      await engine.executeStorylet('clear-test');
      expect(engine.getExecutionHistory()).toHaveLength(1);

      engine.clearHistory();
      expect(engine.getExecutionHistory()).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle execution errors gracefully', async () => {
      mockNarrativeStore.getStorylet.mockImplementation(() => {
        throw new Error('Database error');
      });

      const result = await engine.executeStorylet('error-test');

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Execution failed: Database error');
    });

    it('should handle effect application errors', async () => {
      const mockStorylet: Storylet = {
        id: 'effect-error-test',
        title: 'Effect Error Test',
        description: 'Test effect errors',
        content: 'This will cause an effect error',
        triggers: [],
        choices: [],
        effects: [
          {
            id: 'bad-effect',
            type: 'resource',
            target: 'nonexistent',
            value: 10,
            operator: '+',
            description: 'Bad effect'
          }
        ],
        status: 'dev',
        tags: [],
        priority: 1,
        estimatedPlayTime: 1
      };

      mockNarrativeStore.getStorylet.mockReturnValue(mockStorylet);
      mockGameStore.updateResource.mockImplementation(() => {
        throw new Error('Invalid resource');
      });

      const result = await engine.executeStorylet('effect-error-test');

      expect(result.success).toBe(true); // Execution still succeeds
      expect(result.errors).toContain('Failed to apply effect bad-effect: Invalid resource');
    });
  });
});