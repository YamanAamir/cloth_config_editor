import React, { useState } from 'react';
import { formatDate } from '../utils/dateUtils';
import { message } from 'antd';
import { X, Printer, Download, Mail, CheckCircle, Package, Star, User, CreditCard, ArrowLeft, ArrowRight, Loader2, ShoppingCart, Settings, History, Shirt, Check, ChevronDown } from 'lucide-react';
// import { loadStripe } from "@stripe/stripe-js";
import { useRef } from 'react';
import { useEffect } from 'react';
import { placeOrder, createCheckoutSession, getMyClassInfo, getStudentClassDelivery } from '../api/api';
import useSettingsStore from '../store/settingsStore';
import { getFlagUrl } from '../utils/flags';
import useLogoStore from '../store/logoStore';
import { BASE_URL } from '../utils/const';
import PaymentBreakdown from './PaymentBreakdown';
import { useNavigate } from 'react-router-dom';
// const stripePromise = loadStripe("pk_test_51S0HgS2ZnQzLDaK40M9tlj1n72wtQNsUNhG986xbE6bfHxWmFfOMJfWGAbg4QrAlFtnhVCtOajoIqUbRgSBnRnkb00iMo1bD1o");

const getGarmentIcon = (category) => {
  const cat = (category || '').toUpperCase();
  if (cat.includes('TSHIRT') || cat.includes('T-SHIRT') || cat.includes('SWEATSHIRT') || cat.includes('HOODIE') || cat.includes('ZIPPER')) {
    return Shirt;
  }
  return Package;
};

