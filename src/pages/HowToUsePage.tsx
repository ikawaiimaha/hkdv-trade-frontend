import HeroBanner from '../components/HeroBanner';
import StepCard from '../components/StepCard';
import { steps } from '../data/steps';

export default function HowToUsePage() {
  return (
    <div className="pt-[60px] pb-20">
      <div className="mt-4">
        <HeroBanner icon="📖" title="How To Use" subtitle="Your step-by-step guide to trading like a pro." showMascot={false} />
      </div>
      <section className="max-w-content mx-auto px-4 mt-6 space-y-3">
        {steps.map((s, i) => <StepCard key={s.number} step={s} index={i} />)}
      </section>
      <section className="max-w-content mx-auto px-4 mt-4">
        <div className="rounded-[20px] p-4 flex items-start gap-3 border" style={{ backgroundColor: '#FFF3A3', borderColor: '#FFE8A0' }}>
          <span className="text-lg flex-shrink-0">💡</span>
          <p className="text-[13px] font-medium leading-relaxed" style={{ color: '#4A1838' }}>
            <span className="font-bold">Pro tip:</span> Click any item thumbnail to see full details — tier, rarity, demand, wiki value, and a link to the wiki page.
          </p>
        </div>
      </section>
    </div>
  );
}
