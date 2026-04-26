import { Sparkles } from 'lucide-react';
import HeroBanner from '../components/HeroBanner';
import CollectionCard from '../components/CollectionCard';
import FilterBar from '../components/FilterBar';
import TradeMatchCard from '../components/TradeMatchCard';
import DailyOpportunities from '../components/DailyOpportunities';
import ScoreGuide from '../components/ScoreGuide';
import { useCollections } from '../hooks/useCollections';
import { useTradeMatches } from '../hooks/useTradeMatches';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { collections, loading, error } = useCollections();
  const { trader, isLoggedIn } = useAuth();
  const { matches: tradeMatches, loading: matchesLoading } = useTradeMatches(trader?.id);

  // Show top match or empty state
  const topMatch = tradeMatches[0];

  return (
    <div className="pt-[60px] pb-20">
      <div className="mt-4">
        <HeroBanner title="MomoMint" subtitle="The community marketplace for Hello Kitty Dream Village collectors." ctaText="Join the Community" />
      </div>

      <div className="max-w-content mx-auto px-4 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-8">
          {isLoggedIn ? (
            <TradeMatchCard match={topMatch} index={0} />
          ) : (
            <TradeMatchCard />
          )}
          <DailyOpportunities matches={tradeMatches.slice(0, 3)} loading={matchesLoading} />
        </div>
        <div className="mb-8">
          <ScoreGuide />
        </div>
      </div>

      <section className="max-w-content mx-auto px-4">
        <div className="text-center mb-5">
          <h2 className="text-h1 flex items-center justify-center gap-2 mb-1.5">
            <Sparkles size={16} style={{ color: '#FF8CC6' }} />
            New Releases
          </h2>
          <p className="text-caption" style={{ color: '#B08AA0' }}>
            {loading ? 'Loading...' : `${collections.length} collections`}
          </p>
        </div>

        {error && (
          <div className="text-center py-8 rounded-[24px] border" style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}>
            <img src="/momo-idle.png" alt="" className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-body" style={{ color: '#B08AA0' }}>Couldn&apos;t load collections</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-[24px] border animate-pulse overflow-hidden" style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}>
                  <div className="h-40" style={{ backgroundColor: '#FFE3F1' }} />
                  <div className="p-3 space-y-2">
                    <div className="h-3 rounded w-1/4" style={{ backgroundColor: '#FFE3F1' }} />
                    <div className="h-4 rounded w-3/4" style={{ backgroundColor: '#FFE3F1' }} />
                    <div className="h-3 rounded w-full" style={{ backgroundColor: '#FFE3F1' }} />
                  </div>
                </div>
              ))
            : collections.map((c, i) => <CollectionCard key={c.id} collection={c} index={i} />)}
        </div>
      </section>

      <section className="max-w-content mx-auto px-4 mt-10">
        <h2 className="text-h1 flex items-center justify-center gap-2 mb-4">
          <Sparkles size={16} style={{ color: '#FF8CC6' }} />
          Browse Items
          <Sparkles size={16} style={{ color: '#FF8CC6' }} />
        </h2>
        <FilterBar />
        <div className="mt-6 text-center py-12 rounded-[24px] border" style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}>
          <img src="/momo-idle.png" alt="" className="w-14 h-14 mx-auto mb-3 opacity-40" />
          <p className="text-body" style={{ color: '#B08AA0' }}>No items match your filters.</p>
        </div>
      </section>
    </div>
  );
}
