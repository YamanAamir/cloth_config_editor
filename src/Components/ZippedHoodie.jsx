import React, { useState, useEffect } from "react";
import cog from "../assets/menuimages/cogwheel-pen.png";
import plus from "../assets/menuimages/shirt-plus.png";
import Test from "./Test";
import { BASE_URL } from "../utils/const";
import { ALL_FLAGS } from "../utils/flags";
import { postToPreview } from "../utils/postMessage";
import { X, Image as ImageIcon, Flag, Trash2 } from "lucide-react";

const ZippedHoodie = ({ data, onUpdate, isAppReady, logos, backDesigns, maxCharsText = 25, activeTab: externalTab }) => {
  const [internalTab, setInternalTab] = useState("size");
  const activeTab = externalTab || internalTab;
  const setActiveTab = externalTab ? () => { } : setInternalTab;
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [currentField, setCurrentField] = useState("");
  const [designColor, setDesignColor] = useState("light"); // 'light' | 'dark'
  const designColorRef = React.useRef("light");
  const lastBackDataRef = React.useRef({ diffuse: "", opacity: "" });

  const selectedColor = data?.selectedColor || "Red";
  const selectedSize = data?.selectedSize || "";

  const pressureOptions = data?.pressureOptions || {
    rightChestText: "", rightChestFlag: "", rightChestLogoPredefined: "", rightChestLogoCustom: "", rightChestType: "",
    leftChestText: "", leftChestFlag: "", leftChestLogoPredefined: "", leftChestLogoCustom: "", leftChestType: "",
    rightSleeveText: "", rightSleeveFlag: "", rightSleeveLogoPredefined: "", rightSleeveLogoCustom: "", rightSleeveType: "",
    leftSleeveText: "", leftSleeveFlag: "", leftSleeveLogoPredefined: "", leftSleeveLogoCustom: "", leftSleeveType: "",
    backDesign: null,
  };

  const countries = ALL_FLAGS;
  const flagImages = Object.fromEntries(ALL_FLAGS.map(f => [f.name, f.flagHD || f.flag]));

  const CANVAS_WIDTH = 320;
  const TEXT_HEIGHT = 120;
  const FLAG_HEIGHT = 240;
  const CANVAS_HEIGHT = TEXT_HEIGHT + FLAG_HEIGHT;

  const getEmissiveBase64 = (text, hasFlag = false, hasLogo = false, hasSecondAsset = false, textColor = "#ffffff") => {
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext("2d");

    // Pure black background
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (text?.trim()) {
      let fontSize = 48;
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.fillStyle = "#ffffff"; // emissive = white mask
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      while (ctx.measureText(text).width > CANVAS_WIDTH - 80 && fontSize > 28) {
        fontSize -= 2;
        ctx.font = `bold ${fontSize}px Arial`;
      }
      ctx.fillText(text, CANVAS_WIDTH / 2, TEXT_HEIGHT + FLAG_HEIGHT / 2);
    }

    if (hasFlag && hasSecondAsset) {
      const DIVIDER_W = 2;
      const BOX_W = (CANVAS_WIDTH - DIVIDER_W) / 2;
      const BOX_H = Math.round(FLAG_HEIGHT * 0.4);
      const BOX_Y = TEXT_HEIGHT + (FLAG_HEIGHT - BOX_H) / 2;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, BOX_Y, BOX_W, BOX_H);
      ctx.fillRect(BOX_W + DIVIDER_W, BOX_Y, BOX_W, BOX_H);
    } else if (hasFlag) {
      const targetWidth = CANVAS_WIDTH * 0.9;
      const targetHeight = FLAG_HEIGHT * 1;
      const x = (CANVAS_WIDTH - targetWidth) / 2;
      const y = TEXT_HEIGHT + (FLAG_HEIGHT - targetHeight) / 2;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x, y, targetWidth, targetHeight);
    } else if (hasLogo) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, TEXT_HEIGHT, CANVAS_WIDTH, FLAG_HEIGHT);
    }

    if (hasFlag || hasLogo) {
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 40;
      ctx.strokeRect(5, 5, canvas.width - 10, canvas.height - 10);
    }
    return canvas.toDataURL("image/png");
  };

  const getDiffuseBase64 = async (
    flag,
    logoPre,
    logoCustom,
    text,
    callback,
    flag2 = "",
    flagCount = 1,
    textColor = "#ffffff"
  ) => {
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    const ctx = canvas.getContext("2d");

    const loadImage = (src) =>
      new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => reject();
        img.src = src;
      });

    if (!flag && !flag2 && !logoPre && !logoCustom) {
      // ONLY TEXT MODE
      if (text?.trim()) {
        let fontSize = 48;
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.fillStyle = textColor;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        while (ctx.measureText(text).width > CANVAS_WIDTH - 80 && fontSize > 28) {
          fontSize -= 2;
          ctx.font = `bold ${fontSize}px Arial`;
        }
        ctx.fillText(text, CANVAS_WIDTH / 2, TEXT_HEIGHT + FLAG_HEIGHT / 2);
      }
      callback(canvas.toDataURL("image/png"));
      return;
    }

    const hasTwoFlags = flag && flagImages[flag] && flag2 && flagImages[flag2];

    // ---------- TEXT ---------- (only for text-only mode; with flag/logo, text drawn after)
    if (text?.trim() && !hasTwoFlags && !flag && !logoPre && !logoCustom) {
      let fontSize = 48;
      ctx.font = `bold ${fontSize}px Arial`;
      ctx.fillStyle = textColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      while (ctx.measureText(text).width > CANVAS_WIDTH - 80 && fontSize > 28) {
        fontSize -= 2;
        ctx.font = `bold ${fontSize}px Arial`;
      }
      ctx.fillText(text, CANVAS_WIDTH / 2, TEXT_HEIGHT + FLAG_HEIGHT / 2);
    }

    // ---------- 2 FLAGS SIDE BY SIDE ----------
    if (hasTwoFlags) {
      const DIVIDER_W = 2;
      const BOX_W = (CANVAS_WIDTH - DIVIDER_W) / 2;
      const BOX_H = Math.round(FLAG_HEIGHT * 0.4);
      const BOX_Y = TEXT_HEIGHT + (FLAG_HEIGHT - BOX_H) / 2;
      const drawFlagInBox = (img, x, y, w, h) => {
        const scale = Math.max(w / img.width, h / img.height);
        const dw = img.width * scale; const dh = img.height * scale;
        const dx = x + (w - dw) / 2; const dy = y + (h - dh) / 2;
        ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
        ctx.drawImage(img, dx, dy, dw, dh); ctx.restore();
      };
      try {
        const [img1, img2] = await Promise.all([loadImage(flagImages[flag]), loadImage(flagImages[flag2])]);
        drawFlagInBox(img1, 0, BOX_Y, BOX_W, BOX_H);
        drawFlagInBox(img2, BOX_W + DIVIDER_W, BOX_Y, BOX_W, BOX_H);
        ctx.fillStyle = "#000"; ctx.fillRect(BOX_W, BOX_Y, DIVIDER_W, BOX_H);
      } catch (e) { /* render as-is */ }
      callback(canvas.toDataURL("image/png"));
      return;
    }

    // ---------- SINGLE FLAG ----------
    // if (flag && flagImages[flag]) {
    //   try {
    //     const img = await loadImage(flagImages[flag]);
    //     ctx.drawImage(img, 0, TEXT_HEIGHT, CANVAS_WIDTH, FLAG_HEIGHT);
    //   } catch (e) { /* render as-is */ }
    //   callback(canvas.toDataURL("image/png"));
    //   return;
    // }
    // ---------- SINGLE FLAG ----------
    if (flag && flagImages[flag]) {
      const finalize = () => {
        callback(canvas.toDataURL("image/png"));
      };

      loadImage(flagImages[flag])
        .then((img) => {

          // Remove solid white background fill
          const targetWidth = CANVAS_WIDTH * 0.9;
          const targetHeight = FLAG_HEIGHT * 1;

          // centered position
          const x = (CANVAS_WIDTH - targetWidth) / 2;
          const y = TEXT_HEIGHT + (FLAG_HEIGHT - targetHeight) / 2;

          // draw flag
          ctx.drawImage(img, x, y, targetWidth, targetHeight);

          // Overlay text centered on flag area
          if (text?.trim()) {
            let fontSize = 48;
            ctx.font = `bold ${fontSize}px Arial`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            while (ctx.measureText(text).width > CANVAS_WIDTH - 80 && fontSize > 28) {
              fontSize -= 2;
              ctx.font = `bold ${fontSize}px Arial`;
            }
            ctx.fillStyle = textColor;
            ctx.fillText(text, CANVAS_WIDTH / 2, TEXT_HEIGHT + FLAG_HEIGHT / 2);
          }

          finalize();
        })
        .catch(finalize);

      return;
    }
    // ---------- LOGO ONLY ----------
    let logoSrc = logoCustom;
    if (!logoSrc && logoPre) {
      const foundLogo = logos.find((l) => l.name === logoPre);
      if (foundLogo?.file_path) {
        let path = foundLogo.file_path.replace(/\\/g, "/");
        logoSrc = path.startsWith("http") ? path : `${BASE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
      }
    }

    if (logoSrc) {
      try {
        const img = await loadImage(logoSrc);
        // No solid white background — let cloth color through
        const ratio = Math.min(CANVAS_WIDTH / img.width, FLAG_HEIGHT / img.height);
        const w = img.width * ratio * 0.8; const h = img.height * ratio * 0.8;
        const x = (CANVAS_WIDTH - w) / 2; const y = TEXT_HEIGHT + (FLAG_HEIGHT - h) / 2;

        ctx.drawImage(img, x, y, w, h);

        // Overlay text centered on logo area
        if (text?.trim()) {
          let fontSize = 48;
          ctx.font = `bold ${fontSize}px Arial`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          while (ctx.measureText(text).width > CANVAS_WIDTH - 80 && fontSize > 28) {
            fontSize -= 2;
            ctx.font = `bold ${fontSize}px Arial`;
          }
          ctx.fillStyle = textColor;
          ctx.fillText(text, CANVAS_WIDTH / 2, TEXT_HEIGHT + FLAG_HEIGHT / 2);
        }

        // Opacity canvas construction
        const opacityCanvas = document.createElement("canvas");
        opacityCanvas.width = CANVAS_WIDTH; opacityCanvas.height = CANVAS_HEIGHT;
        const octx = opacityCanvas.getContext("2d");

        // Pure black background
        octx.fillStyle = "#000";
        octx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        octx.drawImage(img, x, y, w, h);
        const imgData = octx.getImageData(0, 0, opacityCanvas.width, opacityCanvas.height);
        for (let i = 0; i < imgData.data.length; i += 4) {
          const r = imgData.data[i], g = imgData.data[i + 1], b = imgData.data[i + 2], a = imgData.data[i + 3];
          const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
          let bw = 0;
          if (a > 10 && brightness < 240) {
            bw = 255;
          }
          imgData.data[i] = imgData.data[i + 1] = imgData.data[i + 2] = bw;
          imgData.data[i + 3] = 255;
        }
        octx.putImageData(imgData, 0, 0);
        callback(canvas.toDataURL("image/png"), opacityCanvas.toDataURL("image/png"));
        return;
      } catch (e) { /* fall through */ }
    }

    // ---------- EMPTY ----------
    callback(canvas.toDataURL("image/png"));
  };

  const sendBackDesign = (diffuseB64, opacityB64, color) => {
    if (!diffuseB64 && !opacityB64) return;

    const invertOpacity = (b64, cb) => {
      const img = new Image();
      img.onload = () => {
        const scale = 2;
        const c = document.createElement("canvas");
        c.width = img.width * scale; c.height = img.height * scale;
        const ctx = c.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, 0, 0, c.width, c.height);
        const d = ctx.getImageData(0, 0, c.width, c.height);
        for (let i = 0; i < d.data.length; i += 4) {
          d.data[i] = 255 - d.data[i];
          d.data[i + 1] = 255 - d.data[i + 1];
          d.data[i + 2] = 255 - d.data[i + 2];
          d.data[i + 3] = 255;
        }
        ctx.putImageData(d, 0, 0);
        cb(c.toDataURL("image/png"));
      };
      img.src = b64;
    };
    ["preview-iframe", "preview-iframe2"].forEach(id => {
      const iframe = document.getElementById(id);
      if (!iframe?.contentWindow) return;
      if (color === "light") {
        if (diffuseB64) iframe.contentWindow.postMessage("ZipperHoodie:back_black_diffuse: " + diffuseB64, "*");
        if (opacityB64) iframe.contentWindow.postMessage("ZipperHoodie:back_black_opacity: " + opacityB64, "*");
      } else {
        if (opacityB64) invertOpacity(opacityB64, inv => {
          iframe.contentWindow.postMessage("ZipperHoodie:back_white_diffuse: " + inv, "*");
        });
        if (opacityB64) invertOpacity(opacityB64, inv => {
          iframe.contentWindow.postMessage("ZipperHoodie:back_white_opacity: " + inv, "*");
        });
      }
    });
  };

  const handleFlagSelect = (field) => {
    setCurrentField(field);
    const area = field.replace("Flag", "").replace("LogoPredefined", "");
    postToPreview(`zhoodie ${area}`);
    setShowFlagModal(true);
  };
  const selectFlag = (countryName) => { onUpdate({ pressureOptions: { ...pressureOptions, [currentField]: countryName } }); setShowFlagModal(false); };
  const selectLogo = (logoName, logoId) => { onUpdate({ pressureOptions: { ...pressureOptions, [currentField]: logoName, selectedLogoId: logoId } }); setShowFlagModal(false); };
  const clearField = (field) => { onUpdate({ pressureOptions: { ...pressureOptions, [field]: "" } }); };
  const getFlagDisplay = (countryName) => countryName || "";
  const getLogoDisplay = (logoName) => logoName || "";

  const handleTypeChange = (area, type) => {
    postToPreview(`zhoodie ${area}`);
    onUpdate({
      pressureOptions: {
        ...pressureOptions,
        [`${area}Type`]: type,
        [`${area}Flag`]: type === "flag" ? pressureOptions[`${area}Flag`] : "",
        [`${area}Flag2`]: "",
        [`${area}FlagCount`]: 1,
        // TEXT
        [`${area}Text`]: type === "" ? pressureOptions[`${area}Text`] : "",
        // LOGO RESET
        [`${area}LogoPredefined`]: type === "logo" ? pressureOptions[`${area}LogoPredefined`] : "",
        [`${area}LogoCustom`]: type === "logo" ? pressureOptions[`${area}LogoCustom`] : "",
      },
    });
  };

  useEffect(() => {
    if (logos && logos.length === 1) {
      const allLogoFields = ['rightChestLogoPredefined', 'leftChestLogoPredefined', 'rightSleeveLogoPredefined', 'leftSleeveLogoPredefined'];
      if (!allLogoFields.some(f => pressureOptions[f])) {
        onUpdate({ pressureOptions: { ...pressureOptions, rightChestLogoPredefined: logos[0].name, selectedLogoId: logos[0].id } });
      }
    }
  }, [logos]);

  useEffect(() => {
    const colorMap = {
      red: "ZipperHoodie:red", black: "ZipperHoodie:black", white: "ZipperHoodie:white", natural: "ZipperHoodie:natural",
      'heather grey': "ZipperHoodie:heatherGrey", navy: "ZipperHoodie:navy", 'light pink': "ZipperHoodie:lightPink",
      'olive green': "ZipperHoodie:oliveGreen", blue: "ZipperHoodie:blue", purple: "ZipperHoodie:purple",
    };
    const message = colorMap[selectedColor.toLowerCase()];
    if (!message) return;
    ["preview-iframe", "preview-iframe2"].forEach((id) => {
      const iframe = document.getElementById(id);
      if (iframe?.contentWindow) iframe.contentWindow.postMessage(message, "*");
    });
  }, [selectedColor, isAppReady]);

  useEffect(() => {
    if (!selectedSize) return;
    const message = `ZipperHoodie:size:${selectedSize}`;
    ["preview-iframe", "preview-iframe2"].forEach((id) => {
      const iframe = document.getElementById(id);
      if (iframe?.contentWindow) iframe.contentWindow.postMessage(message, "*");
    });
  }, [selectedSize, isAppReady]);

  const prevPressureOptionsRef = React.useRef({});
  const renderCounterRef = React.useRef({});

  useEffect(() => {
    const areas = ["rightChest", "leftChest", "rightSleeve", "leftSleeve"];
    areas.forEach((area) => {
      const text = pressureOptions[`${area}Text`]?.trim() || "";
      const flag = pressureOptions[`${area}Flag`] || "";
      const flag2 = pressureOptions[`${area}Flag2`] || "";
      const flagCount = pressureOptions[`${area}FlagCount`] || 1;
      const logoPre = pressureOptions[`${area}LogoPredefined`] || "";
      const logoCustom = pressureOptions[`${area}LogoCustom`] || "";
      const type = pressureOptions[`${area}Type`] || "";
      const textColor = pressureOptions[`${area}TextColor`] || "#ffffff";

      const prev = prevPressureOptionsRef.current[area] || {};
      if (
        prev.text === text && prev.flag === flag && prev.flag2 === flag2 &&
        prev.flagCount === flagCount && prev.logoPre === logoPre &&
        prev.logoCustom === logoCustom && prev.type === type && prev.textColor === textColor
      ) return;

      prevPressureOptionsRef.current[area] = { text, flag, flag2, flagCount, logoPre, logoCustom, type, textColor };

      const currentRender = (renderCounterRef.current[area] || 0) + 1;
      renderCounterRef.current[area] = currentRender;

      const hasFlag = !!flag && type === "flag";
      const hasLogo = !!(logoPre || logoCustom) && type === "logo";
      const hasSecondAsset = !!flag2;

      // Skip emissive for logo — will be sent from getDiffuseBase64 callback
      if (!hasLogo) {
        const opacity = getEmissiveBase64(text, hasFlag, hasLogo, hasSecondAsset, textColor);
        ["preview-iframe", "preview-iframe2"].forEach((id) => {
          const iframe = document.getElementById(id);
          if (iframe?.contentWindow) iframe.contentWindow.postMessage(`ZipperHoodie:${area}_opacity: ${opacity}`, "*");
        });
      }

      getDiffuseBase64(flag, logoPre, logoCustom, text, (diffuseBase, logoOpacityBase) => {
        if (renderCounterRef.current[area] !== currentRender) return;
        ["preview-iframe", "preview-iframe2"].forEach((id) => {
          const iframe = document.getElementById(id);
          if (iframe?.contentWindow) {
            iframe.contentWindow.postMessage(`ZipperHoodie:${area}_diffuse: ${diffuseBase}`, "*");
            if (logoOpacityBase) iframe.contentWindow.postMessage(`ZipperHoodie:${area}_opacity: ${logoOpacityBase}`, "*");
          }
        });
      }, flag2, flagCount, textColor);
    });
  }, [isAppReady, pressureOptions]);

  const colors = [
    { name: "Red", value: "#E61709", border: "#E61709", dark: false },
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

  const visibleColors = backDesigns
    ? [...colors].sort((a, b) => {
      if (designColor === "dark") return (a.dark === b.dark ? 0 : a.dark ? -1 : 1);
      return (a.dark === b.dark ? 0 : a.dark ? 1 : -1);
    })
    : colors;

  const sizes = ["S", "M", "L", "XL", "2XL", "3XL"];

  const renderChestArea = (area) => (
    <div key={area} className="bg-white rounded-lg p-4 mb-4">
      <h3 className="font-semibold text-gray-900 mb-3">
        {area === "rightChest" ? "Right Chest:" : "Left Chest:"}
      </h3>
      <div className="space-y-3">
        <div className="flex rounded-lg overflow-hidden border border-gray-200">
          {["text", "flag", "logo"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                handleTypeChange(area, tab === "text" ? "" : tab);
              }}
              className={`flex-1 py-2 text-xs font-bold capitalize transition-all ${pressureOptions[`${area}Type`] === tab || (tab === "text" && !pressureOptions[`${area}Type`])
                ? "bg-green-700 text-white"
                : "bg-white text-gray-500 hover:bg-gray-50"
                }`}
            >
              {tab === "text" ? "Text" : tab === "flag" ? "Flag" : "Logo"}
              {(tab === "text" && pressureOptions[`${area}Text`]) ||
                (tab === "flag" && pressureOptions[`${area}Flag`]) ||
                (tab === "logo" && pressureOptions[`${area}LogoPredefined`]) ? " ✓" : ""}
            </button>
          ))}
        </div>

        {!pressureOptions[`${area}Type`] && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <input type="text" value={pressureOptions[`${area}Text`]}
                onChange={(e) => {
                  onUpdate({ pressureOptions: { ...pressureOptions, [`${area}Text`]: e.target.value } });
                  setTimeout(() => { postToPreview(`zhoodie ${area}`); }, 0);
                }}
                placeholder="Enter text" maxLength={maxCharsText}
                className="flex-1 min-w-[120px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
              />
              {pressureOptions[`${area}Text`] && (
                <button onClick={() => clearField(`${area}Text`)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex justify-end">
              <span className={`text-xs font-medium ${(pressureOptions[`${area}Text`]?.length || 0) >= maxCharsText ? 'text-red-500' : 'text-gray-400'}`}>
                {pressureOptions[`${area}Text`]?.length || 0}/{maxCharsText}
              </span>
            </div>
            {pressureOptions[`${area}Text`] && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">Text color:</span>
                {["#ffffff", "#000000"].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => onUpdate({ pressureOptions: { ...pressureOptions, [`${area}TextColor`]: color } })}
                    title={color === "#ffffff" ? "White" : "Black"}
                    className="w-7 h-7 rounded-full border-2 transition-all"
                    style={{
                      backgroundColor: color,
                      borderColor: (pressureOptions[`${area}TextColor`] || "#ffffff") === color ? "#16a34a" : "#d1d5db",
                      boxShadow: (pressureOptions[`${area}TextColor`] || "#ffffff") === color ? "0 0 0 2px #16a34a" : "none",
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {pressureOptions[`${area}Type`] === "flag" && (
          <div className="flex flex-wrap gap-2">
            <input type="text" value={getFlagDisplay(pressureOptions[`${area}Flag`])} readOnly placeholder="Select flag"
              className="flex-1 min-w-[120px] px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-pointer"
              onClick={() => handleFlagSelect(`${area}Flag`)}
            />
            <button onClick={() => handleFlagSelect(`${area}Flag`)} className="px-4 py-2 bg-green-900 text-white rounded-lg hover:bg-green-800 text-sm font-medium">Select</button>
            {pressureOptions[`${area}Flag`] && (
              <button onClick={() => clearField(`${area}Flag`)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {pressureOptions[`${area}Type`] === "logo" && (
          <div className="flex flex-wrap gap-2">
            <input type="text" value={getLogoDisplay(pressureOptions[`${area}LogoPredefined`])} readOnly placeholder="Select logo"
              className="flex-1 min-w-[120px] px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-pointer"
              onClick={() => handleFlagSelect(`${area}LogoPredefined`)}
            />
            <button onClick={() => handleFlagSelect(`${area}LogoPredefined`)} className="px-4 py-2 bg-green-900 text-white rounded-lg hover:bg-green-800 text-sm font-medium">Select</button>
            {pressureOptions[`${area}LogoPredefined`] && (
              <button onClick={() => clearField(`${area}LogoPredefined`)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderSleeveArea = (area) => (
    <div key={area} className="bg-white rounded-lg p-4 mb-4">
      <h3 className="font-semibold text-gray-900 mb-3">
        {area === "rightSleeve" ? "Right Sleeve:" : "Left Sleeve:"}
      </h3>
      <div className="space-y-3">
        <div className="flex rounded-lg overflow-hidden border border-gray-200">
          {["text", "flag", "logo"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                if (tab === "text") {
                  postToPreview(`zhoodie ${area}`);
                  onUpdate({ pressureOptions: { ...pressureOptions, [`${area}Type`]: "", [`${area}Flag`]: "", [`${area}LogoPredefined`]: "", [`${area}LogoCustom`]: "" } });
                } else {
                  handleTypeChange(area, tab);
                }
              }}
              className={`flex-1 py-2 text-xs font-bold capitalize transition-all ${pressureOptions[`${area}Type`] === tab || (tab === "text" && !pressureOptions[`${area}Type`])
                ? "bg-green-700 text-white"
                : "bg-white text-gray-500 hover:bg-gray-50"
                }`}
            >
              {tab === "text" ? "Text" : tab === "flag" ? "Flag" : "Logo"}
              {(tab === "text" && pressureOptions[`${area}Text`]) ||
                (tab === "flag" && pressureOptions[`${area}Flag`]) ||
                (tab === "logo" && pressureOptions[`${area}LogoPredefined`]) ? " ✓" : ""}
            </button>
          ))}
        </div>

        {!pressureOptions[`${area}Type`] && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <input type="text" value={pressureOptions[`${area}Text`]}
                onChange={(e) => {
                  onUpdate({ pressureOptions: { ...pressureOptions, [`${area}Text`]: e.target.value } });
                  setTimeout(() => { postToPreview(`zhoodie ${area}`); }, 0);
                }}
                placeholder="Enter text" maxLength={maxCharsText}
                className="flex-1 min-w-[120px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
              />
              {pressureOptions[`${area}Text`] && (
                <button onClick={() => clearField(`${area}Text`)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex justify-end">
              <span className={`text-xs font-medium ${(pressureOptions[`${area}Text`]?.length || 0) >= maxCharsText ? 'text-red-500' : 'text-gray-400'}`}>
                {pressureOptions[`${area}Text`]?.length || 0}/{maxCharsText}
              </span>
            </div>
            {pressureOptions[`${area}Text`] && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">Text color:</span>
                {["#ffffff", "#000000"].map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => onUpdate({ pressureOptions: { ...pressureOptions, [`${area}TextColor`]: color } })}
                    title={color === "#ffffff" ? "White" : "Black"}
                    className="w-7 h-7 rounded-full border-2 transition-all"
                    style={{
                      backgroundColor: color,
                      borderColor: (pressureOptions[`${area}TextColor`] || "#ffffff") === color ? "#16a34a" : "#d1d5db",
                      boxShadow: (pressureOptions[`${area}TextColor`] || "#ffffff") === color ? "0 0 0 2px #16a34a" : "none",
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {pressureOptions[`${area}Type`] === "flag" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-gray-600">Number of flags:</span>
              <div className="flex rounded-lg overflow-hidden border border-gray-200">
                {[1, 2].map((n) => (
                  <button key={n} type="button"
                    onClick={() => {
                      onUpdate({
                        pressureOptions: {
                          ...pressureOptions,
                          [`${area}FlagCount`]: n,
                          ...(n === 1 ? { [`${area}Flag2`]: "" } : {}),
                        },
                      });
                    }}
                    className={`px-4 py-1.5 text-xs font-bold transition-all ${(pressureOptions[`${area}FlagCount`] || 1) === n
                      ? "bg-green-700 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
                      }`}
                  >{n}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                {(Number(pressureOptions[`${area}FlagCount`] || 1) === 2) ? "Flag 1 (50% size)" : "Flag"}
              </label>
              <div className="flex flex-wrap gap-2">
                <input type="text" value={getFlagDisplay(pressureOptions[`${area}Flag`])} readOnly placeholder="Select flag"
                  className="flex-1 min-w-[120px] px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-pointer"
                  onClick={() => handleFlagSelect(`${area}Flag`)}
                />
                <button onClick={() => handleFlagSelect(`${area}Flag`)} className="px-4 py-2 bg-green-900 text-white rounded-lg hover:bg-green-800 text-sm font-medium">Select</button>
                {pressureOptions[`${area}Flag`] && <button onClick={() => clearField(`${area}Flag`)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 className="w-4 h-4" /></button>}
              </div>
            </div>

            {(Number(pressureOptions[`${area}FlagCount`] || 1) === 2) && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Flag 2 (50% size)</label>
                <div className="flex flex-wrap gap-2">
                  <input type="text" value={getFlagDisplay(pressureOptions[`${area}Flag2`] || "")} readOnly placeholder="Select flag"
                    className="flex-1 min-w-[120px] px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-pointer"
                    onClick={() => handleFlagSelect(`${area}Flag2`)}
                  />
                  <button onClick={() => handleFlagSelect(`${area}Flag2`)} className="px-4 py-2 bg-green-900 text-white rounded-lg hover:bg-green-800 text-sm font-medium">Select</button>
                  {pressureOptions[`${area}Flag2`] && <button onClick={() => clearField(`${area}Flag2`)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 className="w-4 h-4" /></button>}
                </div>
              </div>
            )}
          </div>
        )}

        {pressureOptions[`${area}Type`] === "logo" && (
          <div className="flex flex-wrap gap-2">
            <input type="text" value={getLogoDisplay(pressureOptions[`${area}LogoPredefined`])} readOnly placeholder="Select logo"
              className="flex-1 min-w-[120px] px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-pointer"
              onClick={() => handleFlagSelect(`${area}LogoPredefined`)}
            />
            <button onClick={() => handleFlagSelect(`${area}LogoPredefined`)} className="px-4 py-2 bg-green-900 text-white rounded-lg hover:bg-green-800 text-sm font-medium">Select</button>
            {pressureOptions[`${area}LogoPredefined`] && <button onClick={() => clearField(`${area}LogoPredefined`)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 className="w-4 h-4" /></button>}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-md mx-auto">
      {activeTab === "size" ? (
        <>
          <h1 className="text-lg font-bold mb-3 text-gray-900">Zipper Hoodie</h1>
          <div className="mb-4">
            <h2 className="text-xs font-semibold mb-2 text-gray-500 uppercase tracking-wide">Color</h2>
            <div className="grid grid-flow-col grid-rows-1 gap-2 w-fit">
              {visibleColors.map(c => (
                <button key={c.name} title={c.name} onClick={() => onUpdate({ selectedColor: c.name })}
                  className="relative w-8 h-8 rounded-md transition-all focus:outline-none"
                  style={{ backgroundColor: c.value, border: selectedColor === c.name ? `2px solid ${c.border}` : `1px solid ${c.border}`, boxShadow: selectedColor === c.name ? `0 0 0 2px white, 0 0 0 3px ${c.border}` : "none" }}>
                  {selectedColor === c.name && <div className="absolute inset-0 rounded-md border border-white pointer-events-none" />}
                </button>
              ))}
            </div>
            {selectedColor && <p className="text-xs text-gray-500 mt-1.5">{selectedColor}</p>}
          </div>
          <div className="mb-5">
            <h2 className="text-xs font-semibold mb-2 text-gray-500 uppercase tracking-wide">Size</h2>
            <div className="flex flex-wrap gap-2">
              {sizes.map(s => <button key={s} onClick={() => onUpdate({ selectedSize: s })} className={`py-1.5 px-3 rounded-lg border-2 transition-all font-medium text-sm ${selectedSize === s ? "border-gray-900 bg-white text-gray-900" : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"}`}>{s}</button>)}
            </div>
          </div>
          {backDesigns && (
            <div className="mb-5">
              <h2 className="text-xs font-semibold mb-3 text-gray-500 uppercase tracking-wide flex items-center gap-2"><span>⊕</span> Back Design Library</h2>
              <p className="text-xs font-semibold text-gray-700 mb-2">Garment Color</p>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setDesignColor("light"); designColorRef.current = "light"; sendBackDesign(lastBackDataRef.current.diffuse, lastBackDataRef.current.opacity, "light"); }}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${designColor === "light" ? "border-green-600 bg-white text-gray-900" : "border-gray-200 bg-white text-gray-500"}`}>
                  <div className="font-bold">Light Garment</div>
                  <div className="text-xs text-gray-400 font-normal">Black print</div>
                </button>
                <button type="button" onClick={() => { setDesignColor("dark"); designColorRef.current = "dark"; sendBackDesign(lastBackDataRef.current.diffuse, lastBackDataRef.current.opacity, "dark"); }}
                  className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${designColor === "dark" ? "border-green-600 bg-white text-gray-900" : "border-gray-200 bg-white text-gray-500"}`}>
                  <div className="font-bold">Dark Garment</div>
                  <div className="text-xs text-gray-400 font-normal">White print</div>
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <h1 className="text-lg font-bold mb-3 text-gray-900">Pressure Options</h1>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Chest Area</h2>
            {["rightChest", "leftChest"].map(renderChestArea)}
          </div>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Sleeves</h2>
            {["rightSleeve", "leftSleeve"].map(renderSleeveArea)}
          </div>
        </>
      )}

      <div className={activeTab === "pressure" ? "mt-10" : ""} style={activeTab !== "pressure" ? { visibility: 'hidden', position: 'absolute', pointerEvents: 'none', height: 0, overflow: 'hidden' } : {}}>
        <Test postEx="ZipperHoodie:" pressureOptions={pressureOptions} isAppReady={isAppReady} backDesigns={backDesigns} designColor={designColor}
          onUpdate={(update) => {
            if (update.canvasBase64) {
              const raw = update.canvasBase64.rawData;
              const diffuseB64 = raw?.diffuse || "";
              const opacityB64 = raw?.opacity || "";
              lastBackDataRef.current = { diffuse: diffuseB64, opacity: opacityB64 };
              sendBackDesign(diffuseB64, opacityB64, designColorRef.current);
            }
            if (update.backDesign !== undefined) {
              onUpdate({ pressureOptions: { ...pressureOptions, backDesign: update.backDesign } });
            }
          }}
        />
      </div>

      {showFlagModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowFlagModal(false)} />
          <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
            <div className="flex items-center justify-between px-8 py-7 border-b border-slate-50 bg-white/50 sticky top-0 z-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-50 rounded-2xl">
                  {currentField.includes("Logo") ? <ImageIcon className="w-6 h-6 text-green-600" /> : <Flag className="w-6 h-6 text-green-600" />}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 leading-none">{currentField.includes("Logo") ? "Select a Logo" : "Choose a Flag"}</h2>
                  <p className="text-slate-500 text-sm mt-1.5 font-medium">{currentField.includes("Logo") ? "Pick a symbol for your design" : "Represent your country"}</p>
                </div>
              </div>
              <button onClick={() => setShowFlagModal(false)} className="p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all duration-200 group">
                <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
              </button>
            </div>
            <div className="p-8 overflow-y-auto bg-slate-50/30">
              {currentField.includes("Logo") ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                  {logos && logos.map((logo) => (
                    <button key={logo.id} onClick={() => selectLogo(logo.name, logo.id)}
                      className="group relative flex flex-col items-center p-2 rounded-3xl transition-all duration-300 hover:bg-white hover:shadow-xl hover:shadow-slate-200/50"
                    >
                      <div className="w-full aspect-square mb-4 flex items-center justify-center bg-white rounded-2xl border border-slate-100 shadow-sm group-hover:border-green-200 group-hover:-translate-y-2 transition-all duration-500 p-5 overflow-hidden">
                        <img src={`${BASE_URL}${logo.file_path}`.replace(/\\/g, '/')} alt={logo.name}
                          className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300" />
                      </div>
                      <span className="text-xs font-bold text-slate-500 group-hover:text-green-700 transition-colors uppercase tracking-wider text-center truncate w-full px-2">{logo.name}</span>
                      <div className="absolute top-4 right-4 bg-green-600 rounded-full p-1 opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-100 transition-all duration-300">
                        <X className="w-3 h-3 text-white rotate-45" />
                      </div>
                    </button>
                  ))}
                  {(!logos || logos.length === 0) && (
                    <div className="col-span-full py-20 text-center">
                      <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><ImageIcon className="w-8 h-8 text-slate-400" /></div>
                      <p className="text-slate-400 font-bold text-lg">No logos found</p>
                      <p className="text-slate-400/60 text-sm">Logos assigned to your class will appear here.</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {countries.map((country) => (
                    <button key={country.name} onClick={() => selectFlag(country.name)}
                      className="group flex flex-col items-center gap-3 p-4 rounded-xl bg-white border border-slate-100 hover:border-green-300 hover:shadow-lg hover:shadow-green-900/5 hover:-translate-y-1 transition-all duration-300"
                    >
                      <div className="relative w-16 h-12 rounded-lg overflow-hidden shadow-sm border border-slate-100 group-hover:ring-2 group-hover:ring-slate-100 group-hover:ring-green-50 transition-all duration-300">
                        <img src={country.flag} alt={country.name} className="w-full h-full object-cover" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 group-hover:text-slate-900 leading-tight uppercase tracking-wider text-center">{country.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="px-8 py-5 border-t border-slate-50 bg-white/50 sticky bottom-0 z-10">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-widest text-center">Choose an asset to customize your placement</p>
              <div className="flex justify-center items-center gap-2 mt-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ZippedHoodie;
