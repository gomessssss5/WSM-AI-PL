import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Lock, X, ArrowRight, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminAuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdminAuthModal({ onClose, onSuccess }: AdminAuthModalProps) {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  
  // Shake animation trigger
  const [shake, setShake] = useState<boolean>(false);

  const CORRECT_PIN = '3473';

  // Handle key press directly
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSuccess) return;
      
      if (e.key >= '0' && e.key <= '9') {
        if (pin.length < 4) {
          setPin(prev => prev + e.key);
          setError(false);
        }
      } else if (e.key === 'Backspace') {
        setPin(prev => prev.slice(0, -1));
        setError(false);
      } else if (e.key === 'Enter') {
        if (pin.length === 4) {
          validatePin();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, isSuccess]);

  // Validate pin
  const validatePin = () => {
    if (pin === CORRECT_PIN) {
      setIsSuccess(true);
      setError(false);
      setTimeout(() => {
        onSuccess();
      }, 800);
    } else {
      setShake(true);
      setError(true);
      setPin('');
      setTimeout(() => setShake(false), 500);
    }
  };

  // Automatically validate when 4 digits are typed
  useEffect(() => {
    if (pin.length === 4) {
      // Small timeout for visual confirmation of the 4th dot
      const t = setTimeout(() => {
        validatePin();
      }, 150);
      return () => clearTimeout(t);
    }
  }, [pin]);

  const handleNumberClick = (num: string) => {
    if (isSuccess) return;
    if (pin.length < 4) {
      setPin(prev => prev + num);
      setError(false);
    }
  };

  const handleBackspace = () => {
    if (isSuccess) return;
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark overlay backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#faf9f6]/80 backdrop-blur-md"
      />

      {/* Main PIN code Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ 
          opacity: 1, 
          scale: 1, 
          y: 0,
          x: shake ? [-6, 6, -6, 6, -4, 4, -2, 2, 0] : 0 
        }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.25, x: { duration: 0.4 } }}
        className="relative w-full max-w-sm bg-white border border-[#eae6e1] rounded-3xl p-6 shadow-2xl z-10 flex flex-col items-center select-none font-sans"
      >
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon */}
        <div className="mb-4">
          {isSuccess ? (
            <div className="p-3 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-2xl animate-pulse">
              <ShieldCheck className="w-8 h-8" />
            </div>
          ) : (
            <div className="p-3 bg-indigo-50 border border-indigo-100 text-[#5c53e5] rounded-2xl">
              <Lock className="w-8 h-8" />
            </div>
          )}
        </div>

        {/* Title & Desc */}
        <div className="text-center mb-6">
          <h2 className="text-sm font-extrabold text-gray-950 uppercase tracking-tight">
            {isSuccess ? 'Acesso Concedido' : 'Segurança Administrativa'}
          </h2>
          <p className="text-[10px] text-gray-500 font-medium mt-1">
            {isSuccess ? 'Redirecionando para o console root...' : 'Insira a chave PIN secreta de 4 dígitos para prosseguir'}
          </p>
        </div>

        {/* PIN indicators */}
        <div className="flex gap-4 mb-6">
          {[0, 1, 2, 3].map((index) => {
            const hasValue = pin.length > index;
            return (
              <div 
                key={index} 
                className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                  hasValue 
                    ? 'bg-[#5c53e5] border-[#5c53e5] scale-110 shadow-sm shadow-[#5c53e5]/20' 
                    : error 
                      ? 'border-red-400 bg-red-50' 
                      : 'border-gray-300 bg-gray-50'
                }`} 
              />
            );
          })}
        </div>

        {/* Error Feedback message */}
        <div className="h-4 mb-3 flex items-center justify-center">
          <AnimatePresence>
            {error && (
              <motion.span 
                initial={{ opacity: 0, y: -2 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-[10px] font-bold text-red-600 flex items-center gap-1"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                PIN incorreto. Tente novamente.
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Secure keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[240px] mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleNumberClick(num)}
              className="h-12 rounded-xl bg-gray-50 hover:bg-gray-100 border border-[#eae6e1]/70 text-sm font-extrabold text-gray-900 transition-colors active:scale-95 cursor-pointer flex items-center justify-center"
            >
              {num}
            </button>
          ))}
          <div className="w-full h-full" /> {/* Spacer */}
          <button
            onClick={() => handleNumberClick('0')}
            className="h-12 rounded-xl bg-gray-50 hover:bg-gray-100 border border-[#eae6e1]/70 text-sm font-extrabold text-gray-900 transition-colors active:scale-95 cursor-pointer flex items-center justify-center"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="h-12 rounded-xl bg-gray-50 hover:bg-red-50 hover:text-red-600 hover:border-red-100 border border-[#eae6e1]/70 text-xs font-bold text-gray-500 transition-all active:scale-95 cursor-pointer flex items-center justify-center"
          >
            Apagar
          </button>
        </div>

        <div className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mt-2">
          WSM Security Key Ring
        </div>

      </motion.div>
    </div>
  );
}
