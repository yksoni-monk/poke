import React, { useEffect, useState } from 'react';
import { CardData } from '../types/card';
import { CardApiService, useCardApi } from '../services/cardApi';

import LibraryCardDetails from '../components/LibraryCardDetails';

interface LibraryProps {
  onBack?: () => void;
}

const Library: React.FC<LibraryProps> = ({ onBack }) => {
  const { fetchLibrary } = useCardApi();
  const [cardIds, setCardIds] = useState<string[]>([]);
  const [cards, setCards] = useState<CardData[]>([]);
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLibrary = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchLibrary();
        console.log('Library fetch result:', data);
        if (data.success) {
          console.log('Card IDs in library:', data.card_ids);
          setCardIds(data.card_ids || []);
        } else {
          setError('Failed to fetch library');
        }
      } catch (err) {
        setError('Failed to fetch library');
      } finally {
        setLoading(false);
      }
    };
    loadLibrary();
  }, []); // Empty dependency array - only run once on mount

  useEffect(() => {
    const fetchCards = async () => {
      if (!cardIds.length) return setCards([]);
      setLoading(true);
      try {
        const cardDataList: CardData[] = [];
        for (const id of cardIds) {
          const data = await CardApiService.getCardById(id);
          if (data && data.name) {
            cardDataList.push(data);
          }
        }
        setCards(cardDataList);
      } catch (err) {
        setError('Failed to fetch card details');
      } finally {
        setLoading(false);
      }
    };
    fetchCards();
  }, [cardIds]);

  if (selectedCard) {
    return (
      <LibraryCardDetails cardData={selectedCard} onBack={() => setSelectedCard(null)} />
    );
  }

  return (
    <div className="h-dvh flex flex-col bg-gradient-to-br from-blue-900 via-purple-900 to-purple-800">
      {/* Header */}
      <div className="flex-none p-6 text-center text-white flex items-center justify-between">
        {onBack && (
          <button
            onClick={onBack}
            className="text-blue-200 hover:text-white text-base px-4 py-2 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 transition-all duration-200"
          >
            &larr; Back to Home
          </button>
        )}
        <h1 className="flex-1 text-center text-2xl font-bold">Your Library</h1>
        <span className="w-32" /> {/* Spacer for symmetry */}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-auto p-6">
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="text-white text-lg">Loading your collection...</div>
          </div>
        )}
        
        {error && (
          <div className="flex items-center justify-center h-full">
            <div className="text-red-300 text-center">
              <div className="text-lg mb-2">⚠️</div>
              <div>{error}</div>
            </div>
          </div>
        )}
        
        {!loading && !error && cards.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="text-6xl mb-4">📚</div>
            <div className="text-white text-xl font-semibold mb-2">Your library is empty</div>
            <div className="text-blue-200 text-sm">Scan some cards to start building your collection!</div>
          </div>
        )}
        
        {!loading && !error && cards.length > 0 && (
          <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
            {cards.map(card => (
              <div
                key={card.id}
                className="bg-white/15 backdrop-blur-md rounded-2xl p-4 flex flex-col items-center cursor-pointer hover:bg-white/25 transition-all duration-300 border border-white/20 hover:border-white/40 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
                onClick={() => setSelectedCard(card)}
              >
                <div className="w-full aspect-[3/4] rounded-xl overflow-hidden mb-3 bg-white/10">
                  <img 
                    src={card.imageUrl} 
                    alt={card.name} 
                    className="w-full h-full object-contain p-2" 
                  />
                </div>
                <div className="text-white font-semibold text-sm text-center leading-tight">
                  {card.name}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Library; 