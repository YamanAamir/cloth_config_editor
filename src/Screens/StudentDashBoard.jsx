// StudentDashboard.jsx (full fixed code with iframe src fixed to use null instead of empty string)
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { message, Tag, Dropdown, Drawer, Avatar, Divider, Form, Input, Switch, Tour, Button, Modal, Popover } from 'antd';
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
import { useParams, useSearchParams, useLocation } from 'react-router-dom';
import { GraduationCap, ChevronUp, ChevronDown, LogOut, Settings, LayoutGrid, Lock, History, Package, User, CreditCard, Clock, HelpCircle, RefreshCw, Undo } from 'lucide-react';
import StudentPopup from '../Components/Popup';
import useLogoStore from '../store/logoStore';
import useSettingsStore from '../store/settingsStore';
import { useAuth } from '../context/AuthContext';
import { getMyOrder, getMyOrderHistory, placeOrder, getStudentProfile, updateStudentProfile, changePasswordAuth, getMyClassBackDesigns, createCheckoutSession, getOrderPaymentBreakdown } from '../api/api';
import useBackDesignStore from '../store/backDesignStore';
import { getFlagUrl } from '../utils/flags';
import { BASE_URL, DEFAULT_SELECTIONS } from '../utils/const';
import useSocket from '../hooks/useSocket';

