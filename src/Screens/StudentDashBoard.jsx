// StudentDashboard.jsx (full fixed code with iframe src fixed to use null instead of empty string)
import React, { useState, useCallback, useRef, useEffect } from 'react';
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
import { useParams, useSearchParams } from 'react-router-dom';
import { GraduationCap, ChevronUp, ChevronDown, LogOut, Settings, LayoutGrid } from 'lucide-react';
import StudentPopup from '../Components/Popup';
import useLogoStore from '../store/logoStore';
import { useAuth } from '../context/AuthContext';

const StudentDashboard = ({ mode, setMode, students, customizations, setCustomizations, setShowBackPopup /*, setShowBackTextPopup */ }) => { // COMMENTED: Back text feature disabled
    const { logout } = useAuth();
    const [activeMenu, setActiveMenu] = useState('T-SHIRT');
    const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
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
    // Selected student for dropdown or individual display
    const [selectedStudent, setSelectedStudent] = useState("");

    const { logos, loading, fetchLogos } = useLogoStore();
    const userStr = localStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;
    const school_id = user?.school_id;

    useEffect(() => {
        if (school_id) {
            fetchLogos({ school_id: school_id });
        }
    }, [school_id]);

    const handleLogout = () => {
        logout();
        window.location.reload();
    };

    const handleChangeMode = () => {
        setMode(null);
        localStorage.removeItem('mode');
    };

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
                // backTexts: [] // COMMENTED: Back text feature disabled
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
                // backTexts: [] // COMMENTED: Back text feature disabled
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
                // backTexts: [] // COMMENTED: Back text feature disabled
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
                // backTexts: [] // COMMENTED: Back text feature disabled
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

    // Complete state for all components
    const [allSelections, setAllSelections] = useState(DEFAULT_SELECTIONS);

    // Jab selected student change ho → uske customizations load karo
    useEffect(() => {
        if (!selectedStudent) return;

        const studentData = customizations[selectedStudent] || DEFAULT_SELECTIONS;
        setAllSelections(studentData);
    }, [selectedStudent, customizations]);

    const handleUpdateSelection = (category, updates) => {
        setAllSelections(prev => {
            const newSelections = {
                ...prev,
                [category]: { ...prev[category], ...updates }
            };

            // SYNC LOGIC: If backDesign changed, apply to all shirt categories locally
            const isBackDesignUpdate = updates.pressureOptions &&
                updates.pressureOptions.backDesign !== undefined &&
                updates.pressureOptions.backDesign !== (prev[category]?.pressureOptions?.backDesign);

            if (isBackDesignUpdate) {
                const newBackDesign = updates.pressureOptions.backDesign;
                ['T-SHIRT', 'SWEATSHIRT', 'HOODIE', 'ZIPPERHOODIE'].forEach(cat => {
                    if (newSelections[cat]) {
                        newSelections[cat] = {
                            ...newSelections[cat],
                            pressureOptions: {
                                ...(newSelections[cat].pressureOptions || {}),
                                backDesign: newBackDesign
                            }
                        };
                    }
                });
            }

            // Save to global customizations for this student
            setCustomizations(prevCustom => {
                const nextCustom = { ...prevCustom };

                if (isBackDesignUpdate) {
                    // Sync to all students AND all categories
                    students.forEach(student => {
                        const studentName = typeof student === 'object' ? (student.name || student.id) : student;
                        const studentData = nextCustom[studentName] || {};

                        // Update all 4 categories for this student
                        const updatedStudentData = { ...studentData };
                        ['T-SHIRT', 'SWEATSHIRT', 'HOODIE', 'ZIPPERHOODIE'].forEach(cat => {
                            const categoryData = updatedStudentData[cat] || {};
                            updatedStudentData[cat] = {
                                ...categoryData,
                                pressureOptions: {
                                    ...(categoryData.pressureOptions || {}),
                                    backDesign: updates.pressureOptions.backDesign
                                }
                            };
                        });
                        nextCustom[studentName] = updatedStudentData;
                    });
                } else {
                    // Update only selected student
                    nextCustom[selectedStudent] = {
                        ...(nextCustom[selectedStudent] || {}),
                        [category]: newSelections[category]
                    };
                }

                return nextCustom;
            });

            return newSelections;
        });
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
        if (!mode) return;
        const playcanvasUrl = 'https://playcanv.as/e/p/1b1eadeb/';
        ['preview-iframe', 'preview-iframe2'].forEach(id => {
            const iframe = document.getElementById(id);
            if (iframe && !iframe.src) iframe.src = playcanvasUrl;
        });
    }, [mode]);

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
        if (!mode) return;

        const handleMessage = (event) => {
            if (event.data === 'app:ready') {
                console.log("App Ready signal received in Dashboard");
                setIsAppReady(true);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [mode]);


    useEffect(() => {
        if (students.length > 0) {
            const firstStudent = students[0];
            const initialSelection = typeof firstStudent === 'object' ? (firstStudent.name || firstStudent.id) : firstStudent;

            if (mode === "individual") {
                setSelectedStudent(initialSelection);
            } else if (mode === "batch") {
                setSelectedStudent(initialSelection);
            }
        }
    }, [mode, students]);

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
                            <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest leading-none mt-0.5">Cloth Configurator</p>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2 sm:space-x-4">
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
                            onClick={handleChangeMode}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
                            title="Change Selection Mode"
                        >
                            <LayoutGrid className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleLogout}
                            className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl transition-all font-medium text-sm"
                        >
                            <LogOut className="w-4 h-4" />
                            <span className="hidden sm:inline">Log Out</span>
                        </button>
                    </div>
                </header>

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
                                    {/* MODE + STUDENTS DISPLAY */}
                                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="p-2 bg-green-50 rounded-xl">
                                                    <LayoutGrid className="w-5 h-5 text-green-600" />
                                                </div>
                                                <div>
                                                    <h2 className="text-sm font-bold text-slate-900 leading-tight">
                                                        {mode === 'individual' ? 'Individual Configuration' : 'Batch Configuration'}
                                                    </h2>
                                                    <p className="text-xs text-slate-500 font-medium">{students.length} Students</p>
                                                </div>
                                            </div>
                                        </div>

                                        {mode === "individual" && students.length > 0 && (
                                            <div className="flex items-center space-x-2 bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-200">
                                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                                <span className="text-sm font-bold text-slate-700">
                                                    Currently Editing: {typeof selectedStudent === 'object' ? (selectedStudent.name || selectedStudent.id) : selectedStudent}
                                                </span>
                                            </div>
                                        )}

                                        {mode === "batch" && students.length > 0 && (
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Select student to edit</label>
                                                <select
                                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-green-500/20 transition-all appearance-none cursor-pointer"
                                                    value={selectedStudent}
                                                    onChange={(e) => setSelectedStudent(e.target.value)}
                                                >
                                                    {students.map((student, index) => {
                                                        const name = typeof student === 'object' ? (student.name || student.id) : student;
                                                        return (
                                                            <option key={index} value={name}>
                                                                {name}
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                            </div>
                                        )}
                                    </div>
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
                                        400 DKK
                                    </div>
                                    <div className="text-xs text-slate-500"> Service fee of 59.00 kr. included</div>
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
                                Approve and Pay
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
                                        // src={mode ? 'https://playcanv.as/e/p/i27y23x9/' : null}
                                        src={mode ? 'https://playcanv.as/e/p/1b1eadeb/' : null}
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
                                            // src={mode ? 'https://playcanv.as/e/p/i27y23x9/' : null}
                                            src={mode ? 'https://playcanv.as/e/p/1b1eadeb/' : null}
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
                                        400 DKK
                                    </div>
                                    <div className="text-xs text-slate-500">Service fee of 59.00 kr. included</div>
                                </div>
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
                    price={400}
                    packageName={packageName}
                    program={program}
                />
            </div>
        </>
    );
};
export default StudentDashboard;