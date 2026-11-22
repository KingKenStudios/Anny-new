import React, { createContext, useContext, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Loader2, CheckCircle2, Sparkles, Layers, Code, Terminal, Rocket, 
  ChevronDown, ChevronUp, X, Cpu, Zap, AlertCircle, Play, Check 
} from 'lucide-react';
import { systemBus } from '../core/systemBus';

export type StageName = 
  | 'Understanding'
  | 'Analyzing'
  | 'Planning'
  | 'Generating'
  | 'Writing Files'
  | 'Installing Dependencies'
  | 'Compiling'
  | 'Repair'
  | 'Starting Runtime'
  | 'Mounting Application'
  | 'Verifying'
  | 'Completed'
  | 'Failed';

interface OrchestratorContextType {
  isGenerationRunning: boolean;
  setIsGenerationRunning: (status: boolean) => void;
  activeStage: StageName;
  progressPct: number;
  taskTitle: string;
  elapsedSec: number;
  actionText: string;
}

const OrchestratorContext = createContext<OrchestratorContextType>({
  isGenerationRunning: false,
  setIsGenerationRunning: () => {},
  activeStage: 'Understanding',
  progressPct: 0,
  taskTitle: 'Multi-Step Execution',
  elapsedSec: 0,
  actionText: 'Launching',
});

export const useAnnyOrchestrator = () => useContext(OrchestratorContext);

// 6 Core Pipeline Stages mapped from the 11 detailed stages
const PIPELINE_STEPS = [
  { id: 'intent', label: '1. Intent & Context', icon: Sparkles, stages: ['Understanding', 'Analyzing'] },
  { id: 'arch', label: '2. Architecture & VFS', icon: Layers, stages: ['Planning'] },
  { id: 'code', label: '3. Code Synthesis', icon: Code, stages: ['Generating', 'Writing Files'] },
  { id: 'deps', label: '4. Dependencies', icon: Cpu, stages: ['Installing Dependencies'] },
  { id: 'compile', label: '5. AST & Compile', icon: Terminal, stages: ['Compiling', 'Repair'] },
  { id: 'preview', label: '6. Runtime & Verification', icon: Rocket, stages: ['Starting Runtime', 'Mounting Application', 'Verifying', 'Completed'] },
];

export const AnnyOrchestrator: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isGenerationRunning, setIsGenerationRunning] = useState(false);
  const [activeStage, setActiveStage] = useState<StageName>('Understanding');
  const [progressPct, setProgressPct] = useState(0);
  const [taskTitle, setTaskTitle] = useState('Active Pipeline');
  const [isMinimized, setIsMinimized] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [completedNotification, setCompletedNotification] = useState(false);

  useEffect(() => {
    // Timer interval when running
    let timerInterval: any = null;
    if (isGenerationRunning) {
      if (!startTime) setStartTime(Date.now());
      timerInterval = setInterval(() => {
        if (startTime) {
          setElapsedSec(Math.round((Date.now() - startTime) / 100) / 10);
        } else {
          setElapsedSec(prev => Math.round((prev + 0.1) * 10) / 10);
        }
      }, 100);
    } else {
      setStartTime(null);
    }
    return () => {
      if (timerInterval) clearInterval(timerInterval);
    };
  }, [isGenerationRunning, startTime]);

  useEffect(() => {
    // 1. Subscribe to System Bus Events
    const unsubStage = systemBus.subscribe('BuildStageChanged', (data: any) => {
      const stage = data?.stage as StageName;
      if (stage) {
        setActiveStage(stage);
        if (stage === 'Completed') {
          setProgressPct(100);
          setIsGenerationRunning(false);
          triggerCompletionNotice();
        } else if (stage === 'Failed') {
          setIsGenerationRunning(false);
        } else {
          setIsGenerationRunning(true);
        }
      }
    });

    const unsubProgress = systemBus.subscribe('StudioProgress', (data: any) => {
      if (typeof data?.progress === 'number') {
        setProgressPct(Math.min(100, Math.max(0, data.progress)));
      }
      if (data?.title) {
        setTaskTitle(data.title);
      }
    });

    const unsubStart = systemBus.subscribe('BuildStarted', (data: any) => {
      setIsGenerationRunning(true);
      setProgressPct(10);
      setActiveStage('Understanding');
      setCompletedNotification(false);
      setStartTime(Date.now());
      if (data?.projectName || data?.prompt) {
        setTaskTitle(data.projectName || `Executing ${data.prompt?.slice(0, 30)}...`);
      }
    });

    const unsubCompleted = systemBus.subscribe('BuildCompleted', () => {
      setProgressPct(100);
      setActiveStage('Completed');
      setIsGenerationRunning(false);
      triggerCompletionNotice();
    });

    // 3. Custom Window Event Listeners
    const handleCustomStart = (e: CustomEvent) => {
      setIsGenerationRunning(true);
      setCompletedNotification(false);
      setStartTime(Date.now());
      if (e.detail?.title) setTaskTitle(e.detail.title);
    };

    window.addEventListener('anny_generation_started' as any, handleCustomStart as any);

    return () => {
      unsubStage();
      unsubProgress();
      unsubStart();
      unsubCompleted();
      window.removeEventListener('anny_generation_started' as any, handleCustomStart as any);
    };
  }, []);

  const triggerCompletionNotice = () => {
    setCompletedNotification(true);
    setTimeout(() => {
      setCompletedNotification(false);
    }, 6000);
  };

  const getStepState = (stepStages: string[]) => {
    if (activeStage === 'Completed' || progressPct >= 100) return 'completed';
    if (stepStages.includes(activeStage)) return 'active';

    const stageOrder = [
      'Understanding', 'Analyzing', 'Planning', 'Generating', 'Writing Files', 
      'Installing Dependencies', 'Compiling', 'Repair', 'Starting Runtime', 
      'Mounting Application', 'Verifying', 'Completed'
    ];

    const currentStageIdx = stageOrder.indexOf(activeStage);
    const highestStepStageIdx = Math.max(...stepStages.map(s => stageOrder.indexOf(s)));

    if (currentStageIdx > highestStepStageIdx) return 'completed';
    return 'pending';
  };

  const getActionTextForStage = (stage: StageName): string => {
    switch (stage) {
      case 'Understanding':
      case 'Analyzing':
        return 'Analyzing';
      case 'Planning':
        return 'Planning architecture';
      case 'Generating':
        return 'Synthesizing code';
      case 'Writing Files':
        return 'Writing files';
      case 'Installing Dependencies':
        return 'Installing packages';
      case 'Compiling':
      case 'Repair':
        return 'Compiling';
      case 'Starting Runtime':
      case 'Mounting Application':
      case 'Verifying':
      case 'Completed':
      default:
        return 'Launching';
    }
  };

  const actionText = getActionTextForStage(activeStage);

  return (
    <OrchestratorContext.Provider 
      value={{ 
        isGenerationRunning, 
        setIsGenerationRunning, 
        activeStage, 
        progressPct, 
        taskTitle,
        elapsedSec,
        actionText
      }}
    >
      <div className="relative w-full h-full flex flex-col overflow-hidden">
        {/* Main Application Canvas */}
        <div className="flex-1 w-full h-full overflow-hidden relative">
          {children}
        </div>
      </div>
    </OrchestratorContext.Provider>
  );
};
