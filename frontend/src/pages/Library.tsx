import React, { useEffect, useState } from 'react';
import { CardData } from '../types/card';
import { CardApiService } from '../services/cardApi';
import CardDetails from '../components/CardDetails';
import LibraryCardDetails from '../components/LibraryCardDetails';

interface LibraryProps {
  onBack?: () => void;
}

const Library: React.FC<LibraryProps> = ({ onBack }) => {
  const [cardIds, setCardIds] = useState<string[]>([]);
  const [cards, setCards] = useState<CardData[]>([]);
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLibrary = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await CardApiService.fetchLibrary();
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
    fetchLibrary();
  }, []);

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
      <div className="flex-none p-4 text-center text-white text-xl font-bold flex items-center justify-between">
        {onBack && (
          <button
            onClick={onBack}
            className="text-blue-200 hover:text-white text-base px-2 py-1 rounded bg-blue-900/40"
          >
            &larr; Back to Home
          </button>
        )}
        <span className="flex-1 text-center">Your Library</span>
        <span className="w-32" /> {/* Spacer for symmetry */}
      </div>
      <div className="flex-1 min-h-0 overflow-auto p-4">
        {loading && <div className="text-white">Loading...</div>}
        {error && <div className="text-red-300">{error}</div>}
        {!loading && !error && cards.length === 0 && (
          <div className="text-blue-200 text-center">No cards in your library yet.</div>
        )}
        <div className="grid grid-cols-2 gap-4">
          {cards.map(card => (
            <div
              key={card.id}
              className="bg-white/10 rounded-xl p-2 flex flex-col items-center cursor-pointer hover:bg-white/20 transition"
              onClick={() => setSelectedCard(card)}
            >
              <img src={card.imageUrl} alt={card.name} className="w-24 h-32 object-contain mb-2" />
              <div className="text-white text-sm font-semibold text-center">{card.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Library; 