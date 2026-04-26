import { Sparkles, Star } from 'lucide-react';
import HeroBanner from '../components/HeroBanner';
import CollectionCard from '../components/CollectionCard';
import FilterBar from '../components/FilterBar';
import TradeMatchCard from '../components/TradeMatchCard';
import DailyOpportunities from '../components/DailyOpportunities';
import ScoreGuide from '../components/ScoreGuide';
import { collections } from '../data/collections';

export default function HomePage() {
  return (
    <div className="pt-14 pb-20">
      {/* Hero Banner */}
      <div className="mt-4">
        <HeroBanner
          title="HKDV Trade"
          subtitle="The community marketplace for Hello Kitty Dream Village collectors. Browse items, discover values, and join the exchange."
          ctaText="Join the Community"
        />
      </div>

      <div className="max-w-content mx-auto px-4 mt-8">
        {/* Trade Matching Section - New! */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-10">
          <TradeMatchCard />
          <DailyOpportunities />
        </div>

        {/* Score Guide - New! */}
        <div className="mb-10">
          <ScoreGuide />
        </div>
      </div>

      {/* New Releases Section */}
      <section className="max-w-content mx-auto px-4">
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-hkdv-pink flex items-center justify-center gap-2 mb-2">
            <Sparkles size={20} className="text-hkdv-yellow" />
            New Releases
          </h2>
          <p className="text-sm text-hkdv-text-secondary">
            The latest collections — click to browse items
          </p>
        </div>

        {/* Collection Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((collection, index) => (
            <CollectionCard key={collection.id} collection={collection} index={index} />
          ))}
        </div>
      </section>

      {/* Browse Items Section */}
      <section className="max-w-content mx-auto px-4 mt-12">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-hkdv-pink flex items-center gap-2">
            <Star size={18} className="text-hkdv-pink" />
            Browse Items
            <Star size={18} className="text-hkdv-pink" />
          </h2>
        </div>

        <FilterBar />

        {/* Empty state */}
        <div className="mt-8 text-center py-12 bg-white rounded-2xl shadow-card border border-pink-100/30">
          <img src="/mascot-idle.png" alt="" className="w-16 h-16 mx-auto mb-3 opacity-50" />
          <p className="text-sm text-hkdv-text-muted">No items match your filters.</p>
          <p className="text-xs text-hkdv-text-muted mt-1">Try adjusting your search or filters</p>
        </div>
      </section>
    </div>
  );
}
