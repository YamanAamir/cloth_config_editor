# Dynamic Pricing & Garment Selection Feature

**Date:** March 3, 2026  
**Status:** ✅ Implemented  
**Feature:** Select single or multiple garments with dynamic price calculation

---

## 🎯 Feature Overview

Students can now:
- ✅ Select which garments they want to purchase (single or multiple)
- ✅ See individual price for each garment
- ✅ Total price updates automatically based on selection
- ✅ Visual feedback for selected/unselected items
- ✅ Validation to ensure at least one item is selected

---

## 💰 Pricing Structure

### Base Prices (DKK)

| Garment Type | Price |
|--------------|-------|
| T-SHIRT | 200 DKK |
| SWEATSHIRT | 350 DKK |
| HOODIE | 450 DKK |
| ZIPPERHOODIE | 500 DKK |
| SWEATPANTS | 300 DKK |
| SHORTS | 250 DKK |

### Examples

**Single Item:**
- T-Shirt only: 200 DKK

**Multiple Items:**
- T-Shirt + Hoodie: 200 + 450 = 650 DKK
- Complete Set (all 6): 200 + 350 + 450 + 500 + 300 + 250 = 2,050 DKK

---

## 🎨 UI/UX Changes

### Step 1: Order Overview (Selection Screen)

**New Elements:**

1. **Info Banner (Top)**
   ```
   📦 Select Items to Purchase
   Click the checkbox on each garment card to select/deselect items.
   Price will update automatically.
   ```

2. **Garment Cards**
   - ✅ Checkbox in top-right corner
   - Selected: Green border, full opacity, checkmark visible
   - Unselected: Gray border, 60% opacity, empty checkbox
   - Individual price displayed on each card
   - Click anywhere on card to toggle selection

3. **Visual States**
   ```
   Selected Card:
   - Border: Green (border-green-500)
   - Shadow: Green glow
   - Opacity: 100%
   - Checkbox: Green with checkmark
   - Badge: "Selected" (green)
   
   Unselected Card:
   - Border: Gray (border-slate-200)
   - Shadow: None
   - Opacity: 60%
   - Checkbox: Empty white
   - Badge: "Not Selected" (gray)
   ```

4. **Warning Message**
   - Shows if no items selected
   - Red banner with error icon
   - "Please select at least one garment"

### Price Display (Footer)

**Before:**
```
Your Price
Shipping and fees included
400 DKK
```

**After:**
```
Your Price
3 item(s) selected • Shipping included
1,000 DKK  ← Dynamic calculation
```

---

## 🔧 Technical Implementation

### File Modified: `src/Components/Modal.jsx`

### 1. State Management

```javascript
// Track which garments are selected
const [selectedGarments, setSelectedGarments] = useState(() => {
  // Initially select all configured garments
  const configured = {};
  Object.entries(selectedOptions).forEach(([type, options]) => {
    if (isGarmentConfigured(type, options)) {
      configured[type] = true;
    }
  });
  return configured;
});

// Example state:
{
  "T-SHIRT": true,
  "HOODIE": true,
  "SWEATSHIRT": false,
  "ZIPPERHOODIE": false,
  "SWEATPANTS": false,
  "SHORTS": false
}
```

### 2. Price Configuration

```javascript
const GARMENT_PRICES = {
  'T-SHIRT': 200,
  'SWEATSHIRT': 350,
  'HOODIE': 450,
  'ZIPPERHOODIE': 500,
  'SWEATPANTS': 300,
  'SHORTS': 250
};
```

### 3. Dynamic Price Calculation

```javascript
const calculateTotalPrice = () => {
  let total = 0;
  Object.entries(selectedGarments).forEach(([garmentType, isSelected]) => {
    if (isSelected && isGarmentConfigured(garmentType, selectedOptions[garmentType])) {
      total += GARMENT_PRICES[garmentType] || 0;
    }
  });
  return total;
};

const dynamicPrice = calculateTotalPrice();
```

### 4. Toggle Selection

