import { supabase } from '../../../lib/supabaseClient';
import { TableInsert, TableUpdate } from '@/core/types/supabase-helpers';

/** Vehicle management and fitment */
export const vehiclesApi = {
    getVehicles: async (filters?: { make?: string, year?: number, vin?: string }) => {
        let query = supabase.from('vehicles')
            .select('*')
            .is('deleted_at', null)
            .order('make', { ascending: true })
            .order('model', { ascending: true });

        if (filters?.make) query = query.ilike('make', `%${filters.make}%`);
        if (filters?.year) query = query.lte('year_start', filters.year).gte('year_end', filters.year);
        if (filters?.vin) query = query.eq('vin_prefix', filters.vin.substring(0, 8));

        return await query;
    },

    upsertVehicle: async (vehicle: TableInsert<'vehicles'> | TableUpdate<'vehicles'>) => {
        return await supabase.from('vehicles')
            .upsert(vehicle as any)
            .select()
            .single();
    },

    deleteVehicle: async (id: string) => {
        return await supabase.from('vehicles')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);
    },

    // ... searchVehicles and getFitment omitted for brevity or handled by multi-replace if needed ...
    // Wait, I should include the rest if I'm replacing the block.

    searchVehicles: async (term: string) => {
        const sanitized = term.replace(/[%_\\*()]/g, '');
        if (!sanitized.trim()) return { data: [], error: null };

        return await supabase.from('vehicles')
            .select('*')
            .is('deleted_at', null)
            .or(`make.ilike.%${sanitized}%,model.ilike.%${sanitized}%`)
            .limit(20);
    },

    // Fitment
    getFitment: async (productId: string) => {
        return await supabase.from('product_fitment')
            .select('*, vehicle:vehicles(*)')
            .eq('product_id', productId)
            .is('deleted_at', null);
    },

    addFitment: async (fitmentData: TableInsert<'product_fitment'>) => {
        return await supabase.from('product_fitment')
            .insert(fitmentData)
            .select('*, vehicle:vehicles(*)')
            .single();
    },

    removeFitment: async (id: string) => {
        return await supabase.from('product_fitment')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);
    },

    getVehicleProducts: async (vehicleId: string) => {
        return await supabase.rpc('get_vehicle_products', { v_id: vehicleId });
    },
};
