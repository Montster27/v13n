import React, { useState, useEffect, useCallback } from 'react';
import type { MinigameConfig, MinigameResult } from '../../../types/clue';
import { useMinigameStore } from '../../../stores/useMinigameStore';
import { getRandomCardsFromSet } from '../../../data/cardSets';
import type { CardItem } from '../../../data/cardSets';

interface Card {
  id: string;
  cardItem: CardItem;
  isFlipped: boolean;
  isMatched: boolean;
  position: number;
}

interface MemoryCardGameProps {
  config: MinigameConfig;
  clueId: string;
}

export const MemoryCardGame: React.FC<MemoryCardGameProps> = ({
  config,
  clueId
}) => {
  const { completeMinigame } = useMinigameStore();
  
  // Game state
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<Card[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [gameStartTime, setGameStartTime] = useState<Date>();
  const [isGameComplete, setIsGameComplete] = useState(false);

  // Game settings from config
  const cardCount = config.gameSettings.cardCount || 6;
  const flipTime = config.gameSettings.flipTime || 1000;
  const cardSetId = config.gameSettings.cardSetId || 'retro-80s';

  // Initialize game
  useEffect(() => {
    initializeGame();
    setGameStartTime(new Date());
  }, [config]);

  const initializeGame = () => {
    // Get random cards from the selected card set
    const selectedCards = getRandomCardsFromSet(cardSetId, cardCount);
    
    // Create pairs of cards
    const pairs: CardItem[] = [];
    selectedCards.forEach(cardItem => {
      pairs.push(cardItem, cardItem);
    });
    
    // Shuffle cards
    const shuffled = pairs
      .sort(() => Math.random() - 0.5)
      .map((cardItem, index) => ({
        id: `card-${index}`,
        cardItem,
        isFlipped: false,
        isMatched: false,
        position: index
      }));
    
    setCards(shuffled);
    setFlippedCards([]);
    setMoves(0);
    setMatches(0);
    setIsGameComplete(false);
  };

  // Handle card click
  const handleCardClick = useCallback((card: Card) => {
    if (card.isFlipped || card.isMatched || flippedCards.length >= 2) {
      return;
    }

    const newFlippedCards = [...flippedCards, card];
    setFlippedCards(newFlippedCards);
    
    // Flip the card
    setCards(prevCards =>
      prevCards.map(c =>
        c.id === card.id ? { ...c, isFlipped: true } : c
      )
    );

    // If two cards are flipped, check for match
    if (newFlippedCards.length === 2) {
      setMoves(prevMoves => prevMoves + 1);
      
      setTimeout(() => {
        checkForMatch(newFlippedCards);
      }, flipTime);
    }
  }, [flippedCards, flipTime]);

  const checkForMatch = (flippedPair: Card[]) => {
    const [card1, card2] = flippedPair;
    
    if (card1.cardItem.id === card2.cardItem.id) {
      // Match found
      setCards(prevCards =>
        prevCards.map(c =>
          (c.id === card1.id || c.id === card2.id)
            ? { ...c, isMatched: true }
            : c
        )
      );
      
      setMatches(prevMatches => {
        const newMatches = prevMatches + 1;
        
        // Check if game is complete
        if (newMatches === cardCount) {
          completeGame(true);
        }
        
        return newMatches;
      });
    } else {
      // No match, flip cards back
      setCards(prevCards =>
        prevCards.map(c =>
          (c.id === card1.id || c.id === card2.id)
            ? { ...c, isFlipped: false }
            : c
        )
      );
    }
    
    setFlippedCards([]);
  };

  const completeGame = (success: boolean) => {
    if (isGameComplete) return;
    
    setIsGameComplete(true);
    const endTime = new Date();
    const timeSpent = gameStartTime ? Math.floor((endTime.getTime() - gameStartTime.getTime()) / 1000) : 0;
    
    // Calculate score based on moves and time
    const perfectMoves = cardCount;
    const moveEfficiency = Math.max(0, Math.min(100, ((perfectMoves / moves) * 100)));
    const timeBonus = config.timeLimit ? Math.max(0, ((config.timeLimit - timeSpent) / config.timeLimit) * 20) : 0;
    const score = Math.round(moveEfficiency + timeBonus);

    const result: MinigameResult = {
      clueId,
      minigameType: config.type,
      success,
      score: success ? score : 0,
      timeSpent,
      attemptsUsed: 1,
      triggeredStoryletId: success ? config.successStoryletId : config.failureStoryletId,
      completedAt: endTime,
      details: {
        moves,
        accuracy: moveEfficiency,
        bonusPoints: timeBonus,
        perfectRounds: success ? 1 : 0
      }
    };

    // Show completion message briefly before triggering result
    setTimeout(() => {
      completeMinigame(result);
    }, 2000);
  };

  // Grid size calculation
  const gridCols = Math.ceil(Math.sqrt(cardCount * 2));
  const gridSize = `repeat(${gridCols}, 1fr)`;

  return (
    <div className="p-6 min-h-[500px]">
      {/* Game header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-6 text-sm">
          <div className="bg-base-200 px-3 py-2 rounded">
            <span className="font-semibold">Moves:</span> {moves}
          </div>
          <div className="bg-base-200 px-3 py-2 rounded">
            <span className="font-semibold">Matches:</span> {matches}/{cardCount}
          </div>
        </div>
        
        <button
          onClick={initializeGame}
          className="btn btn-ghost btn-sm"
          disabled={isGameComplete}
        >
          🔄 Reset
        </button>
      </div>

      {/* Card grid */}
      <div 
        className="grid gap-3 mx-auto max-w-2xl"
        style={{ gridTemplateColumns: gridSize }}
      >
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => handleCardClick(card)}
            disabled={card.isFlipped || card.isMatched || isGameComplete}
            className={`
              aspect-square rounded-lg transition-all duration-300 
              flex items-center justify-center min-h-[100px] min-w-[100px]
              relative overflow-hidden p-2
              ${card.isFlipped || card.isMatched 
                ? 'bg-white scale-105' 
                : 'bg-gradient-to-br from-blue-600 to-purple-700 hover:from-blue-500 hover:to-purple-600 hover:scale-105'
              }
              ${card.isMatched ? 'ring-4 ring-success ring-opacity-70' : ''}
              ${card.isFlipped && !card.isMatched ? 'ring-4 ring-primary ring-opacity-70' : ''}
            `}
          >
            {card.isFlipped || card.isMatched ? (
              <div className="w-full h-full flex flex-col items-center justify-center">
                <img 
                  src={card.cardItem.imageUrl} 
                  alt={card.cardItem.name}
                  className="w-full h-full object-contain rounded"
                  onError={(e) => {
                    // Fallback to text if image fails to load
                    e.currentTarget.style.display = 'none';
                    if (e.currentTarget.nextSibling) {
                      (e.currentTarget.nextSibling as HTMLElement).style.display = 'block';
                    }
                  }}
                />
                <span className="text-xs font-medium text-center text-gray-600 mt-1 hidden">
                  {card.cardItem.name}
                </span>
              </div>
            ) : (
              <div className="text-white text-4xl font-bold">
                ?
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Game completion message */}
      {isGameComplete && (
        <div className="mt-6 text-center space-y-2">
          <div className="text-xl font-bold text-success">
            🎉 Congratulations!
          </div>
          <div className="text-sm opacity-70">
            Completed in {moves} moves • Score: {Math.round((cardCount / moves) * 100)}%
          </div>
        </div>
      )}
      
      {/* Game tips */}
      {!isGameComplete && moves === 0 && (
        <div className="mt-6 text-center">
          <div className="text-sm opacity-60">
            💡 Click cards to flip them and find matching pairs
          </div>
        </div>
      )}
    </div>
  );
};