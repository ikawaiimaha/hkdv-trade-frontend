import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { events } from '../data/events';

export default function EventCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 3, 1)); // April 2026

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date(2026, 3, 1));
  };

  // Get events for a specific day
  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter((event) => {
      const start = new Date(event.startDate);
      const end = new Date(event.endDate);
      const current = new Date(dateStr);
      return current >= start && current <= end;
    });
  };

  // Check if day is today (April 26, 2026)
  const isToday = (day: number) => {
    return year === 2026 && month === 3 && day === 26;
  };

  const days = [];
  // Empty cells for days before the first day of month
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  // Days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-card-md border border-pink-100/50">
      {/* Calendar header */}
      <div className="flex items-center justify-between mb-4">
        <button className="px-4 py-2 rounded-full border-2 border-hkdv-pink text-hkdv-pink text-sm font-bold hover:bg-hkdv-pink/10 transition-colors">
          + Suggest Event
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousMonth}
            className="p-1.5 rounded-lg hover:bg-pink-50 transition-colors"
          >
            <ChevronLeft size={18} className="text-hkdv-text" />
          </button>
          <span className="text-sm font-bold text-hkdv-text min-w-[110px] text-center">
            {monthNames[month]} {year}
          </span>
          <button
            onClick={goToNextMonth}
            className="p-1.5 rounded-lg hover:bg-pink-50 transition-colors"
          >
            <ChevronRight size={18} className="text-hkdv-text" />
          </button>
        </div>

        <button
          onClick={goToToday}
          className="px-3 py-1.5 rounded-lg text-sm font-bold text-hkdv-text hover:bg-pink-50 transition-colors"
        >
          Today
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayNames.map((day) => (
          <div key={day} className="text-center text-xs font-bold text-hkdv-text-muted py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const dayEvents = getEventsForDay(day);
          const hasEvents = dayEvents.length > 0;
          const today = isToday(day);

          return (
            <div
              key={day}
              className={`aspect-square flex flex-col items-center justify-center rounded-xl text-sm relative cursor-pointer transition-all ${
                today
                  ? 'bg-hkdv-pink text-white font-bold shadow-md'
                  : 'hover:bg-pink-50 text-hkdv-text'
              }`}
            >
              {day}
              {hasEvents && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayEvents.slice(0, 2).map((evt, i) => (
                    <span
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full ${
                        evt.status === 'live' ? 'bg-green-500' : 'bg-orange-400'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
