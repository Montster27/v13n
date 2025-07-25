/**
 * App initialization utilities to check for empty database and offer sample data
 */
import { useNarrativeStore } from '../stores/useNarrativeStore';
import { createSampleStorylets } from './createSampleStorylets';

/**
 * Check if the app needs initial data and optionally create sample data
 */
export const checkAndInitializeData = async (autoCreateSample: boolean = false) => {
  const { storylets, arcs, loadStorylets, loadStoryArcs } = useNarrativeStore.getState();
  
  // First ensure data is loaded from the database
  await loadStorylets();
  await loadStoryArcs();
  
  // Get fresh state after loading
  const freshState = useNarrativeStore.getState();
  const isEmpty = freshState.storylets.length === 0 && freshState.arcs.length === 0;
  
  console.log('App initialization check:');
  console.log('- Storylets:', freshState.storylets.length);
  console.log('- Story Arcs:', freshState.arcs.length);
  console.log('- Database is empty:', isEmpty);
  
  if (isEmpty) {
    console.log('📝 Database is empty. The visual editor will show no storylets or connections.');
    
    if (autoCreateSample) {
      console.log('🚀 Auto-creating sample data...');
      try {
        const result = await createSampleStorylets();
        console.log('✅ Sample data created successfully:', result);
        return { created: true, result };
      } catch (error) {
        console.error('❌ Failed to create sample data:', error);
        return { created: false, error };
      }
    } else {
      console.log('💡 To populate the database with sample data:');
      console.log('1. Go to Dashboard → Data Manager');
      console.log('2. Click "Create Sample Detective Story"');
      console.log('3. Then visit the Visual Editor to see the storylets');
      return { created: false, needsData: true };
    }
  } else {
    console.log('✅ Database contains data. Visual editor should work normally.');
    return { created: false, needsData: false };
  }
};

/**
 * Display helpful debugging information about why the visual editor might be empty
 */
export const diagnoseVisualEditorIssues = () => {
  const { storylets, arcs } = useNarrativeStore.getState();
  
  console.log('=== VISUAL EDITOR DIAGNOSIS ===');
  
  if (storylets.length === 0 && arcs.length === 0) {
    console.log('🔍 Issue: No data in database');
    console.log('📋 Solution: Create sample data via Data Manager');
    return 'NO_DATA';
  }
  
  if (storylets.length > 0 && arcs.length === 0) {
    console.log('🔍 Issue: Storylets exist but no story arcs');
    console.log('📋 Solution: Storylets will show in "All Storylets" view');
    return 'NO_ARCS';
  }
  
  if (storylets.length === 0 && arcs.length > 0) {
    console.log('🔍 Issue: Story arcs exist but no storylets');
    console.log('📋 Solution: Create storylets and assign them to arcs');
    return 'NO_STORYLETS';
  }
  
  // Check if storylets have proper structure
  const storyletsWithIssues = storylets.filter(s => 
    !s.id || !s.title || !s.description || !s.content
  );
  
  if (storyletsWithIssues.length > 0) {
    console.log('🔍 Issue: Some storylets have missing required fields');
    console.log('📋 Affected storylets:', storyletsWithIssues.length);
    return 'MALFORMED_DATA';
  }
  
  console.log('✅ Data looks good. Check visual editor implementation.');
  return 'DATA_OK';
};