```javascript
const toggleGarmentSelection = (garmentType) => {
  setSelectedGarments(prev => ({
    ...prev,
    [garmentType]: !prev[garmentType]
  }));
};
```

### 5. Validation

```javascript
// Step 1 validation
if (currentStep === 0 && Object.values(selectedGarments).every(v => !v)) {
  message.error('Please select at least one garment to continue.');
  return;
}

// Order submission validation
const configuredEntries = Object.entries(selectedOptions).filter(
  ([type, options]) => isGarmentConfigured(type, options) && selectedGarments[type]
);

if (configuredEntries.length === 0) {
  throw new Error("No garments selected. Please select at least one garment.");
}
```

### 6. Order Payload

```javascript
// Only selected garments are included
const garments = configuredEntries.map(([type, options]) => ({
  product_type: type,
  selectedColor: options.selectedColor,
  selectedSize: options.selectedSize,
  design_config: options.pressureOptions || {}
}));

const orderPayload = {
  student_id: studentId,
  class_id: classId,
  garments: garments, // Only selected items
  delivery_details: customerDetails,
  logo_id: logo_id
};
```

### 7. Stripe Payment

```javascript
// Use dynamic price for payment
const stripeResponse = await createCheckoutSession({
  orderId: orderId,
  amount: dynamicPrice * 100 // Dynamic price in cents
});
```

---

## 📱 User Flow

### Scenario 1: Buy Single Item

1. Student designs T-Shirt
2. Opens order modal
3. Sees T-Shirt card (selected by default)
4. Price shows: 200 DKK
5. Clicks "Continue"
6. Enters delivery details
7. Confirms order
8. Pays 200 DKK

### Scenario 2: Buy Multiple Items

1. Student designs T-Shirt, Hoodie, Sweatpants
2. Opens order modal
3. Sees 3 cards (all selected by default)
4. Price shows: 200 + 450 + 300 = 950 DKK
5. Clicks "Continue"
6. Enters delivery details
7. Confirms order
8. Pays 950 DKK

### Scenario 3: Deselect Items

1. Student designs T-Shirt, Hoodie, Sweatpants
2. Opens order modal
3. Sees 3 cards (all selected)
4. Clicks on Sweatpants card to deselect
5. Price updates: 200 + 450 = 650 DKK
6. Item count shows: "2 item(s) selected"
7. Continues with 2 items only

### Scenario 4: No Selection Error

1. Student designs T-Shirt
2. Opens order modal
3. Clicks T-Shirt card to deselect
4. Price shows: 0 DKK
5. Clicks "Continue"
6. Error message: "Please select at least one garment"
7. Cannot proceed until at least one item selected

---

## 🎨 Visual Design

### Color Scheme

