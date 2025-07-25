/**
 * Utility to create sample storylets and story arcs for testing the visual editor
 */

import { useNarrativeStore } from '../stores/useNarrativeStore';

export const createSampleStorylets = async () => {
  const { addStorylet, addStoryArc } = useNarrativeStore.getState();
  
  try {
    // Create a sample story arc first
    const arcId = await addStoryArc({
      name: "Detective Investigation",
      description: "A thrilling detective story where you investigate a mysterious case",
      estimatedLength: 30,
      tags: ["detective", "mystery", "investigation"]
    });

    // Create connected storylets
    const storylet1Id = await addStorylet({
      title: "The Crime Scene",
      description: "You arrive at the scene of a mysterious incident",
      content: "The room is in disarray. There are signs of a struggle, and several clues scattered around. Where do you want to investigate first?",
      status: "dev",
      storyArc: arcId,
      triggers: [],
      effects: [],
      choices: [],
      tags: ["investigation", "crime-scene"],
      priority: 1,
      estimatedPlayTime: 5
    });

    const storylet2Id = await addStorylet({
      title: "Examine the Evidence",
      description: "You carefully examine the physical evidence",
      content: "Looking closer at the evidence, you notice some interesting details. A torn piece of fabric, fingerprints on the window, and a strange symbol drawn in dust.",
      status: "dev", 
      storyArc: arcId,
      triggers: [],
      effects: [],
      choices: [],
      tags: ["evidence", "analysis"],
      priority: 1,
      estimatedPlayTime: 3
    });

    const storylet3Id = await addStorylet({
      title: "Interview Witnesses",
      description: "You speak with people who might have seen something",
      content: "The witnesses have conflicting stories. One claims to have seen a suspicious figure, while another insists nothing unusual happened.",
      status: "dev",
      storyArc: arcId,
      triggers: [],
      effects: [],
      choices: [],
      tags: ["interview", "witnesses"],
      priority: 1,
      estimatedPlayTime: 7
    });

    const storylet4Id = await addStorylet({
      title: "Solve the Case",
      description: "You piece together the clues to solve the mystery",
      content: "With all the evidence gathered and witness testimonies analyzed, you're ready to solve the case. The truth is finally clear.",
      status: "dev",
      storyArc: arcId,
      triggers: [],
      effects: [],
      choices: [],
      tags: ["conclusion", "solution"],
      priority: 1,
      estimatedPlayTime: 10
    });

    // Update storylets with connections (choices leading to next storylets)
    const { updateStorylet } = useNarrativeStore.getState();

    // Crime Scene -> Evidence OR Interview
    await updateStorylet(storylet1Id, {
      choices: [
        {
          id: crypto.randomUUID(),
          text: "Examine the physical evidence",
          description: "Look closely at the clues left behind",
          effects: [],
          requirements: [],
          probability: 100,
          unlocked: true,
          nextStoryletId: storylet2Id,
          createNewStorylet: false
        },
        {
          id: crypto.randomUUID(),
          text: "Interview witnesses", 
          description: "Talk to people who might have seen something",
          effects: [],
          requirements: [],
          probability: 100,
          unlocked: true,
          nextStoryletId: storylet3Id,
          createNewStorylet: false
        }
      ]
    });

    // Evidence -> Solve
    await updateStorylet(storylet2Id, {
      choices: [
        {
          id: crypto.randomUUID(),
          text: "Continue investigation",
          description: "You have enough evidence to solve the case",
          effects: [],
          requirements: [],
          probability: 100,
          unlocked: true,
          nextStoryletId: storylet4Id,
          createNewStorylet: false
        }
      ]
    });

    // Interview -> Solve  
    await updateStorylet(storylet3Id, {
      choices: [
        {
          id: crypto.randomUUID(),
          text: "Piece together the truth",
          description: "The witness testimonies provide the final pieces",
          effects: [],
          requirements: [],
          probability: 100,
          unlocked: true,
          nextStoryletId: storylet4Id,
          createNewStorylet: false
        }
      ]
    });

    console.log('✅ Sample storylets created successfully!');
    console.log(`Created arc: ${arcId}`);
    console.log(`Created storylets: ${[storylet1Id, storylet2Id, storylet3Id, storylet4Id].join(', ')}`);
    
    return {
      arcId,
      storyletIds: [storylet1Id, storylet2Id, storylet3Id, storylet4Id]
    };

  } catch (error) {
    console.error('❌ Failed to create sample storylets:', error);
    throw error;
  }
};

// Simpler function to create just one test storylet
export const createTestStorylet = async () => {
  const { addStorylet } = useNarrativeStore.getState();
  
  try {
    const storyletId = await addStorylet({
      title: "Test Storylet",
      description: "A simple test storylet for the visual editor",
      content: "This is a test storylet to verify the visual editor is working correctly.",
      status: "dev",
      triggers: [],
      effects: [],
      choices: [
        {
          id: crypto.randomUUID(),
          text: "Continue",
          description: "Move to the next part of the story",
          effects: [],
          requirements: [],
          probability: 100,
          unlocked: true
        }
      ],
      tags: ["test"],
      priority: 1,
      estimatedPlayTime: 1
    });

    console.log('✅ Test storylet created:', storyletId);
    return storyletId;
  } catch (error) {
    console.error('❌ Failed to create test storylet:', error);
    throw error;
  }
};