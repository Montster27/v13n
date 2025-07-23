import { useCallback } from 'react';
import { useVisualEditorStore } from '../../../stores/useVisualEditorStore';

/**
 * Custom hook for node management operations
 */
export const useNodeManagement = (onStoryletCreated?: (storyletId: string) => void) => {
  const { addNode } = useVisualEditorStore();

  const handleAddStoryletNode = useCallback(async () => {
    // Create a new storylet in the database first
    const { useNarrativeStore } = await import('../../../stores/useNarrativeStore');
    const narrativeStore = useNarrativeStore.getState();
    
    try {
      const newStoryletId = await narrativeStore.addStorylet({
        title: 'New Storylet',
        description: 'A new storylet to be configured',
        content: 'This storylet needs content. Double-click to edit.',
        triggers: [],
        choices: [],
        effects: [],
        status: 'dev',
        tags: [],
        priority: 1,
        estimatedPlayTime: 5,
        prerequisites: []
      });

      // Then add the visual node
      addNode({
        type: 'storylet',
        position: {
          x: 200 + Math.random() * 400,
          y: 100 + Math.random() * 300
        },
        data: {
          storyletId: newStoryletId,
          title: 'New Storylet',
          description: 'Double-click to edit'
        }
      });

      // Open the editor panel for the new storylet
      if (onStoryletCreated) {
        onStoryletCreated(newStoryletId);
      }
    } catch (error) {
      console.error('Failed to create storylet:', error);
    }
  }, [addNode, onStoryletCreated]);

  return {
    handleAddStoryletNode
  };
};