**Selected State:**
- Primary: Green (#10b981)
- Border: `border-green-500`
- Background: `bg-green-50`
- Text: `text-green-700`
- Shadow: `shadow-green-200/50`

**Unselected State:**
- Primary: Gray (#64748b)
- Border: `border-slate-200`
- Background: `bg-slate-50`
- Text: `text-slate-500`
- Opacity: `opacity-60`

### Animations

- Border transition: 500ms
- Shadow transition: 500ms
- Opacity transition: 500ms
- Checkbox scale: Smooth transform
- Card hover: Slight scale effect

---

## 🔄 State Persistence

### Initial State
- All configured garments are selected by default
- If student configured 3 garments, all 3 start selected

### During Session
- Selection state maintained in component state
- Price recalculates on every toggle
- No localStorage persistence (resets on modal close)

### On Order Submission
- Only selected garments sent to backend
- Unselected garments ignored
- Order payload contains filtered list

---

## 🧪 Testing Checklist

- [x] Single garment selection works
- [x] Multiple garment selection works
- [x] Deselection works
- [x] Price updates dynamically
- [x] Item count updates correctly
- [x] Validation prevents empty order
- [x] Selected items show in confirmation step
- [x] Only selected items sent to backend
- [x] Stripe payment uses correct amount
- [x] Visual states (selected/unselected) clear
- [x] Mobile responsive
- [x] Checkbox clickable
- [x] Card click toggles selection

---

## 📊 Backend Integration

### Order Payload Structure

```json
{
  "student_id": 36,
  "class_id": 6,
  "garments": [
    {
      "product_type": "T-SHIRT",
      "selectedColor": "Red",
      "selectedSize": "M",
      "design_config": {
        "rightChestText": "BERLIN",
        "backDesign": {...}
      }
    },
    {
      "product_type": "HOODIE",
      "selectedColor": "Black",
      "selectedSize": "L",
      "design_config": {...}
    }
  ],
  "delivery_details": {...},
  "logo_id": 5
}
```

### Backend Requirements

1. **Accept Variable Garment Count**
   - Order can have 1-6 garments
   - Each garment has its own price

2. **Calculate Total**
   - Backend should validate total price
   - Match frontend calculation

3. **Store Individual Prices**
   - Recommended: Store price per garment
   - Allows for price history/auditing

4. **Stripe Integration**
   - Amount sent in cents (multiply by 100)
   - Currency: DKK

---

## 🎯 Future Enhancements

### 1. Quantity Per Garment
```javascript
// Allow ordering multiple of same garment
{
  "T-SHIRT": { selected: true, quantity: 2 },
  "HOODIE": { selected: true, quantity: 1 }
}
```

### 2. Discount Codes
```javascript
const applyDiscount = (code) => {
  if (code === "STUDENT10") {
    return dynamicPrice * 0.9; // 10% off
  }
  return dynamicPrice;
};
```

### 3. Bundle Pricing
```javascript
// Discount for buying complete set
if (selectedCount === 6) {
  discount = 200; // 200 DKK off complete set
}
```

### 4. Save Selection
```javascript
// Remember last selection
localStorage.setItem('lastSelection', JSON.stringify(selectedGarments));
```

### 5. Price Breakdown
```javascript
// Show detailed breakdown
- T-Shirt: 200 DKK
- Hoodie: 450 DKK
- Subtotal: 650 DKK
- Shipping: Free
- Total: 650 DKK
```

---

## 🐛 Known Limitations

1. **No Quantity Support**
   - Currently: 1 of each garment type
   - Cannot order 2 T-shirts

2. **No Saved Selection**
   - Selection resets on modal close
   - No persistence across sessions

3. **Fixed Prices**
   - Prices hardcoded in frontend
   - Should ideally come from backend/API

4. **No Discount System**
   - No promo codes
   - No bulk discounts

---

## 📝 Configuration

### To Change Prices

**File:** `src/Components/Modal.jsx`  
**Line:** ~157

```javascript
const GARMENT_PRICES = {
  'T-SHIRT': 200,        // Change here
  'SWEATSHIRT': 350,     // Change here
  'HOODIE': 450,         // Change here
  'ZIPPERHOODIE': 500,   // Change here
  'SWEATPANTS': 300,     // Change here
  'SHORTS': 250          // Change here
};
```

### To Add New Garment Type

1. Add price to `GARMENT_PRICES`
2. Ensure garment type exists in `selectedOptions`
3. No other changes needed (automatic)

---

## ✅ Summary

**What Changed:**
- ✅ Added garment selection checkboxes
- ✅ Implemented dynamic price calculation
- ✅ Added visual feedback for selection state
- ✅ Added validation for empty selection
- ✅ Updated order payload to include only selected items
- ✅ Updated Stripe payment to use dynamic price

**What Works:**
- ✅ Single item purchase
- ✅ Multiple item purchase
- ✅ Select/deselect functionality
- ✅ Real-time price updates
- ✅ Item count display
- ✅ Validation and error handling

**User Benefit:**
- 💰 Pay only for what they want
- 🎯 Flexibility to choose items
- 👀 Clear pricing transparency
- ✨ Better shopping experience

---

**Status:** Production Ready ✅
