import { motion } from 'framer-motion';
import { eventTypeLabels, eventStatusConfig } from '../data/events';
import type { FrontendEvent } from '../hooks/useEvents';

interface EventCardProps {
  event: FrontendEvent;
  index: number;
}

export default function EventCard({ event, index }: EventCardProps) {
  const typeConfig = eventTypeLabels[event.type];
  const statusConfig = eventStatusConfig[event.status];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="bg-white rounded-2xl p-5 shadow-card hover:shadow-card-md transition-shadow duration-200 border border-pink-100/30"
    >
      <h3 className="font-bold text-hkdv-text text-base mb-1">{event.title}</h3>
      <p className="text-sm text-hkdv-text-muted mb-3">
        {formatDate(event.startDate)} - {formatDate(event.endDate)}
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        {event.description && (
          <span className="text-xs text-hkdv-text-secondary mr-1">
            {event.description}
          </span>
        )}

        {/* Type tag */}
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${typeConfig.color}`}>
          <span>{typeConfig.emoji}</span>
          {typeConfig.label}
        </span>

        {/* Status indicator */}
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${statusConfig.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor}`} />
          {statusConfig.label}
        </span>
      </div>
    </motion.div>
  );
}
