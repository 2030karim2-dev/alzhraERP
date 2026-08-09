export const documentAiService = {
  parseDocument: async (_file: File, _mode: 'invoice' | 'inventory'): Promise<{
    items: Array<Record<string, unknown>>;
    supplierName?: string;
    currency: string;
  }> => {
    // Stub — returns empty result.
    // In production, this would call Gemini Vision to extract structured data from the document.
    return {
      items: [],
      supplierName: '',
      currency: 'SAR',
    };
  },
};
