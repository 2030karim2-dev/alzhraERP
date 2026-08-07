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
      for (let i = 0; i < ANALYSIS_STEPS.length; i++) {
        updateStep(i, 'IN_PROGRESS');
        await new Promise(r => setTimeout(r, 500 + Math.random() * 500));
        updateStep(i, 'COMPLETE');
      }
      const data = await vinAnalysisService.analyzeVin(vin);
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
