import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { events } from '../data/events';

export default function EventCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 3, 1));
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter((e) => {
      const start = new Date(e.startDate);
      const end = new Date(e.endDate);
      const current = new Date(dateStr);
      return current >= start && current <= end;
    });
  };

  const isToday = (day: number) => year === 2026 && month === 3 && day === 26;
  const days = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];

  return (
    <div className="rounded-[24px] p-5 shadow-soft border" style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}>
      <div className="flex items-center justify-between mb-4">
        <button className="px-4 py-2 rounded-full text-[12px] font-bold border transition-colors hover:opacity-80"
          style={{ borderColor: '#FFD6EC', color: '#FF3B93' }}>+ Suggest Event</button>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
            className="p-1.5 rounded-[12px] hover:bg-[#FFE3F1] transition-colors"><ChevronLeft size={16} style={{ color: '#4A1838' }} /></button>
          <span className="text-[13px] font-bold min-w-[100px] text-center" style={{ color: '#4A1838' }}>{monthNames[month]} {year}</span>
          <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
            className="p-1.5 rounded-[12px] hover:bg-[#FFE3F1] transition-colors"><ChevronRight size={16} style={{ color: '#4A1838' }} /></button>
        </div>
        <button onClick={() => setCurrentDate(new Date(2026, 3, 1))}
          className="px-3 py-1.5 rounded-[12px] text-[13px] font-bold hover:bg-[#FFE3F1] transition-colors" style={{ color: '#4A1838' }}>Today</button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayNames.map((d) => <div key={d} className="text-center text-[11px] font-bold py-2" style={{ color: '#B08AA0' }}>{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          if (day === null) return <div key={`e-${i}`} className="aspect-square" />;
          const dayEvents = getEventsForDay(day);
          return (
            <div key={day} className={`aspect-square flex flex-col items-center justify-center rounded-[12px] text-[13px] cursor-pointer transition-colors ${
              isToday(day) ? 'font-bold text-white' : 'hover:bg-[#FFE3F1]'
            }`} style={isToday(day) ? { backgroundColor: '#FF8CC6' } : { color: '#4A1838' }}>
              {day}
              {dayEvents.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayEvents.slice(0, 2).map((e, j) => (
                    <span key={j} className={`w-1.5 h-1.5 rounded-full ${e.status === 'live' ? 'bg-green-400' : 'bg-amber-400'}`} />
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
