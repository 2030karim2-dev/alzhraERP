export const useAIInsights = (_data: any) => {
  return { data: null, isPending: false, isError: false, refetch: () => {} };
};

export const useFinancialHealth = () => {
  return {
    financialData: null,
    aiAnalysis: null,
    isLoading: false,
    isError: false,
    refetch: () => {}
  };
};