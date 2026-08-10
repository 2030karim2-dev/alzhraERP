import { useMutation } from '@tanstack/react-query';
import { supabase } from '../../../lib/supabaseClient';

export function useUpdateProfile() {
    return useMutation({
        mutationFn: async (data: { full_name: string }) => {
            const { data: result, error } = await supabase.auth.updateUser({
                data: { full_name: data.full_name }
            });
            if (error) throw error;
            return result;
        },
    });
}
