export interface Event {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  type: 'happy-bag' | 'campaign' | 'anniversary';
  status: 'live' | 'soon' | 'ended';
  description?: string;
}

export const events: Event[] = [
  {
    id: 'sakura-lantern',
    title: 'Sakura Lantern Night',
    startDate: '2026-04-13',
    endDate: '2026-06-10',
    type: 'happy-bag',
    status: 'live',
    description: 'Sakura Lantern Night',
  },
  {
    id: 'may-campaign',
    title: 'May Campaign 2026',
    startDate: '2026-05-01',
    endDate: '2026-05-31',
    type: 'campaign',
    status: 'soon',
  },
  {
    id: 'hkdv-anniversary',
    title: 'HKDV 5th Anniversary',
    startDate: '2026-06-01',
    endDate: '2026-06-14',
    type: 'anniversary',
    status: 'soon',
  },
];

export const eventTypeLabels: Record<string, { label: string; emoji: string; color: string }> = {
  'happy-bag': { label: 'Happy Bag', emoji: '', color: 'bg-purple-100 text-purple-700' },
  campaign: { label: 'Campaign', emoji: '', color: 'bg-orange-100 text-orange-700' },
  anniversary: { label: 'Anniversary', emoji: '', color: 'bg-pink-100 text-pink-700' },
};

export const eventStatusConfig: Record<string, { label: string; color: string; dotColor: string }> = {
  live: { label: 'Live', color: 'text-green-600', dotColor: 'bg-green-500' },
  soon: { label: 'Soon', color: 'text-orange-600', dotColor: 'bg-orange-500' },
  ended: { label: 'Ended', color: 'text-gray-500', dotColor: 'bg-gray-400' },
};
