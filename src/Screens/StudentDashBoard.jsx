// StudentDashboard.jsx (full fixed code with iframe src fixed to use null instead of empty string)
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { message, Tag } from 'antd';
import img1 from '../assets/menuimages/1.png';
import img2 from '../assets/menuimages/2.png';
import img3 from '../assets/menuimages/3.png';
import img4 from '../assets/menuimages/4.png';
import img5 from '../assets/menuimages/5.png';
import img6 from '../assets/menuimages/6.png';
// import img10 from '../assets/logo.jpeg';
import Tshirt from '../Components/Tshirt';
import Hoodie from '../Components/Hoodie';
import ZippedHoodie from '../Components/ZippedHoodie';
import Shorts from '../Components/Shorts';
import SweatPants from '../Components/SweatPants';
import SweatShirt from '../Components/SweatShirt';
import QuoteModal from '../Components/Modal';
import HistoryModal from '../Components/HistoryModal';
import { useParams, useSearchParams } from 'react-router-dom';
import { GraduationCap, ChevronUp, ChevronDown, LogOut, Settings, LayoutGrid, Lock, History, Package } from 'lucide-react';
import StudentPopup from '../Components/Popup';
import useLogoStore from '../store/logoStore';
import { useAuth } from '../context/AuthContext';
import { getMyOrder, getMyOrderHistory, placeOrder, unlockOrder, lockOrder, deleteHistory } from '../api/api';
import useSocket from '../hooks/useSocket';

