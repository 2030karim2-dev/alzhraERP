import { useMutation } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
}

export function useCarAI() {
  return useMutation({
    mutationFn: async (messages: ChatMessage[]) => {
      const { data, error } = await supabase.functions.invoke('car-ai-assistant', {
        body: { messages },
      });

      if (error) throw error;
      return data;
    },
  });
}
