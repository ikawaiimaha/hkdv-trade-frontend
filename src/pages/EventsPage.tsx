import EventCalendar from '../components/EventCalendar';
import EventCard from '../components/EventCard';
import { useEvents } from '../hooks/useEvents';
import { useToast } from '../components/ToastProvider';

export default function EventsPage() {
  const { events, loading, error } = useEvents();
  const { showToast } = useToast();

  return (
    <div className="pt-[60px] pb-20">
      <div className="max-w-content mx-auto px-4 pt-6 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-h1 mb-1">Event Calendar</h1>
            <p className="text-body" style={{ color: '#7A4A68' }}>Birthdays, campaigns, limited events & more.</p>
          </div>
          <button onClick={() => showToast('Suggest Event coming soon!', 'info')}
            className="px-4 py-2 rounded-full text-[12px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #FF8CC6, #BFA2FF)' }}>
            + Suggest
          </button>
        </div>
      </div>

      <div className="max-w-content mx-auto px-4 mt-4 space-y-4">
        <EventCalendar />
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-h2">Upcoming</h2>
            <span className="text-caption" style={{ color: '#B08AA0' }}>{loading ? '...' : `${events.length} events`}</span>
          </div>
          {error && (
            <div className="text-center py-6 rounded-[24px] border" style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}>
              <p className="text-body" style={{ color: '#B08AA0' }}>Couldn&apos;t load events</p>
            </div>
          )}
          <div className="space-y-3">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-[24px] p-5 border animate-pulse" style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}>
                    <div className="h-4 rounded w-1/3 mb-2" style={{ backgroundColor: '#FFE3F1' }} />
                    <div className="h-3 rounded w-1/2 mb-3" style={{ backgroundColor: '#FFE3F1' }} />
                    <div className="flex gap-2">
                      <div className="h-5 rounded-full w-20" style={{ backgroundColor: '#FFE3F1' }} />
                      <div className="h-5 rounded-full w-16" style={{ backgroundColor: '#FFE3F1' }} />
                    </div>
                  </div>
                ))
              : events.map((e, i) => <EventCard key={e.id} event={e} index={i} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