const QuoteModal = ({
  isOpen,
  onClose,
  selectedOptions,
  defaultSelections = {},
  price,
  amountPaid = 0,
  paymentStatus = 'unpaid',
  balanceDue = 0,
  editDeadline = null,
  onContinueConfiguring,
  packageName,
  program,
  initialDeliveryDetails,
  // New: edit-window flow
  processStatus = null,
  editWindowOpen = false,
  existingOrderId = null,
  paymentBreakdown = null,
  onPayNow,
  isPayingBalance = false,
  existingProductTypes = [],
  isLocked = false,
}) => {
  const navigate = useNavigate()

  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);

  // Class student count — for handling fee per-student split
  const [classStudentCount, setClassStudentCount] = useState(0);

  useEffect(() => {
    const fetchClassInfo = async () => {
      try {
        const { data } = await getMyClassInfo();
        if (data?.success) {
          // Use expected_students for handling fee split (total class size)
          setClassStudentCount(data.data?.expected_students || 0);
        }
      } catch {
        // silently fail — handling fee will show 0
      }
    };
    fetchClassInfo();
  }, []);

  // Class-level delivery details (set by class rep) — shipping cost split across all students
  const [classDeliveryDetails, setClassDeliveryDetails] = useState(null);

  useEffect(() => {
    const fetchClassDelivery = async () => {
      try {
        const userStr = localStorage.getItem("user");
        const user = userStr ? JSON.parse(userStr) : null;
        const classId = user?.class_id;
        if (!classId) return;

        const { data } = await getStudentClassDelivery(classId);
        if (data?.success && data.data) {
          setClassDeliveryDetails(data.data); // { country, shippingOption, shippingPrice, address, city, zip, ... }
        }
      } catch {
        // silently fail — shipping section will just show 0
      }
    };
    fetchClassDelivery();
  }, []);

  // Track which garments are selected for purchase — start empty, user explicitly selects
  const [selectedGarments, setSelectedGarments] = useState(() => {
    const selections = {};
    Object.keys(selectedOptions).forEach((type) => {
      selections[type] = type === 'T-SHIRT' || existingProductTypes.includes(type);
    });
    return selections;
  });

  // Already-purchased garments must always stay selected — re-sync whenever the
  // existing order's items become known (they may load after this component mounts)
  // or whenever the modal is reopened.
  useEffect(() => {
    if (existingProductTypes.length === 0) return;
    setSelectedGarments(prev => {
      const next = { ...prev };
      existingProductTypes.forEach(type => { next[type] = true; });
      return next;
    });
  }, [existingProductTypes, isOpen]);

  const [customerDetails, setCustomerDetails] = useState({
    firstName: initialDeliveryDetails?.firstName || '',
    lastName: initialDeliveryDetails?.lastName || '',
    email: initialDeliveryDetails?.email || '',
    phone: initialDeliveryDetails?.phone || '',
    Skolenavn: initialDeliveryDetails?.Skolenavn || '',
    address: initialDeliveryDetails?.address || '',
    city: initialDeliveryDetails?.city || '',
    postalCode: initialDeliveryDetails?.postalCode || '',
    country: initialDeliveryDetails?.country || 'Denmark',
    notes: initialDeliveryDetails?.notes || '',
    deliveryType: initialDeliveryDetails?.deliveryType || "regular",
    deliverToSchool: initialDeliveryDetails?.deliverToSchool !== undefined ? initialDeliveryDetails.deliverToSchool : true
  });

  // Sync state if initialDeliveryDetails changes while modal is open (e.g. slow fetch)
  useEffect(() => {
    if (initialDeliveryDetails) {
      setCustomerDetails(prev => ({
        ...prev,
        ...initialDeliveryDetails
      }));
    }
  }, [initialDeliveryDetails]);

  // --- outside renderCustomerDetails, in your component ---
  const refs = {
    firstName: useRef(null),
    lastName: useRef(null),
    email: useRef(null),
    phone: useRef(null),
    Skolenavn: useRef(null),
    address: useRef(null),
    city: useRef(null),
    country: useRef(null),
    postalCode: useRef(null),
    notes: useRef(null),
  };

  // Ordered list of refs (for enter + click navigation)
  const refOrder = [
    refs.firstName,
    refs.lastName,
    refs.email,
    refs.phone,
    refs.Skolenavn,
    refs.address,
    refs.city,
    refs.postalCode,
    refs.country,
    refs.notes,
  ];

  const lastFocusedIndex = useRef(-1);

  // Track which field was last focused - ONLY on step 1
  useEffect(() => {
    if (currentStep !== 1) return;
    const handleFocus = (index) => {
      lastFocusedIndex.current = index;
    };

    refOrder.forEach((ref, index) => {
      if (ref.current) {
        ref.current.addEventListener("focus", () => handleFocus(index));
      }
    });

    return () => {
      refOrder.forEach((ref) => {
        if (ref.current) {
          ref.current.removeEventListener("focus", () => { });
        }
      });
    };
  }, [currentStep]); // Re-run when step changes

  useEffect(() => {
    if (currentStep !== 1) return;

    const handleClick = (e) => {
      if (e.target.matches('input, textarea, select')) {
        return;
      }
      // If we have a last focused field and it's not the last one
      if (lastFocusedIndex.current >= 0 && lastFocusedIndex.current < refOrder.length - 1) {
        const nextIndex = lastFocusedIndex.current + 1;
        refOrder[nextIndex].current?.focus();
      } else if (lastFocusedIndex.current === -1) {
        // No field focused yet, focus first field
        refOrder[0].current?.focus();
      }
      // If lastFocusedIndex.current is the last field, do nothing
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [currentStep]); // Re-run when step changes

  const [orderDate, setOrderDate] = useState(`ORD-${formatDate(new Date())}`);
  const [expandedImageKey, setExpandedImageKey] = useState(null);
  const [expandedAreaKey, setExpandedAreaKey] = useState(null); // accordion for area items

  // Toggle function for expanding/collapsing image sections
  const toggleExpand = (id) => {
    setExpandedImageKey(prev => (prev === id ? null : id));
  };

  // Toggle function for area accordion — sirf ek area ek waqt open
  const toggleAreaExpand = (id) => {
    setExpandedAreaKey(prev => (prev === id ? null : id));
  };

  const getOptionImageUrl = (category, key, value, options) => {
    if (!selectedOptions || !options) return null;
    const po = options.pressureOptions || {};

    if (key.includes("(Flag") || key.includes("Flag")) {
      return getFlagUrl(value);
    }

    if (key.includes("Custom Logo")) {
      const areaName = key.split(' (')[0];
      const areaKey = areaName.charAt(0).toLowerCase() + areaName.slice(1).replace(' ', '');
      return po[`${areaKey}LogoCustom`];
    }

    if (key.includes("(Logo)") || key.includes("Logo")) {
      const logosList = useLogoStore.getState().logos || [];
      const foundLogo = logosList.find(l => l.name === value);
      if (foundLogo?.file_path) {
        const cleanPath = foundLogo.file_path.replace(/\\/g, '/');
        return `${BASE_URL}${cleanPath}`;
      }
    }

    return null;
  };

  // Garment prices from backend settings (with fallback) — must be before any early return
  const { getGarmentPrice, getVat, getHandlingFeeEnabled, getBaseHandlingFee, getThreshold, getExtraFeeAboveThreshold, getDeliveryFeeThreshold } = useSettingsStore();
  const GARMENT_PRICES = {
    'T-SHIRT': getGarmentPrice('T-SHIRT') || 1200,
    'SWEATSHIRT': getGarmentPrice('SWEATSHIRT') || 1500,
    'HOODIE': getGarmentPrice('HOODIE') || 2000,
    'ZIPPERHOODIE': getGarmentPrice('ZIPPERHOODIE') || 2200,
    'SWEATPANTS': getGarmentPrice('SWEATPANTS') || 2000,
    'SHORTS': getGarmentPrice('SHORTS') || 1500,
  };

  if (!isOpen) return null;

  const steps = orderComplete
    ? ['Thank You']
    : ['Order Overview', 'Delivery Information', 'Order Confirmation'];

  // ✨ NEW: Calculate dynamic total price
  const calculateTotalPrice = () => {
    let total = 0;
    Object.entries(selectedGarments).forEach(([garmentType, isSelected]) => {
      if (isSelected) {
        total += GARMENT_PRICES[garmentType] || 0;
      }
    });
    return total;
  };

  const dynamicPrice = calculateTotalPrice();

  // Shipping fee per student — total class shipping cost (set by class rep) ÷ expected students
  // If expected students exceeds threshold, the shipping price doubles.
  const getShippingFeePerStudent = () => {
    if (!classDeliveryDetails?.shippingPrice) return 0;
    if (!classStudentCount || classStudentCount <= 0) return 0;
    const shippingPrice = parseFloat(classDeliveryDetails.shippingPrice);
    const threshold = getDeliveryFeeThreshold();
    const totalFee = classStudentCount > threshold ? shippingPrice * 2 : shippingPrice;
    return Math.round((totalFee / classStudentCount) * 100) / 100;
  };
  const shippingRate = getShippingFeePerStudent();

  // Handling fee per-student calculation
  // Logic:
  //   students <= threshold  → baseFee ÷ totalStudents
  //   students > threshold   → (baseFee + extraFee) ÷ totalStudents
  const getHandlingFeePerStudent = () => {
    if (!getHandlingFeeEnabled()) return 0;
    if (!classStudentCount || classStudentCount <= 0) return 0;
    const baseFee = getBaseHandlingFee();
    const threshold = getThreshold();
    const extraFee = getExtraFeeAboveThreshold();
    const totalFee = classStudentCount > threshold ? baseFee + extraFee : baseFee;
    return Math.round((totalFee / classStudentCount) * 100) / 100; // round to 2 decimals
  };
  const handlingFeePerStudent = getHandlingFeePerStudent();

  // VAT calculation
  const subtotal = dynamicPrice;
  const vatPct = getVat(); // e.g. 10
  const vatAmount = Math.round(subtotal * vatPct / (100 + vatPct));
  const totalWithVat = subtotal + shippingRate + handlingFeePerStudent;

  // Balance due = total with VAT + shipping - already paid amount
  const computedBalanceDue = Math.max(0, totalWithVat - amountPaid).toFixed(2);

  // ✨ NEW: Toggle garment selection
  const toggleGarmentSelection = (garmentType) => {
    if (existingProductTypes.includes(garmentType)) return; // already purchased — can't be removed
    setSelectedGarments(prev => ({
      ...prev,
      [garmentType]: !prev[garmentType]
    }));
  };

  // Price definitions for each option
  const priceConfig = {
    basePrice: 299,
    bows: {
      color: {
        "Standard": 0,
        "Premium": 50,
        "Luxury": 100
      },
      bowType: {
        "Standard": 0,
        "Premium": 75,
        "Luxury": 150
      },
      emblem: {
        "Standard": 0,
        "Premium": 60,
        "Luxury": 120
      },
      country: {
        "Denmark": 0,
        "Sweden": 25,
        "Norway": 25,
        "Germany": 25,
        "Other": 30
      }
    },
    educationalTape: {
      hatbandColor: {
        "Standard": 0,
        "Premium": 40,
        "Luxury": 80
      },
      materialType: {
        "Standard": 0,
        "Premium": 55,
        "Luxury": 110
      },
      chinStrapColor: {
        "Standard": 0,
        "Premium": 30,
        "Luxury": 60
      },
      buttonMaterial: {
        "Standard": 0,
        "Premium": 20,
        "Luxury": 40
      },
      embroideryColor: {
        "Standard": 0,
        "Premium": 35,
        "Luxury": 70
      },
      buttonColor: {
        "Standard": 0,
        "Premium": 15,
        "Luxury": 30
      },
      embroideryText: {
        "Standard": 0,
        "Premium": 25,
        "Luxury": 50
      }
    },
    embroidery: {
      nameEmbroideryColor: {
        "Standard": 0,
        "Premium": 45,
        "Luxury": 90
      },
      nameEmbroideryText: {
        "Standard": 0,
        "Premium": 25,
        "Luxury": 50
      },
      schoolEmbroideryColor: {
        "Standard": 0,
        "Premium": 45,
        "Luxury": 90
      },
      schoolEmbroideryText: {
        "Standard": 0,
        "Premium": 25,
        "Luxury": 50
      }
    },
    cover: {
      coverColor: {
        "Standard": 0,
        "Premium": 70,
        "Luxury": 140
      },
      edgebandColor: {
        "Standard": 0,
        "Premium": 40,
        "Luxury": 80
      },
      starsStyle: {
        "Standard": 0,
        "Premium": 50,
        "Luxury": 100
      }
    },
    shade: {
      shadeType: {
        "Standard": 0,
        "Premium": 85,
        "Luxury": 170
      },
      materialType: {
        "Standard": 0,
        "Premium": 60,
        "Luxury": 120
      },
      shadowTapeColor: {
        "Standard": 0,
        "Premium": 35,
        "Luxury": 70
      },
      engravingLine1: {
        "Standard": 0,
        "Premium": 15,
        "Luxury": 30
      },
      engravingLine2: {
        "Standard": 0,
        "Premium": 15,
        "Luxury": 30
      },
      engravingLine3: {
        "Standard": 0,
        "Premium": 15,
        "Luxury": 30
      }
    },
    foer: {
      kokardeMaterial: {
        "Standard": 0,
        "Premium": 50,
        "Luxury": 100
      },
      kokardeColor: {
        "Standard": 0,
        "Premium": 30,
        "Luxury": 60
      },
      bowColor: {
        "Standard": 0,
        "Premium": 40,
        "Luxury": 80
      },
      foerMaterial: {
        "Standard": 0,
        "Premium": 65,
        "Luxury": 130
      },
      bowMaterialType: {
        "Standard": 0,
        "Premium": 45,
        "Luxury": 90
      }
    },
    extraCover: {
      extraCoverOption: {
        "None": 0,
        "Standard": 50,
        "Premium": 100,
        "Luxury": 200
      }
    },
    accessories: {
      hatBoxColor: {
        "Standard": 0,
        "Premium": 25,
        "Luxury": 50
      },
      hatBoxType: {
        "None": 0,
        "Standard": 50,
        "Premium": 100,
        "Luxury": 200
      },
      ballpointPenSelection: {
        "None": 0,
        "Standard": 20,
        "Premium": 40
      },
      silkPillowSelection: {
        "None": 0,
        "Standard": 30,
        "Premium": 60
      },
      badgesSelection: {
        "None": 0,
        "Standard": 25,
        "Premium": 50
      },
      glovesSelection: {
        "None": 0,
        "Standard": 35,
        "Premium": 70
      },
      largeBallpointPenSelection: {
        "None": 0,
        "Standard": 30,
        "Premium": 60
      },
      smartTagSelection: {
        "None": 0,
        "Standard": 15,
        "Premium": 30
      },
      lightBallSelection: {
        "None": 0,
        "Standard": 40,
        "Premium": 80
      },
      champagneGlassSelection: {
        "None": 0,
        "Standard": 25,
        "Premium": 50
      },
      whistleSelection: {
        "None": 0,
        "Standard": 20,
        "Premium": 40
      },
      trumpetSelection: {
        "None": 0,
        "Standard": 80,
        "Premium": 160
      }
    },
    size: {
      selectedSize: {
        "49.5": 0,
        "50": 0,
        "51": 0,
        "52": 0,
        "53": 0,
        "54": 0,
        "55": 0,
        "56": 0,
        "57": 0,
        "58": 0,
        "59": 0,
        "60": 0,
        "61": 0
      },
      millimeterAdjustment: {
        "0": 0,
        "5": 10,
        "10": 20,
        "15": 30
      }
    }
  };

  // Function to calculate total price


  // Function to format values for display
  const formatValue = (value, section, key) => {
    let displayValue = '';
    let price = 0;

    if (typeof value === 'object' && value.name) {
      displayValue = value.name;
      if (priceConfig[section] && priceConfig[section][key] && priceConfig[section][key][value.name] !== undefined) {
        price = priceConfig[section][key][value.name];
      }
    } else if (typeof value === 'string') {
      displayValue = value;
      if (priceConfig[section] && priceConfig[section][key] && priceConfig[section][key][value] !== undefined) {
        price = priceConfig[section][key][value];
      }
    } else if (typeof value === 'number') {
      displayValue = value.toString();
      if (priceConfig[section] && priceConfig[section][key] && priceConfig[section][key][value.toString()] !== undefined) {
        price = priceConfig[section][key][value.toString()];
      }
    }

    let mappedValue = displayValue;
    if (key && (key.toLowerCase() === 'size' || key.toLowerCase() === 'selectedsize' || key.toLowerCase() === 'størrelse')) {
      const sizeMap = {
        's': 'Small',
        'm': 'Medium',
        'l': 'Large',
        'xl': 'Extra Large',
        'xxl': 'Double Extra Large',
        'xxxl': 'Triple Extra Large'
      };
      const valLower = displayValue.toLowerCase().trim();
      if (sizeMap[valLower]) {
        mappedValue = sizeMap[valLower];
      }
    }

    if (mappedValue === '' || mappedValue === 'Ikke valgt') {
      return 'Ikke valgt';
    }

    if (price > 0) {
      return `${mappedValue} (+${price} DKK)`;
    }

    return mappedValue;
  };

  // Filter out empty or default values for cleaner display
  //   const filterOptions = (options) => {
  //   // Define relationships between text fields and their color fields
  //   const relatedPairs = {
  //     "Broderi foran": "Broderi farve",
  //     "Navne broderi": "Broderifarve",
  //     "Skolebroderi": "Skolebroderi farve",
  //   };

  //   // First, make a shallow copy so we can safely delete keys
  //   const filtered = { ...options };

  //   // Loop through each related pair
  //   for (const [textKey, colorKey] of Object.entries(relatedPairs)) {
  //     if (filtered[textKey] === "") {
  //       // If the main text field is empty, remove its color field
  //       delete filtered[colorKey];
  //     }
  //   }

  //   // Now remove unwanted keys and empty/null values
  //   return Object.fromEntries(
  //     Object.entries(filtered).filter(([key, value]) => {
  //       if (key === "Ingen") return false;
  //       if (value === null || value === undefined) return false;
  //       if (typeof value === "object" && (!value.name || value.name === "")) return false;
  //       // Keep empty strings for display logic if needed
  //       return true;
  //     })
  //   );
  // };

  const filterOptions = (options) => {
    // 1. Common Logic: Filter out empty strings from the start
    const filtered = {};
    Object.entries(options).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) {
        filtered[key] = value;
      }
    });

    // 2. Legacy Cap Logic (Safely handled)
    const relatedPairs = {
      "Broderi foran": "Broderi farve",
      "Navne broderi": "Broderifarve",
      "Navnebroderi": "Navnebroderi farve",
    };

    for (const [textKey, colorKey] of Object.entries(relatedPairs)) {
      if (filtered[textKey] === undefined && filtered[colorKey]) {
        delete filtered[colorKey];
      }
    }

    // Safety check BEFORE accessing deep nested keys like SKYGGE
    // Using optional chaining or straight up checks to prevent 'undefined' access errors
    if (selectedOptions && selectedOptions.SKYGGE && selectedOptions.SKYGGE.Type === "Glimmer") {
      delete selectedOptions.SKYGGE.Materiale;
    }

    // Safety check for TILBEHØR
    if (selectedOptions && selectedOptions.TILBEHØR) {
      if (selectedOptions.TILBEHØR['Ekstra korkarde'] == "Fravalgt" || selectedOptions.TILBEHØR['Ekstra korkarde'] == "No") {
        delete selectedOptions.TILBEHØR['Ekstra korkarde Text'];
      }
      if (selectedOptions.TILBEHØR['Lille Flag'] == "Fravalgt" || selectedOptions.TILBEHØR['Lille Flag'] == "No") {
        delete selectedOptions.TILBEHØR['Lille Flag Text'];
      }
    }


    if (options.pressureOptions) {
      const po = options.pressureOptions;
      const areas = [
        { key: 'rightChest', name: 'Right Chest' },
        { key: 'leftChest', name: 'Left Chest' },
        { key: 'bottomChest', name: 'Bottom Chest' },
        { key: 'rightSleeve', name: 'Right Sleeve' },
        { key: 'leftSleeve', name: 'Left Sleeve' },
        { key: 'rightLeg', name: 'Right Leg' },
        { key: 'leftLeg', name: 'Left Leg' }
      ];

      areas.forEach(area => {
        const textVal = po[`${area.key}Text`]?.trim();
        const flagVal = po[`${area.key}Flag`]?.trim();
        const flag2Val = po[`${area.key}Flag2`]?.trim();
        const logoPreVal = po[`${area.key}LogoPredefined`]?.trim();
        const logoCustomVal = po[`${area.key}LogoCustom`]?.trim();
        const typeVal = po[`${area.key}Type`]?.trim(); // "text", "flag", "logo"

        if (typeVal === 'flag') {
          if (flagVal) filtered[`${area.name} (Flag)`] = flagVal;
          if (flag2Val) filtered[`${area.name} (Flag 2)`] = flag2Val;
        } else if (typeVal === 'logo') {
          if (logoPreVal) filtered[`${area.name} (Logo)`] = logoPreVal;
          if (logoCustomVal) filtered[`${area.name} (Custom Logo)`] = 'Uploaded';
        } else if (typeVal === 'text') {
          if (textVal) filtered[`${area.name} (Text)`] = textVal;
        } else {
          // Fallback if typeVal is not set but fields have values
          if (textVal) filtered[`${area.name} (Text)`] = textVal;
          if (flagVal) filtered[`${area.name} (Flag)`] = flagVal;
          if (flag2Val) filtered[`${area.name} (Flag 2)`] = flag2Val;
          if (logoPreVal) filtered[`${area.name} (Logo)`] = logoPreVal;
          if (logoCustomVal) filtered[`${area.name} (Custom Logo)`] = 'Uploaded';
        }
      });

      if (po.backDesign) {
        filtered['Design på bagsiden'] = po.backDesign.name || 'Custom';
      }

      // Remove the raw object so it doesn't show up as [Object object]
      delete filtered.pressureOptions;
    }

    // Explicitly keep selectedColor/Size if they exist (they are already in filtered from step 1)
    if (options.selectedColor) filtered['Color'] = options.selectedColor;
    if (options.selectedSize) filtered['Size'] = options.selectedSize;

    // Cleanup: Remove raw selectedColor/Size keys if we mapped them to nice names
    if (filtered['Color']) delete filtered.selectedColor;
    if (filtered['Size']) delete filtered.selectedSize;


    // 4. Final Cleanup & Translation
    return Object.fromEntries(
      Object.entries(filtered).filter(([key, value]) => {
        if (key === "Ingen") return false;
        if (typeof value === "object" && (!value.name || value.name === "")) return false; // Filter empty objects
        return true;
      }).map(([key, value]) => {
        // Convert specific values
        if (typeof value === "string") {
          if (value.trim().toLowerCase() === "none") value = "NONE";
          else if (value.trim().toLowerCase() === "yes") value = "Yes";
          else if (value.trim().toLowerCase() === "no") value = "Deselected";
        }
        return [key, value];
      })
    );
  };




  // Handle input changes
  const handleInputChange = (field, value) => {
    setCustomerDetails(prev => ({
      ...prev,
      [field]: value
    }));

  };

  // Validate customer details
  const validateCustomerDetails = () => {
    const required = customerDetails.deliverToSchool
      ? ['firstName', 'lastName', 'email', 'phone']
      : ['firstName', 'lastName', 'email', 'phone', 'address', 'city', 'postalCode'];
    return required.every(field => (customerDetails[field] || '').trim() !== '');
  };
  const buildFilteredOptions = (selectedOptions) => {
    return Object.fromEntries(
      Object.entries(selectedOptions).map(([category, options]) => {
        return [category, filterOptions(options)];
      }).filter(([_, filtered]) => Object.keys(filtered).length > 0)
    );
  };

  const handleConfirmOrder = async () => {
    setIsLoading(true);

    try {
      const userStr = localStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;
      const studentId = user?.id;
      const classId = user?.class_id;

      if (!studentId || !classId) {
        throw new Error("Student or Class information not found. Please log in again.");
      }

      // Prepare order data
      const configuredEntries = Object.entries(selectedOptions).filter(
        ([type]) => selectedGarments[type]
      );

      if (configuredEntries.length === 0) {
        throw new Error("No garments selected. Please select at least one garment before placing an order.");
      }

      const garments = configuredEntries.map(([type, options]) => {
        const designConfig = { ...(options.pressureOptions || {}) };
        const logosList = useLogoStore.getState().logos || [];

        // Add URLs for all flags and predefined logos
        Object.keys(designConfig).forEach(key => {
          if ((key.endsWith("Flag") || key.endsWith("Flag2")) && designConfig[key]) {
            designConfig[key + "Url"] = getFlagUrl(designConfig[key]);
          }
          if (key.endsWith("LogoPredefined") && designConfig[key]) {
            const logoName = designConfig[key];
            const foundLogo = logosList.find(l => l.name === logoName);
            if (foundLogo?.file_path) {
              const cleanPath = foundLogo.file_path.replace(/\\/g, '/');
              designConfig[key + "Url"] = `${BASE_URL}${cleanPath}`;
            }
          }
        });

        // Specific handling for 2 flags on a sleeve
        if (Number(designConfig.rightSleeveFlagCount) === 2) {
          designConfig.twoFlagsSleeve = "right";
          designConfig.twoFlagsFirstUrl = getFlagUrl(designConfig.rightSleeveFlag);
          designConfig.twoFlagsSecondUrl = getFlagUrl(designConfig.rightSleeveFlag2);
        } else if (Number(designConfig.leftSleeveFlagCount) === 2) {
          designConfig.twoFlagsSleeve = "left";
          designConfig.twoFlagsFirstUrl = getFlagUrl(designConfig.leftSleeveFlag);
          designConfig.twoFlagsSecondUrl = getFlagUrl(designConfig.leftSleeveFlag2);
        }

        return {
          product_type: type,
          selectedColor: options.selectedColor,
          selectedSize: options.selectedSize,
          design_config: designConfig
        };
      });

      // Extract logo_id from any configured garment's pressureOptions
      let logo_id = null;
      for (const [, options] of configuredEntries) {
        if (options.pressureOptions?.selectedLogoId) {
          logo_id = options.pressureOptions.selectedLogoId;
          break;
        }
      }

      // Submit order first
      const saveResponse = await placeOrder({
        student_id: studentId,
        class_id: classId,
        garments,
        delivery_details: customerDetails,
        logo_id
      });

      if (!saveResponse.data?.success) {
        throw new Error(saveResponse.data?.message || "Failed to submit order. Please try again.");
      }

      const savedOrderId = saveResponse.data?.data?.orderId || existingOrderId;
      const balanceDueFromServer = parseFloat(saveResponse.data?.data?.balance_due || 0);

      // ── Always redirect to payment immediately ──
      // First order: pay full amount now
      // Edit-window addition: pay the balance_due for extra products
      if (balanceDueFromServer > 0 && savedOrderId) {
        try {
          const payRes = await createCheckoutSession({ orderId: savedOrderId });
          if (payRes.data?.url) {
            window.location.href = payRes.data.url;
            return;
          }
          if (payRes.data?.no_payment_needed) {
            setOrderComplete(true);
            setIsLoading(false);
            return;
          }
        } catch (payErr) {
          console.error("Payment redirect failed:", payErr);
          message.warning("Order saved. Please use the 'Pay Balance' button to complete payment.");
        }
      }

      // balance_due = 0 — no payment needed, show thank you
      setOrderComplete(true);
      setIsLoading(false);

    } catch (error) {
      console.error("Error submitting order:", error);
      if (error.response?.data?.message) {
        if (error.response.status === 403) {
          onClose?.();
        }
        message.error(error.response.data.message);
      } else if (error.message) {
        message.error(error.message);
      } else {
        message.error("An unexpected error occurred. Please try again.");
      }
      setIsLoading(false);
    }
  };

  // Reset modal to initial state
  const handleResetModal = () => {
    setCurrentStep(0);
    setIsLoading(false);
    setOrderComplete(false);
    setCustomerDetails({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      Skolenavn: '',
      address: '',
      city: '',
      postalCode: '',
      country: 'Denmark',
      notes: ''
    });
  };

  const handleTabClick = (index) => {
    if (index === currentStep) return;

    if (index > 0) {
      if (Object.values(selectedGarments).every(v => !v)) {
        message.error('Please select at least one garment.');
        return;
      }
    }

    if (index > 1) {
      if (!validateCustomerDetails()) {
        message.error('Please fill in all required fields.');
        return;
      }
    }

    setCurrentStep(index);
  };


  // Step 1: Quote Review (Original content)
  const renderQuoteReview = () => (
    <div className="overflow-y-auto px-6 py-6 space-y-8 custom-scrollbar-premium">
      {/* ✨ NEW: Selection Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <Package className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="font-bold text-blue-900 text-sm mb-1">Vælg de varer, du vil købe</h4>
            <p className="text-blue-700 text-xs">
              Klik på afkrydsningsfeltet på hvert produktkort for at vælge eller fravælge varer til din ordre. Prisen opdateres automatisk ud fra dit valg.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {Object.entries(selectedOptions).map(([category, options], categoryIndex) => {
          const filteredOptions = filterOptions(options);

          if (Object.keys(filteredOptions).length === 0) return null;

          const isSelected = selectedGarments[category] || false;
          const isLockedItem = existingProductTypes.includes(category);
          const garmentPrice = GARMENT_PRICES[category] || 0;

          return (
            <div
              key={category}
              className={`bg-white rounded-3xl p-6 shadow-sm border-2 transition-all duration-500 group overflow-hidden relative ${isLockedItem ? 'cursor-not-allowed' : 'cursor-pointer'} ${isSelected
                ? 'border-green-500 shadow-xl shadow-green-200/50'
                : 'border-slate-200 hover:border-slate-300 opacity-60'
                }`}
              onClick={() => toggleGarmentSelection(category)}
            >
              {/* ✨ NEW: Selection Checkbox */}
              <div className="absolute top-4 right-4 z-20">
                <div className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all ${isSelected
                  ? 'bg-green-600 border-green-600'
                  : 'bg-white border-slate-300'
                  }`}>
                  {isSelected && <CheckCircle className="w-5 h-5 text-white" />}
                </div>
              </div>

              {/* Background Accent */}
              <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 transition-colors duration-500 ${isSelected ? 'bg-green-50' : 'bg-slate-50'
                }`}></div>

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6 pr-10">
                  <div className="flex items-center space-x-4">
                    {(() => {
                      const Icon = getGarmentIcon(category);
                      return (
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg transform group-hover:rotate-6 transition-all duration-500 ${isSelected
                          ? 'bg-gradient-to-br from-green-500 to-green-600 shadow-green-200'
                          : 'bg-gradient-to-br from-slate-400 to-slate-500 shadow-slate-200'
                          }`}>
                          <Icon className="w-5.5 h-5.5 text-white" />
                        </div>
                      );
                    })()}
                    <div>
                      <h3 className="text-lg font-bold text-slate-800 capitalize tracking-tight">
                        {category.replace(/([A-Z])/g, ' $1').trim()}
                      </h3>
                      <p className="text-xs text-slate-500 font-medium">Custom Configuration</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <div className={`px-3 py-1 text-[10px] font-bold rounded-full border uppercase tracking-widest ${isSelected
                      ? 'bg-green-50 text-green-700 border-green-100'
                      : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>
                      {isLockedItem ? 'Already Purchased' : isSelected ? 'Selected' : 'Not Selected'}
                    </div>
                    <div className="text-right">
                      <span className={`text-xl font-bold ${isSelected ? 'text-green-600' : 'text-slate-400'}`}>
                        {garmentPrice}
                      </span>
                      <span className={`text-xs font-semibold ml-1 ${isSelected ? 'text-green-600' : 'text-slate-400'}`}>
                        DKK
                      </span>
                    </div>
                  </div>
                </div>

                {/* Area items — original grid layout, sirf image walon mein dropdown */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
                  {Object.entries(filteredOptions).map(([key, value]) => {
                    const imgUrl = getOptionImageUrl(category, key, value, options);
                    const hasImage = !!imgUrl;
                    const areaId = `${category}-${key}`;
                    const isExpanded = expandedAreaKey === areaId;

                    return (
                      <div
                        key={key}
                        className={`group/item relative flex flex-col p-3 bg-slate-50/50 rounded-2xl border transition-all duration-300 ${hasImage
                          ? 'border-green-200 hover:bg-white hover:shadow-md cursor-pointer'
                          : 'border-transparent'
                          }`}
                        onClick={(e) => {
                          if (hasImage) {
                            e.stopPropagation();
                            toggleAreaExpand(areaId);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5 group-hover/item:text-green-600 transition-colors">
                              {key.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                            <span className="text-xs font-bold text-slate-700 group-hover/item:text-slate-900 transition-colors truncate">
                              {formatValue(value, category, key)}
                            </span>
                          </div>

                          {/* Dropdown arrow — sirf image walon pe */}
                          {hasImage && (
                            <button
                              type="button"
                              className="p-1 rounded-lg hover:bg-slate-200/50 transition-colors ml-2 flex-shrink-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleAreaExpand(areaId);
                              }}
                            >
                              <ChevronDown
                                className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-green-600' : ''
                                  }`}
                              />
                            </button>
                          )}
                        </div>

                        {/* Image — sirf is item ka open hone par */}
                        {hasImage && isExpanded && (
                          <div
                            className="mt-3 p-2 bg-white rounded-xl border border-slate-100 flex items-center justify-center animate-in slide-in-from-top-2 duration-200"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <img
                              src={imgUrl}
                              alt={value}
                              className="max-h-24 object-contain rounded-lg shadow-sm"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src = 'https://via.placeholder.com/100?text=Error';
                              }}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ✨ NEW: No items selected warning */}
      {Object.values(selectedGarments).every(v => !v) && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mt-6">
          <div className="flex items-start gap-3">
            <X className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-bold text-red-900 text-sm mb-1">No Items Selected</h4>
              <p className="text-red-700 text-xs">
                Please select at least one garment to continue with your order.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Step 2: Customer Details Form
  // Step 2: Customer Details Form
  const renderCustomerDetails = () => {
    const handleKeyPress = (e, currentFieldName) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const currentIndex = refOrder.findIndex(ref => ref.current?.name === currentFieldName);
        if (currentIndex >= 0 && currentIndex < refOrder.length - 1) {
          refOrder[currentIndex + 1].current?.focus();
        } else if (currentIndex === refOrder.length - 1) {
          if (validateCustomerDetails()) {
            setCurrentStep(prev => prev + 1);
          }
        }
      }
    };

    const inputClasses = "w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-green-500/10 focus:border-green-500 focus:bg-white transition-all duration-300 outline-none text-slate-700 text-xs font-medium placeholder:text-slate-400 shadow-sm";
    const labelClasses = "block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-widest ml-1";

    return (
      <div className="overflow-y-auto px-6 py-6 space-y-8 custom-scrollbar-premium">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* First Name */}
              <div>
                <label className={labelClasses}>Fornavn *</label>
                <input
                  ref={refs.firstName}
                  name="firstName"
                  type="text"
                  value={customerDetails.firstName || ""}
                  onChange={(e) => handleInputChange("firstName", e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, "firstName")}
                  className={inputClasses}
                  placeholder="Indtast dit fornavn"
                />
              </div>

              {/* Last Name */}
              <div>
                <label className={labelClasses}>Efternavn *</label>
                <input
                  ref={refs.lastName}
                  name="lastName"
                  type="text"
                  value={customerDetails.lastName || ""}
                  onChange={(e) => handleInputChange("lastName", e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, "lastName")}
                  className={inputClasses}
                  placeholder="Indtast dit efternavn"
                />
              </div>

              {/* Email Address */}
              <div>
                <label className={labelClasses}>E-mail-adresse *</label>
                <input
                  ref={refs.email}
                  name="email"
                  type="email"
                  value={customerDetails.email || ""}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, "email")}
                  className={inputClasses}
                  placeholder="name@example.com"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className={labelClasses}>Telefonnummer *</label>
                <input
                  ref={refs.phone}
                  name="phone"
                  type="tel"
                  value={customerDetails.phone || ""}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, "phone")}
                  className={inputClasses}
                  placeholder="+45 00 00 00 00"
                />
              </div>

              {/* School Name */}
              {/* <div>
                <label className={labelClasses}>Skolens navn *</label>
                <input
                  ref={refs.Skolenavn}
                  name="Skolenavn"
                  type="text"
                  value={customerDetails.Skolenavn || ""}
                  onChange={(e) => handleInputChange("Skolenavn", e.target.value)}
                  onKeyPress={(e) => handleKeyPress(e, "Skolenavn")}
                  className={inputClasses}
                  placeholder="f.eks. Copenhagen High"
                />
              </div> */}

              {/* <div className="flex flex-col justify-end">
                <label className={labelClasses}>Leveringssted</label>
                <div
                  onClick={() => handleInputChange("deliverToSchool", !customerDetails.deliverToSchool)}
                  className={`flex items-center justify-between px-5 py-3 rounded-full border-2 cursor-pointer transition-all duration-300 ${customerDetails.deliverToSchool
                    ? 'border-green-600 bg-green-50/30'
                    : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${customerDetails.deliverToSchool ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700">Levering til skoleområdet</p>
                      <p className="text-[10px] text-slate-400 font-medium">Sparer fragt- og leveringsomkostninger</p>
                    </div>
                  </div>
                  <div className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${customerDetails.deliverToSchool ? 'bg-green-600' : 'bg-slate-200'}`}>
                    <div className={`bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-300 transform ${customerDetails.deliverToSchool ? 'translate-x-4' : 'translate-x-0'}`}></div>
                  </div>
                </div>
              </div> */}

              {/* {!customerDetails.deliverToSchool ? (
              <>
                <div className="md:col-span-2">
                  <label className={labelClasses}>Gadeadresse *</label>
                  <input
                    ref={refs.address}
                    name="address"
                    type="text"
                    value={customerDetails.address || ""}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, "address")}
                    className={inputClasses}
                    placeholder=""
                  />
                </div>

                <div>
                  <label className={labelClasses}>By *</label>
                  <input
                    ref={refs.city}
                    name="city"
                    type="text"
                    value={customerDetails.city || ""}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, "city")}
                    className={inputClasses}
                    placeholder="f.eks. København"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClasses}>Postnummer *</label>
                    <input
                      ref={refs.postalCode}
                      name="postalCode"
                      type="text"
                      value={customerDetails.postalCode || ""}
                      onChange={(e) => handleInputChange("postalCode", e.target.value)}
                      onKeyPress={(e) => handleKeyPress(e, "postalCode")}
                      className={inputClasses}
                      placeholder="0000"
                    />
                  </div>
                  <div>
                    <label className={labelClasses}>Land</label>
                    <select
                      ref={refs.country}
                      name="country"
                      value={customerDetails.country || "Denmark"}
                      onChange={(e) => handleInputChange("country", e.target.value)}
                      onKeyPress={(e) => handleKeyPress(e, "country")}
                      className={`${inputClasses} appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%20stroke%3D%22currentColor%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22M6%208l4%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat`}
                    >
                      {shippingLoading ? (
                        <option>Loading...</option>
                      ) : shippingRates.length > 0 ? (
                        shippingRates.map(r => (
                          <option key={r.id} value={r.country_name}>{r.country_name}</option>
                        ))
                      ) : (
                        <>
                          <option value="Denmark">Denmark</option>
                          <option value="Sweden">Sweden</option>
                          <option value="Norway">Norway</option>
                          <option value="Germany">Germany</option>
                          <option value="Other">Other</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>
              </>
            ) : (
              <div className="md:col-span-2 bg-green-50 border border-green-200 rounded-2xl p-4 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-bold text-green-950 text-xs mb-0.5">Samlet klasselevering er valgt</h4>
                  <p className="text-green-700 text-[11px] leading-relaxed">
                    Dine varer vil blive leveret samlet i én pakke til klassens leveringsadresse, som sættes af din klasserepræsentant. Du skal ikke betale individuel fragt.
                  </p>
                </div>
              </div>
            )} */}
            </div>

            {/* {!customerDetails.deliverToSchool && (
              <div className="pt-6 border-t border-slate-100">
                <label className={labelClasses}>Leveringspræference</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <button
                    onClick={() => handleInputChange("deliveryType", "regular")}
                    className={`flex items-center px-6 py-3 rounded-full border-2 transition-all duration-300 text-left ${customerDetails.deliveryType === "regular" ? 'border-green-600 bg-green-50/50 shadow-md' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 flex-shrink-0 transition-colors ${customerDetails.deliveryType === "regular" ? 'border-green-600 bg-green-600' : 'border-slate-300 bg-white'}`}>
                      {customerDetails.deliveryType === "regular" && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Regelmæssig levering</p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        {(() => { const r = shippingRates.find(x => x.country_name.toLowerCase() === (customerDetails.country || '').toLowerCase()); return r ? `${r.regular_delivery_rate} DKK — Est. 6 weeks` : 'Est. 6 weeks'; })()}
                      </p>
                    </div>
                  </button>
                  <button
                    onClick={() => handleInputChange("deliveryType", "express")}
                    className={`flex items-center px-6 py-3 rounded-full border-2 transition-all duration-300 text-left ${customerDetails.deliveryType === "express" ? 'border-green-600 bg-green-50/50 shadow-md' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mr-3 flex-shrink-0 transition-colors ${customerDetails.deliveryType === "express" ? 'border-green-600 bg-green-600' : 'border-slate-300 bg-white'}`}>
                      {customerDetails.deliveryType === "express" && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Ekspresprioritet</p>
                      <p className="text-[10px] text-slate-500 font-medium">
                        {(() => { const r = shippingRates.find(x => x.country_name.toLowerCase() === (customerDetails.country || '').toLowerCase()); return r ? `${r.express_delivery_rate} DKK — Est. 3 weeks` : 'Est. 3 weeks'; })()}
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            )} */}

            {/* Notes */}
            <div className="pt-6 border-t border-slate-100">
              <label className={labelClasses}>Bemærkninger til ordren (valgfrit)</label>
              <textarea
                ref={refs.notes}
                name="notes"
                value={customerDetails.notes || ""}
                onChange={(e) => handleInputChange("notes", e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, "notes")}
                rows={3}
                className={`${inputClasses} resize-none min-h-[100px]`}
                placeholder="Er der nogen særlige ønsker eller bemærkninger til din bestilling..."
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Step 3: Order Confirmation
  const renderOrderConfirmation = () => (
    <div className="overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar-premium">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Customer Details Summary */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 group hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 group-hover:bg-blue-50 transition-colors duration-500"></div>

          <div className="relative z-10">
            <div className="flex items-center space-x-3 mb-5">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 tracking-tight">Leveringsoplysninger</h3>
                <p className="text-xs text-slate-500 font-medium">Bekræft dine oplysninger</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
              <div className="space-y-3">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Kundens navn</span>
                  <span className="text-xs font-bold text-slate-700">{customerDetails.firstName} {customerDetails.lastName}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">E-mail-kontakt</span>
                  <span className="text-xs font-bold text-slate-700">{customerDetails.email}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Telefonnummer</span>
                  <span className="text-xs font-bold text-slate-700">{customerDetails.phone}</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Leveringsadresse (klasse)</span>
                  {classDeliveryDetails?.address ? (
                    <span className="text-xs font-bold text-slate-700 leading-relaxed">
                      {classDeliveryDetails.address}<br />
                      {classDeliveryDetails.zip} {classDeliveryDetails.city}<br />
                      {classDeliveryDetails.country}
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-slate-400 italic">Ikke angivet af klasserepræsentant endnu</span>
                  )}
                </div>
                {customerDetails.Skolenavn && (
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Uddannelsesinstitution</span>
                    <span className="text-xs font-bold text-slate-700">{customerDetails.Skolenavn}</span>
                  </div>
                )}
              </div>
            </div>

            {customerDetails.notes && (
              <div className="mt-6 pt-5 border-t border-slate-100">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Særlige anvisninger</span>
                <p className="text-xs font-medium text-slate-600 bg-slate-50 p-3 rounded-xl italic">"{customerDetails.notes}"</p>
              </div>
            )}
          </div>
        </div>

        {/* Product Configuration Summary */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 group hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 group-hover:bg-green-50 transition-colors duration-500"></div>

          <div className="relative z-10">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-200">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 tracking-tight">Konfigurationsoversigt</h3>
                <p className="text-xs text-slate-500 font-medium">Tøjvarer i din ordre</p>
              </div>
            </div>

            <div className="space-y-4">
              {Object.entries(selectedOptions).filter(([category]) => selectedGarments[category]).map(([category, options]) => {
                const filteredOptions = filterOptions(options);
                if (Object.keys(filteredOptions).length === 0) return null;

                return (
                  <div key={category} className="bg-slate-50/50 rounded-[1.5rem] p-4 border border-slate-100 hover:bg-white hover:border-green-100 transition-all duration-300">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-slate-800 text-xs capitalize flex items-center">
                        <div className="w-1 h-3.5 bg-green-500 rounded-full mr-2"></div>
                        {category.replace(/([A-Z])/g, ' $1').trim()}
                      </h4>
                      <span className="text-sm font-bold text-green-600">
                        {GARMENT_PRICES[category]} DKK
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-3 gap-x-8">
                      {Object.entries(filteredOptions).map(([key, value]) => (
                        <div key={key} className="flex flex-col">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                          <span className="text-[11px] font-semibold text-slate-700">{formatValue(value, category, key)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Price Summary */}
        <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 group hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 group-hover:bg-blue-50 transition-colors duration-500"></div>

          <div className="relative z-10">
            <div className="flex items-center space-x-3 mb-5">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800 tracking-tight">Samlet beløb for ordren</h3>
                <p className="text-xs text-slate-500 font-medium">Endelig prisoversigt</p>
              </div>
            </div>

            <div className="bg-slate-50/50 rounded-[1.5rem] p-5 border border-slate-100 space-y-3.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-600">Mellemotal</span>
                <span className="text-sm font-bold text-slate-800">{subtotal} DKK</span>
              </div>
              {vatPct > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-600">VAT ({vatPct}% inkluderet)</span>
                  <span className="text-sm font-bold text-slate-800">{vatAmount} DKK</span>
                </div>
              )}
              {shippingRate > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-600">
                    Forsendelse ({classDeliveryDetails?.shippingOption === 'express' ? 'Express' : 'Regular'} — 1/{classStudentCount} of class, {classDeliveryDetails?.country})
                  </span>
                  <span className="text-sm font-bold text-slate-800">{shippingRate} DKK</span>
                </div>
              )}
              {handlingFeePerStudent > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-slate-600">
                    Ekspeditionsgebyr (1/{classStudentCount} of class)
                  </span>
                  <span className="text-sm font-bold text-slate-800">{handlingFeePerStudent} DKK</span>
                </div>
              )}
              <div className="border-t border-slate-200 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-800">Total</span>
                  <span className="text-lg font-bold text-green-600">{totalWithVat.toFixed(2)} DKK</span>
                </div>
              </div>
              {amountPaid > 0 && (
                <>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-green-600">Allerede betalt beløb</span>
                    <span className="text-sm font-bold text-green-600">-{amountPaid} DKK</span>
                  </div>
                  <div className="border-t border-slate-200 pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-slate-800">Restbeløb</span>
                      <span className="text-lg font-bold text-orange-600">{computedBalanceDue} DKK</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── Existing order payment breakdown (per-product paid/unpaid) ── */}
        {paymentBreakdown && existingOrderId && (
          <PaymentBreakdown
            orderId={existingOrderId}
            processStatus={processStatus}
            totalAmount={paymentBreakdown.total_amount}
            amountPaid={paymentBreakdown.amount_paid}
            balanceDue={paymentBreakdown.balance_due}
            paidProducts={paymentBreakdown.paid_products}
            unpaidProducts={paymentBreakdown.unpaid_products}
            editWindowOpen={paymentBreakdown.edit_window_open}
            editDeadline={editDeadline}
            editInfo={`Edit: ${formatDate(editDeadline)} ${new Date() > new Date(editDeadline) ? '· Expired' : ''}`}
            onPayNow={onPayNow}
            loading={isPayingBalance}
          />
        )}

        {/* ── Payment redirect notice ── */}
        <div className={`rounded-2xl p-4 border flex items-start gap-3 ${computedBalanceDue > 0
          ? 'bg-green-50 border-green-200'
          : 'bg-slate-50 border-slate-200'
          }`}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 bg-green-100">
            <CreditCard className="w-4 h-4 text-green-600" />
          </div>
          <div>
            {computedBalanceDue > 0 ? (
              <>
                <p className="text-sm font-bold text-green-800">
                  Hvis du klikker på »Godkend og betal«, bliver du omdirigeret til en sikker betalingsside
                </p>
                <p className="text-xs text-green-700 mt-1">
                  Du skal betale <span className="font-bold">{computedBalanceDue} DKK</span> nu via Stripe.
                  Efter betaling åbnes dit redigeringsvindue, indtil {formatDate(editDeadline)} — Du kan til enhver tid tilføje flere produkter. Hvert yderligere produkt kræver en separat betaling.
                </p>
              </>
            ) : (
              <p className="text-sm font-semibold text-slate-600">
                No payment needed — your order is already fully paid.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
  const renderThankYouPage = () => (
    <div className="overflow-y-auto px-6 py-12 custom-scrollbar-premium">
      <div className="max-w-xl mx-auto text-center space-y-8">
        <div className="relative inline-block">
          <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full scale-150 animate-pulse"></div>
          <div className="relative w-24 h-24 bg-gradient-to-br from-green-500 to-green-700 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-green-200 animate-in bounce-in duration-1000">
            <CheckCircle className="w-12 h-12 text-white" />
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-4xl font-black text-slate-800 tracking-tight">Bestillingen er bekræftet!</h2>
          <p className="text-slate-500 font-medium text-lg leading-relaxed">
            Din ordre er modtaget, og betalingen er gennemført.
          </p>
        </div>

        {/* Info cards — correct flow */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          <div className="bg-green-50 border border-green-100 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 bg-green-100 rounded-xl flex items-center justify-center">
                <Check className="w-4 h-4 text-green-600" />
              </div>
              <span className="text-xs font-bold text-green-700 uppercase tracking-wide">Betaling gennemført</span>
            </div>
            <p className="text-sm font-semibold text-slate-700">
              Din betaling er blevet gennemført.
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 bg-blue-100 rounded-xl flex items-center justify-center">
                <History className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Redigeringsvindue</span>
            </div>
            <p className="text-sm font-semibold text-slate-700">
              Du kan stadig tilføje produkter indtil den <span className="text-blue-600 font-bold">frist for aflevering af opgaven</span>. Hvert nyt produkt kræver en separat betaling.
            </p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-[2rem] p-8 border border-white shadow-inner">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Bekræftelsesnummer</span>
          <p className="text-2xl font-black text-slate-800 tracking-tight font-mono">{orderDate}</p>
          <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-center space-x-2">
            <Mail className="w-4 h-4 text-green-600" />
            <span className="text-xs font-bold text-slate-500">Bekræftelse sendt til {customerDetails.email}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 pt-4">
          <button
            onClick={() => {
              handleResetModal();
              navigate(-1)
              // window.location.href = "https://shop.studentlife.dk/homepage-duplicate-95/";
              onClose();
            }}
            className="flex-1 flex items-center justify-center px-8 py-5 bg-white border border-slate-200 rounded-2xl text-slate-700 font-bold hover:bg-slate-50 hover:border-slate-300 transition-all duration-300 shadow-sm transform active:scale-95"
          >
            <ShoppingCart className="w-5 h-5 mr-3" />
            Fortsæt med at handle
          </button>

          <button
            onClick={() => {
              handleResetModal();
              if (onContinueConfiguring) onContinueConfiguring();
              onClose();
            }}
            className="flex-1 flex items-center justify-center px-8 py-5 bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-2xl font-bold hover:from-black hover:to-slate-800 transition-all duration-300 shadow-xl shadow-slate-200 transform active:scale-95"
          >
            <Settings className="w-5 h-5 mr-3" />
            Skift design
          </button>
        </div>
      </div>
    </div>
  );
  // Get step content
  const getStepContent = () => {
    if (orderComplete) {
      return renderThankYouPage();
    }

    switch (currentStep) {
      case 0:
        return renderQuoteReview();
      case 1:
        return renderCustomerDetails();
      case 2:
        return renderOrderConfirmation();
      default:
        return renderQuoteReview();
    }
  };

  // Get step icon
  const getStepIcon = (step) => {
    if (orderComplete) return CheckCircle;

    switch (step) {
      case 0:
        return Package;
      case 1:
        return User;
      case 2:
        return CreditCard;
      default:
        return Package;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-6 animate-in fade-in duration-300">
      <div className="bg-white/95 backdrop-blur-xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-[0_25px_60px_-15px_rgba(0,0,0,0.35)] border border-slate-100 rounded-[2rem] overflow-hidden animate-in slide-in-from-bottom duration-500">
        {/* Modal Header with Step Indicator */}
        <div className="relative bg-white border-b border-slate-100 p-6 z-10">
          <div className="relative">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg shadow-green-100">
                  {React.createElement(getStepIcon(currentStep), { className: "w-5 h-5 text-white" })}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-800 tracking-tight">
                    {orderComplete ? 'Order Complete' : steps[currentStep]}
                  </h2>
                  {!orderComplete && (
                    <p className="text-slate-400 text-[11px] mt-0.5 font-medium">
                      Indstil detaljer, bekræft leveringsoplysninger og gennemfør købet sikkert
                    </p>
                  )}
                </div>
              </div>
              {!orderComplete && (
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-all duration-200 hover:scale-105 group border border-slate-100"
                >
                  <X className="w-4 h-4 text-slate-400 group-hover:text-slate-600" />
                </button>
              )}
            </div>

            {/* Step Progress Indicator - Only show if not on thank you page */}
            {!orderComplete && (
              <div className={`grid gap-4 pt-4 border-t border-slate-100`} style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
                {steps.map((step, index) => {
                  const Icon = getStepIcon(index);
                  const isActive = index === currentStep;
                  const isCompleted = index < currentStep;
                  const isClickable = true; // Handled dynamically in handleTabClick

                  return (
                    <div
                      key={step}
                      onClick={() => handleTabClick(index)}
                      className={`flex items-center gap-3 p-2.5 rounded-2xl border cursor-pointer transition-all duration-300 active:scale-[0.98] ${isActive
                        ? 'bg-green-50/50 border-green-200 shadow-sm'
                        : 'border-transparent hover:bg-slate-50/70'
                        }`}
                    >
                      <div className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${isActive
                        ? 'bg-green-600 text-white shadow-md shadow-green-200'
                        : isCompleted
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-400'
                        }`}>
                        {isCompleted ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                      </div>
                      <div className="hidden sm:block">
                        <p className={`text-[11px] font-bold leading-none ${isActive ? 'text-green-800' : isCompleted ? 'text-slate-700' : 'text-slate-400'}`}>
                          {step}
                        </p>
                        <p className="text-[9px] text-slate-400 mt-1 font-medium">
                          {index === 0 ? 'Review Config' : index === 1 ? 'Shipping Details' : 'Verify & Submit'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Content */}
        <div className="flex-1 overflow-auto">
          {getStepContent()}
        </div>

        {/* Enhanced Compact Footer */}
        {!orderComplete && (
          <div className="bg-slate-50 border-t border-slate-100 p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Price / Status info */}
            <div className="flex items-center gap-4">
              <div className="bg-green-50 border border-green-100 rounded-2xl px-4 py-2.5 flex items-center gap-3">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block leading-none mb-1">
                    {computedBalanceDue > 0 && amountPaid > 0 ? 'BALANCE DUE' : 'ORDER TOTAL'}
                  </span>
                  <span className="text-lg font-extrabold text-slate-800 leading-none">
                    {computedBalanceDue <= 0
                      ? (paymentStatus === 'paid' ? '  PAID' : 'FREE')
                      : `${computedBalanceDue} DKK`
                    }
                  </span>
                </div>
              </div>

              {(editDeadline || isLocked) && (
                <div className={`hidden lg:flex items-center text-[11px] font-bold px-3 py-1.5 rounded-xl border ${isLocked ? 'text-red-700 bg-red-50 border-red-100' : 'text-amber-700 bg-amber-50 border-amber-100'}`}>
                  <History className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
                  {isLocked ? 'Order locked' : `Edit window: ${formatDate(editDeadline)}`}
                </div>
              )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {currentStep > 0 ? (
                <button
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  className="flex items-center justify-center px-5 py-3 border border-slate-200 bg-white rounded-xl text-slate-700 font-bold text-sm hover:border-slate-300 hover:bg-slate-50 transition-all duration-200"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </button>
              ) : (
                <button
                  onClick={onClose}
                  className="px-5 py-3 border border-slate-200 bg-white rounded-xl text-slate-600 font-bold text-sm hover:border-slate-300 hover:bg-slate-50 transition-all duration-200"
                >
                  Fortsæt med at designe
                </button>
              )}

              {currentStep < steps.length - 1 ? (
                <button
                  onClick={() => {
                    if (currentStep === 0 && Object.values(selectedGarments).every(v => !v)) {
                      message.error('Please select at least one garment to continue.');
                      return;
                    }
                    if (currentStep === 1 && !validateCustomerDetails()) {
                      message.error('Please fill in all required fields.');
                      return;
                    }
                    setCurrentStep(prev => prev + 1);
                  }}
                  className="flex-1 sm:flex-none flex items-center justify-center bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-6 rounded-xl font-bold text-sm hover:from-green-700 hover:to-green-800 transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  Fortsæt
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              ) : (
                /* Final step — places order then immediately redirects to Stripe */
                <button
                  onClick={handleConfirmOrder}
                  disabled={isLoading || isLocked}
                  className="flex-1 sm:flex-none flex items-center justify-center bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-7 rounded-xl font-bold text-sm hover:from-green-700 hover:to-green-800 transition-all duration-300 shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLocked ? (
                    'Order Locked'
                  ) : isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Omdirigerer til betaling...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Godkend og betal
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuoteModal;
