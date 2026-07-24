import { useRef, useState, useEffect } from "react";
import deleteIconImg from '../assets/canvasimage/delete.png';
import lockIconImg from '../assets/canvasimage/locked.png';
import unlockIconImg from '../assets/canvasimage/unlocked.png';
import resizeIconImg from '../assets/canvasimage/resize.png';
import rotateIconImg from '../assets/canvasimage/rotate.png';

import { BASE_URL } from "../utils/const";
import useBackDesignStore from "../store/backDesignStore";

const deleteIcon = new Image();
deleteIcon.src = deleteIconImg;
const lockIcon = new Image();
lockIcon.src = lockIconImg;
const unlockIcon = new Image();
unlockIcon.src = unlockIconImg;
const resizeIcon = new Image();
resizeIcon.src = resizeIconImg;
const rotateIcon = new Image();
rotateIcon.src = rotateIconImg;

const HANDLE_SIZE = 28;
const CANVAS_WIDTH = 480;
const CANVAS_HEIGHT = 350;


export default function Test({ pressureOptions, onUpdate, postEx, isAppReady, designColor, backDesigns: propBackDesigns }) {
  const canvasRef = useRef(null);
  const prevBase64Ref = useRef({ diffuse: null, opacity: null });
  const exportTimerRef = useRef(null);   // debounce timer for canvas export
  const isInteractingRef = useRef(false); // true while user is dragging/resizing/rotating
  const [objects, setObjects] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [offset, setOffset] = useState({});
  const [initialSize, setInitialSize] = useState({ w: 0, h: 0 });
  const [initialAngleOffset, setInitialAngleOffset] = useState(0);

  const { backDesigns: storeBackDesigns, loading, fetchBackDesigns } = useBackDesignStore();
  const backDesigns = propBackDesigns || storeBackDesigns;
  const userStr = localStorage.getItem("user");
  const user = userStr ? JSON.parse(userStr) : null;

  const designColorRef = useRef(designColor);
  useEffect(() => {
    designColorRef.current = designColor || backDesigns?.designColor;
  }, [designColor, backDesigns]);

  // Global cache outside component to persist across mounts
  if (!window.__globalImageCache) {
    window.__globalImageCache = {};
  }

  const loadImageSafe = (src, callback) => {
    if (window.__globalImageCache[src]) {
      callback(window.__globalImageCache[src]);
      return;
    }
    fetch(src, { mode: 'cors' })
      .then(res => res.blob())
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          window.__globalImageCache[src] = img;
          callback(img);
          URL.revokeObjectURL(blobUrl);
        };
        img.onerror = () => {
          const img2 = new Image();
          img2.crossOrigin = "anonymous";
          img2.onload = () => {
            window.__globalImageCache[src] = img2;
            callback(img2);
          };
          img2.onerror = () => callback(null);
          img2.src = src;
        };
        img.src = blobUrl;
      })
      .catch(() => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          window.__globalImageCache[src] = img;
          callback(img);
        };
        img.onerror = () => callback(null);
        img.src = src;
      });
  };

  const lastBackDesignConfigRef = useRef(null);

  useEffect(() => {
    const config = pressureOptions?.backDesign;

    if (config) {
      const serialized = JSON.stringify({
        src: config.src,
        pos: config.pos,
        size: config.size,
        angle: config.angle,
        locked: config.locked,
      });

      // Content same hai (parent ne bas naya reference banaya) → kuch mat karo
      if (lastBackDesignConfigRef.current === serialized) return;
      lastBackDesignConfigRef.current = serialized;

      loadImageSafe(config.src, (img) => {
        if (!img) return;
        setObjects([{
          id: 'uploadedImage',
          type: 'image',
          srcObj: img,
          pos: config.pos,
          size: config.size,
          angle: config.angle,
          locked: config.locked,
        }]);
        setSelectedId('uploadedImage');
      });
    } else {
      if (lastBackDesignConfigRef.current === null) return; // already empty
      lastBackDesignConfigRef.current = null;
      setObjects([]);
      setSelectedId(null);
    }
  }, [pressureOptions?.backDesign]);
  useEffect(() => {
    if (backDesigns && objects.length === 0 && !pressureOptions?.backDesign) {
      const design = backDesigns;
      const imgPath = design.configured_file_path || design.configured_file_path_2 || design.file_path || "";
      if (!imgPath) {
        setObjects([]);
        setSelectedId(null);
        return;
      }
      const img = `${BASE_URL}${imgPath.replace(/\\/g, "/")}`;
     
      try {
        localStorage.setItem('backDesignUrl', img);
      } catch (e) {
        console.warn('Failed to cache back design URL', e);
      }

      loadImageSafe(img, async (imgObj) => {
        const scale = Math.min(
          (CANVAS_WIDTH * 0.98) / imgObj.width,
          (CANVAS_HEIGHT * 0.95) / imgObj.height
        );
        const w = imgObj.width * scale;
        const h = imgObj.height * scale;

        const newImageObj = {
          id: 'uploadedImage',
          type: 'image',
          srcObj: imgObj,
          pos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
          size: { w, h },
          angle: 0,
          locked: false,
        };

        setObjects([newImageObj]);
        setSelectedId('uploadedImage');

        onUpdate({
          backDesign: {
            pos: newImageObj.pos,
            size: newImageObj.size,
            angle: newImageObj.angle,
            locked: newImageObj.locked,
            src: img,
            designId: design?.id
          }
        });
      });
    }
  }, [backDesigns]); // Only watch backDesigns changes

  const getSelected = () => objects.find(o => o.id === selectedId);

  const getCornerPos = (obj, cx, cy) => {
    const rad = (obj.angle * Math.PI) / 180;
    const localX = (cx * obj.size.w) / 2;
    const localY = (cy * obj.size.h) / 2;
    const rx = localX * Math.cos(rad) - localY * Math.sin(rad);
    const ry = localX * Math.sin(rad) + localY * Math.cos(rad);
    return { x: obj.pos.x + rx, y: obj.pos.y + ry };
  };

  const isOnHandle = (mx, my, obj, cx, cy) => {
    const corner = getCornerPos(obj, cx, cy);
    const dx = mx - corner.x;
    const dy = my - corner.y;
    return dx * dx + dy * dy <= (HANDLE_SIZE / 2) ** 2;
  };

  // ─── Visual-only draw: renders objects + selection handles onto canvas ───────
  const drawVisual = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    objects.forEach(obj => {
      ctx.save();
      ctx.translate(obj.pos.x, obj.pos.y);
      ctx.rotate((obj.angle * Math.PI) / 180);
      if (obj.type === 'image') {
        ctx.drawImage(obj.srcObj, -obj.size.w / 2, -obj.size.h / 2, obj.size.w, obj.size.h);
      }
      ctx.restore();
    });

    const selected = objects.find(o => o.id === selectedId);
    if (selected) {
      const handles = {
        tl: { cx: -1, cy: -1, icon: deleteIcon },
        tr: { cx: 1, cy: -1, icon: selected.locked ? lockIcon : unlockIcon },
        br: { cx: 1, cy: 1, icon: resizeIcon },
        bl: { cx: -1, cy: 1, icon: rotateIcon },
      };
      for (const key in handles) {
        const h = handles[key];
        const corner = getCornerPos(selected, h.cx, h.cy);
        ctx.save();
        ctx.translate(corner.x, corner.y);
        ctx.rotate((selected.angle * Math.PI) / 180);
        if (selected.locked && key !== 'tr') ctx.globalAlpha = 0.4;
        ctx.drawImage(h.icon, -HANDLE_SIZE / 2, -HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE);
        ctx.restore();
      }
    }
  };

  // Re-draw canvas whenever objects or selection changes (does NOT call onUpdate)
  useEffect(() => { drawVisual(); }, [objects, selectedId, isAppReady]);

  // ─── Export effect: debounced — only fires 400ms after objects stop changing ─
  // During drag/resize/rotate, isInteractingRef blocks the export entirely so
  // onUpdate is NOT called on every mouse-move frame (was firing 10+ times).
  useEffect(() => {
    if (!onUpdate || !postEx || objects.length === 0) return;

    // Clear any pending export
    if (exportTimerRef.current) clearTimeout(exportTimerRef.current);

    exportTimerRef.current = setTimeout(() => {
      // Skip export if user is still interacting (drag / resize / rotate)
      if (isInteractingRef.current) return;

      let diffuseBase64 = "";
      let opacityBase64 = "";

      try {
        const EXPORT_SCALE = 3;

        // Diffuse (color) export
        const exportCanvas = document.createElement("canvas");
        exportCanvas.width = CANVAS_WIDTH * EXPORT_SCALE;
        exportCanvas.height = CANVAS_HEIGHT * EXPORT_SCALE;
        const ectx = exportCanvas.getContext("2d");
        ectx.imageSmoothingEnabled = true;
        ectx.imageSmoothingQuality = "high";
        objects.forEach(obj => {
          ectx.save();
          ectx.translate(obj.pos.x * EXPORT_SCALE, obj.pos.y * EXPORT_SCALE);
          ectx.rotate((obj.angle * Math.PI) / 180);
          if (obj.type === 'image') {
            ectx.drawImage(
              obj.srcObj,
              -(obj.size.w * EXPORT_SCALE) / 2,
              -(obj.size.h * EXPORT_SCALE) / 2,
              obj.size.w * EXPORT_SCALE,
              obj.size.h * EXPORT_SCALE
            );
          }
          ectx.restore();
        });
        const dImgData = ectx.getImageData(0, 0, exportCanvas.width, exportCanvas.height);
        const dData = dImgData.data;

        const exportOpacity = document.createElement("canvas");
        exportOpacity.width = exportCanvas.width;
        exportOpacity.height = exportCanvas.height;
        const eoctx = exportOpacity.getContext("2d");
        const oImgData = eoctx.createImageData(exportCanvas.width, exportCanvas.height);
        const oData = oImgData.data;

        const isLightGarment = designColorRef.current === "light";

        for (let i = 0; i < dData.length; i += 4) {
          const r = dData[i];
          const g = dData[i + 1];
          const b = dData[i + 2];
          const a = dData[i + 3];

          if (a < 20) {
            // Transparent background
            dData[i + 3] = 0;
            oData[i] = oData[i + 1] = oData[i + 2] = 0;
            oData[i + 3] = 255;
          } else {
            const brightness = 0.299 * r + 0.587 * g + 0.114 * b;

            if (isLightGarment) {
              // Printing dark ink on light garment -> remove white background
              if (brightness >= 220) {
                dData[i + 3] = 0; // Make white background transparent
                oData[i] = oData[i + 1] = oData[i + 2] = 0;
                oData[i + 3] = 255;
              } else {
                oData[i] = oData[i + 1] = oData[i + 2] = 255;
                oData[i + 3] = 255;
              }
            } else {
              // Dark garment (white print on dark garment) -> remove black background box
              if (brightness <= 60) {
                dData[i + 3] = 0; // Make black background transparent
                oData[i] = oData[i + 1] = oData[i + 2] = 0;
                oData[i + 3] = 255;
              } else {
                oData[i] = oData[i + 1] = oData[i + 2] = 255;
                oData[i + 3] = 255;
              }
            }
          }
        }

        ectx.putImageData(dImgData, 0, 0);
        diffuseBase64 = exportCanvas.toDataURL("image/png", 1.0);

        eoctx.putImageData(oImgData, 0, 0);
        opacityBase64 = exportOpacity.toDataURL("image/png", 1.0);
      } catch (err) {
        console.warn("Canvas export error:", err);
        return;
      }

      if (!diffuseBase64 || !opacityBase64) return;

      // Only call onUpdate if data actually changed
      const newDiffuse = postEx + "back_diffuse: " + diffuseBase64;
      const newOpacity = postEx + "back_opacity: " + opacityBase64;
      const prev = prevBase64Ref.current;
      if (prev.diffuse === newDiffuse && prev.opacity === newOpacity) return;

      prevBase64Ref.current = { diffuse: newDiffuse, opacity: newOpacity };
      onUpdate({
        canvasBase64: {
          diffuse: newDiffuse,
          opacity: newOpacity,
          emissive: postEx + "back_emissive: " + diffuseBase64,
          rawData: {
            diffuse: diffuseBase64,
            opacity: opacityBase64,
            emissive: diffuseBase64,
            slot: 'back'
          }
        }
      });
    }, 400); // 400ms debounce — waits until objects stop changing

    return () => { if (exportTimerRef.current) clearTimeout(exportTimerRef.current); };
  }, [objects]); // ← ONLY objects



  const deleteObject = (obj) => {
    if (obj.id === 'uploadedImage') {
      onUpdate({ backDesign: null });
    }
    setObjects(prev => prev.filter(o => o.id !== obj.id));
    setSelectedId(null);
  };

  const onMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    let clickedOnObject = false;

    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i];

      if (isOnHandle(x, y, obj, 1, -1)) {
        const newLocked = !obj.locked;
        setObjects(prev => prev.map(o => o.id === obj.id ? { ...o, locked: newLocked } : o));
        onUpdate({
          backDesign: {
            pos: obj.pos,
            size: obj.size,
            angle: obj.angle,
            locked: newLocked,
            src: obj.srcObj.src
          }
        });
        setSelectedId(obj.id);
        clickedOnObject = true;
        drawVisual();
        return;
      }

      if (obj.locked) continue;

      if (isOnHandle(x, y, obj, -1, -1)) {
        deleteObject(obj);
        clickedOnObject = true;
        return;
      }

      if (isOnHandle(x, y, obj, 1, 1)) {
        isInteractingRef.current = true;
        setSelectedId(obj.id);
        setResizing(true);
        setInitialSize(obj.size);
        const rad = -obj.angle * Math.PI / 180;
        const dx = x - obj.pos.x;
        const dy = y - obj.pos.y;
        const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
        const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
        setOffset({ dist: Math.hypot(lx, ly) });
        clickedOnObject = true;
        return;
      }

      if (isOnHandle(x, y, obj, -1, 1)) {
        isInteractingRef.current = true;
        setSelectedId(obj.id);
        setRotating(true);
        const mouseAngle = Math.atan2(y - obj.pos.y, x - obj.pos.x);
        setInitialAngleOffset(mouseAngle - obj.angle * Math.PI / 180);
        clickedOnObject = true;
        return;
      }

      const rad = -obj.angle * Math.PI / 180;
      const dx = x - obj.pos.x;
      const dy = y - obj.pos.y;
      const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
      const ly = dx * Math.sin(rad) + dy * Math.cos(rad);

      if (Math.abs(lx) <= obj.size.w / 2 && Math.abs(ly) <= obj.size.h / 2) {
        isInteractingRef.current = true;
        setSelectedId(obj.id);
        setDragging(true);
        setOffset({ x: dx, y: dy });
        clickedOnObject = true;
        return;
      }
    }

    if (!clickedOnObject) {
      setSelectedId(null);
    }
  };

  const onMouseMove = (e) => {
    if (!selectedId) return;
    const selected = getSelected();
    if (!selected || selected.locked) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (dragging) {
      let newX = x - offset.x;
      let newY = y - offset.y;
      const r = Math.hypot(selected.size.w / 2, selected.size.h / 2);
      newX = Math.max(r, Math.min(CANVAS_WIDTH - r, newX));
      newY = Math.max(r, Math.min(CANVAS_HEIGHT - r, newY));
      setObjects(objs => objs.map(o => o.id === selectedId ? { ...o, pos: { x: newX, y: newY } } : o));
    }

    if (resizing) {
      const rad = -selected.angle * Math.PI / 180;
      const dx = x - selected.pos.x;
      const dy = y - selected.pos.y;
      const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
      const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
      if (lx < 0 || ly < 0) return;

      const scale = Math.hypot(lx, ly) / offset.dist;
      let newW = initialSize.w * scale;
      let newH = initialSize.h * scale;

      const maxR = Math.min(selected.pos.x, CANVAS_WIDTH - selected.pos.x, selected.pos.y, CANVAS_HEIGHT - selected.pos.y);
      const propR = Math.hypot(newW / 2, newH / 2);
      if (propR > maxR) {
        newW *= maxR / propR;
        newH *= maxR / propR;
      }

      newW = Math.max(30, newW);
      newH = Math.max(30, newH);

      setObjects(objs => objs.map(o => o.id === selectedId ? { ...o, size: { w: newW, h: newH } } : o));
    }

    if (rotating) {
      const mouseAngle = Math.atan2(y - selected.pos.y, x - selected.pos.x);
      const newAngle = (mouseAngle - initialAngleOffset) * 180 / Math.PI;
      setObjects(objs => objs.map(o => o.id === selectedId ? { ...o, angle: newAngle } : o));
    }
  };

  const onMouseUp = () => {
    if (dragging || resizing || rotating) {
      const selected = getSelected();
      if (selected) {
        onUpdate({
          backDesign: {
            pos: selected.pos,
            size: selected.size,
            angle: selected.angle,
            locked: selected.locked,
            src: selected.srcObj.src
          }
        });
      }
    }
    // Allow export to run now that interaction is complete
    isInteractingRef.current = false;
    setDragging(false);
    setResizing(false);
    setRotating(false);
  };

  return (
    <div className="p-0 max-w-2xl mx-auto hidden">
      {/* Show message when design is auto-applied */}
      {backDesigns && objects.length > 0 && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800 font-medium">
            Back design "{backDesigns.name}" has been automatically applied to all students.
          </p>
        </div>
      )}

      {/* Main Canvas */}
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border-2 border-gray-300 rounded-lg shadow-lg block mx-auto bg-gray-50 hidden"
        style={{ cursor: getSelected()?.locked ? "not-allowed" : "move" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      />
    </div>
  );
}