import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useNarrativeStore } from './useNarrativeStore';
import { act } from '@testing-library/react';

describe('useNarrativeStore Integration Tests', () => {
  beforeEach(() => {
    // Reset store state before each test - manual cleanup
    const state = useNarrativeStore.getState();
    state.storylets.forEach(s => s.id && state.deleteStorylet(s.id));
    state.arcs.forEach(a => a.id && state.deleteStoryArc(a.id));
  });

  afterEach(async () => {
    // Clean up after each test
    const state = useNarrativeStore.getState();
    await Promise.all(state.storylets.map(s => s.id ? state.deleteStorylet(s.id) : Promise.resolve()));
    await Promise.all(state.arcs.map(a => a.id ? state.deleteStoryArc(a.id) : Promise.resolve()));
  });

  it('should handle full storylet lifecycle with persistence', async () => {
    const { addStorylet, getStorylet, updateStorylet, deleteStorylet, storylets } = useNarrativeStore.getState();

    // Create a storylet
    const storyletData = {
      title: 'Integration Test Storylet',
      description: 'A storylet for integration testing',
      content: 'This is the content of our test storylet.',
      triggers: [],
      choices: [],
      effects: [],
      status: 'dev' as const,
      tags: ['test'],
      priority: 1,
      estimatedPlayTime: 5
    };

    // Add storylet
    let storyletId: string;
    await act(async () => {
      storyletId = await addStorylet(storyletData);
    });

    // Verify storylet was added
    expect(storylets).toHaveLength(1);
    expect(getStorylet(storyletId!)).toBeDefined();
    expect(getStorylet(storyletId!)?.title).toBe('Integration Test Storylet');

    // Update storylet
    await act(async () => {
      await updateStorylet(storyletId!, {
        ...storyletData,
        title: 'Updated Integration Test Storylet',
        content: 'Updated content'
      });
    });

    // Verify update
    const updatedStorylet = getStorylet(storyletId!);
    expect(updatedStorylet?.title).toBe('Updated Integration Test Storylet');
    expect(updatedStorylet?.content).toBe('Updated content');

    // Delete storylet
    await act(async () => {
      await deleteStorylet(storyletId!);
    });

    // Verify deletion
    expect(storylets).toHaveLength(0);
    expect(getStorylet(storyletId!)).toBeUndefined();
  });

  it('should handle arc creation and storylet assignment', async () => {
    const { addArc, addStorylet, getStoryletsByArc, arcs } = useNarrativeStore.getState();

    // Create an arc
    const arcData = {
      name: 'Test Arc',
      description: 'An arc for testing'
    };

    let arcId: string;
    await act(async () => {
      arcId = await addArc(arcData);
    });

    // Verify arc was created
    expect(arcs).toHaveLength(1);
    expect(arcs[0].name).toBe('Test Arc');

    // Create storylets in the arc
    const storyletData1 = {
      title: 'Arc Storylet 1',
      description: 'First storylet in arc',
      content: 'Content 1',
      storyArc: arcId!,
      triggers: [],
      choices: [],
      effects: [],
      status: 'dev' as const,
      tags: [],
      priority: 1,
      estimatedPlayTime: 5
    };

    const storyletData2 = {
      title: 'Arc Storylet 2', 
      description: 'Second storylet in arc',
      content: 'Content 2',
      storyArc: arcId!,
      triggers: [],
      choices: [],
      effects: [],
      status: 'dev' as const,
      tags: [],
      priority: 1,
      estimatedPlayTime: 5
    };

    await act(async () => {
      await addStorylet(storyletData1);
      await addStorylet(storyletData2);
    });

    // Verify storylets are assigned to arc
    const arcStorylets = getStoryletsByArc(arcId!);
    expect(arcStorylets).toHaveLength(2);
    expect(arcStorylets.map(s => s.title)).toContain('Arc Storylet 1');
    expect(arcStorylets.map(s => s.title)).toContain('Arc Storylet 2');
  });

  it('should handle storylet choices with connections', async () => {
    const { addStorylet, updateStorylet, getStorylet } = useNarrativeStore.getState();

    // Create first storylet
    const storylet1Data = {
      title: 'First Storylet',
      description: 'The beginning',
      content: 'This is the start.',
      triggers: [],
      choices: [],
      effects: [],
      status: 'dev' as const,
      tags: [],
      priority: 1,
      estimatedPlayTime: 5
    };

    let storylet1Id: string;
    await act(async () => {
      storylet1Id = await addStorylet(storylet1Data);
    });

    // Create second storylet
    const storylet2Data = {
      title: 'Second Storylet',
      description: 'The continuation',
      content: 'This continues the story.',
      triggers: [],
      choices: [],
      effects: [],
      status: 'dev' as const,
      tags: [],
      priority: 1,
      estimatedPlayTime: 5
    };

    let storylet2Id: string;
    await act(async () => {
      storylet2Id = await addStorylet(storylet2Data);
    });

    // Add choice to first storylet that links to second
    const updatedStorylet1 = {
      ...storylet1Data,
      choices: [{
        id: 'choice-1',
        text: 'Continue to next part',
        description: 'Move to the next storylet',
        nextStoryletId: storylet2Id!,
        effects: [],
        requirements: [],
        probability: 100,
        unlocked: true
      }]
    };

    await act(async () => {
      await updateStorylet(storylet1Id!, updatedStorylet1);
    });

    // Verify the connection
    const storylet1 = getStorylet(storylet1Id!);
    expect(storylet1?.choices).toHaveLength(1);
    expect(storylet1?.choices[0].nextStoryletId).toBe(storylet2Id!);
    expect(storylet1?.choices[0].text).toBe('Continue to next part');
  });
});