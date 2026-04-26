import { useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { useToast } from './ToastProvider';

const filterTabs = ['All', 'SR', 'SSR', 'Tradable'];

export default function FilterBar() {
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMore, setShowMore] = useState(false);
  const { showToast } = useToast();

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    showToast(`Filtering by: ${tab} 🔍`, 'info');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      showToast(`Searching for "${searchQuery}"... 🔎`, 'info');
    }
  };

  return (
    <div className="space-y-4">
      {/* Filter tabs and search */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {filterTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabClick(tab)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 ${
                activeTab === tab
                  ? 'text-white'
                  : 'bg-white text-hkdv-text-secondary hover:bg-hkdv-pink/10'
              }`}
              style={activeTab === tab ? { backgroundColor: '#FB88A3' } : {}}
            >
              {tab}
            </button>
          ))}
          <button
            onClick={() => {
              setShowMore(!showMore);
              showToast('More filters coming soon! ✨', 'info');
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-white text-hkdv-text-secondary text-xs font-semibold hover:bg-hkdv-pink/10 transition-colors"
          >
            More
            <ChevronDown size={12} className={`transition-transform ${showMore ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 min-w-[200px] ml-auto">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-hkdv-text-muted" />
            <input
              type="text"
              placeholder="Search by name or collection..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-full bg-white text-sm text-hkdv-text placeholder:text-hkdv-text-muted border-none outline-none focus:ring-2 focus:ring-hkdv-pink/30 transition-shadow"
            />
          </div>
        </form>
      </div>
    </div>
  );
}
