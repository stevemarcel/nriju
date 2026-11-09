---
name: 2026-11-09-inventory-feature
description: "Stock adjustment audit trail with manual admin controls"
---

## Understanding the Data Model

From `Backend/seed/runSeed.js`:

| Product Type | Batch Type | Expiry | Unit | Source Field |
|---|---|---|---|---|
| `cooked` | `FRESH-*` | 24 hours | portion/bowl/etc | Kitchen prep batch |
| `packaged` | `WH-*` | 180 days | litre/piece/packs | Warehouse stock |

Both types use the same `Inventory` model with:
- `quantity` — positive integer
- `isActive` — true = available for sale
- `expiryDate` — when stock becomes unavailable
- `source` enum: `restock`, `order`, `adjust`, `damaged`, `return`, `void`

---

## Proposed Stock Adjustment System

The `Inventory` model with the `source` enum can handle all stock movements. Here's how:

### 1. Add Stock (Restock)
- Creates new batch with `source: "restock"`, positive `quantity`
- Admin specifies expiry date (24h default for cooked, 180d for packaged)

### 2. Remove Stock (Adjust Negative)
- Creates batch with `source: "adjust"`, `quantity: -X` (allow negative)
- OR: Creates new batch with negative quantity
- `computeAvailableStock` will subtract this from total

### 3. Record Damaged Goods
- Creates batch with `source: "damaged"`, `quantity: -X`
- OR create batch with `quantity: 0`, `isActive: false`, `void` reason

### 4. Process Returns
- Creates batch with `source: "return"`, positive `quantity`
- `isActive: true` so stock becomes available
- Expiry = original batch expiry OR today + shelf life

### 5. Void/Incorrect Batch
- Set `source: "void"`, optionally `quantity: X` reversed
- Keep `isActive: false`

### 6. Expiry Date Control

Admin can set custom expiry dates on any batch:
- **Cooked items**: typically 24-hour expiry, but staff can extend for pre-cooked items
- **Packaged items**: can range from 1 day to 6 months depending on type
- The expiry field is always editable in the UI to allow overrides

---

## Verification Checklist

| Step | How |
|---|---|
| Model compiles | ✅ Already done |
| Route guards work | ✅ Already done |
| Product costPrice | ✅ Already done |
| Page loads | ✅ Already done (read-only) |
| Negative qty allowed | TODO: remove `min: 0` constraint |
| computeAvailableStock handles negatives | TODO: aggregate with `$sum` handles automatically |
| Stock adjustments create audit records | TODO: when mutations added |

---

## Summary

This inventory feature provides:

1. **View existing batches** — See all stock with expiry dates
2. **Attribution** — Track who added/modified each batch
3. **Source tracking** — Restock, order, adjust, damaged, return, void
4. **Stats cards** — Total products, active batches, low/out of stock
5. **Cost price** — For future finance/margin calculations

The backend has `Inventory` model with expiry for perishables, and the same model handles non-perishable items. Admin controls expiry, allowing flexibility for dried/frozen goods that can last months.

---

## Schema Change Required

**File: `Backend/models/Inventory.js`**

Change `quantity` validation to allow negatives:

```js
quantity: { type: Number, required: true }, // allow negative for adjustments/damaged
```

And update `computeAvailableStock` to handle negative quantities:

```js
export const computeAvailableStock = async (productId) => {
  const result = await Inventory.aggregate([
    { $match: { product: productId, isActive: true, expiryDate: { $gt: new Date() } } },
    { $group: { _id: null, total: { $sum: "$quantity" } } },
  ]);
  return Math.max(0, result[0]?.total ?? 0); // never negative
};
```

---

## Next Iteration Plan

1. **Backend Model** — Allow negative quantities, add validation
2. **Backend Controller** — Add mutation endpoints for each source type
3. **Frontend Modal** — "Adjust Stock" dialog with source dropdown
4. **Update Stats** — Include `computeAvailableStock` from adjustments
5. **Test** — Verify stock calculations match expectations

---

## Current Status

✅ Model extended with `createdBy`, `updatedBy`, `reason`, `source`  
✅ Controller sets `req.activity` for ActivityLog  
✅ Product has `costPrice` for margin calc  
✅ Frontend shows read-only batch view

❌ Negative quantities not allowed (schema validation)  
❌ No stock adjustment mutations  
❌ No UI controls for bulk/manual adjustments