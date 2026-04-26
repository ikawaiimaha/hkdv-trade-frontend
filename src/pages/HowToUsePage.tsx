import HeroBanner from '../components/HeroBanner';
import StepCard from '../components/StepCard';
import { steps } from '../data/steps';

export default function HowToUsePage() {
  return (
    <div className="pt-14 pb-20">
      {/* Hero Banner */}
      <div className="mt-4">
        <HeroBanner
          icon=""
          title="How To Use"
          subtitle="Your step-by-step guide to trading like a pro. It's easier than it looks, promise!"
        />
      </div>

      {/* Steps */}
      <section className="max-w-content mx-auto px-4 mt-8 space-y-4">
        {steps.map((step, index) => (
          <StepCard key={step.number} step={step} index={index} />
        ))}
      </section>

      {/* Pro Tip */}
      <section className="max-w-content mx-auto px-4 mt-6">
        <div className="bg-hkdv-yellow/20 rounded-2xl p-4 flex items-start gap-3 border border-yellow-200/50">
          <span className="text-lg flex-shrink-0">&#x1F4A1;</span>
          <p className="text-sm text-hkdv-text leading-relaxed">
            <span className="font-bold">Pro tip:</span> Click any item thumbnail anywhere on the site to see its full details — tier, rarity, demand, wiki value, and a link to the wiki page.
          </p>
        </div>
      </section>
    </div>
  );
}
