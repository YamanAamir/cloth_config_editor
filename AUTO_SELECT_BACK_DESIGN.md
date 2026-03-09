# Auto-Select Back Design Feature

**Date:** March 3, 2026  
**Status:** ✅ Implemented  
**Feature:** Automatic selection of predefined back design when only one exists

---

## Problem Statement

**Before:**
- User opens "Global Back Design" popup
- Sees one predefined design (e.g., "Berlin_configured")
- Has to manually click on it to select
- Canvas remains empty until clicked

**User Request:**
> "yahan back design khud se hi selected ayega select nhi krna huga"
> (The back design should come selected automatically, no need to select it)

---

## Solution Implemented

### Auto-Selection Logic

When the following conditions are met:
1. ✅ No back design is currently configured (`!pressureOptions?.backDesign`)
2. ✅ Exactly ONE predefined design exists (`backDesigns.length === 1`)
3. ✅ Canvas is empty (`objects.length === 0`)

Then: **Automatically select and load that design**

---

## Technical Implementation

### File Modified: `src/Components/Test.jsx`

#### 1. Import useCallback
```javascript
import { useRef, useState, useEffect, useCallback } from "react";
```

#### 2. Define selectPredefinedDesign Early (Lines ~60-110)
```javascript
const selectPredefinedDesign = useCallback(async (url) => {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = url;

  img.onload = async () => {
    const scale = Math.min(
      (CANVAS_WIDTH * 0.75) / img.width,
      (CANVAS_HEIGHT * 0.65) / img.height
    );
    const w = img.width * scale;
    const h = img.height * scale;

    const newImageObj = {
      id: 'uploadedImage',
      type: 'image',
      srcObj: img,
      pos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
      size: { w, h },
      angle: 0,
      locked: false,
    };

    setObjects([newImageObj]);
    setSelectedId('uploadedImage');

    try {
      const response = await fetch(url, { mode: 'cors' });
      const blob = await response.blob();
      const file = new File([blob], url.split("/").pop(), { type: blob.type });

      onUpdate({
        backDesign: {
          pos: newImageObj.pos,
          size: newImageObj.size,
          angle: newImageObj.angle,
          locked: newImageObj.locked,
          src: url,
          fileObj: file,
        }
      });
    } catch (error) {
      console.error("Error fetching image:", error);
      onUpdate({
        backDesign: {
          pos: newImageObj.pos,
          size: newImageObj.size,
          angle: newImageObj.angle,
          locked: newImageObj.locked,
          src: url,
        }
      });
    }
  };
}, [onUpdate]);
```

**Why useCallback?**
- Allows function to be defined early in component
- Can be used in useEffect dependencies
- Prevents infinite re-render loops
- Memoizes function for performance

#### 3. Add Auto-Selection useEffect (After line ~140)
```javascript
// Auto-select predefined design if only one exists and no design is configured
useEffect(() => {
  // Only auto-select if:
  // 1. No current design configured
  // 2. Exactly one predefined design available
  // 3. Objects array is empty (nothing on canvas)
  if (!pressureOptions?.backDesign && backDesigns && backDesigns.length === 1 && objects.length === 0) {
    const design = backDesigns[0];
    const img = `${BASE_URL}${design.file_path.replace(/\\/g, "/")}`;
    selectPredefinedDesign(img);
  }
}, [backDesigns, pressureOptions, objects.length, selectPredefinedDesign]);
```

**Dependencies Explained:**
- `backDesigns` - Triggers when designs are loaded from API
- `pressureOptions` - Checks if design already configured
- `objects.length` - Ensures canvas is empty
- `selectPredefinedDesign` - The memoized function

#### 4. Removed Duplicate Function
- Old function definition at line ~320 removed
- Prevents duplicate code
- Cleaner codebase

---

## User Experience Flow

### Scenario 1: Single Predefined Design (AUTO-SELECT) ✅

```
User opens popup
    ↓
backDesigns fetched from API
    ↓
backDesigns.length === 1 ✓
pressureOptions?.backDesign === null ✓
objects.length === 0 ✓
    ↓
🎯 AUTO-SELECT TRIGGERED
    ↓
Design loads on canvas automatically
    ↓
User sees design immediately
    ↓
User can adjust/finish
```

### Scenario 2: Multiple Predefined Designs (MANUAL SELECT)

```
User opens popup
    ↓
backDesigns fetched from API
    ↓
backDesigns.length > 1 ✗
    ↓
❌ AUTO-SELECT SKIPPED
    ↓
User manually clicks desired design
    ↓
Design loads on canvas
```

### Scenario 3: Design Already Configured (LOAD SAVED)

```
User opens popup
    ↓
pressureOptions?.backDesign exists ✓
    ↓
❌ AUTO-SELECT SKIPPED
    ↓
Saved design loads from pressureOptions
    ↓
User sees previously configured design
```

---

## Edge Cases Handled

