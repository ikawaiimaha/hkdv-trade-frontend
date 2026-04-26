import EventCalendar from '../components/EventCalendar';
import EventCard from '../components/EventCard';
import { useEvents } from '../hooks/useEvents';

export default function EventsPage() {
  const { events, loading, error } = useEvents();

  return (
    <div className="pt-14 pb-20">
      {/* Simple Header */}
      <div className="max-w-content mx-auto px-4 pt-8 pb-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-hkdv-text mb-1">Event Calendar</h1>
            <p className="text-sm text-hkdv-text-secondary">
              Birthdays, campaigns, limited events, Happy Bags & more.
            </p>
          </div>
          <button className="px-4 py-2 rounded-full bg-hkdv-pink text-white text-sm font-bold hover:bg-hkdv-pink-dark transition-colors shadow-sm">
            + Suggest Event
          </button>
        </div>
      </div>

      <div className="max-w-content mx-auto px-4 mt-4 space-y-6">
        {/* Calendar */}
        <EventCalendar />

        {/* Upcoming Events */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-base font-bold text-hkdv-text">Upcoming Events</h2>
            <span className="text-sm text-hkdv-text-muted">
              {loading ? '...' : `${events.length} events`}
            </span>
          </div>

          {error && (
            <div className="text-center py-6 bg-white rounded-2xl shadow-card border border-pink-100/30">
              <p className="text-sm text-hkdv-text-muted">Couldn&apos;t load events</p>
            </div>
          )}

          <div className="space-y-3">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl p-5 shadow-card border border-pink-100/30 animate-pulse">
                    <div className="h-4 bg-pink-100/30 rounded w-1/3 mb-2" />
                    <div className="h-3 bg-pink-100/30 rounded w-1/2 mb-3" />
                    <div className="flex gap-2">
                      <div className="h-6 bg-pink-100/30 rounded-full w-20" />
                      <div className="h-6 bg-pink-100/30 rounded-full w-16" />
                    </div>
                  </div>
                ))
              : events.map((event, index) => (
                  <EventCard key={event.id} event={event} index={index} />
                ))}
          </div>
        </div>
      </div>
    </div>
  );
}
