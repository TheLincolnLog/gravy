import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, ChevronLeft, X, Move, ArrowUp, Zap, Target, Layers } from "lucide-react";

interface TutorialOverlayProps {
  onComplete: () => void;
  controlMode: 'pc' | 'mobile';
  tutorialState: {
    moved: boolean;
    jumped: boolean;
    targetsHit: number;
    totalTargets: number;
  };
}

const STEPS = [
  {
    id: 'intro',
    title: "WELCOME TO CUBE CLASH",
    content: "The ultimate minimalist arena fighter. You are a high-tech combat cube locked in gravitational combat.",
    icon: <Target className="w-12 h-12 text-cyan-400" />,
    color: "cyan"
  },
  {
    id: 'movement',
    title: "MOVEMENT",
    content: (mode: 'pc' | 'mobile') => mode === 'pc' 
      ? "Use [WASD] or [ARROW KEYS] to slide across the arena. Try moving now!"
      : "Use the LEFT and RIGHT arrows to navigate. Give it a try!",
    icon: <Move className="w-12 h-12 text-purple-400" />,
    color: "purple",
    task: "Slide around to get a feel for the momentum",
    check: (s: any) => s.moved
  },
  {
    id: 'jumping',
    title: "VERTICALITY",
    content: (mode: 'pc' | 'mobile') => mode === 'pc'
      ? "Press [SPACE] or [W] to jump. Most cubes can double jump. Try jumping!"
      : "Tap the UP arrow on the bottom right to leap. Give it a shot!",
    icon: <ArrowUp className="w-12 h-12 text-emerald-400" />,
    color: "emerald",
    task: "Perform a jump or double jump",
    check: (s: any) => s.jumped
  },
  {
    id: 'combat',
    title: "COMBAT",
    content: (mode: 'pc' | 'mobile') => mode === 'pc'
      ? "Press [F] or [ENTER] to fire. Destroy the 3 test targets in the arena!"
      : "Tap the ZAP button to unleash your arsenal. Take out the 3 targets!",
    icon: <Zap className="w-12 h-12 text-rose-400" />,
    color: "rose",
    task: (s: any) => `Destroy targets: ${s.targetsHit}/${s.totalTargets}`,
    check: (s: any) => s.targetsHit >= s.totalTargets
  },
  {
    id: 'outro',
    title: "ARENA READY",
    content: "You've mastered the basics. Gear up, draft upgrades, and be the last cube standing.",
    icon: <Target className="w-12 h-12 text-white" />,
    color: "white"
  }
];

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ onComplete, controlMode, tutorialState }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const step = STEPS[currentStep];
  const isTaskStep = !!step.check;
  const isCompleted = isTaskStep ? step.check(tutorialState) : true;

  const next = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const prev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="fixed inset-x-0 top-0 z-[100] p-6 pointer-events-none flex justify-center">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-3xl bg-zinc-950/80 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden relative pointer-events-auto shadow-2xl"
      >
        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 w-full h-1 bg-white/5 flex gap-0.5">
          {STEPS.map((_, i) => (
            <div 
              key={i} 
              className={`flex-1 h-full transition-all duration-500 ${i <= currentStep ? 'bg-white' : 'bg-white/5'}`}
            />
          ))}
        </div>

        <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8 p-6 md:px-12">
          <div className="p-4 bg-white/10 rounded-2xl shrink-0 hidden md:block">
            {React.cloneElement(step.icon as React.ReactElement, { size: 36, className: (step.icon as any).props.className + " w-9 h-9" })}
          </div>

          <div className="flex-1 min-w-0 text-center md:text-left">
            <h2 className="text-[10px] font-black italic uppercase tracking-[0.25em] text-cyan-400 mb-1.5 opacity-80">
              PROTOCOL {(currentStep + 1).toString().padStart(2, '0')} // {STEPS.length.toString().padStart(2, '0')}
            </h2>
            <div className="flex flex-col gap-1.5">
              <h3 className="text-xl font-black uppercase text-white leading-none tracking-tight">
                {step.title}
              </h3>
              <div className="text-[13px] text-white/70 font-semibold leading-relaxed max-w-2xl">
                {typeof step.content === 'function' ? step.content(controlMode) : step.content}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 md:gap-5 shrink-0 w-full md:w-auto">
            {isTaskStep && (
              <div className={`px-4 py-2 rounded-lg border flex items-center gap-2 transition-all duration-300 ${isCompleted ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 font-bold' : 'bg-white/5 border-white/10 text-white/60'}`}>
                <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-white/20'}`}>
                  {isCompleted && <X className="rotate-45" size={8} />}
                </div>
                <span className="text-[10px] uppercase tracking-widest">
                   {typeof step.task === 'function' ? step.task(tutorialState) : step.task}
                </span>
              </div>
            )}

            <div className="flex gap-1 h-10 bg-white/5 p-1 rounded-lg">
              <button 
                onClick={prev}
                disabled={currentStep === 0}
                className={`w-8 flex items-center justify-center rounded transition-all ${currentStep === 0 ? 'opacity-0' : 'hover:bg-white/10 text-white/40 hover:text-white'}`}
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={next}
                disabled={!isCompleted}
                className={`px-4 flex items-center gap-2 rounded font-black text-[10px] tracking-widest uppercase transition-all shadow-xl ${isCompleted ? 'bg-white text-black hover:scale-105 active:scale-95' : 'bg-white/5 text-white/20 cursor-not-allowed'}`}
              >
                {currentStep === STEPS.length - 1 ? 'READY' : 'NEXT'} <ChevronRight size={14} />
              </button>
            </div>

            <button 
                onClick={onComplete}
                className="w-10 h-10 flex items-center justify-center rounded-lg text-white/20 hover:text-white hover:bg-white/5 transition-all text-[10px] font-black"
             >
                <X size={18} />
             </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
