import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface FAQItem { question: string; answer: string; }

const faqs: FAQItem[] = [
  { question: 'How do I start trading?', answer: 'Set up your profile, add items to your inventory, then browse listings or create your own to start trading.' },
  { question: 'Is there a fee?', answer: 'No, MomoMint is completely free. Built by the community, for the community.' },
  { question: 'How are item values calculated?', answer: 'From real HKDV wiki data — rarity, source, demand, and release timing all factor in.' },
  { question: 'What are Lucky Trade Tickets?', answer: 'Each successful trade earns tickets that count toward monthly rewards and SSR giveaways.' },
  { question: 'How does the Fairness Meter work?', answer: 'It shows whether an offer is under, fair, or over based on stored wiki values.' },
  { question: 'Can I dispute a trade?', answer: 'Yes, if something goes wrong, you can open a dispute and an admin will review it.' },
];

function AccordionItem({ item, index }: { item: FAQItem; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
      className="rounded-[24px] border overflow-hidden" style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4 text-left">
        <span className="text-[13px] font-bold pr-4" style={{ color: '#4A1838' }}>{item.question}</span>
        <ChevronDown size={16} className={`flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: '#B08AA0' }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} transition={{ duration: 0.2 }}>
            <div className="px-4 pb-4">
              <p className="text-[13px] leading-relaxed" style={{ color: '#7A4A68' }}>{item.answer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FAQPage() {
  return (
    <div className="pt-[60px] pb-20">
      <div className="max-w-content mx-auto px-4 pt-6 pb-4">
        <h1 className="text-h1 mb-1">FAQ</h1>
        <p className="text-body" style={{ color: '#7A4A68' }}>Quick answers for MomoMint users.</p>
      </div>
      <section className="max-w-content mx-auto px-4">
        <h2 className="text-h2 mb-3">Frequently Asked Questions</h2>
        <div className="space-y-2">
          {faqs.map((f, i) => <AccordionItem key={i} item={f} index={i} />)}
        </div>
      </section>
    </div>
  );
}
