export const BASE_URL = import.meta.env.VITE_BASE_URL;

// `dark` marks garment colors that print in light-colored ink — used to pick
// which back-design asset variant (configured_file_path vs configured_file_path_2)
// matches the selected garment.
export const GARMENT_COLORS = [
    { name: "Red", value: "#E61709", border: "#E61709", dark: true },
    { name: "Black", value: "#120F14", border: "#120F14", dark: true },
    { name: "White", value: "#FFFFFF", border: "#D1D5DB", dark: false },
    { name: "Natural", value: "#FFFAD9", border: "#FFFAD9", dark: false },
    { name: "Heather Grey", value: "#D4D9DC", border: "#D4D9DC", dark: false },
    { name: "Navy", value: "#051734", border: "#051734", dark: true },
    { name: "Light Pink", value: "#F0A5C7", border: "#F0A5C7", dark: false },
    { name: "Olive Green", value: "#63673F", border: "#63673F", dark: true },
    { name: "Blue", value: "#0000FF", border: "#0000FF", dark: true },
    { name: "Purple", value: "#431279", border: "#431279", dark: true },
];

export const DEFAULT_SELECTIONS = {
    'T-SHIRT': {
        selectedColor: 'Red',
        selectedSize: 'S',
        pressureOptions: {
            rightChestText: '', rightChestFlag: '', rightChestLogoPredefined: '', rightChestLogoId: null, rightChestLogoCustom: '', rightChestType: '', rightChestTextColor: '#ffffff',
            leftChestText: '', leftChestFlag: '', leftChestLogoPredefined: '', leftChestLogoId: null, leftChestLogoCustom: '', leftChestType: '', leftChestTextColor: '#ffffff',
            rightSleeveText: '', rightSleeveFlag: '', rightSleeveFlag2: '', rightSleeveFlagCount: 1, rightSleeveLogoPredefined: '', rightSleeveLogoId: null, rightSleeveLogoCustom: '', rightSleeveType: '', rightSleeveTextColor: '#ffffff',
            leftSleeveText: '', leftSleeveFlag: '', leftSleeveFlag2: '', leftSleeveFlagCount: 1, leftSleeveLogoPredefined: '', leftSleeveLogoId: null, leftSleeveLogoCustom: '', leftSleeveType: '', leftSleeveTextColor: '#ffffff',
            backDesign: null,
        }
    },
    'SWEATSHIRT': {
        selectedColor: 'Red',
        selectedSize: 'S',
        pressureOptions: {
            rightChestText: '', rightChestFlag: '', rightChestLogoPredefined: '', rightChestLogoId: null, rightChestLogoCustom: '', rightChestType: '', rightChestTextColor: '#ffffff',
            leftChestText: '', leftChestFlag: '', leftChestLogoPredefined: '', leftChestLogoId: null, leftChestLogoCustom: '', leftChestType: '', leftChestTextColor: '#ffffff',
            rightSleeveText: '', rightSleeveFlag: '', rightSleeveFlag2: '', rightSleeveFlagCount: 1, rightSleeveLogoPredefined: '', rightSleeveLogoId: null, rightSleeveLogoCustom: '', rightSleeveType: '', rightSleeveTextColor: '#ffffff',
            leftSleeveText: '', leftSleeveFlag: '', leftSleeveFlag2: '', leftSleeveFlagCount: 1, leftSleeveLogoPredefined: '', leftSleeveLogoId: null, leftSleeveLogoCustom: '', leftSleeveType: '', leftSleeveTextColor: '#ffffff',
            backDesign: null,
        }
    },
    'HOODIE': {
        selectedColor: 'Red',
        selectedSize: 'S',
        pressureOptions: {
            rightChestText: '', rightChestFlag: '', rightChestLogoPredefined: '', rightChestLogoId: null, rightChestLogoCustom: '', rightChestType: '', rightChestTextColor: '#ffffff',
            leftChestText: '', leftChestFlag: '', leftChestLogoPredefined: '', leftChestLogoId: null, leftChestLogoCustom: '', leftChestType: '', leftChestTextColor: '#ffffff',
            bottomChestText: '', bottomChestFlag: '', bottomChestLogoPredefined: '', bottomChestLogoId: null, bottomChestLogoCustom: '', bottomChestType: '', bottomChestTextColor: '#ffffff',
            rightSleeveText: '', rightSleeveFlag: '', rightSleeveFlag2: '', rightSleeveFlagCount: 1, rightSleeveLogoPredefined: '', rightSleeveLogoId: null, rightSleeveLogoCustom: '', rightSleeveType: '', rightSleeveTextColor: '#ffffff',
            leftSleeveText: '', leftSleeveFlag: '', leftSleeveFlag2: '', leftSleeveFlagCount: 1, leftSleeveLogoPredefined: '', leftSleeveLogoId: null, leftSleeveLogoCustom: '', leftSleeveType: '', leftSleeveTextColor: '#ffffff',
            backDesign: null,
        }
    },
    'ZIPPERHOODIE': {
        selectedColor: 'Red',
        selectedSize: 'S',
        pressureOptions: {
            rightChestText: '', rightChestFlag: '', rightChestLogoPredefined: '', rightChestLogoId: null, rightChestLogoCustom: '', rightChestType: '', rightChestTextColor: '#ffffff',
            leftChestText: '', leftChestFlag: '', leftChestLogoPredefined: '', leftChestLogoId: null, leftChestLogoCustom: '', leftChestType: '', leftChestTextColor: '#ffffff',
            rightSleeveText: '', rightSleeveFlag: '', rightSleeveFlag2: '', rightSleeveFlagCount: 1, rightSleeveLogoPredefined: '', rightSleeveLogoId: null, rightSleeveLogoCustom: '', rightSleeveType: '', rightSleeveTextColor: '#ffffff',
            leftSleeveText: '', leftSleeveFlag: '', leftSleeveFlag2: '', leftSleeveFlagCount: 1, leftSleeveLogoPredefined: '', leftSleeveLogoId: null, leftSleeveLogoCustom: '', leftSleeveType: '', leftSleeveTextColor: '#ffffff',
            backDesign: null,
        }
    },
    'SWEATPANTS': {
        selectedColor: 'Red',
        selectedSize: 'S',
        pressureOptions: {
            rightLegText: '', rightLegFlag: '', rightLegLogoPredefined: '', rightLegLogoId: null, rightLegLogoCustom: '', rightLegType: '', rightLegTextColor: '#ffffff',
            leftLegText: '', leftLegFlag: '', leftLegLogoPredefined: '', leftLegLogoId: null, leftLegLogoCustom: '', leftLegType: '', leftLegTextColor: '#ffffff',
        }
    },
    'SHORTS': {
        selectedColor: 'Red',
        selectedSize: 'S',
        pressureOptions: {
            rightLegText: '', rightLegFlag: '', rightLegLogoPredefined: '', rightLegLogoId: null, rightLegLogoCustom: '', rightLegType: '', rightLegTextColor: '#ffffff',
            leftLegText: '', leftLegFlag: '', leftLegLogoPredefined: '', leftLegLogoId: null, leftLegLogoCustom: '', leftLegType: '', leftLegTextColor: '#ffffff',
        }
    }
};
