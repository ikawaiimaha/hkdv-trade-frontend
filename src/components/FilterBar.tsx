import { useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { useToast } from './ToastProvider';

const filterTabs = ['All', 'SR', 'SSR', 'Tradable'];

export default function FilterBar() {
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showMore, setShowMore] = useState(false);
  const { showToast } = useToast();

  const handleTab = (tab: string) => {
    setActiveTab(tab);
    showToast(`Filtering by: ${tab}`, 'info');
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {filterTabs.map((tab) => (
            <button key={tab} onClick={() => handleTab(tab)}
              className="px-3.5 py-1.5 rounded-full text-chip font-bold transition-all duration-150"
              style={{
                backgroundColor: activeTab === tab ? '#FF8CC6' : '#FFF6FA',
                color: activeTab === tab ? '#FFFFFF' : '#7A4A68',
                border: activeTab === tab ? 'none' : '1px solid #FFD6EC',
              }}>
              {tab}
            </button>
          ))}
          <button onClick={() => { setShowMore(!showMore); showToast('More filters coming soon!', 'info'); }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-chip font-bold border transition-colors"
            style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC', color: '#7A4A68' }}>
            More <ChevronDown size={10} className={`transition-transform ${showMore ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); searchQuery && showToast(`Searching "${searchQuery}"...`, 'info'); }}
          className="flex-1 min-w-[180px] ml-auto">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#B08AA0' }} />
            <input type="text" placeholder="Search items..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-full text-[13px] border-2 border-transparent focus:outline-none transition-colors"
              style={{ backgroundColor: '#FFF6FA', color: '#4A1838', borderColor: '#FFD6EC' }} />
          </div>
        </form>
      </div>
    </div>
  );
}
