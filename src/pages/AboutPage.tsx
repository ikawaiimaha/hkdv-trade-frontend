import HeroBanner from '../components/HeroBanner';
import FeatureCard from '../components/FeatureCard';
import { features } from '../data/features';

export default function AboutPage() {
  return (
    <div className="pt-[60px] pb-20">
      <div className="mt-4">
        <HeroBanner icon="🎀" title="What is MomoMint?" subtitle="A cosy trading desk for Hello Kitty Dream Village collectors." showMascot={false} />
      </div>

      <section className="max-w-content mx-auto px-4 mt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {features.map((f, i) => <FeatureCard key={i} feature={f} index={i} />)}
        </div>
      </section>

      <section className="max-w-content mx-auto px-4 mt-6">
        <div className="rounded-[28px] p-8 text-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #FF8CC6, #BFA2FF)' }}>
          <img src="/momo-proud.png" alt="" className="absolute -bottom-2 right-4 w-16 h-16 opacity-60" />
          <img src="/charm-bow.png" alt="" className="absolute -top-3 left-4 w-12 h-12 opacity-30 rotate-12" />
          <h2 className="text-h1 text-white mb-3 relative z-10">Our Mission</h2>
          <p className="text-[13px] text-white/90 leading-relaxed max-w-md mx-auto relative z-10">
            MomoMint was built for serious collectors who want a clean, trusted place to exchange bags. Access is reviewed — every trader is vetted. 💖
          </p>
        </div>
      </section>
    </div>
  );
}