const StudentDashboard = ({ customizations, setCustomizations, setShowBackPopup /*, setShowBackTextPopup */ }) => { // COMMENTED: Back text feature disabled
    const { logout } = useAuth();

    // 1. Move Constants & Logic to top
    const DEFAULT_SELECTIONS = {
        'T-SHIRT': {
            selectedColor: 'Red',
            selectedSize: '',
            pressureOptions: {
                rightChestText: '', rightChestFlag: '', rightChestLogoPredefined: '', rightChestLogoCustom: '', rightChestType: '',
                leftChestText: '', leftChestFlag: '', leftChestLogoPredefined: '', leftChestLogoCustom: '', leftChestType: '',
                rightSleeveText: '', rightSleeveFlag: '', rightSleeveLogoPredefined: '', rightSleeveLogoCustom: '', rightSleeveType: '',
                leftSleeveText: '', leftSleeveFlag: '', leftSleeveLogoPredefined: '', leftSleeveLogoCustom: '', leftSleeveType: '',
                backDesign: null,
            }
        },
        'SWEATSHIRT': {
            selectedColor: 'Red',
            selectedSize: '',
            pressureOptions: {
                rightChestText: '', rightChestFlag: '', rightChestLogoPredefined: '', rightChestLogoCustom: '', rightChestType: '',
                leftChestText: '', leftChestFlag: '', leftChestLogoPredefined: '', leftChestLogoCustom: '', leftChestType: '',
                rightSleeveText: '', rightSleeveFlag: '', rightSleeveLogoPredefined: '', rightSleeveLogoCustom: '', rightSleeveType: '',
                leftSleeveText: '', leftSleeveFlag: '', leftSleeveLogoPredefined: '', leftSleeveLogoCustom: '', leftSleeveType: '',
                backDesign: null,
            }
        },
        'HOODIE': {
            selectedColor: 'Red',
            selectedSize: '',
            pressureOptions: {
                rightChestText: '', rightChestFlag: '', rightChestLogoPredefined: '', rightChestLogoCustom: '', rightChestType: '',
                leftChestText: '', leftChestFlag: '', leftChestLogoPredefined: '', leftChestLogoCustom: '', leftChestType: '',
                bottomChestText: '', bottomChestFlag: '', bottomChestLogoPredefined: '', bottomChestLogoCustom: '', bottomChestType: '',
                rightSleeveText: '', rightSleeveFlag: '', rightSleeveLogoPredefined: '', rightSleeveLogoCustom: '', rightSleeveType: '',
                leftSleeveText: '', leftSleeveFlag: '', leftSleeveLogoPredefined: '', leftSleeveLogoCustom: '', leftSleeveType: '',
                backDesign: null,
            }
        },
        'ZIPPERHOODIE': {
            selectedColor: 'Red',
            selectedSize: '',
            pressureOptions: {
                rightChestText: '', rightChestFlag: '', rightChestLogoPredefined: '', rightChestLogoCustom: '', rightChestType: '',
                leftChestText: '', leftChestFlag: '', leftChestLogoPredefined: '', leftChestLogoCustom: '', leftChestType: '',
                rightSleeveText: '', rightSleeveFlag: '', rightSleeveLogoPredefined: '', rightSleeveLogoCustom: '', rightSleeveType: '',
                leftSleeveText: '', leftSleeveFlag: '', leftSleeveLogoPredefined: '', leftSleeveLogoCustom: '', leftSleeveType: '',
                backDesign: null,
            }
        },
        'SWEATPANTS': {
            selectedColor: 'Red',
            selectedSize: '',
            pressureOptions: {
                rightLegText: '', rightLegFlag: '', rightLegLogoPredefined: '', rightLegLogoCustom: '', rightLegType: '',
                leftLegText: '', leftLegFlag: '', leftLegLogoPredefined: '', leftLegLogoCustom: '', leftLegType: '',
            }
        },
        'SHORTS': {
            selectedColor: 'Red',
            selectedSize: '',
            pressureOptions: {
                rightLegText: '', rightLegFlag: '', rightLegLogoPredefined: '', rightLegLogoCustom: '', rightLegType: '',
                leftLegText: '', leftLegFlag: '', leftLegLogoPredefined: '', leftLegLogoCustom: '', leftLegType: '',
            }
        }
    };

    const GARMENT_PRICES = {
        'T-SHIRT': 200,
        'SWEATSHIRT': 350,
        'HOODIE': 450,
        'ZIPPERHOODIE': 500,
        'SWEATPANTS': 300,
        'SHORTS': 250
    };

    const isGarmentConfigured = (garmentType, garmentData) => {
        const defaults = DEFAULT_SELECTIONS[garmentType];
        if (!defaults) return true;

        if (garmentData.selectedColor && garmentData.selectedColor !== defaults.selectedColor) return true;
        if (garmentData.selectedSize && garmentData.selectedSize !== defaults.selectedSize) return true;

        const currentPO = garmentData.pressureOptions || {};
        const defaultPO = defaults.pressureOptions || {};

        for (const key of Object.keys(currentPO)) {
            const currentVal = currentPO[key];
            const defaultVal = defaultPO[key];
            if (Array.isArray(currentVal)) {
                if (currentVal.length > 0) return true;
                continue;
            }
            if (currentVal !== null && typeof currentVal === 'object') {
                if (JSON.stringify(currentVal) !== JSON.stringify(defaultVal)) return true;
                continue;
            }
            if (currentVal !== '' && currentVal !== null && currentVal !== undefined && currentVal !== defaultVal) {
                return true;
            }
        }
        return false;
    };

    // 2. State
    const [allSelections, setAllSelections] = useState(DEFAULT_SELECTIONS);
    const [activeMenu, setActiveMenu] = useState('T-SHIRT');
    const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
    const [undoAvailable, setUndoAvailable] = useState(false);
    const [searchParams] = useSearchParams();
    const packageName = searchParams.get("package"); // "standard"
    const program = searchParams.get("program");
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [globalEmblem, setGlobalEmblem] = useState({ name: 'Guld', value: 'Guld', color: '#FCD34D' });
    const [isAppReady, setIsAppReady] = useState(false);
    const [isIframeLoaded, setIsIframeLoaded] = useState(false);
    const [extraCoverReset, setExtraCoverReset] = useState(false)
    const [sizeFlag, setSizeFlag] = useState(true)
    const [errors, setErrors] = useState({});
    const [isLocked, setIsLocked] = useState(false);
    const [deadline, setDeadline] = useState(null);
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [dbHistory, setDbHistory] = useState([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState("");
    const [existingDeliveryDetails, setExistingDeliveryDetails] = useState(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [orderId, setOrderId] = useState(null);
    const [amountPaid, setAmountPaid] = useState(0);
    const [paymentStatus, setPaymentStatus] = useState('unpaid');
    const [editDeadline, setEditDeadline] = useState(null);

    // 3. Derived State
    const calculateTotalPrice = () => {
        let total = 0;
        Object.entries(allSelections).forEach(([type, options]) => {
            if (isGarmentConfigured(type, options)) {
                total += GARMENT_PRICES[type] || 0;
            }
        });
        return total;
    };

    const dynamicPrice = calculateTotalPrice();
    const balanceDue = Math.max(0, dynamicPrice - amountPaid);


    const { logos, loading, fetchLogos } = useLogoStore();
    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;
    const school_id = user?.school_id;

    // --- Real-time Socket Updates ---
    const userId = user?.id;

    const fetchOrderData = async () => {
        try {
            const resOrder = await getMyOrder();
            if (resOrder.data?.success && resOrder.data.data) {
                const order = resOrder.data.data;
                setOrderId(order.id);
                setIsLocked(order.is_locked);
                setAmountPaid(parseFloat(order.amount_paid || 0));
                setPaymentStatus(order.payment_status || 'unpaid');
                if (order.edit_deadline) setEditDeadline(new Date(order.edit_deadline));
                if (order.class?.change_deadline) setDeadline(new Date(order.class.change_deadline));
                if (order.delivery_details) {
                    const details = typeof order.delivery_details === 'string'
                        ? JSON.parse(order.delivery_details) : order.delivery_details;
                    setExistingDeliveryDetails(details);
                }
                if (order.order_items?.length > 0) {
                    const newSelections = JSON.parse(JSON.stringify(DEFAULT_SELECTIONS));
                    order.order_items.forEach(item => {
                        const type = item.product_type;
                        if (newSelections[type]) {
                            newSelections[type].selectedColor = item.selectedColor;
                            newSelections[type].selectedSize = item.selectedSize;
                            newSelections[type].pressureOptions = item.design_config;
                        }
                    });
                    setAllSelections(newSelections);
                    const sName = user?.name || "Student";
                    setCustomizations(prev => ({ ...prev, [sName]: newSelections }));
                    setSelectedStudent(sName);
                }
            }
        } catch (err) {
            console.error("Error re-fetching order:", err);
        }
    };

    const fetchHistoryData = async () => {
        try {
            const resHistory = await getMyOrderHistory();
            if (resHistory.data?.success && resHistory.data.data) {
                setDbHistory(resHistory.data.data);
            }
        } catch (err) {
            console.error("Error re-fetching history:", err);
        }
    };

    // Subscribe to real-time events
    useSocket(
        userId ? `order_update_${userId}` : null,
        `order_update_${userId}`,
        (data) => {
            console.log('🔔 Real-time order update received:', data);
            fetchOrderData();
            fetchHistoryData();
        }
    );

    useSocket(
        userId ? `history_update_${userId}` : null,
        `history_update_${userId}`,
        (data) => {
            console.log('🔔 Real-time history update received:', data);
            fetchHistoryData();
        }
    );

    // --- Fetch Existing Order & History ---
    useEffect(() => {
        if (user && user.role === 'student') {
            fetchOrderData();
            fetchHistoryData();
        }
    }, []);

    useEffect(() => {
        if (user) {
            setIsAdmin(user.role === 'admin' || user.role === 'class_representative');

            const now = new Date();

            // 1. Check Class Deadline
            if (user.class_deadline) {
                const deadlineDate = new Date(user.class_deadline);
                setDeadline(deadlineDate);
                if (now > deadlineDate && user.role === 'student') {
                    setIsLocked(true);
                }
            }

            // 2. Check Post-Payment Edit Deadline (if exists)
            if (editDeadline && now > editDeadline && user.role === 'student' && paymentStatus === 'paid') {
                setIsLocked(true);
            }
        }
    }, [user, editDeadline, paymentStatus]);

    const handleLogout = () => {
        logout();
        window.location.reload();
    };

    const handleChangeMode = () => {
        setMode(null);
        localStorage.removeItem('mode');
    };

    // Jab selected student change ho → uske customizations load karo
    useEffect(() => {
        if (!selectedStudent) return;

        const studentData = customizations[selectedStudent] || DEFAULT_SELECTIONS;
        setAllSelections(studentData);
    }, [selectedStudent, customizations]);

    const handleUpdateSelection = (category, updates) => {
        if (isLocked && !isAdmin) {
            message.warning("Editing is locked after the deadline.");
            return;
        }

        // 1. Update LOCAL state immediately for responsive UI
        setAllSelections(prev => {
            const next = JSON.parse(JSON.stringify(prev));

            // Sync Color with allowed restrictions for bottom wear
            if (updates.selectedColor) {
                const colorValue = updates.selectedColor;
                const allowedShortsColors = ["heather grey", "black", "navy", "white"];
                Object.keys(next).forEach(cat => {
                    if (cat === 'SHORTS' || cat === 'SWEATPANTS') {
                        if (allowedShortsColors.includes(colorValue.toLowerCase())) {
                            next[cat].selectedColor = colorValue;
                        }
                    } else {
                        next[cat].selectedColor = colorValue;
                    }
                });
            }

            // Sync Size across all products
            if (updates.selectedSize) {
                Object.keys(next).forEach(cat => {
                    next[cat].selectedSize = updates.selectedSize;
                });
            }

            // Sync Pressure Options with positional mapping
            if (updates.pressureOptions) {
                const pUpdates = updates.pressureOptions;
                Object.keys(pUpdates).forEach(key => {
                    if (key === 'backDesign') {
                        const val = pUpdates[key];
                        ['T-SHIRT', 'SWEATSHIRT', 'HOODIE', 'ZIPPERHOODIE'].forEach(cat => {
                            if (next[cat]) next[cat].pressureOptions.backDesign = val;
                        });
                        return;
                    }

                    const newValue = pUpdates[key];
                    // Regex for exact position matching to avoid chest/sleeve cross-contamination
                    const match = key.match(/^(rightChest|leftChest|rightSleeve|leftSleeve|bottomChest|rightLeg|leftLeg)(.*)$/);
                    if (match) {
                        const basePos = match[1];
                        const suffix = match[2]; // e.g., "Text", "Flag", "Type"

                        // Map Chest to Leg for unified "side" selection
                        const mapping = {
                            'rightChest': ['rightChest', 'rightLeg'],
                            'leftChest': ['leftChest', 'leftLeg'],
                            'rightLeg': ['rightChest', 'rightLeg'],
                            'leftLeg': ['leftChest', 'leftLeg'],
                            'rightSleeve': ['rightSleeve'],
                            'leftSleeve': ['leftSleeve'],
                            'bottomChest': ['bottomChest']
                        };

                        const targets = mapping[basePos] || [basePos];
                        Object.keys(next).forEach(cat => {
                            targets.forEach(tPos => {
                                const tKey = `${tPos}${suffix}`;
                                if (next[cat].pressureOptions && next[cat].pressureOptions.hasOwnProperty(tKey)) {
                                    next[cat].pressureOptions[tKey] = newValue;
                                }
                            });
                        });
                    }
                });
            }

            // Apply any non-sync updates directly
            Object.keys(updates).forEach(key => {
                if (key !== 'selectedColor' && key !== 'selectedSize' && key !== 'pressureOptions') {
                    next[category][key] = updates[key];
                }
            });

            // 2. Schedule parent state update
            setCustomizations(prevCustom => {
                const updated = { ...prevCustom, [selectedStudent]: next };

                // (BackDesign batch sync removed as multi-student mode is disabled)

                // Save to history for Change Control
                setHistory(h => {
                    const newH = [...h.slice(0, historyIndex + 1), JSON.parse(JSON.stringify(updated))].slice(-10);
                    setHistoryIndex(newH.length - 1);
                    setUndoAvailable(newH.length > 1);
                    return newH;
                });

                return updated;
            });

            return next;
        });
    };

    const handleUndo = () => {
        if (historyIndex > 0) {
            const prevIndex = historyIndex - 1;
            const prevState = history[prevIndex];
            setCustomizations(prevState);
            setAllSelections(prevState[selectedStudent] || DEFAULT_SELECTIONS);
            setHistoryIndex(prevIndex);
            setUndoAvailable(prevIndex > 0);
            message.info("Changes reverted.");
        }
    };

    const handleRevertToVersion = (versionItem) => {
        if (!versionItem.changes) return;

        try {
            // changes usually contains previousItems or similar structure
            // In our paymentController we save { previousItems: existingOrder.order_items }
            // Let's assume versionItem.order_items (from the history list API)
            const items = versionItem.order_items || versionItem.changes.previousItems;

            if (items && Array.isArray(items)) {
                const newSelections = JSON.parse(JSON.stringify(DEFAULT_SELECTIONS));
                items.forEach(item => {
                    const type = item.product_type;
                    if (newSelections[type]) {
                        newSelections[type].selectedColor = item.selectedColor;
                        newSelections[type].selectedSize = item.selectedSize;
                        newSelections[type].pressureOptions = item.design_config;
                    }
                });

                // Update state
                setAllSelections(newSelections);
                setCustomizations(prev => ({
                    ...prev,
                    [selectedStudent]: newSelections
                }));

                // Push to local UNDO history so user can revert this restoration
                setHistory(h => {
                    const updated = { ...customizations, [selectedStudent]: newSelections };
                    const newH = [...h.slice(0, historyIndex + 1), JSON.parse(JSON.stringify(updated))].slice(-10);
                    setHistoryIndex(newH.length - 1);
                    setUndoAvailable(true);
                    return newH;
                });

                message.success(`Restored Version ${versionItem.version}`);
                setIsHistoryModalOpen(false);
            }
        } catch (err) {
            console.error("Error reverting version:", err);
            message.error("Failed to restore this version.");
        }
    };

    const handleSaveOrder = async () => {
        if (isLocked && !isAdmin) {
            message.warning("Order is locked and cannot be saved.");
            return;
        }

        setIsSaving(true);
        try {
            const configuredEntries = Object.entries(allSelections).filter(
                ([type, options]) => isGarmentConfigured(type, options)
            );

            if (configuredEntries.length === 0) {
                message.warning("Please configure at least one garment before saving.");
                setIsSaving(false);
                return;
            }

            const garments = configuredEntries.map(([type, options]) => ({
                product_type: type,
                selectedColor: options.selectedColor,
                selectedSize: options.selectedSize,
                design_config: options.pressureOptions || {}
            }));

            const response = await placeOrder({
                student_id: user?.id,
                class_id: user?.class_id,
                garments,
                delivery_details: existingDeliveryDetails || {},
                logo_id: null
            });

            if (response.data?.success) {
                message.success("Design saved successfully!");
                // Refresh history
                const resHistory = await getMyOrderHistory();
                if (resHistory.data?.success) setDbHistory(resHistory.data.data);
            }
        } catch (err) {
            console.error("Error saving order:", err);
            message.error(err.response?.data?.message || "Failed to save design.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAdminUnlock = async () => {
        if (!orderId) {
            message.error("No order found to unlock.");
            return;
        }
        try {
            const res = await unlockOrder(orderId);
            if (res.data?.success) {
                setIsLocked(false);
                message.success("Order unlocked for student.");
            }
        } catch (err) {
            console.error("Error unlocking order:", err);
            message.error("Failed to unlock order.");
        }
    };
    const menuItems = [
        { name: 'T-SHIRT', icon: img1 },
        { name: 'SWEATSHIRT', icon: img2 },
        { name: 'HOODIE', icon: img3 },
        { name: 'ZIPPERHOODIE', icon: img4 },
        { name: 'SWEATPANTS', icon: img5 },
        { name: 'SHORTS', icon: img6 },
    ];
    // Generic handler for all option changes
    // Function to collect all selected options
    // Force iframe src initialization
    useEffect(() => {
        const playcanvasUrl = 'https://playcanv.as/e/p/1b1eadeb/';
        ['preview-iframe', 'preview-iframe2'].forEach(id => {
            const iframe = document.getElementById(id);
            if (iframe && !iframe.src) iframe.src = playcanvasUrl;
        });
    }, []);

    // Unified message sending logic for Page switching and state synchronization
    useEffect(() => {
        if (!isAppReady) return;

        const menuIndex = menuItems.findIndex(item => item.name === activeMenu);
        if (menuIndex !== -1) {
            ['preview-iframe', 'preview-iframe2'].forEach((id) => {
                const iframe = document.getElementById(id);
                if (iframe?.contentWindow) {
                    const pageNum = menuIndex + 1;
                    console.log(`Sending Page : ${pageNum} for ${activeMenu}`);

                    // 1. Switch Page
                    iframe.contentWindow.postMessage(`Page : ${pageNum}`, "*");
                    iframe.contentWindow.postMessage('Tilvælg:no', "*");

                    // 2. Initial state sync for the new model
                    // We send these with a slight delay to ensure the PlayCanvas app has processed the Page switch
                    setTimeout(() => {
                        const currentData = allSelections[activeMenu];
                        if (currentData) {
                            const { selectedColor, selectedSize } = currentData;

                            const prefixMap = {
                                'T-SHIRT': 'T-Shirt: ',
                                'SWEATSHIRT': 'SweatShirt: ',
                                'HOODIE': 'Hoodie: ',
                                'ZIPPERHOODIE': 'ZipperHoodie: ',
                                'SWEATPANTS': 'SweatPant: ',
                                'SHORTS': 'Short: '
                            };

                            const prefix = prefixMap[activeMenu];
                            if (prefix) {
                                if (selectedColor) iframe.contentWindow.postMessage(`${prefix}${selectedColor.toLowerCase()}`, "*");
                                if (selectedSize) iframe.contentWindow.postMessage(`${prefix}size:${selectedSize}`, "*");
                            }
                        }
                    }, 150);
                }
            });
        }
    }, [activeMenu, isAppReady]);

    useEffect(() => {
        const handleMessage = (event) => {
            if (event.data === 'app:ready') {
                console.log("App Ready signal received in Dashboard");
                setIsAppReady(true);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Jab selected student change ho → uske customizations load karo
    useEffect(() => {
        if (!selectedStudent) return;

        // Ensure customizations has an entry for this student
        if (!customizations[selectedStudent]) {
            setCustomizations(prev => ({
                ...prev,
                [selectedStudent]: DEFAULT_SELECTIONS
            }));
            setAllSelections(DEFAULT_SELECTIONS);
        } else {
            setAllSelections(customizations[selectedStudent]);
        }
    }, [selectedStudent, customizations]);

    return (
        <>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
                {/* Global Header */}
                <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-40">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center shadow-lg shadow-green-200">
                            <GraduationCap className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-slate-900 tracking-tight">StudentLife</h1>
                            <div className="flex items-center space-x-2">
                                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest leading-none">Cloth Configurator</p>
                                {isLocked && (
                                    <Tag color="error" className="flex items-center space-x-1 px-1.5 py-0 rounded border-red-100 h-4">
                                        <Lock className="w-2.5 h-2.5" />
                                        <span className="text-[9px] font-bold uppercase">Locked</span>
                                    </Tag>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2 sm:space-x-4">
                        {undoAvailable && (
                            <button
                                onClick={handleUndo}
                                className="flex items-center space-x-2 px-3 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all font-medium text-sm border border-slate-200"
                                title="Undo last change"
                            >
                                <span className="rotate-180">↺</span>
                                <span className="hidden sm:inline">Undo</span>
                            </button>
                        )}
                        <button
                            onClick={handleSaveOrder}
                            disabled={isSaving || (isLocked && !isAdmin)}
                            className={`flex items-center space-x-2 px-3 py-2 ${isSaving ? 'bg-slate-100' : 'bg-green-600 hover:bg-green-700'} text-white rounded-xl transition-all font-medium text-sm shadow-sm disabled:opacity-50`}
                        >
                            <Settings className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save Design'}</span>
                        </button>
                        {dbHistory.length > 0 && (
                            <button
                                onClick={() => setIsHistoryModalOpen(true)}
                                className="flex items-center space-x-2 px-3 py-2 bg-white text-slate-600 rounded-xl hover:bg-slate-50 transition-all font-medium text-sm border border-slate-200"
                                title="View Saved Versions"
                            >
                                <History className="w-4 h-4 text-green-600" />
                                <span className="hidden sm:inline">History</span>
                            </button>
                        )}
                        <button
                            onClick={() => setShowBackPopup(true)}
                            className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-all font-medium text-sm shadow-md"
                        >
                            <Settings className="w-4 h-4" />
                            <span className="hidden sm:inline">Design Back</span>
                            <span className="sm:hidden text-[10px]">Back</span>
                        </button>
                        {/* COMMENTED: Back text feature disabled */}
                        {/* <button
                            onClick={() => setShowBackTextPopup(true)}
                            className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-indigo-700 text-white rounded-xl hover:bg-indigo-800 transition-all font-medium text-sm shadow-md"
                        >
                            <Type className="w-4 h-4" />
                            <span className="hidden sm:inline">Back Text</span>
                            <span className="sm:hidden text-[10px]">Text</span>
                        </button> */}

                        <button
                            onClick={handleLogout}
                            className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl transition-all font-medium text-sm"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline">Log Out</span>
                        </button>
                    </div>
                </header>

                {/* Status Bar for Locked / Deadline / Progress */}
                <div className="bg-slate-800 text-white px-6 py-2 flex items-center justify-between shadow-inner">
                    <div className="flex items-center space-x-6">
                        <div className="flex items-center space-x-2">
                            <Package className="w-4 h-4 text-green-400" />
                            <span className="text-sm">
                                {Object.entries(allSelections).filter(([type, options]) => isGarmentConfigured(type, options)).length} Items Configured
                            </span>
                        </div>
                        {editDeadline && (
                            <div className="flex items-center space-x-2">
                                <History className="w-4 h-4 text-yellow-400" />
                                <span className={`text-sm ${new Date() > editDeadline ? 'text-red-400 font-bold' : ''}`}>
                                    Edit Window: {editDeadline.toLocaleDateString()} {new Date() > editDeadline && '(Expired)'}
                                </span>
                            </div>
                        )}
                        <div className="flex items-center space-x-4">
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Configuration Total</span>
                                <span className="text-sm font-bold text-white">{dynamicPrice} DKK</span>
                            </div>
                            {amountPaid > 0 && (
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] text-green-400 font-bold uppercase tracking-wider">Paid</span>
                                    <span className="text-sm font-bold text-green-400">{amountPaid} DKK</span>
                                </div>
                            )}
                            <Tag color={paymentStatus === 'paid' ? 'success' : (paymentStatus === 'partial' ? 'warning' : 'default')} style={{ margin: 0 }}>
                                {paymentStatus.toUpperCase()}
                            </Tag>
                        </div>
                        {isLocked && (
                            <div className="flex items-center space-x-2 bg-red-600/50 px-3 py-1 rounded-xl border border-red-500/50 animate-pulse">
                                <Lock className="w-3.5 h-3.5" />
                                <span className="text-xs font-bold uppercase tracking-widest">
                                    {new Date() > editDeadline ? 'Window Expired' : (new Date() > deadline ? 'Deadline Passed' : 'Order Locked')}
                                </span>
                            </div>
                        )}
                    </div>
                    {isAdmin && isLocked && (
                        <button
                            onClick={handleAdminUnlock}
                            className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-xs font-bold transition-all border border-white/10"
                        >
                            Admin Bypass: Unlock Order
                        </button>
                    )}
                </div>

                <div className="hidden md:flex h-[calc(100vh-80px)] w-full relative">
                    {/* Sidebar */}
                    <div className="flex flex-col h-full border-r border-slate-200 bg-white shadow-xl z-10 w-[600px] min-w-[500px]">
                        <div className='flex flex-1 min-h-0'>
                            <div className="bg-white/70 border-r border-slate-200 overflow-y-auto firstdiv custom-scrollbar-premium min-w-[100px]">
                                <div className="p-6">
                                    <h2 className="text-sm font-semibold text-center text-slate-600 uppercase tracking-wider mb-4">
                                        Clothing
                                    </h2>
                                    <nav className="">
                                        {menuItems.map((item, index) => (
                                            <button
                                                key={index}
                                                onClick={() => {
                                                    setActiveMenu(item.name);
                                                }}
                                                className={`flex items-center px-2 py-3 rounded-xl transition-all duration-200 group w-full ${activeMenu === item.name
                                                    ? 'bg-gradient-to-r from-green-50 to-green-50 border border-green-200 shadow-sm'
                                                    : 'hover:bg-slate-50 hover:shadow-sm'
                                                    }`}
                                            >
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mr-3 transition-transform duration-200 ${activeMenu === item.name ? 'scale-110' : 'group-hover:scale-105'
                                                    }`}>
                                                    <img src={item.icon} alt={item.name} className="w-10 h-10 object-contain" />
                                                </div>
                                                {/* <span className={`text-sm font-medium ${activeMenu === item.name ? 'text-slate-900' : 'text-slate-600'}`}>{item.name}</span> */}
                                                {activeMenu === item.name && (
                                                    <div className="ml-auto w-2 h-2 bg-green-700 rounded-full"></div>
                                                )}
                                            </button>
                                        ))}
                                    </nav>
                                </div>
                            </div>
                            <div className="flex-1 bg-white/50 secondDiv overflow-y-auto custom-scrollbar-premium">
                                <div className="p-6 space-y-8">

                                    {activeMenu === 'T-SHIRT' && <Tshirt isAppReady={isAppReady} logos={logos} data={allSelections['T-SHIRT']} onUpdate={(updates) => handleUpdateSelection('T-SHIRT', updates)} />}
                                    {activeMenu === "SWEATSHIRT" && <SweatShirt isAppReady={isAppReady} logos={logos} data={allSelections['SWEATSHIRT']} onUpdate={(updates) => handleUpdateSelection('SWEATSHIRT', updates)} />}
                                    {activeMenu === "HOODIE" && <Hoodie isAppReady={isAppReady} logos={logos} data={allSelections['HOODIE']} onUpdate={(updates) => handleUpdateSelection('HOODIE', updates)} />}
                                    {activeMenu === "ZIPPERHOODIE" && <ZippedHoodie isAppReady={isAppReady} logos={logos} data={allSelections['ZIPPERHOODIE']} onUpdate={(updates) => handleUpdateSelection('ZIPPERHOODIE', updates)} />}
                                    {activeMenu === "SWEATPANTS" && <SweatPants isAppReady={isAppReady} logos={logos} data={allSelections['SWEATPANTS']} onUpdate={(updates) => handleUpdateSelection('SWEATPANTS', updates)} />}
                                    {activeMenu === "SHORTS" && <Shorts isAppReady={isAppReady} logos={logos} data={allSelections['SHORTS']} onUpdate={(updates) => handleUpdateSelection('SHORTS', updates)} />}
                                </div>
                            </div>
                        </div>
                        <div className=" border-slate-200 p-6 bg-white/50 backdrop-blur-sm">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-sm font-medium text-slate-600">Total Price</span>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-slate-900">
                                        {dynamicPrice} DKK
                                    </div>
                                    <div className="text-xs text-slate-500"> Service fee included</div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsQuoteModalOpen(true)}
                                disabled={!sizeFlag}
                                className={`w-full py-3 rounded-xl font-semibold transition-all duration-200 shadow-md
           
        ${sizeFlag
                                        ? "bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 hover:shadow-lg"
                                        : "bg-gray-300 text-gray-500 cursor-not-allowed"}`}
                            >
                                {balanceDue <= 0 && paymentStatus === 'paid' ? 'Save Changes' : (balanceDue > 0 && amountPaid > 0 ? `Pay Balance (${balanceDue} DKK)` : 'Approve and Pay')}
                            </button>
                        </div>
                    </div>
                    {/* Main Content Area */}
                    <div className="flex flex-1 h-full">
                        {/* Preview Panel */}
                        <div className="flex-1 p-6">
                            <div className="bg-white/50 backdrop-blur-sm rounded-2xl shadow-xl h-full flex flex-col border border-slate-200">
                                {/* Header */}
                                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-green-600 rounded-xl flex items-center justify-center">
                                            <GraduationCap className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-slate-800">Selected {activeMenu}</h4>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                        <span className="text-xs font-medium text-slate-600">LIVE PREVIEW</span>
                                    </div>
                                </div>
                                {/* Iframe Preview */}
                                <div className="flex-1 rounded-b-2xl overflow-hidden">
                                    <iframe
                                        id="preview-iframe"
                                        src={'https://playcanv.as/e/p/1b1eadeb/'}
                                        className="w-full h-full"
                                        frameBorder="0"
                                        title="3D Student Card Preview"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="md:hidden flex flex-col ">
                    {/* Mobile Preview Panel - Top */}
                    <div className="flex flex-col h-screen">
                        {/* Main content area that will scroll */}
                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* Preview section */}
                            <div
                                // className={`transition-all duration-300 ${isConfigOpen ? 'h-[35vh]' : 'h-[70vh]'
                                className={`transition-all duration-300 ${isConfigOpen ? 'h-[35vh]' : 'h-[35vh]'
                                    }`}
                            >
                                <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200 h-full">
                                    <div className="flex items-center justify-between p-4 border-b border-slate-200">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 bg-gradient-to-r from-green-600 to-green-600 rounded-xl flex items-center justify-center">
                                                <GraduationCap className="w-4 h-4 text-white" />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-slate-800 text-sm">Selected {activeMenu}</h4>
                                                {/* <p className="text-xs text-slate-600 capitalize" >{program.toUpperCase()}</p> */}
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            {isLocked && (
                                                <Tag color="error" className="flex items-center space-x-1 px-2 py-0.5 rounded-full border-red-100">
                                                    <Lock className="w-3 h-3" />
                                                    <span className="text-[10px] font-bold uppercase tracking-tight">Locked</span>
                                                </Tag>
                                            )}
                                            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                            <span className="text-xs font-medium text-slate-600">LIVE</span>
                                        </div>
                                    </div>
                                    {/* Scrolling Message */}
                                    {/* <div className="bg-yellow-100 border-y border-yellow-300 px-4 py-2">
                  <p className="text-[10px] text-yellow-800 font-semibold text-center">
                    Ændringen vises ikke på huen, men bare rolig — det er ikke en fejl 😉 Din hue bliver præcis, som du designer den.
                    Er du i tvivl? Skriv til os på Instagram eller TikTok, så uploader vi en video af en hue, der ligner din 🎥✨
                  </p>
                </div> */}
                                    <div
                                        className="h-[calc(100%-60px)] rounded-b-2xl overflow-hidden"
                                        style={{
                                            pointerEvents: isConfigOpen ? 'none' : 'auto',
                                        }}
                                    >
                                        <iframe
                                            id="preview-iframe2"
                                            src={'https://playcanv.as/e/p/1b1eadeb/'}
                                            className="w-full h-full"
                                            frameBorder="0"
                                            title="3D Student Card Preview"
                                        />
                                    </div>
                                </div>
                            </div>
                            {/* Config Toggle Button */}
                            <div className="px-4 py-2 bg-white/80 border-t border-slate-200 flex justify-center flex-shrink-0">
                                <button
                                    onClick={() => setIsConfigOpen(!isConfigOpen)}
                                    className="flex items-center justify-center w-full py-2 bg-slate-100 rounded-lg text-slate-700 font-medium"
                                >
                                    {isConfigOpen ? (
                                        <>
                                            <ChevronDown className="w-4 h-4 mr-1" />
                                            Hide Configuration
                                        </>
                                    ) : (
                                        <>
                                            <ChevronUp className="w-4 h-4 mr-1" />
                                            Show Configuration
                                        </>
                                    )}
                                </button>
                            </div>
                            {/* Config Panel (collapsible + scrollable) */}
                            {/* Config Panel (collapsible + scrollable) */}
                            <div
                                // className={`transition-all duration-300 overflow-y-auto ${isConfigOpen ? '' : 'flex-none h-0'
                                // }`}
                                className={`transition-all duration-300 overflow-y-auto max-h-[30vh] md:max-h-full ${isConfigOpen ? 'max-h-[30vh]' : 'max-h-0'
                                    }`}
                            >
                                {isConfigOpen && (
                                    <div className="p-4 space-y-6">
                                        {/* Keep all components mounted but conditionally show based on activeMenu */}
                                        {activeMenu === 'T-SHIRT' && <Tshirt isAppReady={isAppReady} data={allSelections['T-SHIRT']} onUpdate={(updates) => handleUpdateSelection('T-SHIRT', updates)} />}
                                        {activeMenu === "SWEATSHIRT" && <SweatShirt isAppReady={isAppReady} data={allSelections['SWEATSHIRT']} onUpdate={(updates) => handleUpdateSelection('SWEATSHIRT', updates)} />}
                                        {activeMenu === "HOODIE" && <Hoodie isAppReady={isAppReady} data={allSelections['HOODIE']} onUpdate={(updates) => handleUpdateSelection('HOODIE', updates)} />}
                                        {activeMenu === "ZIPPERHOODIE" && <ZippedHoodie isAppReady={isAppReady} data={allSelections['ZIPPERHOODIE']} onUpdate={(updates) => handleUpdateSelection('ZIPPERHOODIE', updates)} />}
                                        {activeMenu === "SWEATPANTS" && <SweatPants isAppReady={isAppReady} data={allSelections['SWEATPANTS']} onUpdate={(updates) => handleUpdateSelection('SWEATPANTS', updates)} />}
                                        {activeMenu === "SHORTS" && <Shorts isAppReady={isAppReady} data={allSelections['SHORTS']} onUpdate={(updates) => handleUpdateSelection('SHORTS', updates)} />}
                                    </div>
                                )}
                            </div>
                            {/* Sidebar - Now inside the scrollable area but above footer */}
                            <div className="bg-white/70 border-t border-slate-200 flex-shrink-0">
                                <div className="px-4 pt-2">
                                    <h3 className="text-xs font-semibold text-center text-slate-600 uppercase tracking-wider mb-3">
                                        Clothing
                                    </h3>
                                    <div className="flex overflow-x-auto space-x-3 pb-2">
                                        {menuItems.map((item, index) => (
                                            <button
                                                key={index}
                                                onClick={() => {
                                                    setActiveMenu(item.name)
                                                }}
                                                className={`flex-shrink-0 flex flex-col items-center px-3 rounded-xl transition-all duration-200 min-w-[80px] ${activeMenu === item.name
                                                    ? 'bg-gradient-to-r from-green-50 to-green-50 border border-green-200 shadow-sm'
                                                    : 'hover:bg-slate-50 hover:shadow-sm'
                                                    }`}
                                            >
                                                <div
                                                    className={`w-8 rounded-lg flex items-center justify-center mb-2 transition-transform duration-200 ${activeMenu === item.name ? 'scale-110' : 'hover:scale-105'
                                                        }`}
                                                >
                                                    <img
                                                        src={item.icon}
                                                        alt={item.name}
                                                        className="w-6 h-6 object-contain"
                                                    />
                                                </div>
                                                <span className="text-xs font-medium text-slate-600 text-center leading-tight">
                                                    {item.name.replace(' ', '\n')}
                                                </span>
                                                {activeMenu === item.name && (
                                                    <div className="mt-1 w-2 h-2 bg-green-500 rounded-full"></div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Fixed Footer - Always visible at bottom */}
                        <div className="border-t border-slate-200 p-4 bg-white/90 backdrop-blur-sm flex-shrink-0">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-sm font-medium text-slate-600">Total Price</span>
                                <div className="text-right">
                                    <div className="text-xl font-bold text-slate-900">
                                        {dynamicPrice} DKK
                                    </div>
                                    <div className="text-xs text-slate-500">Service fee included</div>
                                </div>
                            </div>
                            <div className="flex space-x-3 mb-4">
                                <button
                                    onClick={handleSaveOrder}
                                    disabled={isSaving || (isLocked && !isAdmin)}
                                    className="flex-1 flex items-center justify-center space-x-2 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold transition-all hover:bg-slate-200 disabled:opacity-50"
                                >
                                    <Settings className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
                                    <span>{isSaving ? 'Saving...' : 'Save Design'}</span>
                                </button>
                                {dbHistory.length > 0 && (
                                    <button
                                        onClick={() => setIsHistoryModalOpen(true)}
                                        className="flex-1 flex items-center justify-center space-x-2 py-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold transition-all hover:bg-slate-50"
                                    >
                                        <History className="w-4 h-4 text-green-600" />
                                        <span>History</span>
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={() => setIsQuoteModalOpen(true)}
                                // disabled={!sizeFlag}
                                // disabled={!sizeFlag}
                                className={`w-full py-3 rounded-xl font-semibold transition-all duration-200 shadow-md
        ${sizeFlag
                                        ? "bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 hover:shadow-lg"
                                        : "bg-gray-300 text-gray-500 cursor-not-allowed"}`}
                            >
                                Approve and Pay
                            </button>
                        </div>
                    </div>
                    {/* Quote Modal */}
                </div>
                <QuoteModal
                    isOpen={isQuoteModalOpen}
                    onClose={() => setIsQuoteModalOpen(false)}
                    selectedOptions={allSelections}
                    defaultSelections={DEFAULT_SELECTIONS}
                    price={dynamicPrice}
                    amountPaid={amountPaid}
                    paymentStatus={paymentStatus}
                    balanceDue={balanceDue}
                    editDeadline={editDeadline}
                    packageName={packageName}
                    program={program}
                    initialDeliveryDetails={existingDeliveryDetails}
                />
                <HistoryModal
                    isOpen={isHistoryModalOpen}
                    onClose={() => setIsHistoryModalOpen(false)}
                    history={dbHistory}
                    onRevert={handleRevertToVersion}
                    onHistoryUpdated={fetchHistoryData}
                />
            </div>
        </>
    );
};
export default StudentDashboard;