const StudentDashboard = ({ customizations, setCustomizations, setShowBackPopup, initialOrderData, initialHistoryData, initialBackDesignData /*, setShowBackTextPopup */ }) => { // COMMENTED: Back text feature disabled
    const { logout } = useAuth();
    const { backDesigns } = useBackDesignStore();
    const { fetchBackDesigns } = useBackDesignStore();

    // Tops chest/sleeve fields use rakhte hain, bottoms sirf leg fields — copy ke waqt inhe mix nahi karna
    const GARMENT_FAMILY = {
        'T-SHIRT': 'top', 'SWEATSHIRT': 'top', 'HOODIE': 'top', 'ZIPPERHOODIE': 'top',
        'SWEATPANTS': 'bottom', 'SHORTS': 'bottom',
    };

    // Source garment ke pressureOptions ko target garment ke field-naming (Chest<->Leg) mein translate karta hai
    // aur sirf wahi keys rakhta hai jo target garment ke schema mein actually exist karti hain (e.g. Sleeve/bottomChest
    // fields ka koi equivalent SHORTS/SWEATPANTS pe nahi hota, isliye woh drop ho jati hain)
    // const mapPressureOptionsForGarment = (sourceOptions, sourceGarment, targetGarment) => {
    //     const targetDefaults = DEFAULT_SELECTIONS[targetGarment]?.pressureOptions || {};
    //     const sameFamily = GARMENT_FAMILY[sourceGarment] === GARMENT_FAMILY[targetGarment];
    //     const mapped = {};

    //     Object.entries(sourceOptions || {}).forEach(([key, value]) => {
    //         if (key === 'backDesign') {
    //             mapped.backDesign = value;
    //             return;
    //         }

    //         let targetKey = key;
    //         if (!sameFamily) {
    //             if (key.startsWith('rightChest')) targetKey = 'rightLeg' + key.slice('rightChest'.length);
    //             else if (key.startsWith('leftChest')) targetKey = 'leftLeg' + key.slice('leftChest'.length);
    //             else if (key.startsWith('rightLeg')) targetKey = 'rightChest' + key.slice('rightLeg'.length);
    //             else if (key.startsWith('leftLeg')) targetKey = 'leftChest' + key.slice('leftLeg'.length);
    //             else return; // Sleeve*/bottomChest* — dusri family mein koi equivalent field nahi
    //         }

    //         if (targetDefaults.hasOwnProperty(targetKey)) {
    //             mapped[targetKey] = value;
    //         }
    //     });

    //     return mapped;
    // };
    const mapPressureOptionsForGarment = (sourceOptions, sourceGarment, targetGarment) => {
        const targetDefaults = DEFAULT_SELECTIONS[targetGarment]?.pressureOptions || {};
        const sameFamily = GARMENT_FAMILY[sourceGarment] === GARMENT_FAMILY[targetGarment];
        const mapped = {};

        Object.entries(sourceOptions || {}).forEach(([key, value]) => {
            if (key === 'backDesign') {
                mapped.backDesign = value;
                return;
            }

            let targetKey = key;
            if (!sameFamily) {
                if (key.startsWith('rightChest')) targetKey = 'rightLeg' + key.slice('rightChest'.length);
                else if (key.startsWith('leftChest')) targetKey = 'leftLeg' + key.slice('leftChest'.length);
                else if (key.startsWith('rightLeg')) targetKey = 'rightChest' + key.slice('rightLeg'.length);
                else if (key.startsWith('leftLeg')) targetKey = 'leftChest' + key.slice('leftLeg'.length);
                else return;
            }

            if (targetDefaults.hasOwnProperty(targetKey)) {
                mapped[targetKey] = value;
            }
        });

        // 👇 NAYA: agar area ka Type khali nahi hai (flag/logo select hai), to us area ki Text field
        // force empty rakho — warna target garment (jo ek waqt me sirf ek asset support karta hai)
        // me purani text hidden bake ho jati hai texture ke andar.
        ['rightLeg', 'leftLeg', 'rightChest', 'leftChest'].forEach(area => {
            const typeKey = `${area}Type`;
            const textKey = `${area}Text`;
            if (mapped.hasOwnProperty(typeKey) && mapped[typeKey] && mapped.hasOwnProperty(textKey)) {
                mapped[textKey] = '';
            }
        });

        return mapped;
    };
    const { fetchSettings, getGarmentPrice, getVat, getMaxCharsClothText } = useSettingsStore();

    // Fetch settings on mount
    useEffect(() => { fetchSettings(); }, []);

    const GARMENT_PRICES = {
        'T-SHIRT': getGarmentPrice('T-SHIRT') || 1200,
        'SWEATSHIRT': getGarmentPrice('SWEATSHIRT') || 1500,
        'HOODIE': getGarmentPrice('HOODIE') || 2000,
        'ZIPPERHOODIE': getGarmentPrice('ZIPPERHOODIE') || 2200,
        'SWEATPANTS': getGarmentPrice('SWEATPANTS') || 2000,
        'SHORTS': getGarmentPrice('SHORTS') || 1500,
    };

    const isGarmentConfigured = (garmentType, garmentData) => {
        const defaults = DEFAULT_SELECTIONS[garmentType];
        if (!defaults) return true;

        // Color aur Size sync hote hain globally — inhe "configured" nahi maante
        // Sirf pressureOptions mein actual user-made design changes count karein

        // Ye keys auto-assign hoti hain (logo auto-select, internal IDs) — ignore karo
        // Keys jo configured nahi maani jayengi:
        // - Logo auto-assign keys (system se aati hain, user ne manually select nahi kiya)
        // - backDesign (class-level back design — user action nahi hai)
        // Configured = sirf tab jab user ne text/flag manually add kiya ho
        const AUTO_ASSIGNED_KEYS = new Set([
            'selectedLogoId',
            'backDesign',                // class back design auto-apply — configured nahi
            'rightChestLogoPredefined', 'leftChestLogoPredefined',
            'bottomChestLogoPredefined', 'rightSleeveLogoPredefined',
            'leftSleeveLogoPredefined',
            'rightLegLogoPredefined', 'leftLegLogoPredefined',
            'rightChestLogoCustom', 'leftChestLogoCustom',
            'bottomChestLogoCustom', 'rightSleeveLogoCustom',
            'leftSleeveLogoCustom', 'rightLegLogoCustom', 'leftLegLogoCustom',
            // Type fields bhi ignore — sirf content fields check karo
            'rightChestType', 'leftChestType', 'bottomChestType',
            'rightSleeveType', 'leftSleeveType',
            'rightLegType', 'leftLegType',
            // TextColor ignore — color alone configured nahi maanta
            'rightChestTextColor', 'leftChestTextColor', 'bottomChestTextColor',
            'rightSleeveTextColor', 'leftSleeveTextColor',
            'rightLegTextColor', 'leftLegTextColor',
            // FlagCount ignore
            'rightSleeveFlagCount', 'leftSleeveFlagCount',
        ]);

        const currentPO = garmentData.pressureOptions || {};
        const defaultPO = defaults.pressureOptions || {};

        for (const key of Object.keys(currentPO)) {
            // Auto-assigned keys skip karo
            if (AUTO_ASSIGNED_KEYS.has(key)) continue;

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
    const [allSelections, setAllSelectionsState] = useState(() => {
        try {
            const saved = localStorage.getItem('studentCustomizations');
            let parsed = saved ? JSON.parse(saved) : null;
            if (parsed) {
                const rawUser = localStorage.getItem('user');
                const userObj = rawUser ? JSON.parse(rawUser) : null;
                const email = userObj?.email;
                const name = userObj?.name;
                const keys = Object.keys(parsed);
                const isOldFormat = keys.length > 0 && !keys.includes('T-SHIRT') && !keys.includes('HOODIE') && !keys.includes('SWEATSHIRT');
                if (isOldFormat) {
                    if (email && parsed[email]) {
                        return parsed[email];
                    } else if (name && parsed[name]) {
                        return parsed[name];
                    }
                    return DEFAULT_SELECTIONS;
                }
                return parsed;
            }
        } catch { /* ignore */ }
        return DEFAULT_SELECTIONS;
    });
    const setAllSelections = (val) => {
        setAllSelectionsState(val);
    };
    const [activeMenu, setActiveMenu] = useState('T-SHIRT');
    const [garmentTab, setGarmentTab] = useState('size'); // 'size' | 'pressure'
    const [backDesignKey, setBackDesignKey] = useState(0); // force Test remount on page switch
    const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
    const [profileData, setProfileData] = useState(null);
    const [profileTab, setProfileTab] = useState('info'); // 'info' | 'edit' | 'password'
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileEditForm] = Form.useForm();
    const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
    const [undoAvailable, setUndoAvailable] = useState(false);
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const packageName = searchParams.get("package");
    const program = searchParams.get("program");
    const [isConfigOpen, setIsConfigOpen] = useState(false);
    const [globalEmblem, setGlobalEmblem] = useState({ name: 'Guld', value: 'Guld', color: '#FCD34D' });
    const [isAppReady, setIsAppReady] = useState(false);
    const [isIframeLoaded, setIsIframeLoaded] = useState(false);
    const [extraCoverReset, setExtraCoverReset] = useState(false)
    const lastSentPageRef = useRef(null);
    const lastSentKeyRef = useRef("");

    // Garment switch copy popup state
    const [copyDesignPrompt, setCopyDesignPrompt] = useState(null); // { from, to }

    // --- User Initialization ---
    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;

    // --- Tour Guide State & Config ---
    const [tourOpen, setTourOpen] = useState(false);
    const [activeTourSteps, setActiveTourSteps] = useState([]);
    const [showTourPrompt, setShowTourPrompt] = useState(false);

    const tourFeatures = [
        {
            id: 'basics',
            title: 'Basics',
            isForClassRep: false,
            steps: [
                {
                    title: 'Vælg produkt',
                    description: 'Skift mellem T-shirts, hoodies, sweatshirts og andre produkter ved at klikke her.',
                    target: () => window.innerWidth < 768 ? document.getElementById('garment-menu-mobile') : document.getElementById('garment-menu'),
                },
                {
                    title: 'Farve og størrelse',
                    description: 'Vælg produktets grundfarve (lys eller mørk), den ønskede farve samt din størrelse.',
                    target: () => window.innerWidth < 768 ? document.getElementById('color-size-tab-btn-mobile') : document.getElementById('color-size-tab-btn'),
                },
                {
                    title: 'Design',
                    description: 'Gå til denne fane for at tilføje tekst, flag eller logo på bryst og ærmer.',
                    target: () => window.innerWidth < 768 ? document.getElementById('design-tab-btn-mobile') : document.getElementById('design-tab-btn'),
                },
                {
                    title: 'Pris og status',
                    description: 'Her kan du følge den samlede pris, status på din bestilling samt vigtige deadlines.',
                    target: () => window.innerWidth < 768 ? document.getElementById('price-summary-mobile') : document.getElementById('price-summary'),
                },
                {
                    title: 'Topmenu',
                    description: 'Øverst finder du navigationen, hvor du blandt andet kan starte rundvisningen, åbne din profil og få adgang til øvrige funktioner.',
                    target: () => document.getElementById('global-header'),
                },
                {
                    title: 'Farve og Størrelse',
                    description: 'Vælge farve og den ønskede størrelse',
                    target: () => window.innerWidth < 768 ? document.getElementById('main-content-mobile') : document.getElementById('main-content'),
                }
            ]
        }
    ];

    const handleStartTour = (steps) => {
        setActiveTourSteps(steps);
        setTourOpen(true);
    };

    const tourMenuItems = tourFeatures
        .filter(tour => (user?.role === 'class_representative' || user?.role === 'admin') || !tour.isForClassRep)
        .map(tour => ({
            key: tour.id,
            label: tour.title,
            onClick: () => handleStartTour(tour.steps)
        }));
    // Auto-prompt Tour Guide logic
    useEffect(() => {
        if (isAppReady) {
            const promptState = localStorage.getItem('tourPromptShown');

            if (!promptState) {
                const timer = setTimeout(() => {
                    setShowTourPrompt(true);
                }, 1000);

                return () => clearTimeout(timer);
            }
        }
    }, [isAppReady]);

    // Track which garments user has explicitly added to order
    const [orderedGarments, setOrderedGarments] = useState({});
    const [sizeFlag, setSizeFlag] = useState(true)
    const [errors, setErrors] = useState({});
    const [isLocked, setIsLocked] = useState(false);
    const [deadline, setDeadline] = useState(null);
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [dbHistory, setDbHistory] = useState([]);
    const [isAdmin, setIsAdmin] = useState(false);

    const [existingDeliveryDetails, setExistingDeliveryDetails] = useState(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [orderId, setOrderId] = useState(null);
    const [amountPaid, setAmountPaid] = useState(0);
    const [paymentStatus, setPaymentStatus] = useState(null);
    const [editDeadline, setEditDeadline] = useState(null);
    const [classStatus, setClassStatus] = useState(null); // tracking.class_status
    const [backDesignStatus, setBackDesignStatus] = useState(null); // back design approval status
    const [isRefreshing, setIsRefreshing] = useState(false);
    // New lifecycle state
    const [processStatus, setProcessStatus] = useState(null); // on_hold | locked_awaiting_payment | partial_paid | paid | production | dispatched
    const [holdDeadline, setHoldDeadline] = useState(null); // Date when hold period expires

    // Payment breakdown state (per-product paid vs unpaid)
    const [paymentBreakdown, setPaymentBreakdown] = useState(null);
    const [isPayingBalance, setIsPayingBalance] = useState(false);
    const [editWindowOpen, setEditWindowOpen] = useState(false);
    // Product types already in the current order — locked from being unselected once purchased
    const [existingProductTypes, setExistingProductTypes] = useState([]);

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

    // Sidebar mein price tab dikhao jab koi garment actually configured ho
    const anyGarmentConfigured = Object.entries(allSelections).some(
        ([type, options]) => isGarmentConfigured(type, options)
    );

    const subtotal = anyGarmentConfigured ? calculateTotalPrice() : 0;
    const vatPct = getVat(); // e.g. 10
    const vatAmount = anyGarmentConfigured ? Math.round(subtotal * vatPct / (100 + vatPct)) : 0;
    const dynamicPrice = subtotal;
    const balanceDue = Math.max(0, dynamicPrice - amountPaid);


    const { logos, loading, fetchLogos } = useLogoStore();
    const school_id = user?.school_id;
    useEffect(() => {
        if (school_id) {
            fetchLogos({ page: 1, limit: 100, school_id });
        }
    }, [school_id, fetchLogos]);

    // Auto-fetch back designs on mount so Test.jsx gets them without button
    // Also update localStorage studentCustomizations with fresh backDesign src
    // so stale cached image URLs get replaced with the latest from API on every refresh
    useEffect(() => {
        const classId = user?.class_id;
        if (!classId) return;

        fetchBackDesigns({ class_id: classId });

        // Fetch latest back design and sync backDesign.src in localStorage
        getMyClassBackDesigns().then(res => {
            if (!res.data?.success || !res.data?.data) return;
            const design = res.data.data;
            const latestSrc = design.configured_file_path
                ? `${BASE_URL}${design.configured_file_path.replace(/\\/g, '/')}`
                : null;
            if (!latestSrc) return;

            try {
                const stored = localStorage.getItem('studentCustomizations');
                if (!stored) return;
                const parsed = JSON.parse(stored);

                let updated = false;
                const studentData = JSON.parse(JSON.stringify(parsed));

                // Update backDesign.src in ALL garment types where it is set
                Object.keys(studentData).forEach(garmentType => {
                    const po = studentData[garmentType]?.pressureOptions;
                    if (po?.backDesign?.src && po.backDesign.src !== latestSrc) {
                        po.backDesign.src = latestSrc;
                        po.backDesign.designId = design.id;
                        updated = true;
                    }
                });

                if (updated) {
                    localStorage.setItem('studentCustomizations', JSON.stringify(studentData));
                    setAllSelections(studentData);
                    setCustomizations(studentData);
                }
            } catch (err) {
                console.error('Failed to update backDesign src in localStorage:', err);
            }
        }).catch(() => { });
    }, []);

    // --- Real-time Socket Updates ---
    const userId = user?.id;

    const processOrderResponse = (order) => {
        if (!order) return;
        setOrderId(order.id);
        const ps = order.process_status || null;
        setProcessStatus(ps);
        if (order.hold_deadline) setHoldDeadline(new Date(order.hold_deadline));
        const editWindowStillOpen = order.edit_deadline
            ? new Date() < new Date(order.edit_deadline)
            : false;
        setEditWindowOpen(editWindowStillOpen);
        const locked = order.is_locked ||
            ps === 'locked_awaiting_payment' ||
            ps === 'production' ||
            ps === 'dispatched' ||
            (ps === 'paid' && !editWindowStillOpen) ||
            (ps === 'partial_paid' && !editWindowStillOpen);
        setIsLocked(locked);
        setAmountPaid(parseFloat(order.amount_paid || 0));
        setPaymentStatus(order?.payment_status ?? null);
        if (order.edit_deadline) setEditDeadline(new Date(order.edit_deadline));
        if (order.class?.change_deadline) setDeadline(new Date(order.class.change_deadline));
        if (order.tracking?.class_status) setClassStatus(order.tracking.class_status);
        if (order.delivery_details) {
            const details = typeof order.delivery_details === 'string'
                ? JSON.parse(order.delivery_details) : order.delivery_details;
            setExistingDeliveryDetails(details);
        }
        if (order.paid_products || order.unpaid_products) {
            const editWindowStillOpenCalc = order.edit_deadline ? new Date() < new Date(order.edit_deadline) : false;
            setPaymentBreakdown({
                total_amount: parseFloat(order.total_amount || 0),
                amount_paid: parseFloat(order.amount_paid || 0),
                balance_due: parseFloat(order.balance_due || 0),
                paid_products: order.paid_products || [],
                unpaid_products: order.unpaid_products || [],
                edit_window_open: editWindowStillOpenCalc,
                edit_deadline: order.edit_deadline
            });
        }
        setExistingProductTypes((order.order_items || []).map(item => item.product_type));

        if (order.order_items?.length > 0) {
            let localData = null;
            try {
                const s = localStorage.getItem('studentCustomizations');
                localData = s ? JSON.parse(s) : null;
            } catch { /* ignore */ }
            if (localData) {
                setAllSelections(localData);
                setCustomizations(localData);
            } else {
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
                setCustomizations(newSelections);
                try {
                    localStorage.setItem('studentCustomizations', JSON.stringify(newSelections));
                } catch { /* ignore */ }
            }
        }
    };

    const fetchOrderData = async () => {
        try {
            const resOrder = await getMyOrder();
            if (resOrder.data?.success && resOrder.data.data) {
                processOrderResponse(resOrder.data.data);
            }
        } catch (err) {
            console.error("Error re-fetching order:", err);
        }
    };

    const fetchBackDesignStatus = async () => {
        try {
            const resBackDesigns = await getMyClassBackDesigns();
            if (resBackDesigns.data?.success && resBackDesigns.data.data) {
                const data = resBackDesigns.data.data;
                // API single object ya array dono return kar sakta hai — dono handle karo
                let latestDesign = null;
                if (Array.isArray(data)) {
                    latestDesign = data.find(design => design.class_id === user?.class_id) || data[0];
                } else if (data && typeof data === 'object') {
                    // Single object directly
                    latestDesign = data;
                }
                if (latestDesign) {
                    setBackDesignStatus(latestDesign.approval_status);
                }
            }
        } catch (err) {
            console.error("Error fetching back design status:", err);
        }
    };

    const handleRefreshStatus = async () => {
        setIsRefreshing(true);
        try {
            await Promise.all([
                fetchOrderData(),
                fetchHistoryData(),
                fetchBackDesignStatus()
            ]);
            message.success("Status updated!");
        } catch (err) {
            console.error("Error refreshing status:", err);
            message.error("Failed to refresh status");
        } finally {
            setIsRefreshing(false);
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
            fetchOrderData();
            fetchHistoryData();
            fetchBackDesignStatus(); // Also refresh back design status
        }
    );

    useSocket(
        userId ? `history_update_${userId}` : null,
        `history_update_${userId}`,
        (data) => {
            fetchHistoryData();
        }
    );

    // Listen for back design approval updates
    useSocket(
        user?.class_id ? `back_design_update_${user.class_id}` : null,
        (data) => {
            fetchBackDesignStatus();
            if (data.approval_status === 'approved') {
                message.success('🎉 Your back design has been approved!');
            } else if (data.approval_status === 'rejected') {
                message.error('❌ Your back design has been rejected. Please contact your class representative.');
            }
        }
    );

    const [isPolling, setIsPolling] = useState(false);

    useEffect(() => {
        if (processStatus !== 'pending_payment') {
            setIsPolling(false);
            return;
        }

        let cancelled = false;
        let attempt = 0;
        const MAX = 20; // max 20 attempts = 80 seconds total

        setIsPolling(true);

        const poll = async () => {
            if (cancelled || attempt >= MAX) {
                if (!cancelled) setIsPolling(false);
                return;
            }
            attempt++;
            try {
                const res = await getMyOrder();
                if (!res.data?.success || !res.data?.data) {
                    if (!cancelled) setTimeout(poll, 4000);
                    return;
                }
                const o = res.data.data;
                if (o.process_status !== 'pending_payment') {
                    // Webhook fired — update all dashboard state
                    if (!cancelled) {
                        setIsPolling(false);
                        await fetchOrderData();
                        await fetchHistoryData();
                        message.success('Payment confirmed! Your order is updated.');
                    }
                    return;
                }
                // Still pending — retry
                if (!cancelled) setTimeout(poll, 4000);
            } catch {
                if (!cancelled) setTimeout(poll, 4000);
            }
        };

        // Start polling immediately (no delay) so first check is instant
        poll();

        return () => {
            cancelled = true;
            setIsPolling(false);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [processStatus]);
    // --- Fetch Existing Order & History on mount ---
    useEffect(() => {
        if (user && ['student', 'class_representative'].includes(user.role)) {
            // Use pre-fetched data from App.jsx immediately (no API wait)
            if (initialOrderData) processOrderResponse(initialOrderData);
            if (initialHistoryData) setDbHistory(initialHistoryData);
            if (initialBackDesignData) {
                const data = initialBackDesignData;
                let latestDesign = null;
                if (Array.isArray(data)) {
                    latestDesign = data.find(d => d.class_id === user?.class_id) || data[0];
                } else if (data && typeof data === 'object') {
                    latestDesign = data;
                }
                if (latestDesign) setBackDesignStatus(latestDesign.approval_status);
            }

            // Always fetch fresh data in background to ensure up-to-date state
            Promise.all([
                fetchOrderData(),
                fetchHistoryData(),
                fetchBackDesignStatus()
            ]).catch(err => console.error("Background refresh error:", err));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Refetch when navigating BACK to dashboard from Stripe payment ──
    // location.key changes every navigation — catches back-from-success
    useEffect(() => {
        if (user && ['student', 'class_representative'].includes(user.role)) {
            fetchOrderData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.key]);

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

            // 3. Derive lock from processStatus (backend-authoritative)
            if (processStatus && ['locked_awaiting_payment', 'production', 'dispatched', 'pending_payment'].includes(processStatus)) {
                setIsLocked(true);
            }
            // For paid / partial_paid: lock only when edit window is closed
            if ((processStatus === 'paid' || processStatus === 'partial_paid') && !editWindowOpen) {
                setIsLocked(true);
            }
        }
    }, [user, editDeadline, paymentStatus, processStatus]);

    const handleLogout = () => {
        logout();
        window.location.reload();
    };

    // ── Pay Now handler — launches Stripe checkout (first OR additional payment) ──
    const handlePayNow = async () => {
        if (!orderId) { message.error("No order found."); return; }
        setIsPayingBalance(true);
        try {
            const res = await createCheckoutSession({ orderId });
            if (res.data?.url) {
                window.location.href = res.data.url;
            } else if (res.data?.no_payment_needed) {
                message.success("Order is already fully paid.");
                await fetchOrderData();
            } else {
                message.error("Could not open payment page. Please try again.");
            }
        } catch (err) {
            console.error("Payment error:", err);
            message.error(err.response?.data?.message || "Payment failed.");
        } finally {
            setIsPayingBalance(false);
        }
    };

    const handleChangeMode = () => {
        setMode(null);
        localStorage.removeItem('mode');
    };

    // Jab selected student change ho → uske customizations load karo
    const handleUpdateSelection = (category, updates) => {
        if (isLocked && !isAdmin) {
            message.warning("Editing is locked after the deadline.");
            return;
        }

        // 1. Update LOCAL state immediately for responsive UI
        setAllSelections(prev => {
            const next = JSON.parse(JSON.stringify(prev));

            // Color — sirf active garment pe apply hoga (sync band)
            if (updates.selectedColor) {
                next[category].selectedColor = updates.selectedColor;
            }

            // Size — sirf active garment pe apply hoga (sync band)
            if (updates.selectedSize) {
                next[category].selectedSize = updates.selectedSize;
            }

            // Sync Pressure Options with positional mapping
            if (updates.pressureOptions) {
                const pUpdates = updates.pressureOptions;

                // For SHORTS, apply updates directly without cross-category sync
                if (category === 'SHORTS') {
                    Object.keys(pUpdates).forEach(key => {
                        if (next[category].pressureOptions) {
                            next[category].pressureOptions[key] = pUpdates[key];
                        }
                    });
                } else {
                    // Sirf backDesign cross-garment sync hoga — baaki sab sirf active category pe
                    Object.keys(pUpdates).forEach(key => {
                        if (key === 'backDesign') {
                            const val = pUpdates[key];
                            ['T-SHIRT', 'SWEATSHIRT', 'HOODIE', 'ZIPPERHOODIE'].forEach(cat => {
                                if (next[cat]) next[cat].pressureOptions.backDesign = val;
                            });
                            return;
                        }

                        // Baaki sab updates sirf active category pe apply karo — NO cross-garment sync
                        if (next[category].pressureOptions && next[category].pressureOptions.hasOwnProperty(key)) {
                            next[category].pressureOptions[key] = pUpdates[key];
                        } else if (next[category].pressureOptions) {
                            // Key exist nahi karti toh bhi set karo (naye fields ke liye)
                            next[category].pressureOptions[key] = pUpdates[key];
                        }
                    });
                }
            }

            // Apply any non-sync updates directly
            Object.keys(updates).forEach(key => {
                if (key !== 'selectedColor' && key !== 'selectedSize' && key !== 'pressureOptions') {
                    next[category][key] = updates[key];
                }
            });

            // 2. Schedule parent state update
            setCustomizations(next);

            // Save to history for Change Control
            setHistory(h => {
                const newH = [...h.slice(0, historyIndex + 1), JSON.parse(JSON.stringify(next))].slice(-10);
                setHistoryIndex(newH.length - 1);
                setUndoAvailable(newH.length > 1);
                return newH;
            });

            return next;
        });
    };

    const handleUndo = () => {
        if (historyIndex > 0) {
            const prevIndex = historyIndex - 1;
            const prevState = history[prevIndex];
            setCustomizations(prevState);
            setAllSelections(prevState);
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
                setCustomizations(newSelections);

                // Push to local UNDO history so user can revert this restoration
                setHistory(h => {
                    const newH = [...h.slice(0, historyIndex + 1), JSON.parse(JSON.stringify(newSelections))].slice(-10);
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

    // Save Design — garment selection modal
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [saveGarmentSelection, setSaveGarmentSelection] = useState({});

    const handleSaveClick = () => {
        if (isLocked && !isAdmin) {
            message.warning("Order is locked and cannot be saved.");
            return;
        }
        // Build list of configured garments for user to pick from
        const configured = {};
        Object.entries(allSelections).forEach(([type, options]) => {
            if (isGarmentConfigured(type, options)) {
                configured[type] = true; // pre-select all configured
            }
        });
        if (Object.keys(configured).length === 0) {
            message.warning("Pehle koi garment configure karein.");
            return;
        }
        setSaveGarmentSelection(configured);
        setShowSaveModal(true);
    };

    const handleSaveOrder = async (selectedTypes) => {
        setIsSaving(true);
        setShowSaveModal(false);
        try {
            const garments = selectedTypes.map(type => {
                const designConfig = { ...(allSelections[type].pressureOptions || {}) };

                // Add URLs for all flags and predefined logos
                const logosList = useLogoStore.getState().logos || [];
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
                    selectedColor: allSelections[type].selectedColor,
                    selectedSize: allSelections[type].selectedSize,
                    design_config: designConfig
                };
            });

            const response = await placeOrder({
                student_id: user?.id,
                class_id: user?.class_id,
                garments,
                delivery_details: existingDeliveryDetails || {},
                logo_id: null
            });

            if (response.data?.success) {
                const savedData = response.data.data;
                const requiresPayment = savedData?.requires_additional_payment || savedData?.balance_due > 0;

                // If edit-window and new products added → redirect to Stripe immediately
                if (requiresPayment && savedData?.orderId) {
                    message.info("Design saved! Redirecting to payment for new products…");
                    try {
                        const payRes = await createCheckoutSession({ orderId: savedData.orderId });
                        if (payRes.data?.url) {
                            window.location.href = payRes.data.url;
                            return;
                        }
                    } catch (payErr) {
                        console.error("Payment redirect failed:", payErr);
                        message.warning("Design saved. Please pay the balance from the dashboard.");
                    }
                } else {
                    message.success("Design saved successfully!");
                }

                await fetchOrderData();
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

        // Stale localStorage read hata diya — allSelections hi hamesha authoritative/fresh state hai
        // (localStorage write App.jsx mein 800ms debounce hai, isliye seedha localStorage padhna purana data de sakta hai)
        const latestSelections = allSelections;
        const menuIndex = menuItems.findIndex(item => item.name === activeMenu);
        if (menuIndex !== -1) {
            const pageNum = menuIndex + 1;
            // Sirf tab bhejo jab page number actually badla ho — garmentTab switch
            // (Size <-> Design) par pageNum same rehta hai, isliye repeat postMessage nahi jayega
            const shouldSendPage = lastSentPageRef.current !== pageNum;
            if (shouldSendPage) lastSentPageRef.current = pageNum;
            console.log("shouldSendPage", shouldSendPage);

            ['preview-iframe', 'preview-iframe2'].forEach((id) => {
                const iframe = document.getElementById(id);
                if (iframe?.contentWindow) {
                    // 1. Switch Page — sirf tab jab page number naya ho
                    if (shouldSendPage) {
                        iframe.contentWindow.postMessage(`Page : ${pageNum}`, "*");
                    }
                    // iframe.contentWindow.postMessage('Tilvælg:no', "*");

                    // 2. Initial state sync for the new model
                    setTimeout(() => {
                        const currentIframe = document.getElementById(id);
                        if (currentIframe?.contentWindow) {
                            const currentData = latestSelections[activeMenu];
                            if (currentData) {
                                const { selectedColor, selectedSize } = currentData;
                                const key = `${activeMenu}:${selectedColor}:${selectedSize}`;

                                // Safety-net effect ne pehle hi ye bhej diya ho to skip karo
                                if (lastSentKeyRef.current !== key) {
                                    lastSentKeyRef.current = key;

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
                                        if (selectedColor) currentIframe.contentWindow.postMessage(`${prefix}${selectedColor.toLowerCase()}`, "*");
                                        if (selectedSize) currentIframe.contentWindow.postMessage(`${prefix}size:${selectedSize}`, "*");
                                    }
                                }
                            }
                        }
                        // Trigger re-send of back design without remounting component
                        window.dispatchEvent(new Event("resendBackDesign"));
                    }, 300);
                }
            });

            setTimeout(() => {
                // setAllSelections(JSON.parse(JSON.stringify(latestSelections)));
                window.dispatchEvent(new Event("resendBackDesign"));
            }, 650);
        }
    }, [activeMenu, garmentTab, isAppReady]);
    // On initial load, if saved garment data is already present, immediately resend
    // the relevant preview messages so flag/logo payloads aren't stuck behind a tab switch.
    // useEffect(() => {
    //     if (!isAppReady || !allSelections?.[activeMenu]) return;

    //     const currentData = allSelections[activeMenu];
    //     const prefixMap = {
    //         'T-SHIRT': 'T-Shirt: ',
    //         'SWEATSHIRT': 'SweatShirt: ',
    //         'HOODIE': 'Hoodie: ',
    //         'ZIPPERHOODIE': 'ZipperHoodie: ',
    //         'SWEATPANTS': 'SweatPant: ',
    //         'SHORTS': 'Short: '
    //     };
    //     const prefix = prefixMap[activeMenu];

    //     ['preview-iframe', 'preview-iframe2'].forEach((id) => {
    //         const iframe = document.getElementById(id);
    //         if (iframe?.contentWindow) {
    //             if (prefix) {
    //                 if (currentData.selectedColor) iframe.contentWindow.postMessage(`${prefix}${currentData.selectedColor.toLowerCase()}`, "*");
    //                 if (currentData.selectedSize) iframe.contentWindow.postMessage(`${prefix}size:${currentData.selectedSize}`, "*");
    //             }
    //         }
    //     });

    //     window.dispatchEvent(new Event("resendBackDesign"));
    // }, [isAppReady, activeMenu, allSelections]);
    // Safety-net: first load pe (default T-SHIRT tab) bhi flags/logos postMessage
    // ek dafa force-resync ho jaye, jaisa tab-switch pe hota hai.
    // PlayCanvas ka asset/texture load app:ready ke baad bhi thodi der le sakta hai,
    // isliye ek single timer ki bajaye multiple retries karte hain taake reliably catch ho jaye.
    // useEffect(() => {
    //     if (!isAppReady || !allSelectionsRef.current?.[activeMenu]) return;

    //     const currentData = allSelectionsRef.current[activeMenu];
    //     const prefixMap = {
    //         'T-SHIRT': 'T-Shirt: ',
    //         'SWEATSHIRT': 'SweatShirt: ',
    //         'HOODIE': 'Hoodie: ',
    //         'ZIPPERHOODIE': 'ZipperHoodie: ',
    //         'SWEATPANTS': 'SweatPant: ',
    //         'SHORTS': 'Short: '
    //     };
    //     const prefix = prefixMap[activeMenu];

    //     ['preview-iframe', 'preview-iframe2'].forEach((id) => {
    //         const iframe = document.getElementById(id);
    //         if (iframe?.contentWindow) {
    //             if (prefix) {
    //                 if (currentData.selectedColor) iframe.contentWindow.postMessage(`${prefix}${currentData.selectedColor.toLowerCase()}`, "*");
    //                 if (currentData.selectedSize) iframe.contentWindow.postMessage(`${prefix}size:${currentData.selectedSize}`, "*");
    //             }
    //         }
    //     });

    //     window.dispatchEvent(new Event("resendBackDesign"));
    // }, [isAppReady, activeMenu]);
    useEffect(() => {
        if (!isAppReady || !allSelectionsRef.current?.[activeMenu]) return;

        const currentData = allSelectionsRef.current[activeMenu];

        // Dedupe: agar same garment + same color + same size pehle hi bheja ja chuka hai,
        // to Effect #1 (Page-switch effect) ke sath duplicate mat bhejo
        const key = `${activeMenu}:${currentData.selectedColor}:${currentData.selectedSize}`;
        if (lastSentKeyRef.current === key) return;
        lastSentKeyRef.current = key;

        const prefixMap = {
            'T-SHIRT': 'T-Shirt: ',
            'SWEATSHIRT': 'SweatShirt: ',
            'HOODIE': 'Hoodie: ',
            'ZIPPERHOODIE': 'ZipperHoodie: ',
            'SWEATPANTS': 'SweatPant: ',
            'SHORTS': 'Short: '
        };
        const prefix = prefixMap[activeMenu];

        ['preview-iframe', 'preview-iframe2'].forEach((id) => {
            const iframe = document.getElementById(id);
            if (iframe?.contentWindow) {
                if (prefix) {
                    if (currentData.selectedColor) iframe.contentWindow.postMessage(`${prefix}${currentData.selectedColor.toLowerCase()}`, "*");
                    if (currentData.selectedSize) iframe.contentWindow.postMessage(`${prefix}size:${currentData.selectedSize}`, "*");
                }
            }
        });

        window.dispatchEvent(new Event("resendBackDesign"));
    }, [isAppReady, activeMenu]);
    const didInitialForceSync = useRef(false);
    useEffect(() => {
        if (!isAppReady || didInitialForceSync.current) return;
        didInitialForceSync.current = true;

        const doSync = () => {
            // "Page : X" message ko yaha retries se hata diya gaya hai.
            // Ab Page message deduplicate hokar sirf main useEffect se hi jayega (jahan lastSentPageRef laga hai).
            window.dispatchEvent(new Event("resendBackDesign"));
        };

        // Multiple retries — 1s, 2.5s, 4s — taake variable load time cover ho jaye
        const timers = [1000, 2500, 4000].map(delay => setTimeout(doSync, delay));

        return () => timers.forEach(clearTimeout);
    }, [isAppReady]);
    useEffect(() => {
        const handleMessage = (event) => {
            if (event.data === 'app:ready') {
                setIsAppReady(true);
            }
        };

        window.addEventListener('message', handleMessage);

        // Fallback: agar 15 seconds mein app:ready nahi aaya (WebGL fail etc.)
        // toh bhi isAppReady true kar do taake UI block na ho
        const fallbackTimer = setTimeout(() => {
            setIsAppReady(prev => {
                if (!prev) {
                    console.warn("PlayCanvas app:ready timeout — WebGL may not be supported. Enabling UI anyway.");
                }
                return true;
            });
        }, 15000);

        return () => {
            window.removeEventListener('message', handleMessage);
            clearTimeout(fallbackTimer);
        };
    }, []);

    const allSelectionsRef = React.useRef(allSelections);
    useEffect(() => { allSelectionsRef.current = allSelections; }, [allSelections]);

    // Removed redundant isAppReady effect that was causing unnecessary state updates and re‑renders.

    useEffect(() => {
        if (customizations && Object.keys(customizations).length > 0) {
            setAllSelections(customizations);
        } else {
            setAllSelections(DEFAULT_SELECTIONS);
        }
    }, [customizations]);
    return (
        <>
            <Tour
                open={tourOpen}
                onClose={() => setTourOpen(false)}
                steps={activeTourSteps}
                okButtonProps={{ style: { backgroundColor: '#008235', color: '#fff' } }}
                cancelButtonProps={{ style: { color: '#008235' } }} />

            {/* ── Copy Design Prompt Modal ── */}
            {copyDesignPrompt && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800 mb-2">
                            Copy Design?
                        </h3>
                        <p className="text-sm text-slate-500 mb-6">
                            Du har konfigureret en <span className="font-bold text-green-700">{copyDesignPrompt.from}</span>.
                            Vil du også kopiere dette design til <span className="font-bold text-green-700">{copyDesignPrompt.to}</span>
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    // Copy pressureOptions from source to target — via handleUpdateSelection
                                    // taake customizations (parent state) bhi update ho aur localStorage autosave/undo history ke saath sync rahe
                                    // Field names bhi target garment ke schema mein translate hote hain (Chest<->Leg), warna
                                    // SHORTS/SWEATPANTS jaise garments pe chest/sleeve fields ghuskar pollute kar dete hain
                                    const sourceData = allSelections[copyDesignPrompt.from];
                                    const mappedOptions = mapPressureOptionsForGarment(
                                        sourceData.pressureOptions,
                                        copyDesignPrompt.from,
                                        copyDesignPrompt.to
                                    );
                                    handleUpdateSelection(copyDesignPrompt.to, {
                                        pressureOptions: mappedOptions
                                    });
                                    setActiveMenu(copyDesignPrompt.to);
                                    setCopyDesignPrompt(null);
                                }}
                                className="flex-1 py-2.5 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-all"
                            >
                                Haan, Copy Karo
                            </button>
                            <button
                                onClick={() => {
                                    setActiveMenu(copyDesignPrompt.to);
                                    setCopyDesignPrompt(null);
                                }}
                                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
                            >
                                Nahi, Alag Rakho
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Save Design — Garment Selection Modal ── */}
            {showSaveModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800 mb-1">Select Garments to Save</h3>
                        <p className="text-sm text-slate-500 mb-5">Select items to include in your order</p>
                        <div className="space-y-3 mb-6">
                            {Object.entries(saveGarmentSelection).map(([type, checked]) => (
                                <label key={type} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-green-300 cursor-pointer transition-all">
                                    <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => setSaveGarmentSelection(prev => ({ ...prev, [type]: !prev[type] }))}
                                        className="w-4 h-4 accent-green-600"
                                    />
                                    <span className="text-sm font-semibold text-slate-700">{type}</span>
                                    <span className="ml-auto text-xs font-bold text-green-600">{GARMENT_PRICES[type]} DKK</span>
                                </label>
                            ))}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    const selected = Object.entries(saveGarmentSelection)
                                        .filter(([, v]) => v).map(([k]) => k);
                                    if (selected.length === 0) {
                                        message.warning("Kam az kam ek garment select karein.");
                                        return;
                                    }
                                    handleSaveOrder(selected);
                                }}
                                className="flex-1 py-2.5 bg-green-600 text-white rounded-xl font-bold text-sm hover:bg-green-700 transition-all"
                            >
                                Save Karein
                            </button>
                            <button
                                onClick={() => setShowSaveModal(false)}
                                className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="min-h-screen lg:bg-gradient-to-br from-slate-50 to-slate-100">
                {/* Global Header */}
                <header id="global-header" className="lg:bg-white/80 backdrop-blur-md lg:border-b lg:border-slate-200 lg:px-6 px-3 lg:py-4 py-2 flex justify-between items-center sticky top-0 z-40">
                    <div className="flex items-center gap-4">
                        <div className="w-24 flex items-center justify-center">
                            <img src="clothLogo.png" alt="" />
                        </div>
                    </div>

                    <div className="flex items-center space-x-2 sm:space-x-4">
                        {undoAvailable && (
                            <button
                                onClick={handleUndo}
                                // flex items-center sm:space-x-2 p-2 sm:px-3 sm:py-2 bg-[#008235] text-white rounded-full sm:rounded-2xl hover:bg-[#00652a] transition-all font-medium text-sm border border-[#008235] cursor-pointer
                                className="flex items-center sm:space-x-2 p-2 sm:px-3 sm:py-2 bg-slate-100 text-slate-600 rounded-full sm:rounded-2xl hover:bg-slate-200 transition-all font-medium text-sm border border-slate-200"
                                title="Undo last change"
                            >
                                <Undo className="w-4 h-4 sm:w-4 sm:h-4" />
                                <span className="hidden sm:inline">Undo</span>
                            </button>
                        )}
                        {/* <button
                            onClick={handleSaveClick}
                            disabled={isSaving || (isLocked && !isAdmin)}
                            className={`flex items-center space-x-2 px-3 py-2 ${isSaving ? 'bg-slate-100' : 'bg-green-600 hover:bg-green-700'} text-white rounded-xl transition-all font-medium text-sm shadow-sm disabled:opacity-50`}
                        >
                            <Settings className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save Design'}</span>
                        </button> */}
                        {/* {dbHistory.length > 0 && (
                            <button
                                onClick={() => setIsHistoryModalOpen(true)}
                                className="flex items-center space-x-2 px-3 py-2 bg-white text-slate-600 rounded-xl hover:bg-slate-50 transition-all font-medium text-sm border border-slate-200"
                                title="View Saved Versions"
                            >
                                <History className="w-4 h-4 text-green-600" />
                                <span className="hidden sm:inline">History</span>
                            </button>
                        )} */}
                        {/* <button
                            onClick={() => setShowBackPopup(true)}
                            className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-all font-medium text-sm shadow-md"
                        >
                            <Settings className="w-4 h-4" />
                            <span className="hidden sm:inline">Design Back</span>
                            <span className="sm:hidden text-[10px]">Back</span>
                        </button> */}
                        {/* COMMENTED: Back text feature disabled */}
                        {/* <button
                            onClick={() => setShowBackTextPopup(true)}
                            className="flex items-center space-x-2 px-3 sm:px-4 py-2 bg-indigo-700 text-white rounded-xl hover:bg-indigo-800 transition-all font-medium text-sm shadow-md"
                        >
                            <Type className="w-4 h-4" />
                            <span className="hidden sm:inline">Back Text</span>
                            <span className="sm:hidden text-[10px]">Text</span>
                        </button> */}

                        {/* Tour Guide Button */}
                        <Popover
                            content={
                                <div className="flex flex-col p-1 max-w-[240px]">
                                    <div className="flex items-start gap-3 mb-4">

                                        <span className="text-[14px] font-semibold text-slate-700 leading-snug">
                                            Vil du have en hurtig rundvisning? Klik her for at komme i gang.
                                        </span>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button
                                            className="px-3 py-1.5 text-[11px] text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-md transition-all"
                                            onClick={() => {
                                                setShowTourPrompt(false);
                                                localStorage.setItem('tourPromptShown', 'false');
                                            }}
                                        >
                                            Skip
                                        </button>
                                        <button
                                            className="px-3 py-1.5 text-[11px] text-white bg-[#008235] hover:bg-[#00652a] rounded-md shadow-sm transition-all"
                                            onClick={() => {
                                                setShowTourPrompt(false);
                                                localStorage.setItem('tourPromptShown', 'true');
                                                handleStartTour(tourFeatures[0].steps);
                                            }}
                                        >
                                            Start
                                        </button>
                                    </div>
                                </div>
                            }
                            open={showTourPrompt}
                            onOpenChange={(v) => {
                                if (!v) {
                                    setShowTourPrompt(false);
                                    localStorage.setItem('tourPromptShown', 'false');
                                }
                            }}
                            placement="bottom"
                            trigger="click"
                            overlayInnerStyle={{ borderRadius: '12px', padding: '16px' }}
                        >
                            <button
                                className="flex items-center sm:space-x-2 p-2 sm:px-3 sm:py-2 bg-[#008235] text-white rounded-full sm:rounded-2xl hover:bg-[#00652a] transition-all font-medium text-sm border border-[#008235] cursor-pointer"
                                title="Guide"
                                onClick={() => handleStartTour(tourFeatures[0].steps)}
                            >
                                <HelpCircle className="w-4 h-4 sm:w-4 sm:h-4" />
                                <span className="hidden sm:inline">Guide</span>
                            </button>
                        </Popover>

                        <Dropdown
                            menu={{
                                items: [
                                    {
                                        key: 'profile',
                                        label: 'Profile',
                                        icon: <User />,
                                        onClick: () => setProfileDrawerOpen(true),
                                    },
                                    { type: 'divider' },
                                    {
                                        key: 'logout',
                                        label: 'Log ud',
                                        icon: <LogOut className="w-3.5 h-3.5" />,
                                        danger: true,
                                        onClick: handleLogout,
                                    },
                                ],
                            }}
                            trigger={['click']}
                            placement="bottomRight"
                        >
                            <button className="flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-slate-100 transition-all">
                                <Avatar
                                    size={34}
                                    style={{ backgroundColor: '#16a34a', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}
                                >
                                    {user?.name?.charAt(0)?.toUpperCase() || 'S'}
                                </Avatar>
                                <span className="hidden sm:inline text-sm font-semibold text-slate-700 max-w-[100px] truncate">
                                    {user?.name || 'Student'}
                                </span>
                            </button>
                        </Dropdown>
                    </div>
                </header>


                {/* Status Bar for Locked / Deadline / Progress */}
                <div className="hidden lg:flex bg-white border-b border-slate-200 lg:px-6 px-3 py-2 flex items-center justify-between shadow-sm">
                    <div className="flex items-center lg:gap-4 gap-1.5 flex-wrap">
                        {/* Items configured */}
                        <div className="flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5 text-green-600" />
                            <span className="text-xs font-semibold text-slate-600">
                                {Object.entries(allSelections).filter(([type, options]) => isGarmentConfigured(type, options)).length} configured
                            </span>
                        </div>

                        <div className="hidden md:block w-px h-4 bg-slate-200" />

                        {/* Price */}
                        <div className="hidden md:flex items-center gap-1.5">
                            <span className="text-xs text-slate-400 font-medium">Price</span>
                            <span className="text-xs font-bold text-slate-700">{GARMENT_PRICES[activeMenu]} DKK</span>
                        </div>

                        {/* Paid */}
                        {amountPaid > 0 && (
                            <>
                                <div className="w-px h-4 bg-slate-200" />
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs text-slate-400 font-medium">Paid</span>
                                    <span className="text-xs font-bold text-green-600">{amountPaid} DKK</span>
                                </div>
                            </>
                        )}

                        {processStatus ? (() => {
                            const psMap = {
                                on_hold: { label: 'On Hold – Editing open', dot: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
                                pending_payment: { label: 'Payment Processing…', dot: 'bg-yellow-400 animate-pulse', text: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
                                locked_awaiting_payment: { label: 'Awaiting Payment', dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50 border-red-200' },
                                partial_paid: { label: 'Partial Paid – Balance Due', dot: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
                                paid: { label: isLocked ? 'Paid  – Order locked' : editWindowOpen ? 'Paid   – Edit window open' : 'Paid  ', dot: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50 border-green-200' },
                                in_production: { label: 'In Production', dot: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
                                production: { label: 'In Production', dot: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
                                dispatched: { label: 'Dispatched', dot: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
                            };
                            const ps = psMap[processStatus];
                            if (!ps) return null;
                            const balanceDueVal = paymentBreakdown?.balance_due || 0;
                            return (
                                <div key="process-badge" className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold tracking-wider ${ps.bg} ${ps.text}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ps.dot}`} />
                                    <span>{ps.label}</span>
                                    {processStatus === 'pending_payment' && isPolling && (
                                        <span className="ml-1 flex items-center gap-1 text-yellow-700 font-bold">
                                            <span className="w-2.5 h-2.5 border border-yellow-600 border-t-transparent rounded-full animate-spin inline-block" />
                                            Checking…
                                        </span>
                                    )}
                                    {(processStatus === 'locked_awaiting_payment' || processStatus === 'partial_paid') && !isAdmin && (
                                        <button
                                            key="pay-now-btn"
                                            onClick={handlePayNow}
                                            disabled={isPayingBalance}
                                            className={`ml-1 underline font-bold transition-colors ${processStatus === 'partial_paid' ? 'text-orange-700 hover:text-orange-900' : 'text-red-700 hover:text-red-900'}`}
                                        >
                                            {isPayingBalance ? 'Opening...' : processStatus === 'partial_paid' ? `Pay ${balanceDueVal.toFixed(2)} DKK` : 'Pay Now'}
                                        </button>
                                    )}
                                </div>
                            );
                        })() : null}
                        {/* (
                            <span key="payment-fallback" className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                                paymentStatus === 'partial' ? 'bg-orange-100 text-orange-700' :
                                    'bg-slate-100 text-slate-500'
                                }`}>
                                {paymentStatus}
                            </span>
                        ) */}
                        {/* Class tracking status */}
                        {classStatus && (() => {
                            const statusMap = {
                                // active: { label: 'Order in progress', color: 'bg-blue-100 text-blue-700' },
                                orders_locked: { label: 'Order locked – going to production', color: 'bg-orange-100 text-orange-700' },
                                production_ready: { label: 'Being produced', color: 'bg-purple-100 text-purple-700' },
                                shipped: { label: 'Shipped – check email for tracking', color: 'bg-indigo-100 text-indigo-700' },
                                completed: { label: 'Delivered', color: 'bg-green-100 text-green-700' },
                            };
                            const s = statusMap[classStatus];
                            if (!s) return null;
                            return (
                                <>
                                    <div className="w-px h-4 bg-slate-200" />
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider ${s.color}`}>
                                        {s.label}
                                    </span>
                                </>
                            );
                        })()}

                        {/* Back Design Approval Status */}
                        {backDesignStatus && (() => {
                            const statusMap = {
                                pending: { label: 'Back Design: Pending Review', color: 'bg-yellow-100 text-yellow-700' },
                                approved: { label: 'Back Design: Approved  ', color: 'bg-green-100 text-green-700' },
                                rejected: { label: 'Back Design: Rejected', color: 'bg-red-100 text-red-700' },
                            };
                            const s = statusMap[backDesignStatus];
                            if (!s) return null;
                            return (
                                <>
                                    <div className="w-px h-4 bg-slate-200" />
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider ${s.color}`}>
                                        {s.label}
                                    </span>
                                </>
                            );
                        })()}

                        {/* Edit deadline */}
                        {editDeadline && !isLocked && (
                            <>
                                <div className="w-px h-4 bg-slate-200" />
                                <div className="flex items-center gap-1.5">
                                    <History className="w-3.5 h-3.5 text-yellow-500" />
                                    <span className={`text-xs font-semibold ${new Date() > editDeadline ? 'text-red-500' : 'text-slate-500'}`}>
                                        Edit: {editDeadline.toLocaleDateString()} {new Date() > editDeadline && '· Expired'}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                </div>



                <div className="hidden lg:flex h-[calc(96vh-80px)] w-full relative">
                    {/* Sidebar */}
                    <div className="flex flex-col h-full border-r border-slate-200 bg-white shadow-xl z-10 lg:w-[600px] w-[450px]">
                        <div className='flex flex-1 min-h-0'>
                            <div id="garment-menu" className="bg-white/70 border-r border-slate-200 overflow-y-auto firstdiv custom-scrollbar-premium min-w-[100px]">
                                <div className="lg:p-6 p-3">
                                    <h2 className="text-sm font-semibold text-center text-slate-600 uppercase tracking-wider mb-4">
                                        Clothing
                                    </h2>
                                    <nav className="">
                                        {menuItems.map((item, index) => (
                                            <button
                                                key={index}
                                                onClick={() => {
                                                    // Agar current garment configured hai aur naya garment configured nahi
                                                    // toh copy karne ka poochho
                                                    const currentConfigured = isGarmentConfigured(activeMenu, allSelections[activeMenu]);
                                                    const targetConfigured = isGarmentConfigured(item.name, allSelections[item.name]);
                                                    if (
                                                        item.name !== activeMenu &&
                                                        currentConfigured &&
                                                        !targetConfigured
                                                    ) {
                                                        setCopyDesignPrompt({ from: activeMenu, to: item.name });
                                                    } else {
                                                        setActiveMenu(item.name);
                                                    }
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
                                {/* Tab Navigation — top */}
                                <div className="px-6 pt-4 pb-2">
                                    <div id="color-size-tabs" className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                                        <button
                                            id="color-size-tab-btn"
                                            onClick={() => setGarmentTab('size')}
                                            className={`flex-1 py-2.5 text-sm font-semibold transition-all rounded-xl ${garmentTab === 'size' ? 'bg-green-700 text-white' : 'text-gray-500 bg-white hover:bg-gray-50'}`}
                                        >
                                            Color & Size
                                        </button>
                                        <button
                                            id="design-tab-btn"
                                            onClick={() => setGarmentTab('pressure')}
                                            className={`flex-1 py-2.5 text-sm font-semibold transition-all rounded-xl ${garmentTab === 'pressure' ? 'bg-green-700 text-white' : 'text-gray-500 bg-white hover:bg-gray-50'}`}
                                        >
                                            Design
                                        </button>
                                    </div>
                                </div>
                                <div id="main-content" className="lg:p-6 p-3 lg:space-y-8 space-y-4">

                                    {activeMenu === 'T-SHIRT' && <Tshirt key="tshirt" isAppReady={isAppReady} logos={logos} data={allSelections['T-SHIRT']} onUpdate={(updates) => handleUpdateSelection('T-SHIRT', updates)} backDesigns={backDesigns} maxCharsText={getMaxCharsClothText()} activeTab={garmentTab} />}
                                    {activeMenu === "SWEATSHIRT" && <SweatShirt key="sweatshirt" isAppReady={isAppReady} logos={logos} data={allSelections['SWEATSHIRT']} onUpdate={(updates) => handleUpdateSelection('SWEATSHIRT', updates)} backDesigns={backDesigns} maxCharsText={getMaxCharsClothText()} activeTab={garmentTab} />}
                                    {activeMenu === "HOODIE" && <Hoodie key="hoodie" isAppReady={isAppReady} logos={logos} data={allSelections['HOODIE']} onUpdate={(updates) => handleUpdateSelection('HOODIE', updates)} backDesigns={backDesigns} maxCharsText={getMaxCharsClothText()} activeTab={garmentTab} />}
                                    {activeMenu === "ZIPPERHOODIE" && <ZippedHoodie key="zipper" isAppReady={isAppReady} logos={logos} data={allSelections['ZIPPERHOODIE']} onUpdate={(updates) => handleUpdateSelection('ZIPPERHOODIE', updates)} backDesigns={backDesigns} maxCharsText={getMaxCharsClothText()} activeTab={garmentTab} />}
                                    {activeMenu === "SWEATPANTS" && <SweatPants key="sweatpants" isAppReady={isAppReady} logos={logos} data={allSelections['SWEATPANTS']} onUpdate={(updates) => handleUpdateSelection('SWEATPANTS', updates)} maxCharsText={getMaxCharsClothText()} activeTab={garmentTab} />}
                                    {activeMenu === "SHORTS" && <Shorts key="shorts" isAppReady={isAppReady} logos={logos} data={allSelections['SHORTS']} onUpdate={(updates) => handleUpdateSelection('SHORTS', updates)} maxCharsText={getMaxCharsClothText()} activeTab={garmentTab} />}
                                </div>
                            </div>
                        </div>
                        <div id="price-summary" className=" border-slate-200 p-6 bg-white/50 backdrop-blur-sm">
                            <div className="mb-4 space-y-1.5">
                                <div className="flex justify-between items-center pt-1.5">
                                    <span className="text-sm font-semibold text-slate-700">Price</span>
                                    <span className="text-2xl font-bold text-slate-900">{GARMENT_PRICES[activeMenu]} DKK</span>
                                </div>
                            </div>
                            {/* pending_payment — payment being confirmed by Stripe */}
                            {processStatus === 'pending_payment' && (
                                <div className="mb-4 flex items-center gap-2 px-4 py-3 bg-yellow-50 border border-yellow-200 rounded-xl">
                                    <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                                    <div className="flex-1">
                                        <p className="text-xs font-bold text-yellow-800">Payment being confirmed…</p>
                                        <p className="text-[10px] text-yellow-600">Stripe is processing. Refresh in a few seconds.</p>
                                    </div>
                                    <button
                                        onClick={handleRefreshStatus}
                                        className="text-xs font-bold text-yellow-700 underline hover:text-yellow-900 flex-shrink-0"
                                    >
                                        {isRefreshing ? '…' : 'Refresh'}
                                    </button>
                                </div>
                            )}

                            <button
                                onClick={() => {
                                    if (processStatus === 'partial_paid' && (paymentBreakdown?.balance_due || 0) > 0) {
                                        handlePayNow();
                                    } else if ((processStatus === 'paid' && !editWindowOpen) || (isLocked && !isAdmin)) {
                                        // Edit window closed — nothing to do
                                    } else {
                                        setIsQuoteModalOpen(true);
                                    }
                                }}
                                disabled={
                                    !sizeFlag ||
                                    isPayingBalance ||
                                    processStatus === 'pending_payment' ||
                                    (processStatus === 'paid' && !editWindowOpen) ||
                                    (isLocked && !isAdmin)
                                }
                                className={`w-full py-3 rounded-xl font-semibold transition-all duration-200 shadow-md
                                    ${(processStatus === 'pending_payment') || (processStatus === 'paid' && !editWindowOpen) || (isLocked && !isAdmin)
                                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                        : !sizeFlag
                                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                                            : processStatus === 'partial_paid'
                                                ? "bg-gradient-to-r from-orange-500 to-orange-600 text-white hover:from-orange-600 hover:to-orange-700 hover:shadow-lg"
                                                : processStatus === 'paid' && editWindowOpen
                                                    ? "bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 hover:shadow-lg"
                                                    : "bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 hover:shadow-lg"
                                    }`}
                            >
                                {isPayingBalance
                                    ? 'Opening payment…'
                                    : processStatus === 'pending_payment'
                                        ? 'Awaiting payment confirmation…'
                                        : isLocked && !isAdmin
                                            ? 'Order Locked'
                                            : processStatus === 'partial_paid' && (paymentBreakdown?.balance_due || 0) > 0
                                                ? `Betal restbeløbet – ${(paymentBreakdown?.balance_due || 0).toFixed(2)} DKK`
                                                : processStatus === 'paid' && editWindowOpen
                                                    ? 'Tilføj flere produkter og betal'
                                                    : processStatus === 'paid' && !editWindowOpen
                                                        ? 'Redigeringsvinduet er lukket'
                                                        : 'Godkend og betal'
                                }
                            </button>
                        </div>
                    </div>
                    {/* Main Content Area */}
                    <div className="flex flex-1 h-full">
                        {/* Preview Panel */}
                        <div className="flex-1">
                            <div className="bg-white/50  h-full flex flex-col border border-slate-200">
                                <div className="flex-1 overflow-hidden relative">
                                    {/* {!isIframeLoaded && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 z-10">
                                            <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                                            <p className="text-sm text-slate-500">Loading 3D Preview...</p>
                                        </div>
                                    )} */}
                                    <iframe
                                        id="preview-iframe"
                                        src={'https://playcanv.as/e/p/1b1eadeb/'}
                                        className="w-full h-full"
                                        frameBorder="0"
                                        title="3D Student Card Preview"
                                        onLoad={() => setIsIframeLoaded(true)}
                                        onError={() => setIsIframeLoaded(true)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div id="main-content-mobile" className="lg:hidden flex flex-col flex-1 overflow-y-auto relative">
                    <div className="overflow-hiddenshrink-0" style={{ height: '300px' }}>
                        <iframe
                            id="preview-iframe2"
                            src={'https://playcanv.as/e/p/1b1eadeb/'}
                            className="w-full h-full"
                            frameBorder="0"
                            title="3D Preview"
                            onLoad={() => setIsIframeLoaded(true)}
                            onError={() => setIsIframeLoaded(true)}
                        />
                    </div>

                    {/* ── Product strip (garment selector) ── */}
                    <div id="garment-menu-mobile" className="bg-white border-b border-slate-200 sticky top-0 z-10">
                        <div className="px-3 py-2">
                            <div className="flex overflow-x-auto gap-1 scrollbar-none" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                                {menuItems.map((item, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setActiveMenu(item.name)}
                                        className={`flex-shrink-0 flex flex-col items-center p-2 rounded-xl transition-all duration-200 min-w-[52px] ${activeMenu === item.name
                                            ? 'bg-green-50 border border-green-200 shadow-sm'
                                            : 'hover:bg-slate-50'
                                            }`}
                                    >
                                        <img src={item.icon} alt={item.name} className="w-7 h-7 object-contain" />
                                        {activeMenu === item.name && (
                                            <div className="mt-0.5 w-1.5 h-1.5 bg-green-500 rounded-full" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="md:hidden  bg-white border-b border-slate-200 lg:px-6 px-3 py-2 flex items-center justify-between shadow-sm">
                        <div className="flex items-center lg:gap-4 gap-1.5 flex-wrap">
                            {/* Items configured */}
                            <div className="flex items-center gap-1.5">
                                <Package className="w-3.5 h-3.5 text-green-600" />
                                <span className="text-xs font-semibold text-slate-600">
                                    {Object.entries(allSelections).filter(([type, options]) => isGarmentConfigured(type, options)).length} configured
                                </span>
                            </div>

                            <div className="hidden md:block w-px h-4 bg-slate-200" />

                            {/* Price */}
                            <div className="hidden md:flex items-center gap-1.5">
                                <span className="text-xs text-slate-400 font-medium">Price</span>
                                <span className="text-xs font-bold text-slate-700">{GARMENT_PRICES[activeMenu]} DKK</span>
                            </div>

                            {/* Paid */}
                            {amountPaid > 0 && (
                                <>
                                    <div className="w-px h-4 bg-slate-200" />
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs text-slate-400 font-medium">Paid</span>
                                        <span className="text-xs font-bold text-green-600">{amountPaid} DKK</span>
                                    </div>
                                </>
                            )}

                            {processStatus ? (() => {
                                const psMap = {
                                    on_hold: { label: 'On Hold – Editing open', dot: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
                                    pending_payment: { label: 'Payment Processing…', dot: 'bg-yellow-400 animate-pulse', text: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
                                    locked_awaiting_payment: { label: 'Awaiting Payment', dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50 border-red-200' },
                                    partial_paid: { label: 'Partial Paid – Balance Due', dot: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
                                    paid: { label: isLocked ? 'Paid  – Order locked' : editWindowOpen ? 'Paid   – Edit window open' : 'Paid  ', dot: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50 border-green-200' },
                                    in_production: { label: 'In Production', dot: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
                                    production: { label: 'In Production', dot: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
                                    dispatched: { label: 'Dispatched', dot: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
                                };
                                const ps = psMap[processStatus];
                                if (!ps) return null;
                                const balanceDueVal = paymentBreakdown?.balance_due || 0;
                                return (
                                    <div key="process-badge" className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold tracking-wider ${ps.bg} ${ps.text}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ps.dot}`} />
                                        <span>{ps.label}</span>
                                        {processStatus === 'pending_payment' && isPolling && (
                                            <span className="ml-1 flex items-center gap-1 text-yellow-700 font-bold">
                                                <span className="w-2.5 h-2.5 border border-yellow-600 border-t-transparent rounded-full animate-spin inline-block" />
                                                Checking…
                                            </span>
                                        )}
                                        {(processStatus === 'locked_awaiting_payment' || processStatus === 'partial_paid') && !isAdmin && (
                                            <button
                                                key="pay-now-btn"
                                                onClick={handlePayNow}
                                                disabled={isPayingBalance}
                                                className={`ml-1 underline font-bold transition-colors ${processStatus === 'partial_paid' ? 'text-orange-700 hover:text-orange-900' : 'text-red-700 hover:text-red-900'}`}
                                            >
                                                {isPayingBalance ? 'Opening...' : processStatus === 'partial_paid' ? `Pay ${balanceDueVal.toFixed(2)} DKK` : 'Pay Now'}
                                            </button>
                                        )}
                                    </div>
                                );
                            })() : null}
                            {/* (
                            <span key="payment-fallback" className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                                paymentStatus === 'partial' ? 'bg-orange-100 text-orange-700' :
                                    'bg-slate-100 text-slate-500'
                                }`}>
                                {paymentStatus}
                            </span>
                        ) */}
                            {/* Class tracking status */}
                            {classStatus && (() => {
                                const statusMap = {
                                    // active: { label: 'Order in progress', color: 'bg-blue-100 text-blue-700' },
                                    orders_locked: { label: 'Order locked – going to production', color: 'bg-orange-100 text-orange-700' },
                                    production_ready: { label: 'Being produced', color: 'bg-purple-100 text-purple-700' },
                                    shipped: { label: 'Shipped – check email for tracking', color: 'bg-indigo-100 text-indigo-700' },
                                    completed: { label: 'Delivered', color: 'bg-green-100 text-green-700' },
                                };
                                const s = statusMap[classStatus];
                                if (!s) return null;
                                return (
                                    <>
                                        <div className="w-px h-4 bg-slate-200" />
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider ${s.color}`}>
                                            {s.label}
                                        </span>
                                    </>
                                );
                            })()}

                            {/* Back Design Approval Status */}
                            {backDesignStatus && (() => {
                                const statusMap = {
                                    pending: { label: 'Back Design: Pending Review', color: 'bg-yellow-100 text-yellow-700' },
                                    approved: { label: 'Back Design: Approved  ', color: 'bg-green-100 text-green-700' },
                                    rejected: { label: 'Back Design: Rejected', color: 'bg-red-100 text-red-700' },
                                };
                                const s = statusMap[backDesignStatus];
                                if (!s) return null;
                                return (
                                    <>
                                        <div className="w-px h-4 bg-slate-200" />
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full tracking-wider ${s.color}`}>
                                            {s.label}
                                        </span>
                                    </>
                                );
                            })()}

                            {/* Edit deadline */}
                            {editDeadline && !isLocked && (
                                <>
                                    <div className="w-px h-4 bg-slate-200" />
                                    <div className="flex items-center gap-1.5">
                                        <History className="w-3.5 h-3.5 text-yellow-500" />
                                        <span className={`text-xs font-semibold ${new Date() > editDeadline ? 'text-red-500' : 'text-slate-500'}`}>
                                            Edit: {editDeadline.toLocaleDateString()} {new Date() > editDeadline && '· Expired'}
                                        </span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                    {/* ── Tab navigation (Color & Size / Design) ── */}
                    <div className="bg-white border-b border-slate-200 px-4 py-2 sticky top-[52px] z-10">
                        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                            <button
                                id="color-size-tab-btn-mobile"
                                onClick={() => setGarmentTab('size')}
                                className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${garmentTab === 'size' ? 'bg-green-700 text-white' : 'text-gray-500 bg-white'}`}
                            >
                                Color & Size
                            </button>
                            <button
                                id="design-tab-btn-mobile"
                                onClick={() => setGarmentTab('pressure')}
                                className={`flex-1 py-2 text-sm font-semibold rounded-xl transition-all ${garmentTab === 'pressure' ? 'bg-green-700 text-white' : 'text-gray-500 bg-white'}`}
                            >
                                Design
                            </button>
                        </div>
                    </div>


                    {/* ── Mobile Controls ── */}
                    <div className="lg:px-4 px-2 lg:pt-4 pt-2 pb-2 lg:space-y-4 space-y-2 shrink-0">
                        {activeMenu === 'T-SHIRT' && <Tshirt key="tshirt-mobile" isAppReady={isAppReady} logos={logos} data={allSelections['T-SHIRT']} onUpdate={(updates) => handleUpdateSelection('T-SHIRT', updates)} backDesigns={backDesigns} maxCharsText={getMaxCharsClothText()} activeTab={garmentTab} />}
                        {activeMenu === "SWEATSHIRT" && <SweatShirt key="sweatshirt-mobile" isAppReady={isAppReady} logos={logos} data={allSelections['SWEATSHIRT']} onUpdate={(updates) => handleUpdateSelection('SWEATSHIRT', updates)} backDesigns={backDesigns} maxCharsText={getMaxCharsClothText()} activeTab={garmentTab} />}
                        {activeMenu === "HOODIE" && <Hoodie key="hoodie-mobile" isAppReady={isAppReady} logos={logos} data={allSelections['HOODIE']} onUpdate={(updates) => handleUpdateSelection('HOODIE', updates)} backDesigns={backDesigns} maxCharsText={getMaxCharsClothText()} activeTab={garmentTab} />}
                        {activeMenu === "ZIPPERHOODIE" && <ZippedHoodie key="zipper-mobile" isAppReady={isAppReady} logos={logos} data={allSelections['ZIPPERHOODIE']} onUpdate={(updates) => handleUpdateSelection('ZIPPERHOODIE', updates)} backDesigns={backDesigns} maxCharsText={getMaxCharsClothText()} activeTab={garmentTab} />}
                        {activeMenu === "SWEATPANTS" && <SweatPants key="sweatpants-mobile" isAppReady={isAppReady} logos={logos} data={allSelections['SWEATPANTS']} onUpdate={(updates) => handleUpdateSelection('SWEATPANTS', updates)} maxCharsText={getMaxCharsClothText()} activeTab={garmentTab} />}
                        {activeMenu === "SHORTS" && <Shorts key="shorts-mobile" isAppReady={isAppReady} logos={logos} data={allSelections['SHORTS']} onUpdate={(updates) => handleUpdateSelection('SHORTS', updates)} maxCharsText={getMaxCharsClothText()} activeTab={garmentTab} />}
                    </div>

                    {/* ── 3D Preview ── */}


                    {/* ── Footer (price + CTA) ── */}
                    <div id="price-summary-mobile" className="border-t border-slate-200 p-4 bg-white sticky bottom-0">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-sm font-semibold text-slate-700">Price</span>
                            <span className="text-xl font-bold text-slate-900">{GARMENT_PRICES[activeMenu]} DKK</span>
                        </div>
                        <button
                            onClick={() => {
                                if (processStatus === 'partial_paid' && (paymentBreakdown?.balance_due || 0) > 0) {
                                    handlePayNow();
                                } else if ((processStatus === 'paid' && !editWindowOpen) || (isLocked && !isAdmin)) {
                                    // locked — nothing
                                } else {
                                    setIsQuoteModalOpen(true);
                                }
                            }}
                            disabled={
                                isPayingBalance ||
                                processStatus === 'pending_payment' ||
                                (processStatus === 'paid' && !editWindowOpen) ||
                                (isLocked && !isAdmin)
                            }
                            className={`w-full py-3 rounded-xl font-semibold transition-all duration-200 shadow-md ${processStatus === 'pending_payment' || (processStatus === 'paid' && !editWindowOpen) || (isLocked && !isAdmin)
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : processStatus === 'partial_paid'
                                    ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white'
                                    : 'bg-gradient-to-r from-green-600 to-green-700 text-white'
                                }`}
                        >
                            {isPayingBalance ? 'Opening payment…'
                                : processStatus === 'pending_payment' ? 'Awaiting confirmation…'
                                    : isLocked && !isAdmin ? 'Order Locked'
                                        : processStatus === 'partial_paid' && (paymentBreakdown?.balance_due || 0) > 0 ? `Pay Balance – ${(paymentBreakdown?.balance_due || 0).toFixed(2)} DKK`
                                            : processStatus === 'paid' && editWindowOpen ? 'Add More Products & Pay'
                                                : processStatus === 'paid' && !editWindowOpen ? 'Edit Window Closed'
                                                    : 'Approve and Pay'}
                        </button>
                    </div>
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
                    processStatus={processStatus}
                    editWindowOpen={editWindowOpen}
                    existingOrderId={orderId}
                    paymentBreakdown={paymentBreakdown}
                    onPayNow={handlePayNow}
                    isPayingBalance={isPayingBalance}
                    existingProductTypes={existingProductTypes}
                    isLocked={isLocked && !isAdmin}
                />
                <HistoryModal
                    isOpen={isHistoryModalOpen}
                    onClose={() => setIsHistoryModalOpen(false)}
                    history={dbHistory}
                    onRevert={handleRevertToVersion}
                    onHistoryUpdated={fetchHistoryData}
                />

                {/* ── Profile Drawer ── */}
                <Drawer
                    title={null}
                    placement="right"
                    width={360}
                    open={profileDrawerOpen}
                    onClose={() => { setProfileDrawerOpen(false); setProfileTab('info'); }}
                    styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' } }}
                    afterOpenChange={(open) => {
                        if (open) {
                            getStudentProfile().then(r => {
                                if (r.data?.success) {
                                    const d = r.data.data;
                                    setProfileData(d);
                                    profileEditForm.setFieldsValue({
                                        name: d.name,
                                        phone_number: d.phone_number || '',
                                        year_of_birth: d.year_of_birth || '',
                                        consent_production: d.consent_production,
                                        consent_marketing: d.consent_marketing,
                                    });
                                }
                            }).catch(() => { });
                        }
                    }}
                >
                    {/* Header */}
                    <div className="bg-gradient-to-br from-green-600 to-green-700 px-6 py-8 text-center flex-shrink-0">
                        <Avatar size={72} style={{ backgroundColor: '#fff', color: '#16a34a', fontSize: 28, fontWeight: 700 }}>
                            {user?.name?.charAt(0)?.toUpperCase() || 'S'}
                        </Avatar>
                        <h2 className="text-white font-bold text-lg mt-3">{profileData?.name || user?.name}</h2>
                        <p className="text-green-100 text-sm">{profileData?.email || user?.email}</p>
                        {profileData?.class?.name && (
                            <span className="inline-block mt-2 bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">
                                {profileData.class.name}
                            </span>
                        )}
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-slate-200 flex-shrink-0">
                        {[['info', 'Info'], ['edit', 'Edit'], ['password', 'Password']].map(([key, label]) => (
                            <button key={key} onClick={() => setProfileTab(key)}
                                className={`flex-1 py-2.5 text-xs font-bold transition-all ${profileTab === key ? 'border-b-2 border-green-600 text-green-700' : 'text-slate-500 hover:text-slate-700'}`}>
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto px-6 py-5">

                        {/* INFO TAB */}
                        {profileTab === 'info' && (
                            <div className="space-y-4">
                                {[
                                    ['Email', profileData?.email],
                                    ['Phone', profileData?.phone_number || '—'],
                                    ['Year of Birth', profileData?.year_of_birth || '—'],
                                    ['School', profileData?.school?.name || '—'],
                                    ['Class', profileData?.class?.name || '—'],
                                    ['Order Status', paymentStatus?.toUpperCase()],
                                    ['Amount Paid', amountPaid > 0 ? `${amountPaid} DKK` : '—'],
                                ].map(([label, val]) => (
                                    <div key={label}>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
                                        <p className="text-sm font-semibold text-slate-700">{val}</p>
                                    </div>
                                ))}
                                {/* <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Consent</p>
                                    <p className="text-xs text-slate-600">Production: {profileData?.consent_production ? '✅' : '❌'}</p>
                                    <p className="text-xs text-slate-600">Marketing: {profileData?.consent_marketing ? '✅' : '❌'}</p>
                                </div> */}
                            </div>
                        )}

                        {/* EDIT TAB */}
                        {profileTab === 'edit' && (
                            <Form form={profileEditForm} layout="vertical" size="middle"
                                onFinish={async (vals) => {
                                    setProfileSaving(true);
                                    try {
                                        const r = await updateStudentProfile(vals);
                                        if (r.data?.success) {
                                            message.success('Profile updated!');
                                            setProfileData(r.data.data);
                                        }
                                    } catch { message.error('Update failed'); }
                                    finally { setProfileSaving(false); }
                                }}
                            >
                                <Form.Item label="Name" name="name" rules={[{ required: true }]}>
                                    <Input />
                                </Form.Item>
                                <Form.Item label="Phone" name="phone_number">
                                    <Input placeholder="+45 00 00 00 00" />
                                </Form.Item>
                                <Form.Item label="Year of Birth" name="year_of_birth">
                                    <select
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:border-green-500"
                                        onChange={(e) => profileEditForm.setFieldValue('year_of_birth', e.target.value)}
                                        value={profileEditForm.getFieldValue('year_of_birth') || ''}
                                    >
                                        <option value="">Select year</option>
                                        {Array.from({ length: new Date().getFullYear() - 1949 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                            <option key={y} value={y}>{y}</option>
                                        ))}
                                    </select>
                                </Form.Item>
                                {/* <Form.Item label="Production Consent" name="consent_production" valuePropName="checked">
                                    <Switch />
                                </Form.Item>
                                <Form.Item label="Marketing Consent" name="consent_marketing" valuePropName="checked">
                                    <Switch />
                                </Form.Item> */}
                                <Form.Item>
                                    <button type="submit" disabled={profileSaving}
                                        className="w-full py-2.5 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 transition-all disabled:opacity-50">
                                        {profileSaving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </Form.Item>
                            </Form>
                        )}

                        {/* PASSWORD TAB */}
                        {profileTab === 'password' && (
                            <Form layout="vertical" size="middle"
                                onFinish={async (vals) => {
                                    if (vals.newPassword !== vals.confirmPassword) {
                                        message.error('Passwords do not match'); return;
                                    }
                                    setProfileSaving(true);
                                    try {
                                        await changePasswordAuth({ currentPassword: vals.currentPassword, newPassword: vals.newPassword });
                                        message.success('Password changed!');
                                    } catch (e) { message.error(e.response?.data?.message || 'Failed'); }
                                    finally { setProfileSaving(false); }
                                }}
                            >
                                <Form.Item label="Current Password" name="currentPassword" rules={[{ required: true }]}>
                                    <Input.Password />
                                </Form.Item>
                                <Form.Item label="New Password" name="newPassword" rules={[{ required: true, min: 6 }]}>
                                    <Input.Password />
                                </Form.Item>
                                <Form.Item label="Confirm Password" name="confirmPassword" rules={[{ required: true }]}>
                                    <Input.Password />
                                </Form.Item>
                                <Form.Item>
                                    <button type="submit" disabled={profileSaving}
                                        className="w-full py-2.5 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 transition-all disabled:opacity-50">
                                        {profileSaving ? 'Updating...' : 'Change Password'}
                                    </button>
                                </Form.Item>
                            </Form>
                        )}
                    </div>

                    <Divider style={{ margin: 0 }} />
                    <div className="px-6 py-4 flex-shrink-0">
                        <button onClick={() => { setProfileDrawerOpen(false); handleLogout(); }}
                            className="w-full flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-600 rounded-xl font-semibold text-sm hover:bg-red-100 transition-all border border-red-100">
                            <LogOut className="w-4 h-4" />
                            Log ud
                        </button>
                    </div>
                </Drawer>
            </div>
        </>
    );
};
export default StudentDashboard;
