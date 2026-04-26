import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from './ToastProvider';

const messages = [
  'Welcome back! Ready to trade?',
  "You're trading like a pro!",
  'Wishlist match found! 72% compatible',
  'New collector joined nearby!',
];

export default function ChatBubble() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const { showToast } = useToast();

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
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="relative cursor-pointer"
        onClick={() => showToast('Momo says hi!', 'info')}
      >
        <img src="/momo-idle.png" alt="Momo" className="w-12 h-12 object-contain drop-shadow-sm" />
      </motion.div>

      <AnimatePresence mode="wait">
        {isVisible && (
          <motion.div
            key={messageIndex}
            initial={{ opacity: 0, y: 5, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.9 }}
            transition={{ duration: 0.25 }}
            className="rounded-[18px] rounded-bl-sm px-3.5 py-2.5 shadow-soft max-w-[200px] border"
            style={{ backgroundColor: '#FFF6FA', borderColor: '#FFD6EC' }}
          >
            <p className="text-[12px] font-medium leading-relaxed" style={{ color: '#4A1838' }}>
              {messages[messageIndex]}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
