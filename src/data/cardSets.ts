// Card set configurations for memory games

export interface CardItem {
  id: string;
  name: string;
  imageUrl: string;
  category: string;
}

export interface CardSet {
  id: string;
  name: string;
  description: string;
  theme: string;
  cards: CardItem[];
}

// 80s Retro themed card set
export const retro80sCardSet: CardSet = {
  id: 'retro-80s',
  name: '80s Nostalgia',
  description: 'Iconic items from the 1980s era',
  theme: 'vintage',
  cards: [
    {
      id: 'big-hair',
      name: 'Big Hair',
      imageUrl: '/assets/minigames/cards/big hair.png',
      category: 'fashion'
    },
    {
      id: 'blondie',
      name: 'Blondie',
      imageUrl: '/assets/minigames/cards/blondie.png',
      category: 'music'
    },
    {
      id: 'book-case',
      name: 'Bookcase',
      imageUrl: '/assets/minigames/cards/book case.png',
      category: 'furniture'
    },
    {
      id: 'c64',
      name: 'Commodore 64',
      imageUrl: '/assets/minigames/cards/c64.png',
      category: 'technology'
    },
    {
      id: 'cassette',
      name: 'Cassette Tape',
      imageUrl: '/assets/minigames/cards/casette.png',
      category: 'music'
    },
    {
      id: 'clash',
      name: 'The Clash',
      imageUrl: '/assets/minigames/cards/clash.png',
      category: 'music'
    },
    {
      id: 'hair-band',
      name: 'Hair Band',
      imageUrl: '/assets/minigames/cards/hair band.png',
      category: 'fashion'
    },
    {
      id: 'id',
      name: 'ID Badge',
      imageUrl: '/assets/minigames/cards/id.png',
      category: 'personal'
    },
    {
      id: 'lava-lamp',
      name: 'Lava Lamp',
      imageUrl: '/assets/minigames/cards/lava.png',
      category: 'decor'
    },
    {
      id: 'mug',
      name: 'Coffee Mug',
      imageUrl: '/assets/minigames/cards/mug.png',
      category: 'personal'
    },
    {
      id: 'notebook',
      name: 'Notebook',
      imageUrl: '/assets/minigames/cards/notebook.png',
      category: 'personal'
    },
    {
      id: 'police',
      name: 'Police',
      imageUrl: '/assets/minigames/cards/police.png',
      category: 'authority'
    },
    {
      id: 'protest',
      name: 'Protest',
      imageUrl: '/assets/minigames/cards/protest.png',
      category: 'social'
    },
    {
      id: 'socks',
      name: 'Striped Socks',
      imageUrl: '/assets/minigames/cards/socks.png',
      category: 'fashion'
    },
    {
      id: 'stubby',
      name: 'Beer Bottle',
      imageUrl: '/assets/minigames/cards/stubby.png',
      category: 'personal'
    },
    {
      id: 'vhs',
      name: 'VHS Tape',
      imageUrl: '/assets/minigames/cards/vhs.png',
      category: 'technology'
    },
    {
      id: 'walkman',
      name: 'Walkman',
      imageUrl: '/assets/minigames/cards/walkman.png',
      category: 'technology'
    }
  ]
};

// All available card sets
export const cardSets: { [key: string]: CardSet } = {
  'retro-80s': retro80sCardSet
};

// Helper functions
export const getCardSet = (setId: string): CardSet | undefined => {
  return cardSets[setId];
};

export const getRandomCardsFromSet = (setId: string, count: number): CardItem[] => {
  const cardSet = getCardSet(setId);
  if (!cardSet) return [];
  
  const shuffled = [...cardSet.cards].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

export const getAllCardSets = (): CardSet[] => {
  return Object.values(cardSets);
};