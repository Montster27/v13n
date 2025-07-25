import React, { useState } from 'react';
import { Card } from '../common/Card';
import { MemoryCardGame } from '../minigames/games/MemoryCardGame';
import { LogicPuzzleGame } from '../minigames/games/LogicPuzzleGame';
import { SequenceMatchGame } from '../minigames/games/SequenceMatchGame';
import { WordPuzzleGame } from '../minigames/games/WordPuzzleGame';
import { ReactionTimeGame } from '../minigames/games/ReactionTimeGame';
import { PatternRecognitionGame } from '../minigames/games/PatternRecognitionGame';
import type { MinigameConfig, MinigameSettings } from '../../types/clue';

// Simplified config interface for testing
interface TestMinigameConfig {
  type: MinigameConfig['type'];
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number;
  gameSettings: MinigameSettings;
}

interface MinigameOption {
  id: string;
  name: string;
  description: string;
  type: MinigameConfig['type'];
  component: React.ComponentType<{ config: TestMinigameConfig; clueId: string }>;
  defaultConfig: Omit<TestMinigameConfig, 'type'>;
}

const minigameOptions: MinigameOption[] = [
  {
    id: 'memory-cards',
    name: '🃏 Memory Card Game',
    description: 'Match pairs of cards by remembering their positions',
    type: 'memory_cards',
    component: MemoryCardGame,
    defaultConfig: {
      difficulty: 'medium',
      timeLimit: 60,
      settings: {
        cardCount: 16, // 8 pairs = 16 cards
        flipTime: 1000
      }
    }
  },
  {
    id: 'logic-puzzle',
    name: '🧩 Logic Puzzle Game', 
    description: 'Solve Latin Square puzzles using logical deduction',
    type: 'logic_puzzle',
    component: LogicPuzzleGame,
    defaultConfig: {
      difficulty: 'medium',
      timeLimit: 120,
      settings: {
        gridSize: 4,
        hintsEnabled: true
      }
    }
  },
  {
    id: 'sequence-match',
    name: '🔄 Sequence Match Game',
    description: 'Remember and repeat increasingly complex color sequences',
    type: 'sequence_match',
    component: SequenceMatchGame,
    defaultConfig: {
      difficulty: 'medium',
      timeLimit: 90,
      settings: {
        sequenceLength: 3, // Starting sequence length
        maxLength: 8,
        colors: ['red', 'blue', 'green', 'yellow']
      }
    }
  },
  {
    id: 'word-puzzle',
    name: '📝 Word Puzzle Game',
    description: 'Fill in crossword-style word puzzles with clues',
    type: 'word_puzzle',
    component: WordPuzzleGame,
    defaultConfig: {
      difficulty: 'medium',
      timeLimit: 180,
      settings: {
        gridSize: 5,
        wordCount: 6
      }
    }
  },
  {
    id: 'reaction-time',
    name: '⚡ Reaction Time Game',
    description: 'Click targets as quickly as possible to test reflexes',
    type: 'reaction_time',
    component: ReactionTimeGame,
    defaultConfig: {
      difficulty: 'medium',
      timeLimit: 60,
      settings: {
        targetCount: 10,
        targetSize: 'medium',
        targetSpeed: 'normal'
      }
    }
  },
  {
    id: 'pattern-recognition',
    name: '🎨 Pattern Recognition Game',
    description: 'Identify patterns in shapes, colors, and arrangements',
    type: 'pattern_recognition',
    component: PatternRecognitionGame,
    defaultConfig: {
      difficulty: 'medium',
      timeLimit: 90,
      settings: {
        patternComplexity: 'medium',
        elementCount: 6
      }
    }
  }
];

const difficultyOptions = [
  { value: 'easy', label: '🟢 Easy', color: 'text-success' },
  { value: 'medium', label: '🟡 Medium', color: 'text-warning' },
  { value: 'hard', label: '🔴 Hard', color: 'text-error' }
] as const;

