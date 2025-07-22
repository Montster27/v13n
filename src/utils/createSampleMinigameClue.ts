// Helper to create a sample minigame clue for testing
import { useClueStore } from '../stores/useClueStore';
import { useNarrativeStore } from '../stores/useNarrativeStore';
import type { MinigameConfig } from '../types/clue';
import { MEMORY_CARD_GAME, TIME_LIMITS } from '../constants/game';

export const createSampleMinigameClue = async () => {
  const { addClue } = useClueStore.getState();
  const { addStorylet } = useNarrativeStore.getState();
  
  // First create the success and failure storylets
  const successStoryletId = await addStorylet({
    title: "Memory Palace Success",
    description: "Your exceptional memory skills revealed hidden connections",
    content: `Your mind cuts through the chaos of memories like a knife through butter. The images snap into place with crystal clarity - each item telling part of a larger story.

The photograph falls into place: the big hair, the walkman, the protest signs. You've seen these before, in different contexts, different times. Your memory has unlocked a crucial pattern.

Detective Martinez nods approvingly. "Most people can't make those connections. Your mind works differently - that's exactly what we need for this case."

The memories you've organized reveal a timeline that changes everything about this investigation.`,
    choices: [{
      id: crypto.randomUUID(),
      text: 'Explain the pattern you discovered',
      description: 'Share your insights with the detective',
      effects: [
        {
          id: crypto.randomUUID(),
          type: 'resource',
          target: 'knowledge',
          value: 15,
          operator: '+',
          description: 'Gained valuable insights'
        }
      ],
      requirements: [],
      probability: 100,
      unlocked: true
    }],
    effects: [],
    storyArc: undefined,
    triggers: [],
    status: 'dev',
    tags: ['memory', 'success', 'detective'],
    priority: 1,
    estimatedPlayTime: 3,
    prerequisites: []
  });

  const failureStoryletId = await addStorylet({
    title: "Memory Fog",
    description: "The memories slip away like smoke",
    content: `The images blur together in your mind. The harder you try to focus, the more they seem to shift and change. The walkman becomes a radio, the protest sign becomes a street sign, the patterns dissolve.

Detective Martinez frowns as you struggle to articulate what you're seeing. "Take your time," she says, but you can hear the disappointment in her voice.

Perhaps there's another approach. Sometimes the mind reveals its secrets through different pathways. This direct confrontation with memory isn't working - you'll need to try a different technique.

Not everything can be solved through pure recollection. Sometimes you need to get creative.`,
    choices: [{
      id: crypto.randomUUID(),
      text: 'Suggest a different approach',
      description: 'Propose an alternative investigation method',
      effects: [
        {
          id: crypto.randomUUID(),
          type: 'resource',
          target: 'social',
          value: 10,
          operator: '+',
          description: 'Built rapport through honest collaboration'
        }
      ],
      requirements: [],
      probability: 100,
      unlocked: true
    }],
    effects: [],
    storyArc: undefined,
    triggers: [],
    status: 'dev',
    tags: ['memory', 'failure', 'detective'],
    priority: 1,
    estimatedPlayTime: 3,
    prerequisites: []
  });

  // Create the minigame configuration
  const minigameConfig: MinigameConfig = {
    id: 'memory-test-80s',
    type: 'memory_cards',
    title: 'Memory Palace Test',
    introduction: `Detective Martinez slides a collection of photographs across the table. Her eyes are sharp, evaluating.

"Before we go any further with this case, I need to know if you have the mental capacity we need. These aren't just random images - they're fragments from various crime scenes, witness statements, and evidence from the past five years."

She taps the table with her pen. "Your mind needs to be a palace of memory, able to hold and connect seemingly unrelated information. The killer we're tracking operates in patterns, but those patterns are subtle. They hide in the connections between things that happened months or years apart."

The photographs seem to shimmer under the harsh fluorescent lights. Each one tells a story, but do you have the mental agility to see how they connect?

"Show me what kind of investigator you really are."`,
    instructions: `Click cards to reveal the images beneath. Find matching pairs by remembering their locations.

You'll see photographs from various crime scenes and evidence. Your goal is to match identical items that appeared in different contexts - a crucial skill for pattern recognition in detective work.

Each successful match demonstrates your ability to see connections others miss. But be careful - you only have a limited time to prove your worth to Detective Martinez.`,
    difficulty: 'medium',
    timeLimit: TIME_LIMITS.MEMORY_GAME_TIME,
    maxAttempts: 2,
    successStoryletId,
    failureStoryletId,
    gameSettings: {
      cardCount: MEMORY_CARD_GAME.DEFAULT_CARD_PAIRS,
      cardSetId: 'retro-80s',
      flipTime: MEMORY_CARD_GAME.DEFAULT_FLIP_TIME
    },
    theme: 'noir',
    backgroundColor: '#1a1a1a',
    accentColor: '#ffd700'
  };

  // Create the clue
  const clueId = await addClue({
    name: 'detective_memory_test',
    title: 'Detective Memory Assessment',
    description: 'Detective Martinez wants to test your pattern recognition abilities before trusting you with the case',
    fullDescription: 'A crucial test that will determine whether Detective Martinez considers you capable enough to handle the complex investigation ahead. Your memory and pattern recognition skills will be put to the ultimate test.',
    category: 'evidence',
    type: 'logical',
    importance: 'major',
    investigationLevel: 'detailed',
    reliability: 'confirmed',
    status: 'active',
    tags: ['detective', 'memory', 'test', 'investigation'],
    keywords: ['pattern recognition', 'memory palace', 'detective work', 'crime scenes'],
    narrativeWeight: 8,
    icon: '🧠',
    color: '#4a5568',
    prerequisites: [],
    requiredStorylets: [],
    requiredCharacterInteractions: [],
    unlocksStorylets: [successStoryletId, failureStoryletId],
    isMinigame: true,
    minigameConfig
  });

  // Sample minigame clue created successfully
  return clueId;
};