import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: 'How do I start trading?',
    answer: 'First, set up your profile and add items to your inventory. Then browse listings or create your own to start trading with other collectors.',
  },
  {
    question: 'Is there a fee to use HKDV Trade?',
    answer: 'No, HKDV Trade is completely free to use. It was built by the community, for the community.',
  },
  {
    question: 'How are item values calculated?',
    answer: 'Item values are calculated from real HKDV wiki data — rarity, source, demand, and release timing all factor into the valuation.',
  },
  {
    question: 'What are Lucky Trade Tickets?',
    answer: 'Each successful trade earns Lucky Trade Tickets that count toward monthly rewards and SSR giveaway entries.',
  },
  {
    question: 'How does the Fairness Meter work?',
    answer: 'The Fairness Meter shows whether an offer is under, fair, or over based on stored wiki values for each item.',
  },
  {
    question: 'Can I dispute a trade?',
    answer: 'Yes, if something goes wrong with a trade, you can open a dispute and an admin will review it.',
  },
];

function FAQAccordionItem({ item, index }: { item: FAQItem; index: number }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="bg-white rounded-xl shadow-card overflow-hidden"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50/50 transition-colors"
      >
        <span className="font-semibold text-hkdv-text text-sm pr-4">{item.question}</span>
        <ChevronDown
          size={18}
          className={`text-hkdv-text-muted flex-shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-5 pb-5">
              <p className="text-sm text-hkdv-text-secondary leading-relaxed">
                {item.answer}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FAQPage() {
  return (
    <div className="pt-14 pb-20">
      {/* Simple Header (no gradient hero) */}
      <div className="max-w-content mx-auto px-4 pt-8 pb-6">
        <h1 className="text-3xl font-extrabold text-hkdv-text mb-2">FAQ</h1>
        <p className="text-sm text-hkdv-text-secondary">
          Quick answers for HKDV Trade users.
        </p>
      </div>

      {/* FAQ Section */}
      <section className="max-w-content mx-auto px-4">
        <h2 className="text-lg font-bold text-hkdv-text mb-4">
          Frequently Asked Questions
        </h2>

        <div className="space-y-3">
          {faqItems.map((item, index) => (
            <FAQAccordionItem key={index} item={item} index={index} />
          ))}
        </div>
      </section>
    </div>
  );
}
