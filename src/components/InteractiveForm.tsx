import React, { useState } from 'react';
import { WsmForm } from '../types';
import { ChevronLeft, ChevronRight, X, ArrowRight, ArrowUp, Edit2, CheckSquare, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InteractiveFormProps {
  form: WsmForm;
  onSubmit: (response: string) => void;
  onCancel: () => void;
}

export default function InteractiveForm({ form, onSubmit, onCancel }: InteractiveFormProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [otherText, setOtherText] = useState("");

  if (!form.questions || form.questions.length === 0) return null;

  const totalSteps = form.questions.length;
  const question = form.questions[currentStep];

  const handleNext = (updatedAnswers = answers) => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
      setOtherText("");
    } else {
      handleSubmit(updatedAnswers);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setOtherText("");
    }
  };

  const handleSubmit = (currentAnswers = answers) => {
    // Format all answers into a clear text message for the AI
    let result = "";
    // If there is otherText on the last step, let's include it
    let finalAnswers = { ...currentAnswers };
    if (otherText.trim()) {
      if (question.type === 'multiple_choice') {
        const currentAns = finalAnswers[currentStep] || [];
        if (!currentAns.includes(otherText.trim())) {
          finalAnswers[currentStep] = [...currentAns, otherText.trim()];
        }
      } else {
        finalAnswers[currentStep] = otherText.trim();
      }
    }

    for (let i = 0; i < totalSteps; i++) {
      const q = form.questions[i];
      const a = finalAnswers[i];
      if (a !== undefined && a !== null && a !== "") {
        let answerText = "";
        if (Array.isArray(a)) {
          answerText = a.join(", ");
        } else {
          answerText = a;
        }
        result += `P: ${q.question}\nR: ${answerText}\n\n`;
      } else {
         result += `P: ${q.question}\nR: (Pulo)\n\n`;
      }
    }
    onSubmit(result.trim());
  };

  const handleSingleSelect = (val: string) => {
    const nextAnswers = { ...answers, [currentStep]: val };
    setAnswers(nextAnswers);
    setTimeout(() => {
      handleNext(nextAnswers);
    }, 150);
  };

  const handleMultiToggle = (val: string) => {
    const currentAns = answers[currentStep] || [];
    let newAns = [...currentAns];
    if (newAns.includes(val)) {
      newAns = newAns.filter(v => v !== val);
    } else {
      newAns.push(val);
    }
    setAnswers({ ...answers, [currentStep]: newAns });
  };

  const isMulti = question.type === 'multiple_choice';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
      className="bg-white border border-gray-150 shadow-xl rounded-2xl p-4 flex flex-col mb-4 w-full relative"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <AnimatePresence mode="wait">
          <motion.h3 
            key={currentStep}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            className="font-medium text-gray-800 text-[14.5px] pr-8"
          >
            {question.question}
          </motion.h3>
        </AnimatePresence>
        <div className="flex items-center gap-2 text-gray-400 text-[13px] shrink-0">
          <button 
            onClick={handlePrev} 
            disabled={currentStep === 0}
            className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span>{currentStep + 1} de {totalSteps}</span>
          <button 
            onClick={handleNext}
            disabled={currentStep === totalSteps - 1 && !answers[currentStep]}
            className="p-1 hover:bg-gray-100 rounded disabled:opacity-30 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={onCancel} className="p-1 hover:bg-gray-100 rounded ml-1 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Options */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={currentStep}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col gap-1.5 flex-1"
        >
          {question.options && question.options.map((opt, idx) => {
          if (isMulti) {
            const isSelected = (answers[currentStep] || []).includes(opt);
            return (
              <button
                key={idx}
                onClick={() => handleMultiToggle(opt)}
                className="flex items-center gap-3 w-full text-left p-3 rounded-xl hover:bg-gray-50 border border-transparent transition-colors cursor-pointer group"
              >
                <div className={`w-5 h-5 rounded-[4px] flex items-center justify-center border transition-colors ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300'}`}>
                  {isSelected ? <CheckSquare className="w-4 h-4" /> : null}
                </div>
                <span className="text-gray-700 text-[14px]">{opt}</span>
              </button>
            );
          } else {
             // Single choice
             const isSelected = answers[currentStep] === opt;
             return (
               <button
                 key={idx}
                 onClick={() => handleSingleSelect(opt)}
                 className={`flex items-center gap-3 w-full text-left p-3 rounded-xl border border-transparent transition-colors cursor-pointer group ${isSelected ? 'bg-gray-100' : 'hover:bg-gray-50'}`}
               >
                 <div className="w-6 h-6 rounded-md bg-gray-100 text-gray-400 flex items-center justify-center font-medium text-[12px] group-hover:bg-white shrink-0">
                   {idx + 1}
                 </div>
                 <span className="text-gray-700 text-[14px] flex-1">{opt}</span>
                 <ArrowRight className="w-4 h-4 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />
               </button>
             );
          }
        })}

        {(question.allow_other || question.type === 'text') && (
          <div className="flex items-center gap-2 p-2 mt-2 bg-gray-50 border border-gray-200 rounded-xl focus-within:border-gray-400 focus-within:bg-white transition-colors">
            <Edit2 className="w-4 h-4 text-gray-400 ml-2 shrink-0" />
            <input
              type="text"
              placeholder={question.type === 'text' ? "Sua resposta..." : "Outra opção..."}
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && otherText.trim()) {
                  if (isMulti) {
                     const currentAns = answers[currentStep] || [];
                     const nextAnswers = { ...answers, [currentStep]: [...currentAns, otherText.trim()] };
                     setAnswers(nextAnswers);
                     setTimeout(() => handleNext(nextAnswers), 100);
                  } else {
                    const nextAnswers = { ...answers, [currentStep]: otherText.trim() };
                    setAnswers(nextAnswers);
                    setTimeout(() => handleNext(nextAnswers), 100);
                  }
                }
              }}
              className="bg-transparent outline-none flex-1 text-[14px] text-gray-700 placeholder-gray-400 py-1"
            />
            {otherText.trim() && (
              <button 
                onClick={() => {
                   if (isMulti) {
                      const currentAns = answers[currentStep] || [];
                      const nextAnswers = { ...answers, [currentStep]: [...currentAns, otherText.trim()] };
                      setAnswers(nextAnswers);
                      setTimeout(() => handleNext(nextAnswers), 100);
                   } else {
                      const nextAnswers = { ...answers, [currentStep]: otherText.trim() };
                      setAnswers(nextAnswers);
                      setTimeout(() => handleNext(nextAnswers), 100);
                   }
                }}
                className="w-7 h-7 bg-black text-white rounded-lg flex items-center justify-center hover:bg-gray-800 transition-colors cursor-pointer mr-1"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
        </motion.div>
      </AnimatePresence>

      {/* Footer controls for Multi/Text or Skip */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
        <div className="text-[12.5px] text-gray-400 font-medium">
          {isMulti && (answers[currentStep]?.length || 0)} {(answers[currentStep]?.length === 1) ? 'selecionado' : 'selecionados'}
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => handleNext()}
            className="px-4 py-1.5 border border-gray-200 rounded-lg text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
          >
            Pular
          </button>
          {isMulti && (
            <button 
              onClick={() => handleNext()}
              className="w-8 h-8 rounded-lg bg-[#b5583b] hover:bg-[#a14c31] text-white flex items-center justify-center transition-colors cursor-pointer"
            >
               <ArrowUp className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