### 1. No Predefined Designs
```javascript
if (backDesigns && backDesigns.length === 1) // ✗ False
// Auto-select skipped - canvas remains empty
```

### 2. Multiple Designs
```javascript
if (backDesigns.length === 1) // ✗ False (length = 2+)
// Auto-select skipped - user must choose
```

### 3. Design Already on Canvas
```javascript
if (objects.length === 0) // ✗ False
// Auto-select skipped - don't override existing work
```

### 4. Previously Saved Design
```javascript
if (!pressureOptions?.backDesign) // ✗ False
// Auto-select skipped - load saved design instead
```

### 5. API Still Loading
```javascript
if (backDesigns && ...) // ✗ False (backDesigns = null)
// Auto-select skipped - wait for data
```

---

## Testing Checklist

- [x] Code compiles without errors
- [x] No ESLint warnings
- [x] useCallback properly imported
- [x] Function dependencies correct
- [ ] Test with 1 predefined design (should auto-select)
- [ ] Test with 2+ predefined designs (should NOT auto-select)
- [ ] Test with 0 predefined designs (should show empty)
- [ ] Test with already configured design (should load saved)
- [ ] Test canvas manipulation after auto-select
- [ ] Test "Finish" button saves correctly
- [ ] Test across all 4 garment types

---

## Benefits

### For Users ✅
- **Faster workflow** - No extra click needed
- **Better UX** - Design appears immediately
- **Less confusion** - Clear what design will be used
- **Saves time** - Especially for classes with single design

### For System ✅
- **Consistent behavior** - Predictable auto-selection
- **Smart logic** - Only auto-selects when appropriate
- **No breaking changes** - Existing functionality preserved
- **Backward compatible** - Works with saved designs

---

## Related Components

### BackDesignPopup.jsx
- Renders the popup modal
- Passes `backDesigns` prop to Test component
- Handles "Finish" button
- Syncs design to all students

### StudentDashBoard.jsx
- Opens BackDesignPopup via button
- Manages customizations state
- Passes students array

### App.jsx
- Manages global state
- Fetches backDesigns from API
- Provides backDesigns to components

---

## API Integration

### Endpoint Used
```javascript
fetchBackDesigns({ class_id: getClassId })
```

### Expected Response
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "name": "Berlin_configured",
      "file_path": "/uploads/designs/berlin.png",
      "status": "0",
      "class_id": 456
    }
  ]
}
```

### Status Filtering
```javascript
backDesigns = (data.data || []).filter(i => String(i.status) === "0")
```
Only approved designs (status = "0") are shown.

---

## Future Enhancements

### Possible Improvements:

1. **Loading Indicator**
   - Show spinner while auto-selecting
   - Better feedback during image load

2. **Animation**
   - Smooth fade-in when design appears
   - Visual indication of auto-selection

3. **Notification**
   - Toast message: "Design auto-selected"
   - Help users understand what happened

4. **Preference Setting**
   - Allow users to disable auto-select
   - Store preference in localStorage

5. **Multi-Design Preview**
   - Show thumbnails of all designs
   - Highlight auto-selected one

---

## Known Limitations

1. **Only works with single design**
   - Multiple designs require manual selection
   - This is intentional behavior

2. **Requires CORS-enabled images**
   - Backend must send proper headers
   - `Access-Control-Allow-Origin: *`

3. **Network dependent**
   - Auto-select happens after API response
   - Slow network = delayed auto-select

4. **No undo for auto-select**
   - User must manually delete if unwanted
   - Could add "Clear" button

---

## Troubleshooting

### Issue: Design not auto-selecting

**Check:**
1. Is `backDesigns.length === 1`?
2. Is `pressureOptions?.backDesign` null?
3. Is `objects.length === 0`?
4. Check browser console for errors
5. Verify API response has data

**Debug:**
```javascript
console.log("backDesigns:", backDesigns);
console.log("pressureOptions:", pressureOptions);
console.log("objects:", objects);
```

### Issue: Design loads but doesn't show

**Check:**
1. CORS headers on image URL
2. Image URL is valid
3. Image format supported (PNG/JPG)
4. Canvas dimensions correct

### Issue: Auto-selects on every render

**Check:**
1. useCallback dependencies correct
2. useEffect dependencies correct
3. No infinite loop in state updates

---

## Code Quality

### Metrics:
- **Lines Changed:** ~60
- **Files Modified:** 1 (Test.jsx)
- **Breaking Changes:** None
- **Backward Compatible:** Yes
- **Test Coverage:** Manual testing required

### Best Practices Used:
- ✅ useCallback for performance
- ✅ Proper dependency arrays
- ✅ Error handling (try-catch)
- ✅ Conditional logic clear
- ✅ No side effects in render
- ✅ Comments for clarity

---

**Status:** Ready for testing  
**Priority:** P1 - UX improvement  
**Impact:** Medium - Improves workflow for single-design classes
