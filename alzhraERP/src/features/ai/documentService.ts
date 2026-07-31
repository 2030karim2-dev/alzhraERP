export const documentAiService = {
  parseDocument: async (_file: File, _type: 'invoice' | 'inventory') => {
    return {
      items: [],
      currency: 'SAR',
      supplierName: ''
    };
  }
};