import React, { useState, useEffect } from "react";
import cog from "../assets/menuimages/cogwheel-pen.png";
import plus from "../assets/menuimages/shirt-plus.png";
import Test from "./Test";
import logo1 from "../assets/Universitylogo/logo1.png";
import logo2 from "../assets/Universitylogo/logo2.png";
import logo3 from "../assets/Universitylogo/logo3.jpg";
import logo4 from "../assets/Universitylogo/logo4.png";
import { BASE_URL } from "../utils/const";
import { X, Image as ImageIcon, Flag } from "lucide-react";

const ZippedHoodie = ({ data, onUpdate, isAppReady, logos }) => {
  const [activeTab, setActiveTab] = useState("size");
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [currentField, setCurrentField] = useState("");

  // Defaults
  const selectedColor = data?.selectedColor || "Red";
  const selectedSize = data?.selectedSize || "";

  const pressureOptions = data?.pressureOptions || {
    rightChestText: "",
    rightChestFlag: "",
    rightChestLogoPredefined: "",
    rightChestLogoCustom: "",
    rightChestType: "", // 'flag' | 'logo' | ''

    leftChestText: "",
    leftChestFlag: "",
    leftChestLogoPredefined: "",
    leftChestLogoCustom: "",
    leftChestType: "",



    rightSleeveText: "",
    rightSleeveFlag: "",
    rightSleeveLogoPredefined: "",
    rightSleeveLogoCustom: "",
    rightSleeveType: "",

    leftSleeveText: "",
    leftSleeveFlag: "",
    leftSleeveLogoPredefined: "",
    leftSleeveLogoCustom: "",
    leftSleeveType: "",

    backDesign: null,
  };

  const countries = [
    { name: "Denmark", flag: "https://flagcdn.com/w40/dk.png" },
    { name: "United States", flag: "https://flagcdn.com/w40/us.png" },
    { name: "United Kingdom", flag: "https://flagcdn.com/w40/gb.png" },
    { name: "Germany", flag: "https://flagcdn.com/w40/de.png" },
    { name: "France", flag: "https://flagcdn.com/w40/fr.png" },
    { name: "Spain", flag: "https://flagcdn.com/w40/es.png" },
    { name: "Italy", flag: "https://flagcdn.com/w40/it.png" },
    { name: "Netherlands", flag: "https://flagcdn.com/w40/nl.png" },
    { name: "Sweden", flag: "https://flagcdn.com/w40/se.png" },
    { name: "Norway", flag: "https://flagcdn.com/w40/no.png" },
    { name: "Finland", flag: "https://flagcdn.com/w40/fi.png" },
    { name: "Poland", flag: "https://flagcdn.com/w40/pl.png" },
    { name: "Japan", flag: "https://flagcdn.com/w40/jp.png" },
    { name: "South Korea", flag: "https://flagcdn.com/w40/kr.png" },
    { name: "China", flag: "https://flagcdn.com/w40/cn.png" },
    { name: "India", flag: "https://flagcdn.com/w40/in.png" },
    { name: "Brazil", flag: "https://flagcdn.com/w40/br.png" },
    { name: "Canada", flag: "https://flagcdn.com/w40/ca.png" },
    { name: "Australia", flag: "https://flagcdn.com/w40/au.png" },
    { name: "Mexico", flag: "https://flagcdn.com/w40/mx.png" },
  ];

  const flagImages = {
    Denmark: "https://flagcdn.com/w320/dk.png",
    "United States": "https://flagcdn.com/w320/us.png",
    "United Kingdom": "https://flagcdn.com/w320/gb.png",
    Germany: "https://flagcdn.com/w320/de.png",
    France: "https://flagcdn.com/w320/fr.png",
    Spain: "https://flagcdn.com/w320/es.png",
    Italy: "https://flagcdn.com/w320/it.png",
    Netherlands: "https://flagcdn.com/w320/nl.png",
    Sweden: "https://flagcdn.com/w320/se.png",
    Norway: "https://flagcdn.com/w320/no.png",
    Finland: "https://flagcdn.com/w320/fi.png",
    Poland: "https://flagcdn.com/w320/pl.png",
    Japan: "https://flagcdn.com/w320/jp.png",
    "South Korea": "https://flagcdn.com/w320/kr.png",
    China: "https://flagcdn.com/w320/cn.png",
    India: "https://flagcdn.com/w320/in.png",
    Brazil: "https://flagcdn.com/w320/br.png",
    Canada: "https://flagcdn.com/w320/ca.png",
    Australia: "https://flagcdn.com/w320/au.png",
    Mexico: "https://flagcdn.com/w320/mx.png",
  };

  // const predefinedLogos = [
  //   { name: "Logo 1", url: logo1 },
  //   { name: "Logo 2", url: logo2 },
  //   { name: "Logo 3", url: logo3 },
  //   { name: "Logo 4", url: logo4 },
  // ];

  // CANVAS CONSTANTS
  const CANVAS_WIDTH = 320;
  const TEXT_HEIGHT = 80;
  const FLAG_HEIGHT = 200;
  const CANVAS_HEIGHT = TEXT_HEIGHT + FLAG_HEIGHT;

  const getEmissiveBase64 = (text, hasFlag = false, hasLogo = false) => {
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, TEXT_HEIGHT);

    if (text?.trim()) {
      let fontSize = 48;
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      while (ctx.measureText(text).width > CANVAS_WIDTH - 80 && fontSize > 28) {
        fontSize -= 2;
        ctx.font = `bold ${fontSize}px Arial`;
      }
      ctx.fillText(text, CANVAS_WIDTH / 2, TEXT_HEIGHT / 2);
    }

    ctx.fillStyle = hasFlag || hasLogo ? "#ffffff" : "#000000";
    ctx.fillRect(0, TEXT_HEIGHT, CANVAS_WIDTH, FLAG_HEIGHT);

    // Add black border if both text and flag are present
    if (text?.trim() && hasFlag) {
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
    }

    return canvas.toDataURL("image/png");
  };

  const getDiffuseBase64 = (countryName, text, callback) => {
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (text?.trim()) {
      let fontSize = 48;
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      while (ctx.measureText(text).width > CANVAS_WIDTH - 80 && fontSize > 28) {
        fontSize -= 2;
        ctx.font = `bold ${fontSize}px Arial`;
      }
      ctx.fillText(text, CANVAS_WIDTH / 2, TEXT_HEIGHT / 2);
    }

    const drawBorder = () => {
      if (text?.trim() && countryName) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 10;
        ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
      }
    };

    if (countryName && flagImages[countryName]) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        ctx.drawImage(img, 0, TEXT_HEIGHT, CANVAS_WIDTH, FLAG_HEIGHT);
        drawBorder();
        callback(canvas.toDataURL("image/png"));
      };
      img.src = flagImages[countryName];
      return;
    }

    drawBorder();
    callback(canvas.toDataURL("image/png"));
  };

  const getLogoBase64 = (predefinedName, customBase64, callback) => {
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_WIDTH;
    canvas.height = FLAG_HEIGHT;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let src = customBase64;
    if (!src && predefinedName && logos) {
      const foundLogo = logos.find((l) => l.name === predefinedName);
      if (foundLogo) {
        src = `${BASE_URL}${foundLogo.file_path}`.replace(/\\/g, '/');
      }
    }

    if (src) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const ratio = Math.min(
          canvas.width / img.width,
          canvas.height / img.height,
        );
        const w = img.width * ratio * 0.9;
        const h = img.height * ratio * 0.9;
        const x = (canvas.width - w) / 2;
        const y = (canvas.height - h) / 2;
        ctx.drawImage(img, x, y, w, h);
        callback(canvas.toDataURL("image/png"));
      };
      img.src = src;
      return;
    }

    callback(canvas.toDataURL("image/png"));
  };

  const handleFlagSelect = (field) => {
    setCurrentField(field);
    setShowFlagModal(true);
  };

  const selectFlag = (countryName) => {
    onUpdate({
      pressureOptions: {
        ...pressureOptions,
        [currentField]: countryName,
      },
    });
    setShowFlagModal(false);
  };

  const selectLogo = (logoName) => {
    onUpdate({
      pressureOptions: {
        ...pressureOptions,
        [currentField]: logoName,
      },
    });
    setShowFlagModal(false);
  };

  const clearField = (field) => {
    onUpdate({
      pressureOptions: {
        ...pressureOptions,
        [field]: "",
      },
    });
  };

  const getFlagDisplay = (countryName) => {
    if (!countryName) return "";
    const country = countries.find((c) => c.name === countryName);
    return country ? `${country.flag} ${country.name}` : countryName;
  };

  const getLogoDisplay = (logoName) => logoName || "";

  const handleTypeChange = (area, type) => {
    onUpdate({
      pressureOptions: {
        ...pressureOptions,
        [`${area}Type`]: type,
        ...(type === "flag"
          ? {
            [`${area}LogoPredefined`]: "",
            [`${area}LogoCustom`]: "",
          }
          : type === "logo"
            ? {
              [`${area}Flag`]: "",
            }
            : {
              [`${area}Flag`]: "",
              [`${area}LogoPredefined`]: "",
              [`${area}LogoCustom`]: "",
            }),
      },
    });
  };

  // ── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    // const colorMap = {
    //   red: 'ZipperHoodie:red',
    //   orange: 'ZipperHoodie:orange',
    //   lime: 'ZipperHoodie:lime',
    //   kit: 'ZipperHoodie:kit',
    //   'light blue': 'ZipperHoodie:light blue',
    //   turquoise: 'ZipperHoodie:turquoise',
    //   navy: 'ZipperHoodie:navy',
    //   black: 'ZipperHoodie:black',
    //   'white (black print)': 'ZipperHoodie:white',
    // };

    const colorMap = {
      red: "ZipperHoodie:red",
      black: "ZipperHoodie:black",
      white: "ZipperHoodie:white",
      natural: "ZipperHoodie:natural",
      "heather grey": "ZipperHoodie:heatherGrey",
      navy: "ZipperHoodie:navy",
      "light pink": "ZipperHoodie:lightPink",
      "olive green": "ZipperHoodie:oliveGreen",
      blue: "ZipperHoodie:blue",
      purple: "ZipperHoodie:purple",
    };

    const message = colorMap[selectedColor.toLowerCase()];
    if (!message) return;

    ["preview-iframe", "preview-iframe2"].forEach((id) => {
      const iframe = document.getElementById(id);
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(message, "*");
      }
    });
  }, [selectedColor, isAppReady]);



  useEffect(() => {
    if (!selectedSize) return;
    const message = `ZipperHoodie:size:${selectedSize}`;
    ["preview-iframe", "preview-iframe2"].forEach((id) => {
      const iframe = document.getElementById(id);
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(message, "*");
      }
    });
  }, [selectedSize, isAppReady]);

  // Ref to track previous options to prevent unnecessary updates
  const prevPressureOptionsRef = React.useRef({});

  useEffect(() => {
    const areas = [
      "rightChest",
      "leftChest",

      "rightSleeve",
      "leftSleeve",
    ];

    areas.forEach((area) => {
      const text = pressureOptions[`${area}Text`]?.trim() || "";
      const flag = pressureOptions[`${area}Flag`] || "";
      const logoPre = pressureOptions[`${area}LogoPredefined`] || "";
      const logoCustom = pressureOptions[`${area}LogoCustom`] || "";
      const type = pressureOptions[`${area}Type`] || "";

      // Check if anything actually changed for this area
      const prev = prevPressureOptionsRef.current[area] || {};
      const hasChanged =
        prev.text !== text ||
        prev.flag !== flag ||
        prev.logoPre !== logoPre ||
        prev.logoCustom !== logoCustom ||
        prev.type !== type;

      if (!hasChanged) return;

      // Update the ref for this area
      prevPressureOptionsRef.current[area] = { text, flag, logoPre, logoCustom, type };

      const hasText = text.length > 0;
      const hasFlag = !!flag && type === "flag";
      const hasLogo = !!(logoPre || logoCustom) && type === "logo";

      // Emissive
      const opacity = getEmissiveBase64(text, hasFlag, hasLogo);
      ["preview-iframe", "preview-iframe2"].forEach((id) => {
        const iframe = document.getElementById(id);
        if (iframe?.contentWindow) {
          const msg = `ZipperHoodie:${area}_opacity: ${opacity}`;
          iframe.contentWindow.postMessage(msg, "*");
        }
      });

      // Diffuse
      getDiffuseBase64(flag, text, (diffuseBase) => {
        getLogoBase64(logoPre, logoCustom, (logoBase) => {
          const finalCanvas = document.createElement("canvas");
          finalCanvas.width = CANVAS_WIDTH;
          finalCanvas.height = CANVAS_HEIGHT;
          const ctx = finalCanvas.getContext("2d");

          const diffuseImg = new Image();
          diffuseImg.onload = () => {
            ctx.drawImage(diffuseImg, 0, 0);

            if (hasLogo) {
              const logoImg = new Image();
              logoImg.onload = () => {
                ctx.drawImage(
                  logoImg,
                  0,
                  TEXT_HEIGHT,
                  CANVAS_WIDTH,
                  FLAG_HEIGHT
                );
                const finalDiffuse = finalCanvas.toDataURL("image/png");
                ["preview-iframe", "preview-iframe2"].forEach((id) => {
                  const iframe = document.getElementById(id);
                  if (iframe?.contentWindow) {
                    const msg = `ZipperHoodie:${area}_diffuse: ${finalDiffuse}`;
                    iframe.contentWindow.postMessage(msg, "*");

                    iframe.contentWindow.postMessage({
                      type: 'texture_update',
                      item: 'ZipperHoodie',
                      slot: `${area}_diffuse`,
                      data: finalDiffuse
                    }, "*");
                  }
                });
              };
              logoImg.src = logoBase;
            } else {
              ["preview-iframe", "preview-iframe2"].forEach((id) => {
                const iframe = document.getElementById(id);
                if (iframe?.contentWindow) {
                  const msg = `ZipperHoodie:${area}_diffuse: ${diffuseBase}`;
                  iframe.contentWindow.postMessage(msg, "*");

                  iframe.contentWindow.postMessage({
                    type: 'texture_update',
                    item: 'ZipperHoodie',
                    slot: `${area}_diffuse`,
                    data: diffuseBase
                  }, "*");
                }
              });
            }
          };
          diffuseImg.src = diffuseBase;
        });
      });
    });
  }, [isAppReady, pressureOptions]);

  // const colors = [
  //   { name: 'Red', value: '#DC143C', border: '#DC143C' },
  //   { name: 'Orange', value: '#FF4500', border: '#FF4500' },
  //   { name: 'Lime', value: '#C5D86D', border: '#C5D86D' },
  //   { name: 'Kit', value: '#D4B896', border: '#D4B896' },
  //   { name: 'Light blue', value: '#A8C5D6', border: '#A8C5D6' },
  //   { name: 'Turquoise', value: '#0891B2', border: '#0891B2' },
  //   { name: 'Navy', value: '#1F2937', border: '#1F2937' },
  //   { name: 'Black', value: '#000000', border: '#000000' },
  //   { name: 'White (black print)', value: '#FFFFFF', border: '#D1D5DB' },
  // ];

  const colors = [
    { name: "Red", value: "#E61709", border: "#E61709" },
    { name: "Black", value: "#120F14", border: "#120F14" },
    { name: "White", value: "#FFFFFF", border: "#D1D5DB" },
    { name: "Natural", value: "#FFFAD9", border: "#FFFAD9" },
    { name: "Heather Grey", value: "#D4D9DC", border: "#D4D9DC" },
    { name: "Navy", value: "#051734", border: "#051734" },
    { name: "Light Pink", value: "#F0A5C7", border: "#F0A5C7" },
    { name: "Olive Green", value: "#63673F", border: "#63673F" },
    { name: "Blue", value: "#0000FF", border: "#0000FF" },
    { name: "Purple", value: "#431279", border: "#431279" },
  ];

  const sizes = ["S", "M", "L", "XL", "2XL", "3XL"];

  return (
    <div className="max-w-md mx-auto p-6 bg-gray-50">
      {/* Tab Navigation */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setActiveTab("size")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === "size"
            ? "bg-white shadow-sm border-2 border-green-700"
            : "bg-white border-2 border-transparent hover:border-gray-300"
            }`}
        >
          <span className="font-medium text-gray-900">Size and color</span>
          <img className="w-10" src={cog} alt="settings" />
        </button>
        <button
          onClick={() => setActiveTab("pressure")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${activeTab === "pressure"
            ? "bg-white shadow-sm border-2 border-green-700"
            : "bg-white border-2 border-transparent hover:border-gray-300"
            }`}
        >
          <span className="font-medium text-gray-900">Pressure</span>
          <img className="w-10" src={plus} alt="add" />
        </button>
      </div>

      {activeTab === "size" ? (
        <>
          <h1 className="text-3xl font-bold mb-8 text-gray-900">
            Zipper Hoodie
          </h1>

          {/* Color Section */}
          <div className="mb-8">
            <h2 className="text-sm font-semibold mb-4 text-gray-700">Color</h2>
            <div className="grid grid-cols-4 gap-4">
              {colors.map((color) => (
                <div key={color.name} className="flex flex-col items-center">
                  <button
                    onClick={() => onUpdate({ selectedColor: color.name })}
                    className="relative w-12 h-12 rounded-lg transition-all focus:outline-none"
                    style={{
                      backgroundColor: color.value,
                      border:
                        selectedColor === color.name
                          ? `3px solid ${color.border}`
                          : `1px solid ${color.border}`,
                      boxShadow:
                        selectedColor === color.name
                          ? `0 0 0 2px white, 0 0 0 4px ${color.border}`
                          : "none",
                    }}
                  >
                    {selectedColor === color.name && (
                      <div className="absolute inset-0 rounded-lg border-2 border-white pointer-events-none" />
                    )}
                  </button>
                  <span className="text-xs mt-2 text-center text-gray-700">
                    {color.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Size Section */}
          <div>
            <h2 className="text-sm font-semibold mb-4 text-gray-700">Size</h2>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {sizes.map((size) => (
                <button
                  key={size}
                  onClick={() => onUpdate({ selectedSize: size })}
                  className={`py-3 px-4 rounded-lg border-2 transition-all font-medium ${selectedSize === size
                    ? "border-gray-900 bg-white text-gray-900"
                    : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
                    }`}
                >
                  {size}
                </button>
              ))}
            </div>
            <a href="#" className="text-sm text-green-600 hover:underline">
              Size guide
            </a>
          </div>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-bold mb-8 text-gray-900">
            Pressure Options
          </h1>

          {/* Chest Area */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Chest Area
            </h2>

            {["rightChest", "leftChest"].map((area) => (
              <div key={area} className="bg-white rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-gray-900 mb-3">
                  {area === "bottomChest"
                    ? "Bottom Chest"
                    : `${area.replace("Chest", " Chest")}:`}
                </h3>
                <div className="space-y-6">
                  {/* Free text */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Free text
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={pressureOptions[`${area}Text`]}
                        onChange={(e) =>
                          onUpdate({
                            pressureOptions: {
                              ...pressureOptions,
                              [`${area}Text`]: e.target.value,
                            },
                          })
                        }
                        placeholder="Enter text"
                        maxLength={10}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                      />
                      {pressureOptions[`${area}Text`] && (
                        <button
                          onClick={() => clearField(`${area}Text`)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Radio Buttons: Flag or Logo */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Select Type
                    </label>
                    <div className="flex gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`${area}Type`}
                          checked={pressureOptions[`${area}Type`] === "flag"}
                          onChange={() => handleTypeChange(area, "flag")}
                          className="w-5 h-5 text-green-600 focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700">Flag</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`${area}Type`}
                          checked={pressureOptions[`${area}Type`] === "logo"}
                          onChange={() => handleTypeChange(area, "logo")}
                          className="w-5 h-5 text-green-600 focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700">Logo</span>
                      </label>
                    </div>
                  </div>

                  {/* Flag Options */}
                  {pressureOptions[`${area}Type`] === "flag" && (
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Predefined flag
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={getFlagDisplay(pressureOptions[`${area}Flag`])}
                          readOnly
                          placeholder="Select flag"
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-pointer"
                          onClick={() => handleFlagSelect(`${area}Flag`)}
                        />
                        <button
                          onClick={() => handleFlagSelect(`${area}Flag`)}
                          className="px-6 py-2 bg-green-900 text-white rounded-lg hover:bg-green-800 transition-colors font-medium"
                        >
                          Select
                        </button>
                        {pressureOptions[`${area}Flag`] && (
                          <button
                            onClick={() => clearField(`${area}Flag`)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Logo Options */}
                  {pressureOptions[`${area}Type`] === "logo" && (
                    <div className="space-y-4">
                      {/* Predefined Logo */}
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          Predefined Logo
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={getLogoDisplay(
                              pressureOptions[`${area}LogoPredefined`],
                            )}
                            readOnly
                            placeholder="Select predefined logo"
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-pointer"
                            onClick={() =>
                              handleFlagSelect(`${area}LogoPredefined`)
                            }
                          />
                          <button
                            onClick={() =>
                              handleFlagSelect(`${area}LogoPredefined`)
                            }
                            className="px-6 py-2 bg-green-900 text-white rounded-lg hover:bg-green-800 transition-colors font-medium"
                          >
                            Select
                          </button>
                          {pressureOptions[`${area}LogoPredefined`] && (
                            <button
                              onClick={() =>
                                clearField(`${area}LogoPredefined`)
                              }
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Custom Logo */}
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          Or upload custom logo
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              onUpdate({
                                pressureOptions: {
                                  ...pressureOptions,
                                  [`${area}LogoCustom`]: ev.target.result,
                                  [`${area}LogoPredefined`]: "",
                                },
                              });
                            };
                            reader.readAsDataURL(file);
                          }}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                        />
                        {pressureOptions[`${area}LogoCustom`] && (
                          <button
                            onClick={() => clearField(`${area}LogoCustom`)}
                            className="mt-2 px-4 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                          >
                            Remove custom logo
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Sleeves */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Sleeves
            </h2>

            {["rightSleeve", "leftSleeve"].map((area) => (
              <div key={area} className="bg-white rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-gray-900 mb-3">
                  {area.replace("Sleeve", " Sleeve")}:
                </h3>
                <div className="space-y-6">
                  {/* Free text */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Free text
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={pressureOptions[`${area}Text`]}
                        onChange={(e) =>
                          onUpdate({
                            pressureOptions: {
                              ...pressureOptions,
                              [`${area}Text`]: e.target.value,
                            },
                          })
                        }
                        placeholder="Enter text"
                        maxLength={10}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                      />
                      {pressureOptions[`${area}Text`] && (
                        <button
                          onClick={() => clearField(`${area}Text`)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Radio Buttons */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Select Type
                    </label>
                    <div className="flex gap-6">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`${area}Type`}
                          checked={pressureOptions[`${area}Type`] === "flag"}
                          onChange={() => handleTypeChange(area, "flag")}
                          className="w-5 h-5 text-green-600 focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700">Flag</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name={`${area}Type`}
                          checked={pressureOptions[`${area}Type`] === "logo"}
                          onChange={() => handleTypeChange(area, "logo")}
                          className="w-5 h-5 text-green-600 focus:ring-green-500"
                        />
                        <span className="text-sm text-gray-700">Logo</span>
                      </label>
                    </div>
                  </div>

                  {/* Flag */}
                  {pressureOptions[`${area}Type`] === "flag" && (
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Predefined flag
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={getFlagDisplay(pressureOptions[`${area}Flag`])}
                          readOnly
                          placeholder="Select flag"
                          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-pointer"
                          onClick={() => handleFlagSelect(`${area}Flag`)}
                        />
                        <button
                          onClick={() => handleFlagSelect(`${area}Flag`)}
                          className="px-6 py-2 bg-green-900 text-white rounded-lg hover:bg-green-800 transition-colors font-medium"
                        >
                          Select
                        </button>
                        {pressureOptions[`${area}Flag`] && (
                          <button
                            onClick={() => clearField(`${area}Flag`)}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Logo */}
                  {pressureOptions[`${area}Type`] === "logo" && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          Predefined Logo
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={getLogoDisplay(
                              pressureOptions[`${area}LogoPredefined`],
                            )}
                            readOnly
                            placeholder="Select predefined logo"
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-pointer"
                            onClick={() =>
                              handleFlagSelect(`${area}LogoPredefined`)
                            }
                          />
                          <button
                            onClick={() =>
                              handleFlagSelect(`${area}LogoPredefined`)
                            }
                            className="px-6 py-2 bg-green-900 text-white rounded-lg hover:bg-green-800 transition-colors font-medium"
                          >
                            Select
                          </button>
                          {pressureOptions[`${area}LogoPredefined`] && (
                            <button
                              onClick={() =>
                                clearField(`${area}LogoPredefined`)
                              }
                              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          Or upload custom logo
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              onUpdate({
                                pressureOptions: {
                                  ...pressureOptions,
                                  [`${area}LogoCustom`]: ev.target.result,
                                  [`${area}LogoPredefined`]: "",
                                },
                              });
                            };
                            reader.readAsDataURL(file);
                          }}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                        />
                        {pressureOptions[`${area}LogoCustom`] && (
                          <button
                            onClick={() => clearField(`${area}LogoCustom`)}
                            className="mt-2 px-4 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                          >
                            Remove custom logo
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Test Component - Always mounted to broadcast back design, but hidden if not in pressure tab */}
      <div className={activeTab === "pressure" ? "mt-10" : "hidden"}>
        <Test
          postEx="ZippedHoodie:"
          pressureOptions={pressureOptions}
          isAppReady={isAppReady}
          onUpdate={(update) => {
            if (update.canvasBase64) {
              const { diffuse, opacity, emissive } = update.canvasBase64;
              ["preview-iframe", "preview-iframe2"].forEach((id) => {
                const iframe = document.getElementById(id);
                if (iframe?.contentWindow) {
                  iframe.contentWindow.postMessage(diffuse, "*");
                  iframe.contentWindow.postMessage(opacity, "*");
                  if (emissive) iframe.contentWindow.postMessage(emissive, "*");
                }
              });
            }
            if (update.backDesign !== undefined) {
              onUpdate({
                pressureOptions: {
                  ...pressureOptions,
                  backDesign: update.backDesign,
                },
              });
            }
          }}
        />
      </div>

      {/* Modal / Asset Picker */}
      {showFlagModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300"
            onClick={() => setShowFlagModal(false)}
          />
          <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
            <div className="flex items-center justify-between px-8 py-7 border-b border-slate-50 bg-white/50 sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-50 rounded-2xl">
                  {currentField.includes("Logo") ? (
                    <ImageIcon className="w-6 h-6 text-green-600" />
                  ) : (
                    <Flag className="w-6 h-6 text-green-600" />
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 leading-none">
                    {currentField.includes("Logo") ? "Select a Logo" : "Choose a Flag"}
                  </h2>
                  <p className="text-slate-500 text-sm mt-1.5 font-medium">
                    {currentField.includes("Logo") ? "Pick a symbol for your design" : "Represent your country"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowFlagModal(false)}
                className="p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all duration-200 group"
              >
                <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
              </button>
            </div>
            <div className="p-8 overflow-y-auto custom-scrollbar-premium bg-slate-50/30">
              {currentField.includes("Logo") ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                  {logos && logos.map((logo) => (
                    <button
                      key={logo.id}
                      onClick={() => selectLogo(logo.name)}
                      className="group relative flex flex-col items-center p-2 rounded-3xl transition-all duration-300 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50"
                    >
                      <div className="w-full aspect-square mb-4 flex items-center justify-center bg-white rounded-2xl border border-slate-100 shadow-sm group-hover:border-green-200 group-hover:-translate-y-2 transition-all duration-500 p-5 overflow-hidden">
                        <img
                          src={`${BASE_URL}${logo.file_path}`.replace(/\\/g, '/')}
                          alt={logo.name}
                          className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-green-600/0 group-hover:bg-green-600/5 transition-colors duration-300" />
                      </div>
                      <span className="text-xs font-bold text-slate-500 group-hover:text-green-700 truncate w-full px-2 text-center uppercase tracking-wider transition-colors">
                        {logo.name}
                      </span>
                      <div className="absolute top-4 right-4 bg-green-600 rounded-full p-1 opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-100 transition-all duration-300 shadow-lg">
                        <X className="w-3 h-3 text-white rotate-45" />
                      </div>
                    </button>
                  ))}
                  {(!logos || logos.length === 0) && (
                    <div className="col-span-full py-20 text-center">
                      <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <ImageIcon className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-slate-400 font-bold text-lg">No logos found</p>
                      <p className="text-slate-400/60 text-sm">Logos assigned to your class will appear here.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {countries.map((country) => (
                    <button
                      key={country.name}
                      onClick={() => selectFlag(country.name)}
                      className="group flex flex-col items-center gap-4 p-5 rounded-2xl bg-white border border-slate-100 hover:border-green-300 hover:shadow-lg hover:shadow-green-900/5 hover:-translate-y-1 transition-all duration-300"
                    >
                      <div className="relative w-14 h-14 rounded-full overflow-hidden shadow-inner bg-slate-100 group-hover:ring-4 group-hover:ring-green-50 transition-all duration-300">
                        <img
                          src={country.flag}
                          alt={country.name}
                          className="w-full h-full object-cover scale-150"
                        />
                      </div>
                      <span className="text-[10px] font-black text-slate-400 group-hover:text-slate-900 leading-tight uppercase tracking-[0.1em] text-center">
                        {country.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="px-8 py-5 border-t border-slate-50 bg-white flex justify-center items-center gap-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                Choose an asset to customize your placement
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ZippedHoodie;
