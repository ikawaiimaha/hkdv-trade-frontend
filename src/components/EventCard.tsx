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

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      className="rounded-[24px] p-5 shadow-soft hover:shadow-soft-hover transition-shadow duration-200 border"
      style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}
    >
      <h3 className="text-h2 mb-1">{event.title}</h3>
      <p className="text-body mb-3" style={{ color: '#B08AA0' }}>
        {formatDate(event.startDate)} — {formatDate(event.endDate)}
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`chip ${typeConfig.color}`}>
          {typeConfig.label}
        </span>
        <span className={`flex items-center gap-1.5 text-caption ${statusConfig.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotColor}`} />
          {statusConfig.label}
        </span>
      </div>
    </motion.div>
  );
}
