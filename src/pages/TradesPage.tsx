import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, SlidersHorizontal, TrendingUp, Filter, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTradeMatches } from '../hooks/useTradeMatches';
import TradeMatchCard from '../components/TradeMatchCard';

export default function TradesPage() {
  const { trader, isLoggedIn } = useAuth();
  const { matches, loading } = useTradeMatches(trader?.id);
  const [sortBy, setSortBy] = useState<'score' | 'trades' | 'recent'>('score');
  const [minScore, setMinScore] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const sortedMatches = [...matches].sort((a, b) => {
    if (sortBy === 'score') return b.matchScore - a.matchScore;
    if (sortBy === 'trades') return b.possibleTrades - a.possibleTrades;
    return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime();
  }).filter((m) => m.matchScore >= minScore);

  if (!isLoggedIn) {
    return (
      <div className="pt-[60px] pb-20 flex items-center justify-center min-h-[60vh] px-4">
        <div className="text-center max-w-sm">
          <img src="/momo-idle.png" alt="" className="w-20 h-20 mx-auto mb-4 opacity-50" />
          <h1 className="text-h1 mb-3">Find Trade Matches</h1>
          <p className="text-body mb-6" style={{ color: '#7A4A68' }}>
            Log in to discover collectors who have the items you want — and want the items you have.
          </p>
          <Link
            to="/login"
            className="inline-block px-8 py-3 rounded-full text-[13px] font-bold text-white shadow-soft"
            style={{ background: 'linear-gradient(135deg, #FF8CC6, #BFA2FF)' }}
          >
            Log In to Trade
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-[60px] pb-20">
      <div className="max-w-content mx-auto px-4 mt-4">
        <Link to="/" className="inline-flex items-center gap-1 text-[12px] font-bold mb-4 hover:opacity-80" style={{ color: '#FF3B93' }}>
          <ArrowLeft size={14} /> Marketplace
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5"
        >
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={16} style={{ color: '#FF8CC6' }} />
            <h1 className="text-h1">Trade Feed</h1>
          </div>
          <p className="text-body" style={{ color: '#7A4A68' }}>
            {loading ? 'Scanning for trade matches...' : `${matches.length} mutual trade matches found`}
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="rounded-[20px] p-4 border mb-5"
          style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter size={14} style={{ color: '#FF3B93' }} />
              <span className="text-[13px] font-bold" style={{ color: '#4A1838' }}>Filters</span>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-1 text-[11px] font-bold"
              style={{ color: '#FF3B93' }}
            >
              <SlidersHorizontal size={12} />
              {showFilters ? 'Hide' : 'Show'}
            </button>
          </div>

          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              className="mt-3 pt-3 border-t space-y-3"
              style={{ borderColor: '#FFD6EC' }}
            >
              <div>
                <label className="text-[11px] font-bold block mb-1.5" style={{ color: '#7A4A68' }}>Sort by</label>
                <div className="flex gap-2">
                  {[
                    { key: 'score' as const, label: 'Match Score', icon: TrendingUp },
                    { key: 'trades' as const, label: 'Trade Count', icon: SlidersHorizontal },
                    { key: 'recent' as const, label: 'Recently Active', icon: SlidersHorizontal },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setSortBy(opt.key)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-colors ${
                        sortBy === opt.key
                          ? 'text-white border-transparent'
                          : 'border-[#FFD6EC] hover:bg-[#FFE3F1]'
                      }`}
                      style={sortBy === opt.key ? { background: 'linear-gradient(135deg, #FF8CC6, #BFA2FF)' } : { color: '#7A4A68' }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold block mb-1.5" style={{ color: '#7A4A68' }}>
                  Minimum Score: {minScore}%
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={minScore}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{ backgroundColor: '#FFEAF3', accentColor: '#FF3B93' }}
                />
                <div className="flex justify-between text-[9px] font-bold mt-1" style={{ color: '#B08AA0' }}>
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Match Grid */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="rounded-[24px] p-5 border animate-pulse"
                style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}
              >
                <div className="h-40 rounded-[16px]" style={{ backgroundColor: '#FFEAF3' }} />
              </div>
            ))}
          </div>
        ) : sortedMatches.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {sortedMatches.map((match, i) => (
              <TradeMatchCard key={match.trader.id} match={match} index={i} />
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 rounded-[24px] border"
            style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}
          >
            <img src="/momo-idle.png" alt="" className="w-16 h-16 mx-auto mb-3 opacity-40" />
            <h2 className="text-h2 mb-2">No Trade Matches Yet</h2>
            <p className="text-body max-w-sm mx-auto" style={{ color: '#7A4A68' }}>
              Add more items to your inventory and wishlist to discover collectors with mutual trade interests.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
