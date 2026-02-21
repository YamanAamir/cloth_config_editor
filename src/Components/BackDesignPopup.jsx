import React, { useState, useEffect } from 'react';
import Test from './Test';
import img1 from '../assets/menuimages/1.png';
import img2 from '../assets/menuimages/2.png';
import img3 from '../assets/menuimages/3.png';
import img4 from '../assets/menuimages/4.png';
import img5 from '../assets/menuimages/5.png';
import img6 from '../assets/menuimages/6.png';
import { X } from 'lucide-react';

const BackDesignPopup = ({ onFinish, customizations, setCustomizations, students, backDesigns }) => {
    const [activeTab, setActiveTab] = useState('T-SHIRT');

    const productTabs = [
        { name: 'T-SHIRT', icon: img1, postEx: 'T-Shirt:' },
        { name: 'SWEATSHIRT', icon: img2, postEx: 'SweatShirt:' },
        { name: 'HOODIE', icon: img3, postEx: 'Hoodie:' },
        { name: 'ZIPPERHOODIE', icon: img4, postEx: 'ZipperHoodie:' },
        // { name: 'SWEATPANTS', icon: img5, postEx: 'SweatPant:' },
        // { name: 'SHORTS', icon: img6, postEx: 'Shorts:' },
    ];

    const handleUpdate = (update) => {
        // 1. Send to PlayCanvas for real-time preview
        if (update.canvasBase64) {
            const { diffuse, opacity, emissive } = update.canvasBase64;
            ['preview-iframe', 'preview-iframe2'].forEach((id) => {
                const iframe = document.getElementById(id);
                if (iframe?.contentWindow) {
                    if (diffuse) iframe.contentWindow.postMessage(diffuse, '*');
                    if (opacity) iframe.contentWindow.postMessage(opacity, '*');
                    if (emissive) iframe.contentWindow.postMessage(emissive, '*');
                }
            });
        }

        // 2. Save configuration for ALL students
        if (update.backDesign !== undefined) {
            setCustomizations((prev) => {
                const nextCustom = { ...prev };
                students.forEach(student => {
                    const studentName = typeof student === 'object' ? (student.name || student.id) : student;
                    const studentData = nextCustom[studentName] || {};

                    const shirtCategories = ['T-SHIRT', 'SWEATSHIRT', 'HOODIE', 'ZIPPERHOODIE'];
                    let targetCategories = [activeTab];

                    // If saving for a shirt, sync to ALL shirt types
                    if (shirtCategories.includes(activeTab)) {
                        targetCategories = shirtCategories;
                    }

                    targetCategories.forEach(cat => {
                        const categoryData = studentData[cat] || {};
                        studentData[cat] = {
                            ...categoryData,
                            pressureOptions: {
                                ...(categoryData.pressureOptions || {}),
                                backDesign: update.backDesign
                            }
                        };
                    });

                    nextCustom[studentName] = { ...studentData };
                });
                return nextCustom;
            });
        }
    };

    const currentTab = productTabs.find((t) => t.name === activeTab);

    // Use the first student's data as the template for the popup UI
    const firstStudentName = students.length > 0 ? (typeof students[0] === 'object' ? (students[0].name || students[0].id) : students[0]) : "";
    const firstStudentData = customizations[firstStudentName] || {};
    const currentCategoryData = firstStudentData[activeTab] || {};
    const currentBackDesign = currentCategoryData.pressureOptions?.backDesign;

    // Switch PlayCanvas page when tab changes
    useEffect(() => {
        const pageIndex = productTabs.findIndex(t => t.name === activeTab) + 1;
        ['preview-iframe', 'preview-iframe2'].forEach((id) => {
            const iframe = document.getElementById(id);
            if (iframe?.contentWindow) {
                iframe.contentWindow.postMessage(`Page : ${pageIndex}`, "*");
            }
        });
    }, [activeTab]);

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 md:p-8 max-w-5xl w-full max-h-[95vh] overflow-y-auto shadow-2xl border border-gray-100 flex flex-col">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Configure Global Back Design</h2>
                        <p className="text-gray-500 text-sm mt-1">Design uploaded here will be applied to ALL students.</p>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <button
                            onClick={onFinish}
                            className="px-8 py-2 bg-green-700 text-white font-bold rounded-xl hover:bg-green-800 transition shadow-lg shrink-0"
                        >
                            Finish
                        </button>
                        <button
                            onClick={onFinish}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                            title="Close"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-8 flex-1 overflow-hidden">
                    {/* Sidebar Tabs */}
                    <div className="flex md:flex-col overflow-x-auto md:overflow-y-auto gap-2 md:w-48 pb-2">
                        {productTabs.map((tab) => (
                            <button
                                key={tab.name}
                                onClick={() => setActiveTab(tab.name)}
                                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all min-w-[140px] md:min-w-0 ${activeTab === tab.name
                                    ? 'bg-green-50 border-2 border-green-600 shadow-sm'
                                    : 'bg-gray-50 border-2 border-transparent hover:border-gray-200'
                                    }`}
                            >
                                <img src={tab.icon} alt={tab.name} className="w-8 h-8 object-contain" />
                                <span className={`text-xs font-bold ${activeTab === tab.name ? 'text-green-700' : 'text-gray-600'}`}>
                                    {tab.name}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Main Area: Test component */}
                    <div className="flex-1 bg-gray-50 rounded-2xl p-6 border border-gray-200 overflow-y-auto">
                        <Test
                            key={activeTab} // Force remount to refresh Test internal state when switching products
                            postEx={currentTab.postEx}
                            pressureOptions={{ backDesign: currentBackDesign }}
                            onUpdate={handleUpdate}
                            backDesigns={backDesigns}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BackDesignPopup;
