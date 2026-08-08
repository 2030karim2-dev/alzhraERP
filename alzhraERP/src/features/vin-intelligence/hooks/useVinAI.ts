import { useState, useCallback } from 'react';
import type { VinAnalysisResult, VehicleCorePart } from '../types';
import { analyzeVinWithAI, getPartAIInsight, type VinAIInsight } from '../services/vinAIService';

interface UseVinAIReturn {
  aiInsight: VinAIInsight | null;
  isAnalyzingAI: boolean;
  aiError: string | null;
  runAIAnalysis: (result: VinAnalysisResult) => Promise<void>;
  getPartInsight: (part: VehicleCorePart, make: string, model: string) => Promise<string | null>;
  clearAIInsight: () => void;
}

export function useVinAI(): UseVinAIReturn {
  const [aiInsight, setAIInsight] = useState<VinAIInsight | null>(null);
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [aiError, setAIError] = useState<string | null>(null);

  const runAIAnalysis = useCallback(async (result: VinAnalysisResult) => {
    if (!result || result.analysisStatus === 'FAILED') return;
    
    setIsAnalyzingAI(true);
    setAIError(null);
    setAIInsight(null);

    try {
      const insight = await analyzeVinWithAI(result);
      if (insight) {
        setAIInsight(insight);
      } else {
        setAIError('لم يتمكن الذكاء الاصطناعي من تحليل بيانات المركبة.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI analysis failed';
      setAIError(msg);
    } finally {
      setIsAnalyzingAI(false);
    }
  }, []);

  const getPartInsight = useCallback(async (
    part: VehicleCorePart,
    make: string,
    model: string
  ): Promise<string | null> => {
    try {
      return await getPartAIInsight(part, make, model);
    } catch {
      return null;
    }
  }, []);

  const clearAIInsight = useCallback(() => {
    setAIInsight(null);
    setAIError(null);
  }, []);

  return { aiInsight, isAnalyzingAI, aiError, runAIAnalysis, getPartInsight, clearAIInsight };
}