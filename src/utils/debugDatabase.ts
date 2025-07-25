/**
 * Debug utilities to check database state and troubleshoot visual editor issues
 */
import { db, deserializeStorylet, deserializeStoryArc } from '../lib/db';
import { useNarrativeStore } from '../stores/useNarrativeStore';

/**
 * Debug function to check the current state of the database
 */
export const debugDatabaseState = async () => {
  console.log('=== DATABASE DEBUG ===');
  
  try {
    // Check raw database contents
    const rawStorylets = await db.storylets.toArray();
    const rawArcs = await db.storyArcs.toArray();
    
    console.log('Raw database contents:');
    console.log('- Storylets in DB:', rawStorylets.length);
    console.log('- Story Arcs in DB:', rawArcs.length);
    
    if (rawStorylets.length > 0) {
      console.log('Sample storylet:', rawStorylets[0]);
    }
    
    if (rawArcs.length > 0) {
      console.log('Sample arc:', rawArcs[0]);
    }
    
    // Check deserialized data
    const deserializedStorylets = rawStorylets.map(deserializeStorylet);
    const deserializedArcs = rawArcs.map(deserializeStoryArc);
    
    console.log('Deserialized data:');
    console.log('- Deserialized storylets:', deserializedStorylets.length);
    console.log('- Deserialized arcs:', deserializedArcs.length);
    
    // Check store state
    const storeState = useNarrativeStore.getState();
    console.log('Store state:');
    console.log('- Storylets in store:', storeState.storylets.length);
    console.log('- Arcs in store:', storeState.arcs.length);
    console.log('- Loading states:', storeState.loading);
    
    return {
      database: {
        storylets: rawStorylets.length,
        arcs: rawArcs.length
      },
      deserialized: {
        storylets: deserializedStorylets.length,
        arcs: deserializedArcs.length
      },
      store: {
        storylets: storeState.storylets.length,
        arcs: storeState.arcs.length,
        loading: storeState.loading
      }
    };
    
  } catch (error) {
    console.error('Error debugging database:', error);
    return null;
  }
};

/**
 * Check if the visual editor should show nodes
 */
export const debugVisualEditor = () => {
  console.log('=== VISUAL EDITOR DEBUG ===');
  
  const { storylets, arcs } = useNarrativeStore.getState();
  
  console.log('Data available for visual editor:');
  console.log('- Total storylets:', storylets.length);
  console.log('- Total arcs:', arcs.length);
  
  if (storylets.length > 0) {
    console.log('Sample storylet structure:', {
      id: storylets[0].id,
      title: storylets[0].title,
      storyArc: storylets[0].storyArc,
      choices: storylets[0].choices?.length || 0
    });
  }
  
  if (arcs.length > 0) {
    console.log('Sample arc structure:', {
      id: arcs[0].id,
      name: arcs[0].name,
      storyletsInArc: storylets.filter(s => s.storyArc === arcs[0].id).length
    });
  }
  
  // Check for orphaned storylets (no arc)
  const orphanedStorylets = storylets.filter(s => !s.storyArc);
  console.log('- Orphaned storylets (no arc):', orphanedStorylets.length);
  
  return {
    totalStorylets: storylets.length,
    totalArcs: arcs.length,
    orphanedStorylets: orphanedStorylets.length,
    hasData: storylets.length > 0 || arcs.length > 0
  };
};

/**
 * Add this function to window for browser console access
 */
if (typeof window !== 'undefined') {
  (window as any).debugDB = debugDatabaseState;
  (window as any).debugVisualEditor = debugVisualEditor;
}