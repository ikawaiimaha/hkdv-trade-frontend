import { motion } from 'framer-motion';
import { ArrowRight, Eye } from 'lucide-react';
import RarityBadge from './RarityBadge';
import { useToast } from './ToastProvider';
import type { FrontendCollection } from '../hooks/useCollections';

interface CollectionCardProps {
  collection: FrontendCollection;
  index: number;
}

export default function CollectionCard({ collection, index }: CollectionCardProps) {
  const { showToast } = useToast();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      whileHover={{ y: -6, transition: { duration: 0.25 } }}
      className="bg-white rounded-2xl shadow-card hover:shadow-card-lg transition-shadow duration-250 overflow-hidden group border border-pink-100/30"
    >
      {/* Image area */}
      <div className="h-44 bg-hkdv-cream flex items-center justify-center overflow-hidden relative">
        <img
          src={collection.image}
          alt={collection.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 left-3 flex items-center gap-2">
          {collection.isLimited && (
            <span className="text-xs">&#127873;</span>
          )}
          <RarityBadge tier={collection.isLimited ? 'epic' : 'common'} />
          {collection.isLimited && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-gradient-to-r from-purple-400 to-pink-400 uppercase tracking-wider">
              &#127873; Limited
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Date */}
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-0.5 rounded-full bg-hkdv-pink/10 text-hkdv-pink text-[10px] font-bold uppercase tracking-wider">
            NEW
          </span>
          <span className="text-xs text-hkdv-text-muted">{collection.date}</span>
        </div>

        {/* Title */}
        <h3 className="font-bold text-hkdv-text text-sm mb-2 leading-tight group-hover:text-hkdv-pink transition-colors">
          {collection.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-hkdv-text-secondary leading-relaxed mb-3 line-clamp-3">
          {collection.description}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-pink-100/50">
          <span className="text-xs font-bold" style={{ color: '#F04E7C' }}>
            {collection.itemCount} items
          </span>
          <button
            onClick={() => showToast(`Browsing "${collection.title}" coming soon! 🎀`, 'info')}
            className="text-xs font-bold flex items-center gap-1 group-hover:gap-2 transition-all duration-200 hover:opacity-80"
            style={{ color: '#F04E7C' }}
          >
            <Eye size={12} />
            Click to browse
            <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform duration-200" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
