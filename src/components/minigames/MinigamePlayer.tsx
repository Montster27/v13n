import React, { useEffect, useState } from 'react';
import type { MinigameConfig } from '../../types/clue';
import { MemoryCardGame } from './games/MemoryCardGame';
import { LogicPuzzleGame } from './games/LogicPuzzleGame';
import { SequenceMatchGame } from './games/SequenceMatchGame';
import { WordPuzzleGame } from './games/WordPuzzleGame';
import { ReactionTimeGame } from './games/ReactionTimeGame';
import { PatternRecognitionGame } from './games/PatternRecognitionGame';

interface MinigamePlayerProps {
  config: MinigameConfig;
  clueId: string;
}

export const MinigamePlayer: React.FC<MinigamePlayerProps> = ({
  config,
  clueId
}) => {
  const [gameComponent, setGameComponent] = useState<React.ReactNode>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadGame = async () => {
      try {
        // Load the appropriate minigame component based on type
        switch (config.type) {
          case 'memory_cards':
            setGameComponent(
              <MemoryCardGame 
                config={config}
                clueId={clueId}
              />
            );
            break;
            
          case 'logic_puzzle':
            setGameComponent(
              <LogicPuzzleGame 
                config={config}
                clueId={clueId}
              />
            );
            break;
            
          case 'sequence_match':
            setGameComponent(
              <SequenceMatchGame 
                config={config}
                clueId={clueId}
              />
            );
            break;
            
          case 'word_puzzle':
            setGameComponent(
              <WordPuzzleGame 
                config={config}
                clueId={clueId}
              />
            );
            break;
            
          case 'reaction_time':
            setGameComponent(
              <ReactionTimeGame 
                config={config}
                clueId={clueId}
              />
            );
            break;
            
          case 'pattern_recognition':
            setGameComponent(
              <PatternRecognitionGame 
                config={config}
                clueId={clueId}
              />
            );
            break;
            
          default:
            setError(`Unknown minigame type: ${config.type}`);
        }
      } catch (err) {
        console.error('Failed to load minigame:', err);
        setError('Failed to load minigame');
      }
    };

    loadGame();
  }, [config, clueId]);

  if (error) {
    return (
      <div className="p-8 min-h-[500px] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="text-error text-lg font-semibold">Game Loading Error</div>
          <p className="text-base-content/70">{error}</p>
          <div className="text-sm opacity-60">
            Game type: {config.type}
          </div>
        </div>
      </div>
    );
  }

  if (!gameComponent) {
    return (
      <div className="p-8 min-h-[500px] flex items-center justify-center">
        <div className="flex items-center gap-4">
          <div className="loading loading-spinner loading-lg"></div>
          <span>Loading game...</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="minigame-player"
      style={{
        backgroundColor: config.backgroundColor || 'transparent',
        color: config.accentColor ? `${config.accentColor}` : 'inherit'
      }}
    >
      {gameComponent}
    </div>
  );
};