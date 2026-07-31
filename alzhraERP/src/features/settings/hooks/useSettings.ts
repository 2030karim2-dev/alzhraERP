
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsService } from '../services/settingsService';
import { useAuthStore } from '../../auth/store';
import { CompanyFormData } from '../types';

export const useCompanyProfile = () => {
  const { user } = useAuthStore();
  return useQuery({
    queryKey: ['company_profile', user?.company_id],
    queryFn: () => user?.company_id ? settingsService.getCompanyProfile(user.company_id) : Promise.resolve(null),
    enabled: !!user?.company_id,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  return useMutation({
    mutationFn: (data: CompanyFormData) => {
      if (!user?.company_id) throw new Error("No Company ID");
      return settingsService.updateProfile(user.company_id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company_profile'] });
    }
  });
};
