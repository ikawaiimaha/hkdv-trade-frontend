import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
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
      whileHover={{ y: -4, transition: { duration: 0.25 } }}
      className="rounded-[24px] overflow-hidden shadow-soft hover:shadow-soft-hover transition-shadow duration-250 cursor-pointer border"
      style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}
    >
      {/* Image */}
      <div className="h-40 overflow-hidden relative">
        <img src={collection.image} alt={collection.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <RarityBadge tier={collection.isLimited ? 'epic' : 'common'} />
          {collection.isLimited && (
            <span className="chip text-white" style={{ backgroundColor: '#BFA2FF' }}>🎀 Limited</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="chip" style={{ backgroundColor: '#FFE3F1', color: '#FF3B93' }}>NEW</span>
          <span className="text-caption" style={{ color: '#B08AA0' }}>{collection.date}</span>
        </div>

        <h3 className="text-h2 mb-1.5 leading-tight">{collection.title}</h3>
        <p className="text-body mb-3 line-clamp-2" style={{ color: '#7A4A68' }}>{collection.description}</p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: '#FFD6EC' }}>
          <span className="text-caption" style={{ color: '#FF3B93' }}>{collection.itemCount} items</span>
          <button onClick={() => showToast(`Browsing "${collection.title}" coming soon!`, 'info')}
            className="text-caption font-bold flex items-center gap-1 group-hover:gap-1.5 transition-all" style={{ color: '#FF3B93' }}>
            Browse <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
