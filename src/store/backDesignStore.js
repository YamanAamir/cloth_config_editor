import { create } from 'zustand';
import { getMyClassBackDesigns } from '../api/api';

const useBackDesignStore = create((set) => ({
    backDesigns: null, // store single object instead of array
    loading: false,
    error: null,

    fetchBackDesigns: async (params = {}) => {
        set({ loading: true, error: null });
        try {
            const { data } = await getMyClassBackDesigns(params);
            console.log("Fetched BackDesign:", data.data);

            if (data.success) {
                set({
                    // store as object directly
                    backDesigns: String(data.data?.status) === "1" ? data.data : null,
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
        backDesigns: null,
        loading: false,
        error: null
    })
}));

export default useBackDesignStore;