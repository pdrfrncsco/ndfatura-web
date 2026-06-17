'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  HelpCircle, 
  Info, 
  Sparkles,
  ShieldCheck,
  Zap,
  DollarSign
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

interface TourStep {
  targetId: string;
  title: string;
  content: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  icon?: React.ElementType;
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: 'nav-item-dashboard',
    title: 'Dashboard Executivo',
    content: 'Acompanhe a saúde financeira da sua empresa com KPIs em tempo real, evolução de facturação e rácios de sincronização AGT.',
    position: 'right',
    icon: Zap
  },
  {
    targetId: 'nav-item-invoices',
    title: 'Facturação Fiscal',
    content: 'Emita Facturas (FT), Facturas-Recibo (FR) e outros documentos certificados. Lembre-se: documentos assinados não podem ser alterados.',
    position: 'right',
    icon: ShieldCheck
  },
  {
    targetId: 'nav-item-recurring',
    title: 'Faturas Recorrentes',
    content: 'Automatize avenças e contratos. Configure uma vez e o sistema gera as faturas automaticamente no ciclo definido.',
    position: 'right',
    icon: Sparkles
  },
  {
    targetId: 'nav-item-payments',
    title: 'Recebimentos e Recibos',
    content: 'Registe pagamentos e emita Recibos (RC). É aqui que o imposto de selo é liquidado e as faturas são marcadas como pagas.',
    position: 'right',
    icon: DollarSign
  },
  {
    targetId: 'nav-item-products',
    title: 'Produtos e IVA',
    content: 'Faça a gestão do seu catálogo. Cada produto possui a sua taxa de IVA (Geral 14%, Isento, etc.) conforme a legislação angolana.',
    position: 'right',
    icon: Info
  },
  {
    targetId: 'btn-theme-toggle',
    title: 'Personalização',
    content: 'Alterne entre os modos Dark e Light para maior conforto visual durante o seu trabalho.',
    position: 'bottom'
  },
  {
    targetId: 'btn-quick-new-invoice',
    title: 'Emissão Rápida',
    content: 'Precisa emitir agora? Use este atalho para iniciar uma nova factura rascunho de qualquer lugar do dashboard.',
    position: 'left'
  }
];

export function InteractiveTour() {
  const { theme } = useAuthStore();
  const [activeStep, setActiveStep] = React.useState<number | null>(null);
  const [targetRect, setTargetRect] = React.useState<DOMRect | null>(null);
  const [showTour, setShowTour] = React.useState(false);

  React.useEffect(() => {
    const hasSeenTour = localStorage.getItem('ndf_tour_completed');
    if (!hasSeenTour) {
      // Delay initial tour to let data load
      const timer = setTimeout(() => {
        setShowTour(true);
        setActiveStep(0);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  React.useEffect(() => {
    if (activeStep !== null && showTour) {
      const step = TOUR_STEPS[activeStep];
      const element = document.getElementById(step.targetId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Use a small timeout to ensure scroll has finished before measuring
        setTimeout(() => {
          setTargetRect(element.getBoundingClientRect());
        }, 100);
      } else {
        // Skip step if element not found in current view
        if (activeStep < TOUR_STEPS.length - 1) {
           setActiveStep(activeStep + 1);
        } else {
           handleComplete();
        }
      }
    } else {
      setTargetRect(null);
    }
  }, [activeStep, showTour]);

  const handleNext = () => {
    if (activeStep === null) return;
    if (activeStep < TOUR_STEPS.length - 1) {
      setActiveStep(activeStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (activeStep !== null && activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const handleComplete = () => {
    setShowTour(false);
    setActiveStep(null);
    localStorage.setItem('ndf_tour_completed', 'true');
  };

  if (!showTour || activeStep === null || !targetRect) return null;

  const currentStep = TOUR_STEPS[activeStep];
  const Icon = currentStep.icon || HelpCircle;

  // Calculate tooltip position
  const getTooltipStyle = () => {
    const gap = 12;
    switch (currentStep.position) {
      case 'right':
        return {
          top: targetRect.top + targetRect.height / 2,
          left: targetRect.right + gap,
          transform: 'translateY(-50%)'
        };
      case 'left':
        return {
          top: targetRect.top + targetRect.height / 2,
          left: targetRect.left - gap,
          transform: 'translate( -100%, -50%)'
        };
      case 'top':
        return {
          top: targetRect.top - gap,
          left: targetRect.left + targetRect.width / 2,
          transform: 'translate(-50%, -100%)'
        };
      case 'bottom':
      default:
        return {
          top: targetRect.bottom + gap,
          left: targetRect.left + targetRect.width / 2,
          transform: 'translateX(-50%)'
        };
    }
  };

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Overlay with hole */}
      <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px] pointer-events-auto" style={{
        clipPath: `polygon(
          0% 0%, 0% 100%, 
          ${targetRect.left}px 100%, 
          ${targetRect.left}px ${targetRect.top}px, 
          ${targetRect.right}px ${targetRect.top}px, 
          ${targetRect.right}px ${targetRect.bottom}px, 
          ${targetRect.left}px ${targetRect.bottom}px, 
          ${targetRect.left}px 100%, 
          100% 100%, 100% 0%
        )`
      }} onClick={handleComplete} />

      {/* Tooltip */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className={`absolute pointer-events-auto w-72 rounded-2xl border p-5 shadow-2xl ${
          theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
        style={getTooltipStyle()}
      >
        <header className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-600 text-white shadow-lg shadow-blue-500/20">
              <Icon className="h-4 w-4" />
            </div>
            <h4 className="font-bold text-sm tracking-tight">{currentStep.title}</h4>
          </div>
          <button onClick={handleComplete} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
            <X className="h-4 w-4" />
          </button>
        </header>

        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
          {currentStep.content}
        </p>

        <footer className="flex items-center justify-between">
          <div className="flex gap-1">
            {TOUR_STEPS.map((_, idx) => (
              <div key={idx} className={`h-1 rounded-full transition-all ${idx === activeStep ? 'w-4 bg-blue-600' : 'w-1 bg-slate-200 dark:bg-slate-700'}`} />
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            {activeStep > 0 && (
              <button 
                onClick={handleBack}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <button 
              onClick={handleNext}
              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all shadow-md shadow-blue-500/10"
            >
              <span>{activeStep === TOUR_STEPS.length - 1 ? 'Terminar' : 'Seguinte'}</span>
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </footer>
      </motion.div>
    </div>
  );
}

export function TourTrigger() {
  const startTour = () => {
    localStorage.removeItem('ndf_tour_completed');
    window.location.reload();
  };

  return (
    <button 
      onClick={startTour}
      className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-500 transition-all"
      title="Iniciar Tour Guiado"
    >
      <HelpCircle className="h-5 w-5" />
    </button>
  );
}
