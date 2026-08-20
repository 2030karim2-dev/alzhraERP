import { useMutation } from '@tanstack/react-query';
import { authApi } from '../../auth/api';

export function useUpdateProfile() {
    return useMutation({
        mutationFn: async (data: { full_name: string }) => {
            return authApi.updateProfile(data.full_name);
        },
    });
}
