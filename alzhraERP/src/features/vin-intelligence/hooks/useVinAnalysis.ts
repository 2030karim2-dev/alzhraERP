import { useState, useCallback } from 'react';
import type { VinAnalysisResult, AnalysisStep } from '../types';
import { vinAnalysisService, ANALYSIS_STEPS } from '../services/vinAnalysisService';

interface UseVinAnalysisReturn {
  result: VinAnalysisResult | null;
  isAnalyzing: boolean;
  error: string | null;
  steps: AnalysisStep[];
  analyzeVin: (vin: string) => Promise<void>;
  reset: () => void;
}

export function useVinAnalysis(): UseVinAnalysisReturn {
  const [result, setResult] = useState<VinAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<AnalysisStep[]>(ANALYSIS_STEPS.map(s => ({ ...s })));

  const resetSteps = useCallback(() => setSteps(ANALYSIS_STEPS.map(s => ({ ...s }))), []);

  const updateStep = useCallback((idx: number, status: AnalysisStep['status']) =>
    setSteps(prev => { const n = [...prev]; n[idx] = { ...n[idx], status }; return n; }), []);

  const analyzeVin = useCallback(async (vin: string) => {
    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    resetSteps();

    try {
      // Phase A: Pre-analysis steps (validate → identify → config)
      const preSteps = [0, 1, 2];
      for (const i of preSteps) {
        updateStep(i, 'IN_PROGRESS');
        await new Promise(r => setTimeout(r, 400 + Math.random() * 300));
        updateStep(i, 'COMPLETE');
      }

      // Run the actual analysis (mock lookup in vehicle DB)
      const data = await vinAnalysisService.analyzeVin(vin);

      // Phase B: Post-analysis steps (parts → oem → inventory → knowledge)
      const postSteps = [3, 4, 5, 6];
      for (const i of postSteps) {
        updateStep(i, 'IN_PROGRESS');
        await new Promise(r => setTimeout(r, 300 + Math.random() * 400));
        updateStep(i, 'COMPLETE');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setSteps(prev => prev.map(s => s.status === 'IN_PROGRESS' ? { ...s, status: 'ERROR' as const } : s));
    } finally {
      setIsAnalyzing(false);
    }
  }, [updateStep, resetSteps]);

  const reset = useCallback(() => { setResult(null); setError(null); resetSteps(); }, [resetSteps]);

  return { result, isAnalyzing, error, steps, analyzeVin, reset };
}
