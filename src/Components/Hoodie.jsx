import React, { useState, useEffect } from "react";
import cog from "../assets/menuimages/cogwheel-pen.png";
import plus from "../assets/menuimages/shirt-plus.png";
import Test from "./Test";
import { BASE_URL, GARMENT_COLORS as colors } from "../utils/const";
import { ALL_FLAGS } from "../utils/flags";
import { postToPreview } from "../utils/postMessage";
import { X, Image as ImageIcon, Flag, Trash2 } from "lucide-react";

const Hoodie = ({ data, onUpdate, isAppReady, logos, backDesigns, maxCharsText = 25, activeTab: externalTab }) => {
  const [internalTab, setInternalTab] = useState("size");
  const activeTab = externalTab || internalTab;
  const setActiveTab = externalTab ? () => { } : setInternalTab;
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [currentField, setCurrentField] = useState("");

  const selectedColor = data?.selectedColor || "Red";
  const selectedSize = data?.selectedSize || "";

  const initialDesignColor = colors.find(c => c.name.toLowerCase() === selectedColor.toLowerCase())?.dark ? "dark" : "light";
  const [designColor, setDesignColor] = useState(initialDesignColor);
  const designColorRef = React.useRef(initialDesignColor);

  // selectedColor can change from outside this component after mount — e.g. an
  // already-purchased order's saved color arriving once the async fetch resolves,
  // or restoring a past version — so the light/dark toggle (only set at mount via
  // useState) can end up stuck out of sync with the actual garment color. Re-sync it.
  useEffect(() => {
    if (backDesigns) {
      const hasLight = !!backDesigns.configured_file_path;
      const hasDark = !!backDesigns.configured_file_path_2;
      if (hasLight && !hasDark) {
        if (designColorRef.current !== "light") {
          setDesignColor("light");
          designColorRef.current = "light";
        }
        const currentMeta = colors.find(c => c.name.toLowerCase() === selectedColor.toLowerCase());
        if (!currentMeta || currentMeta.dark) {
          onUpdate({ selectedColor: "White" });
        }
        return;
      }
      if (hasDark && !hasLight) {
        if (designColorRef.current !== "dark") {
          setDesignColor("dark");
          designColorRef.current = "dark";
        }
        const currentMeta = colors.find(c => c.name.toLowerCase() === selectedColor.toLowerCase());
        if (!currentMeta || !currentMeta.dark) {
          onUpdate({ selectedColor: "Black" });
        }
        return;
      }
    }
    const meta = colors.find(c => c.name.toLowerCase() === selectedColor.toLowerCase());
    if (!meta) return;
    const expected = meta.dark ? "dark" : "light";
    if (expected !== designColorRef.current) {
      setDesignColor(expected);
      designColorRef.current = expected;
    }
  }, [selectedColor, backDesigns]);

  const lastBackDataRef = React.useRef({ diffuse: "", opacity: "" }); // cache last canvas data
  const lastSentBackRef = React.useRef({ diffuse: "", opacity: "", color: "" }); // dedupe: last actually SENT data

  React.useEffect(() => {
    const handleResend = () => {
      if (lastBackDataRef.current?.diffuse) {
        sendBackDesign(lastBackDataRef.current.diffuse, lastBackDataRef.current.opacity, designColorRef.current);
      }
    };
    window.addEventListener("resendBackDesign", handleResend);
    return () => window.removeEventListener("resendBackDesign", handleResend);
  }, []);

  const handleDesignColorChange = (newDesignColor) => {
    setDesignColor(newDesignColor);
    designColorRef.current = newDesignColor;
    sendBackDesign(lastBackDataRef.current.diffuse, lastBackDataRef.current.opacity, newDesignColor);

    const current = colors.find(c => c.name.toLowerCase() === selectedColor.toLowerCase());
    const isCompatible = current && (newDesignColor === "dark" ? current.dark : !current.dark);
    if (!isCompatible) {
      const defaultColor = newDesignColor === "dark" ? "Black" : "White";
      onUpdate({ selectedColor: defaultColor });
    }
  };

  useEffect(() => {
    if (!backDesigns) return;
    const hasLight = !!backDesigns.configured_file_path;
    const hasDark = !!backDesigns.configured_file_path_2;

    let targetDesignColor = designColorRef.current;
    if (hasLight && !hasDark) {
      targetDesignColor = "light";
    } else if (hasDark && !hasLight) {
      targetDesignColor = "dark";
    } else if (hasLight && hasDark) {
      const meta = colors.find(c => c.name.toLowerCase() === selectedColor.toLowerCase());
      if (meta) {
        targetDesignColor = meta.dark ? "dark" : "light";
      }
    }

    if (targetDesignColor !== designColorRef.current) {
      handleDesignColorChange(targetDesignColor);
    } else {
      const current = colors.find(c => c.name.toLowerCase() === selectedColor.toLowerCase());
      const isCompatible = current && (targetDesignColor === "dark" ? current.dark : !current.dark);
      if (!isCompatible) {
        const defaultColor = targetDesignColor === "dark" ? "Black" : "White";
        onUpdate({ selectedColor: defaultColor });
      }
    }
  }, [backDesigns]);

  const pressureOptions = data?.pressureOptions || {
    rightChestText: "", rightChestFlag: "", rightChestLogoPredefined: "", rightChestLogoCustom: "", rightChestType: "",
    leftChestText: "", leftChestFlag: "", leftChestLogoPredefined: "", leftChestLogoCustom: "", leftChestType: "",
    bottomChestText: "", bottomChestFlag: "", bottomChestLogoPredefined: "", bottomChestLogoCustom: "", bottomChestType: "",
    rightSleeveText: "", rightSleeveFlag: "", rightSleeveLogoPredefined: "", rightSleeveLogoCustom: "", rightSleeveType: "",
    leftSleeveText: "", leftSleeveFlag: "", leftSleeveLogoPredefined: "", leftSleeveLogoCustom: "", leftSleeveType: "",
    backDesign: null,
  };
  const countries = ALL_FLAGS;
  const flagImages = Object.fromEntries(ALL_FLAGS.map(f => [f.name, f.flagHD || f.flag]));
  const CANVAS_WIDTH = 320, TEXT_HEIGHT = 120, FLAG_HEIGHT = 240, CANVAS_HEIGHT = 360;

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
      const textY = TEXT_HEIGHT + FLAG_HEIGHT / 2;
      ctx.fillText(text, CANVAS_WIDTH / 2, textY);
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

    if (hasFlag && hasSecondAsset) {
      // Two-flag split — thin border, especially left/right, so neither flag gets clipped
      const BORDER_TB = 10, BORDER_LR = 3;
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, BORDER_TB);
      ctx.fillRect(0, canvas.height - BORDER_TB, canvas.width, BORDER_TB);
      ctx.fillRect(0, 0, BORDER_LR, canvas.height);
      ctx.fillRect(canvas.width - BORDER_LR, 0, BORDER_LR, canvas.height);
    } else if (hasFlag || hasLogo) {
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

    // ---------- TEXT ---------- (only for text-only mode when no flag/logo; with flag/logo, text drawn after)
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
          const y = (TEXT_HEIGHT + (FLAG_HEIGHT - targetHeight) / 2) - 8;

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
        const ratio = Math.min(CANVAS_WIDTH / img.width, FLAG_HEIGHT / img.height * 0.8);

        // Normal path dimensions
        const LOGO_W_SCALE = 0.8;
        const LOGO_H_SCALE = 1;
        const w = img.width * ratio * LOGO_W_SCALE;
        const h = img.height * ratio * LOGO_H_SCALE;
        const x = (CANVAS_WIDTH - w) / 2;
        const y = TEXT_HEIGHT + (FLAG_HEIGHT - h) / 20;

        // Two-tone path dimensions
        const TWOTONE_W_SCALE = 0.8;
        const TWOTONE_H_SCALE = 1.1; // 👈 yahan apni marzi ki value do
        const wTT = img.width * ratio * TWOTONE_W_SCALE;
        const hTT = img.height * ratio * TWOTONE_H_SCALE;
        const xTT = (CANVAS_WIDTH - wTT) / 2;
        const yTT = TEXT_HEIGHT + (FLAG_HEIGHT - hTT) / 2;

        const W = CANVAS_WIDTH, H = CANVAS_HEIGHT;

        // ── native pixels — alpha & two-tone detection ──
        const tmpC = document.createElement("canvas");
        tmpC.width = img.width; tmpC.height = img.height;
        const tmpCtx2 = tmpC.getContext("2d");
        tmpCtx2.drawImage(img, 0, 0);
        const tmpD = tmpCtx2.getImageData(0, 0, img.width, img.height);

        let imgHasAlpha = false;
        for (let i = 3; i < tmpD.data.length; i += 4) {
          if (tmpD.data[i] < 254) { imgHasAlpha = true; break; }
        }

        // near-black / near-white count — two-tone check
        let nBlack = 0, nWhite = 0, nOpaque = 0;
        for (let i = 0; i < tmpD.data.length; i += 4) {
          if (tmpD.data[i + 3] < 20) continue;
          nOpaque++;
          const lum = 0.299 * tmpD.data[i] + 0.587 * tmpD.data[i + 1] + 0.114 * tmpD.data[i + 2];
          if (lum < 50) nBlack++;
          else if (lum > 205) nWhite++;
        }
        const twoToneRatio = nOpaque ? (nBlack + nWhite) / nOpaque : 0;
        const isTwoTone = twoToneRatio > 0.9 && nBlack > 0 && nWhite > 0;

        // background tone (corners average)
        const cLum = [[0, 0], [img.width - 1, 0], [0, img.height - 1], [img.width - 1, img.height - 1]]
          .map(([px, py]) => { const k = (py * img.width + px) * 4; return 0.299 * tmpD.data[k] + 0.587 * tmpD.data[k + 1] + 0.114 * tmpD.data[k + 2]; });
        const bgIsWhite = (cLum.reduce((s, v) => s + v, 0) / 4) > 127;

        if (isTwoTone) {
          // ── CLEAN PATH: white-bg+black-shape ya black-bg+white-shape ──
          const workC = document.createElement("canvas");
          workC.width = W; workC.height = H;
          const wctx = workC.getContext("2d");
          wctx.drawImage(img, xTT, yTT, wTT, hTT); // 👈 TT dimensions
          const wd = wctx.getImageData(0, 0, W, H);


          const opacityCanvas = document.createElement("canvas");
          opacityCanvas.width = W; opacityCanvas.height = H;
          const octx = opacityCanvas.getContext("2d");
          const od = octx.createImageData(W, H);

          for (let p = 0, i = 0; p < W * H; p++, i += 4) {
            const a = wd.data[i + 3];
            let fg;
            if (a < 20) fg = false;
            else {
              const lum = 0.299 * wd.data[i] + 0.587 * wd.data[i + 1] + 0.114 * wd.data[i + 2];
              fg = bgIsWhite ? (lum < 128) : (lum > 128);
            }
            if (fg) {
              wd.data[i + 3] = 255;
              od.data[i] = od.data[i + 1] = od.data[i + 2] = 255;
            } else {
              wd.data[i + 3] = 0;
              od.data[i] = od.data[i + 1] = od.data[i + 2] = 0;
            }
            od.data[i + 3] = 255;
          }
          ctx.putImageData(wd, 0, 0);
          octx.putImageData(od, 0, 0);

          if (text?.trim()) {
            let fs = 48;
            ctx.font = `bold ${fs}px Arial`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
            while (ctx.measureText(text).width > CANVAS_WIDTH - 80 && fs > 28) { fs -= 2; ctx.font = `bold ${fs}px Arial`; }
            ctx.fillStyle = textColor;
            ctx.fillText(text, CANVAS_WIDTH / 2, TEXT_HEIGHT + FLAG_HEIGHT / 2);

            let fs2 = 48; octx.fillStyle = "#ffffff";
            octx.font = `bold ${fs2}px Arial`; octx.textAlign = "center"; octx.textBaseline = "middle";
            while (octx.measureText(text).width > CANVAS_WIDTH - 80 && fs2 > 28) { fs2 -= 2; octx.font = `bold ${fs2}px Arial`; }
            octx.fillText(text, CANVAS_WIDTH / 2, TEXT_HEIGHT + FLAG_HEIGHT / 2);
          }

          callback(canvas.toDataURL("image/png"), opacityCanvas.toDataURL("image/png"));
          return;
        }

        // ── GENERAL PATH ──
        ctx.drawImage(img, x, y, w, h);

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

        const opacityCanvas = document.createElement("canvas");
        opacityCanvas.width = CANVAS_WIDTH; opacityCanvas.height = CANVAS_HEIGHT;
        const octx = opacityCanvas.getContext("2d");

        if (imgHasAlpha) {
          octx.drawImage(img, x, y, w, h);
          const d = octx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          for (let i = 0; i < d.data.length; i += 4) {
            const bw = d.data[i + 3] > 127 ? 255 : 0;
            d.data[i] = d.data[i + 1] = d.data[i + 2] = bw; d.data[i + 3] = 255;
          }
          octx.putImageData(d, 0, 0);
        } else {
          const gC = (px, py) => { const idx = (py * img.width + px) * 4; return [tmpD.data[idx], tmpD.data[idx + 1], tmpD.data[idx + 2]]; };
          const corners = [gC(0, 0), gC(img.width - 1, 0), gC(0, img.height - 1), gC(img.width - 1, img.height - 1)];
          const bgR = corners.reduce((s, c) => s + c[0], 0) / 4;
          const bgG = corners.reduce((s, c) => s + c[1], 0) / 4;
          const bgB = corners.reduce((s, c) => s + c[2], 0) / 4;
          const thr = 90;
          octx.drawImage(img, x, y, w, h);
          const d = octx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          for (let i = 0; i < d.data.length; i += 4) {
            const a = d.data[i + 3]; let bw;
            if (a < 10) { bw = 0; }
            else { const diff = Math.abs(d.data[i] - bgR) + Math.abs(d.data[i + 1] - bgG) + Math.abs(d.data[i + 2] - bgB); bw = diff > thr ? 255 : 0; }
            d.data[i] = d.data[i + 1] = d.data[i + 2] = bw; d.data[i + 3] = 255;
          }
          octx.putImageData(d, 0, 0);
        }
        callback(canvas.toDataURL("image/png"), opacityCanvas.toDataURL("image/png"));
        return;
      } catch (e) { /* fall through */ }
    }

    // ---------- EMPTY ----------
    callback(canvas.toDataURL("image/png"));
  };

  const sendBackDesign = (diffuseB64, opacityB64, color) => {
    if (!diffuseB64 && !opacityB64) return;

    // Dedupe: agar same data + same color pehle hi bheja ja chuka hai, to skip
    if (
      lastSentBackRef.current.diffuse === diffuseB64 &&
      lastSentBackRef.current.opacity === opacityB64 &&
      lastSentBackRef.current.color === color
    ) {
      return;
    }
    lastSentBackRef.current = { diffuse: diffuseB64, opacity: opacityB64, color };

    // const formatTexture = (b64, cb) => {
    //   if (!b64) { cb(null); return; }
    //   const img = new Image();
    //   img.crossOrigin = "anonymous";
    //   img.onload = () => {
    //     const BIG_CANVAS = 2048;
    //     const c = document.createElement("canvas");
    //     c.width = BIG_CANVAS; c.height = BIG_CANVAS;
    //     const ctx = c.getContext("2d");
    //     ctx.imageSmoothingEnabled = true;
    //     ctx.imageSmoothingQuality = "high";

    //     const TARGET_PERCENT = 0.9;
    //     const targetSize = BIG_CANVAS * TARGET_PERCENT;
    //     const ratio = Math.min(targetSize / img.width, targetSize / img.height);
    //     const dw = img.width * ratio;
    //     const dh = img.height * ratio;
    //     const dx = (BIG_CANVAS - dw) / 2;
    //     const dy = (BIG_CANVAS - dh) / 2;

    //     ctx.drawImage(img, dx, dy, dw, dh);
    //     cb(c.toDataURL("image/png", 1.0));
    //   };
    //   img.src = b64;
    // };

    const formatTexture = (b64, cb) => {
      if (!b64) {
        cb(null);
        return;
      }

      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        // Bleed pass at natural size: push opaque edge colors out into the
        // transparent margin so the upscale smoothing below can't sample
        // transparent-black RGB at the edges — that's what was showing up
        // as a dark outline around the design on the shirt.
        const bleedCanvas = document.createElement("canvas");
        bleedCanvas.width = img.width;
        bleedCanvas.height = img.height;
        const bctx = bleedCanvas.getContext("2d");
        bctx.drawImage(img, 0, 0);
        bctx.globalCompositeOperation = "destination-over";
        const bleed = 2;
        for (let ox = -bleed; ox <= bleed; ox++) {
          for (let oy = -bleed; oy <= bleed; oy++) {
            if (ox === 0 && oy === 0) continue;
            bctx.drawImage(img, ox, oy);
          }
        }

        const BIG_CANVAS = 4096; // pehle 2048 tha

        const c = document.createElement("canvas");
        c.width = BIG_CANVAS;
        c.height = BIG_CANVAS;

        const ctx = c.getContext("2d");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        const TARGET_PERCENT = 1.3; // pehle 0.9 tha

        const targetSize = BIG_CANVAS * TARGET_PERCENT;
        const ratio = Math.min(
          targetSize / img.width,
          targetSize / img.height
        );

        const dw = img.width * ratio;
        const dh = img.height * ratio;

        const dx = (BIG_CANVAS - dw) / 1.9;
        const dy = (BIG_CANVAS - dh) / 2;

        ctx.drawImage(bleedCanvas, dx, dy, dw, dh);

        cb(c.toDataURL("image/png", 1.0));
      };

      img.src = b64;
    };

    formatTexture(diffuseB64, (formattedDiffuse) => {
      formatTexture(opacityB64, (formattedOpacity) => {
        ["preview-iframe", "preview-iframe2"].forEach(id => {
          const iframe = document.getElementById(id);
          if (!iframe?.contentWindow) return;
          if (color === "light") {
            if (formattedDiffuse) iframe.contentWindow.postMessage("Hoodie:back_black_diffuse: " + formattedDiffuse, "*");
            if (formattedOpacity) iframe.contentWindow.postMessage("Hoodie:back_black_opacity: " + formattedOpacity, "*");
          } else {
            if (formattedDiffuse) iframe.contentWindow.postMessage("Hoodie:back_white_diffuse: " + formattedDiffuse, "*");
            if (formattedOpacity) iframe.contentWindow.postMessage("Hoodie:back_white_opacity: " + formattedOpacity, "*");
          }
        });
      });
    });
  };

  const handleFlagSelect = (field) => {
    setCurrentField(field);
    const area = field.replace("Flag", "").replace("LogoPredefined", "");
    postToPreview(`hoodie ${area}`);
    setShowFlagModal(true);
  };
  const selectFlag = (name) => { onUpdate({ pressureOptions: { ...pressureOptions, [currentField]: name } }); setShowFlagModal(false); };
  const selectLogo = (name, id) => { const area = currentField.replace("LogoPredefined", ""); onUpdate({ pressureOptions: { ...pressureOptions, [currentField]: name, [`${area}LogoId`]: id, selectedLogoId: id } }); setShowFlagModal(false); };
  const clearField = (field) => { onUpdate({ pressureOptions: { ...pressureOptions, [field]: "" } }); };
  const getFlagDisplay = (n) => n || "";
  const getLogoDisplay = (n) => n || "";

  const handleTypeChange = (area, type) => {
    postToPreview(`hoodie ${area}`);
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
        [`${area}LogoId`]: type === "logo" ? pressureOptions[`${area}LogoId`] : null,
        [`${area}LogoCustom`]: type === "logo" ? pressureOptions[`${area}LogoCustom`] : "",
      },
    });
  };

  useEffect(() => {
    if (logos && logos.length === 1) {
      const fs = ["rightChestLogoPredefined", "leftChestLogoPredefined", "bottomChestLogoPredefined", "rightSleeveLogoPredefined", "leftSleeveLogoPredefined"];
      if (!fs.some(f => pressureOptions[f])) onUpdate({ pressureOptions: { ...pressureOptions, rightChestLogoPredefined: logos[0].name, rightChestLogoId: logos[0].id, selectedLogoId: logos[0].id } });
    }
  }, [logos]);

  useEffect(() => {
    const m = { red: "Hoodie:red", black: "Hoodie:black", white: "Hoodie:white", natural: "Hoodie:natural", "heather grey": "Hoodie:heatherGrey", navy: "Hoodie:navy", "light pink": "Hoodie:lightPink", "olive green": "Hoodie:oliveGreen", blue: "Hoodie:blue", purple: "Hoodie:purple" };
    const msg = m[selectedColor.toLowerCase()]; if (!msg) return;
    ["preview-iframe", "preview-iframe2"].forEach(id => { const f = document.getElementById(id); if (f?.contentWindow) f.contentWindow.postMessage(msg, "*"); });
  }, [selectedColor, isAppReady]);

  useEffect(() => {
    if (!selectedSize) return;
    ["preview-iframe", "preview-iframe2"].forEach(id => { const f = document.getElementById(id); if (f?.contentWindow) f.contentWindow.postMessage(`Hoodie:size:${selectedSize}`, "*"); });
  }, [selectedSize, isAppReady]);

  const prevRef = React.useRef({});
  const renderCounterRef = React.useRef({});
  useEffect(() => {
    ["rightChest", "leftChest", "bottomChest", "rightSleeve", "leftSleeve"].forEach(area => {
      const text = pressureOptions[`${area}Text`]?.trim() || "", flag = pressureOptions[`${area}Flag`] || "", flag2 = pressureOptions[`${area}Flag2`] || "", flagCount = pressureOptions[`${area}FlagCount`] || 1, logoPre = pressureOptions[`${area}LogoPredefined`] || "", logoCustom = pressureOptions[`${area}LogoCustom`] || "", type = pressureOptions[`${area}Type`] || "";
      const textColor = pressureOptions[`${area}TextColor`] || "#ffffff";
      const p = prevRef.current[area] || {};
      if (p.text === text && p.flag === flag && p.flag2 === flag2 && p.flagCount === flagCount && p.logoPre === logoPre && p.logoCustom === logoCustom && p.type === type && p.textColor === textColor) return;
      prevRef.current[area] = { text, flag, flag2, flagCount, logoPre, logoCustom, type, textColor };

      const currentRender = (renderCounterRef.current[area] || 0) + 1;
      renderCounterRef.current[area] = currentRender;

      const hasFlag = !!flag && type === "flag", hasLogo = !!(logoPre || logoCustom) && type === "logo";
      const hasSecondAsset = !!flag2;

      // Skip emissive for logo ? will be sent from getDiffuseBase64 callback
      if (!hasLogo) {
        const opacity = getEmissiveBase64(text, hasFlag, hasLogo, hasSecondAsset, textColor);
        ["preview-iframe", "preview-iframe2"].forEach(id => { const f = document.getElementById(id); if (f?.contentWindow) f.contentWindow.postMessage(`Hoodie:${area}_opacity: ${opacity}`, "*"); });
      }

      getDiffuseBase64(flag, logoPre, logoCustom, text, (d, logoOpacityBase) => {
        if (renderCounterRef.current[area] !== currentRender) return;
        ["preview-iframe", "preview-iframe2"].forEach(id => {
          const f = document.getElementById(id);
          if (f?.contentWindow) {
            f.contentWindow.postMessage(`Hoodie:${area}_diffuse: ${d}`, "*");
            if (logoOpacityBase) f.contentWindow.postMessage(`Hoodie:${area}_opacity: ${logoOpacityBase}`, "*");
          }
        });
      }, flag2, flagCount, textColor);
    });
  }, [isAppReady, pressureOptions]);

  // Filter colors based on garment toggle — dark garment shows dark colors, light shows light colors
  const visibleColors = backDesigns
    ? colors.filter(c => {
      const hasLight = !!backDesigns.configured_file_path;
      const hasDark = !!backDesigns.configured_file_path_2;
      if (hasLight && !hasDark) return !c.dark;
      if (hasDark && !hasLight) return c.dark;
      return designColor === "dark" ? c.dark : !c.dark;
    })
    : colors;

  const sizes = ["S", "M", "L", "XL", "2XL", "3XL"];

  const renderChestArea = (area) => (
    <div key={area} className="bg-white rounded-lg lg:p-4 p-2 lg:mb-4 mb-2">
      <h3 className=" lg:font-semibold text-gray-900 lg:mb-3 mb-1">
        {area === "rightChest" ? "Right Chest:" : area === "leftChest" ? "Left Chest:" : "Bottom Chest:"}
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
                (tab === "logo" && pressureOptions[`${area}LogoPredefined`]) ? "  " : ""}
            </button>
          ))}
        </div>

        {!pressureOptions[`${area}Type`] && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <input type="text" value={pressureOptions[`${area}Text`]}
                onChange={(e) => {
                  onUpdate({ pressureOptions: { ...pressureOptions, [`${area}Text`]: e.target.value } });
                  setTimeout(() => { postToPreview(`hoodie ${area}`); }, 0);
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
    <div key={area} className="bg-white rounded-lg lg:p-4 p-2 lg:mb-4 mb-2">
      <h3 className=" lg:font-semibold text-gray-900 lg:mb-3 mb-1">
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
                  postToPreview(`hoodie ${area}`);
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
                (tab === "logo" && pressureOptions[`${area}LogoPredefined`]) ? "  " : ""}
            </button>
          ))}
        </div>

        {!pressureOptions[`${area}Type`] && (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <input type="text" value={pressureOptions[`${area}Text`]}
                onChange={(e) => {
                  onUpdate({ pressureOptions: { ...pressureOptions, [`${area}Text`]: e.target.value } });
                  setTimeout(() => { postToPreview(`hoodie ${area}`); }, 0);
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

  const Modal = () => (
    showFlagModal ? (
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
    ) : null
  );

  return (
    <div className="max-w-md mx-auto">
      {activeTab === "size" ? (
        <>
          <h1 className="lg:text-lg text-md lg:font-bold font-semibold lg:mb-3 mb-1 text-gray-900">Hoodie</h1>
          {backDesigns && (backDesigns.configured_file_path || backDesigns.configured_file_path_2) && (
            <div className="lg:mb-5 mb-2">
              <p className="text-xs font-semibold text-gray-700 mb-2">Garment Color</p>
              <div className="flex gap-3">
                {backDesigns.configured_file_path && (
                  <button type="button" onClick={() => handleDesignColorChange("light")}
                    className={`basis-1/2 flex-none py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${designColor === "light" ? "border-green-600 bg-white text-gray-900" : "border-gray-200 bg-white text-gray-500"}`}>
                    <div className="font-bold">Light Garment</div>
                    <div className="text-xs text-gray-400 font-normal">Black print</div>
                  </button>
                )}
                {backDesigns.configured_file_path_2 && (
                  <button type="button" onClick={() => handleDesignColorChange("dark")}
                    className={`basis-1/2 flex-none py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${designColor === "dark" ? "border-green-600 bg-white text-gray-900" : "border-gray-200 bg-white text-gray-500"}`}>
                    <div className="font-bold">Dark Garment</div>
                    <div className="text-xs text-gray-400 font-normal">White print</div>
                  </button>
                )}
              </div>
            </div>
          )}
          <div className="mb-4">
            <h2 className="text-xs font-semibold mb-2 text-gray-500 uppercase tracking-wide">Color</h2>
            <div className="grid grid-flow-col grid-rows-1 gap-2 w-fit">
              {visibleColors.map(c => (
                <button key={c.name} title={c.name} onClick={() => onUpdate({ selectedColor: c.name })}
                  className="relative lg:w-8 lg:h-8 w-6 h-6 lg:rounded-md rounded-full transition-all focus:outline-none"
                  style={{ backgroundColor: c.value, border: selectedColor === c.name ? `2px solid ${c.border}` : `1px solid ${c.border}`, boxShadow: selectedColor === c.name ? `0 0 0 2px white, 0 0 0 3px ${c.border}` : "none" }}>
                  {selectedColor === c.name && <div className="absolute inset-0 lg:rounded-md rounded-full border border-white pointer-events-none" />}
                </button>
              ))}
            </div>
            {selectedColor && <p className="text-xs text-gray-500 mt-1.5">{selectedColor}</p>}
          </div>
          <div className="lg:mb-5 mb-2">
            <h2 className="text-xs font-semibold mb-2 text-gray-500 uppercase tracking-wide">Size</h2>
            <div className="flex flex-wrap gap-2">
              {sizes.map(s => <button key={s} onClick={() => onUpdate({ selectedSize: s })} className={`py-1.5 px-3 rounded-lg border-2 transition-all font-medium text-sm ${selectedSize === s ? "border-gray-900 bg-white text-gray-900" : "border-gray-200 bg-white text-gray-600 hover:border-gray-400"}`}>{s}</button>)}
            </div>
          </div>

        </>
      ) : (
        <>
          <h1 className="lg:text-lg text-md lg:font-bold font-semibold lg:mb-3 mb-1 text-gray-900">Pressure Options</h1>
          <div className="lg:mb-6"><h2 className="lg:text-xl text-base font-semibold text-gray-900 lg:mb-4 mb-2">Chest Area</h2>{["rightChest", "leftChest", "bottomChest"].map(renderChestArea)}</div>
          <div className="lg:mb-6"><h2 className="lg:text-xl text-base font-semibold text-gray-900 lg:mb-4 mb-2">Sleeves</h2>{["rightSleeve", "leftSleeve"].map(renderSleeveArea)}</div>
        </>
      )}
      <div className={activeTab === "pressure" ? "lg:mt-10" : ""} style={activeTab !== "pressure" ? { visibility: "hidden", position: "absolute", pointerEvents: "none", height: 0, overflow: "hidden" } : {}}>
        <Test postEx="Hoodie:" pressureOptions={pressureOptions} isAppReady={isAppReady} backDesigns={backDesigns} designColor={designColor} onUpdate={u => {
          if (u.canvasBase64) {
            const raw = u.canvasBase64.rawData;
            const diffuseB64 = raw?.diffuse || "";
            const opacityB64 = raw?.opacity || "";
            lastBackDataRef.current = { diffuse: diffuseB64, opacity: opacityB64 };
            sendBackDesign(diffuseB64, opacityB64, designColorRef.current);
          }
          if (u.backDesign !== undefined) onUpdate({ pressureOptions: { ...pressureOptions, backDesign: u.backDesign } });
        }} />
      </div>
      <Modal />
    </div>
  );
};

export default Hoodie;
