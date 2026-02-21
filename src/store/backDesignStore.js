import { create } from 'zustand';
import { listSchoolBackDesigns } from '../api/api';

const useBackDesignStore = create((set) => ({
    backDesigns: [],
    loading: false,
    error: null,
    pagination: {
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
    },

    fetchBackDesigns: async (params = {}) => {
        set({ loading: true, error: null });
        try {
            const { data } = await listSchoolBackDesigns(params);

            if (data.success) {
                set({
                    backDesigns: (data.data || []).filter(i => String(i.status) === "0"),
                    pagination: data.pagination,
                    loading: false,
                    error: null
                });
            } else {
                set({
                    error: data.error || 'Failed to fetch back designs',
                    loading: false
                });
            }
        } catch (err) {
            set({
                error: err.response?.data?.error || err.message || 'Something went wrong',
                loading: false
            });
        }
    },

    // Reset store if needed
    reset: () => set({
        backDesigns: [],
        loading: false,
        error: null,
        pagination: {
            total: 0,
            page: 1,
            limit: 10,
            totalPages: 0,
        }
    })
}));

export default useBackDesignStore;
