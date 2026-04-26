import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const messages = [
  { text: 'Welcome back! Ready to trade?', mood: 'happy' },
  { text: "You're trading like a pro!", mood: 'celebration' },
  { text: 'Wishlist match found! 72% compatible', mood: 'excited' },
  { text: 'New collector joined nearby!', mood: 'happy' },
];

export default function ChatBubble() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setMessageIndex((prev) => (prev + 1) % messages.length);
        setIsVisible(true);
      }, 300);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-4 left-4 z-40 flex items-end gap-2">
      {/* Character */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="relative"
      >
        <img
          src="/mascot-idle.png"
          alt="HKDV Mascot"
          className="w-14 h-14 object-contain drop-shadow-md"
        />
      </motion.div>

      {/* Speech bubble */}
      <AnimatePresence mode="wait">
        {isVisible && (
          <motion.div
            key={messageIndex}
            initial={{ opacity: 0, y: 5, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.9 }}
            transition={{ duration: 0.25 }}
            className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-card-lg max-w-[220px] border border-pink-100/50"
          >
            <p className="text-xs text-hkdv-text font-medium leading-relaxed">
              {messages[messageIndex].text}
            </p>
            {messageIndex === 2 && (
              <button className="mt-1.5 text-xs font-bold text-hkdv-pink hover:text-hkdv-pink-dark transition-colors flex items-center gap-1">
                View match &#x279C;
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