export const MinigameTester: React.FC = () => {
  const [selectedMinigame, setSelectedMinigame] = useState<MinigameOption | null>(null);
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [customTimeLimit, setCustomTimeLimit] = useState<number>(60);
  const [gameKey, setGameKey] = useState(0); // Force re-render when restarting

  const handleSelectMinigame = (minigame: MinigameOption) => {
    setSelectedMinigame(minigame);
    setCustomTimeLimit(minigame.defaultConfig.timeLimit || 60);
    setGameKey(prev => prev + 1); // Reset game instance
  };

  const handleRestartGame = () => {
    setGameKey(prev => prev + 1); // Force component remount
  };

  const handleBackToMenu = () => {
    setSelectedMinigame(null);
    setGameKey(prev => prev + 1);
  };

  const getCurrentConfig = (): TestMinigameConfig => {
    if (!selectedMinigame) throw new Error('No minigame selected');
    
    return {
      type: selectedMinigame.type,
      difficulty,
      timeLimit: customTimeLimit,
      gameSettings: selectedMinigame.defaultConfig.settings
    };
  };

  if (selectedMinigame) {
    const GameComponent = selectedMinigame.component;
    const config = getCurrentConfig();

    return (
      <div className="space-y-6">
        {/* Game Header */}
        <Card className="border-2 border-primary/20">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">{selectedMinigame.name}</h2>
              <p className="text-base-content/70">{selectedMinigame.description}</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleRestartGame}
                className="btn btn-outline btn-sm"
              >
                🔄 Restart
              </button>
              <button 
                onClick={handleBackToMenu}
                className="btn btn-ghost btn-sm"
              >
                ← Back to Menu
              </button>
            </div>
          </div>
          
          {/* Game Settings */}
          <div className="flex gap-4 mt-4 pt-4 border-t border-base-300">
            <div className="flex items-center gap-2">
              <span className="text-sm opacity-70">Difficulty:</span>
              <select 
                className="select select-bordered select-xs"
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
              >
                {difficultyOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm opacity-70">Time Limit:</span>
              <input 
                type="number"
                min="30"
                max="300"
                className="input input-bordered input-xs w-20"
                value={customTimeLimit}
                onChange={(e) => setCustomTimeLimit(parseInt(e.target.value) || 60)}
              />
              <span className="text-xs opacity-60">seconds</span>
            </div>
          </div>
        </Card>

        {/* Game Container */}
        <Card className="min-h-96">
          <GameComponent 
            key={gameKey}
            config={config}
            clueId="test-clue-id"
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">🎮 Minigame Tester</h1>
        <p className="text-base-content/70">
          Test and play all available minigames with customizable settings
        </p>
      </div>

      {/* Minigame Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {minigameOptions.map((minigame) => (
          <Card 
            key={minigame.id}
            className="hover:shadow-lg transition-all duration-200 cursor-pointer hover:scale-105 border-2 border-transparent hover:border-primary/20"
            onClick={() => handleSelectMinigame(minigame)}
          >
            <div className="text-center space-y-4">
              <div className="text-4xl">{minigame.name.split(' ')[0]}</div>
              <div>
                <h3 className="text-lg font-semibold">{minigame.name.slice(2)}</h3>
                <p className="text-sm text-base-content/70 mt-2">
                  {minigame.description}
                </p>
              </div>
              
              {/* Game Info */}
              <div className="space-y-2 text-xs opacity-60">
                <div className="flex justify-between">
                  <span>Default Time:</span>
                  <span>{minigame.defaultConfig.timeLimit}s</span>
                </div>
                <div className="flex justify-between">
                  <span>Default Difficulty:</span>
                  <span className="capitalize">{minigame.defaultConfig.difficulty}</span>
                </div>
              </div>

              <button 
                className="btn btn-primary btn-sm w-full"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectMinigame(minigame);
                }}
              >
                🎮 Play Game
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Statistics */}
      <Card className="bg-base-200">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">📊 Available Minigames</h3>
          <div className="flex justify-center gap-8 text-sm">
            <div>
              <div className="text-2xl font-bold text-primary">{minigameOptions.length}</div>
              <div className="opacity-70">Total Games</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-success">6</div>
              <div className="opacity-70">Game Types</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-warning">3</div>
              <div className="opacity-70">Difficulty Levels</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Instructions */}
      <Card className="bg-info/10 border-info/20">
        <div className="space-y-2">
          <h4 className="font-semibold text-info">💡 How to Use</h4>
          <ul className="text-sm space-y-1 opacity-80">
            <li>• Click any minigame card to start playing</li>
            <li>• Adjust difficulty and time limit before playing</li>
            <li>• Use "Restart" to replay with the same settings</li>
            <li>• Games automatically track your performance</li>
            <li>• Perfect for testing game mechanics and balance</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};