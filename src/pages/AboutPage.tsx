import HeroBanner from '../components/HeroBanner';
import FeatureCard from '../components/FeatureCard';
import { features } from '../data/features';

export default function AboutPage() {
  return (
    <div className="pt-14 pb-20">
      {/* Hero Banner - matches original with 🎀 icon */}
      <div className="mt-4">
        <HeroBanner
          icon="🎀"
          title="What is HKDV?"
          subtitle="A cosy trading desk for Hello Kitty Dream Village collectors — built with love for the community."
          showMascot={false}
        />
      </div>

      {/* Feature Cards Grid */}
      <section className="max-w-content mx-auto px-4 mt-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {features.map((feature, index) => (
            <FeatureCard key={index} feature={feature} index={index} />
          ))}
        </div>
      </section>

      {/* Mission Section */}
      <section className="max-w-content mx-auto px-4 mt-8">
        <div
          className="rounded-2xl p-8 text-center relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #F04E7C 0%, #FB88A3 50%, #C084FC 100%)' }}
        >
          <img src="/charm-bow.png" alt="" className="absolute -top-4 -right-4 w-16 h-16 opacity-30 rotate-12" />
          <img src="/charm-heart.png" alt="" className="absolute -bottom-2 -left-2 w-12 h-12 opacity-30 -rotate-12" />
          
          <h2 className="text-xl font-bold text-white mb-3 relative z-10">Our Mission</h2>
          <p className="text-white/90 text-sm leading-relaxed max-w-lg mx-auto relative z-10">
            HKDV Trade was built for serious collectors who want a clean, trusted place to exchange bags. Access is reviewed — so every trader you meet here has been vetted. 💖
          </p>
        </div>
      </section>
    </div>
  );
}
