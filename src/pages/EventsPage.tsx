import EventCalendar from '../components/EventCalendar';
import EventCard from '../components/EventCard';
import { events } from '../data/events';

export default function EventsPage() {
  return (
    <div className="pt-14 pb-20">
      {/* Simple Header - matches original */}
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
            <span className="text-sm text-hkdv-text-muted">{events.length} events</span>
          </div>

          <div className="space-y-3">
            {events.map((event, index) => (
              <EventCard key={event.id} event={event} index={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
