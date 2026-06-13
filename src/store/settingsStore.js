import { create } from 'zustand';
import { getPublicSettings } from '../api/api';

const useSettingsStore = create((set, get) => ({
    settings: null, // raw map: { price_T-SHIRT: "1200", ... }
    loading: false,

    fetchSettings: async () => {
        if (get().settings) return; // already loaded
        set({ loading: true });
        try {
            const { data } = await getPublicSettings();
            if (data.success) {
                set({ settings: data.data, loading: false });
            }
        } catch {
            set({ loading: false });
        }
    },

    // Helpers
    getGarmentPrice: (type) => {
        const s = get().settings;
        if (!s) return 0;
        return parseFloat(s[`price_${type}`] || 0);
    },

    getHandlingFeeEnabled: () => {
        const s = get().settings;
        return s?.handling_fee_enabled === 'true';
    },

    getBaseHandlingFee: () => {
        const s = get().settings;
        return parseFloat(s?.handling_fee || 0);          // key: handling_fee
    },

    getThreshold: () => {
        const s = get().settings;
        return parseInt(s?.handling_fee_threshold || 0);  // key: handling_fee_threshold
    },

    getExtraFeeAboveThreshold: () => {
        const s = get().settings;
        return parseFloat(s?.handling_fee_extra || 0);    // key: handling_fee_extra
    },

    getVat: () => {
        const s = get().settings;
        return parseFloat(s?.vat_percentage || 0);
    },

    getMaxCharsClothText: () => {
        const s = get().settings;
        const val = parseInt(s?.max_chars_cloth_text || 25);
        return isNaN(val) ? 25 : val;
    },
}));

export default useSettingsStore;
