export interface MemoryEntry {
    id?: string;
    key: string;
    content: string;
    updated_at?: string;
}

export const memoryService = {
    saveMemory: async (_companyId: string, _userId: string, _key: string, _content: string): Promise<void> => {},
    getMemories: async (_companyId: string, _userId: string): Promise<MemoryEntry[]> => [],
    summarizeAndStore: async (_companyId: string, _userId: string, _messages: any[]): Promise<void> => {},
    savePreference: async (_companyId: string, _userId: string, _preference: string): Promise<void> => {},
    deleteMemory: async (_companyId: string, _userId: string, _key: string): Promise<void> => {},
    buildMemoryContext: (_memories: MemoryEntry[]): string => '',
};
