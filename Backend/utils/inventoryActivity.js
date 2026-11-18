import { recordActivity, formatNairaFromKobo } from "./activityUtils.js";

const pluralUnit = (quantity, unit = "unit") =>
  `${Number(quantity).toLocaleString("en-NG")} ${unit || "unit"}${Number(quantity) === 1 ? "" : "s"}`;

/**
 * Record a human-readable inventory event through the shared activity layer.
 * `before` and `after` are the denormalized available stock counts.
 */
export const recordInventoryActivity = (
  req,
  { action, product, before, after, quantity, reason, batch, unitCost, supplier, location },
) => {
  if (!product?._id || !action) return;

  const unit = product.unit || "unit";
  const changes = [
    {
      field: "Available stock",
      from: `${before} ${unit}`,
      to: `${after} ${unit}`,
    },
  ];

  if (unitCost !== undefined && unitCost !== null) {
    changes.push({
      field: "Batch unit cost",
      from: "—",
      to: formatNairaFromKobo(unitCost),
    });
  }
  if (batch) changes.push({ field: "Batch reference", from: "—", to: batch });
  if (supplier) changes.push({ field: "Supplier", from: "—", to: supplier });
  if (location) changes.push({ field: "Storage location", from: "—", to: location });
  if (reason) changes.push({ field: "Reason", from: "—", to: reason });

  const quantityText = pluralUnit(quantity || Math.abs((after ?? 0) - (before ?? 0)), unit);
  const phrases = {
    stock_added: `added ${quantityText} to the inventory of "${product.name}"${batch ? ` (batch ${batch})` : ""}`,
    stock_removed: `removed ${quantityText} from the inventory of "${product.name}"`,
    stock_adjusted: `reconciled "${product.name}" stock from ${pluralUnit(before, unit)} to ${pluralUnit(after, unit)}`,
    stock_damaged: `recorded ${quantityText} of "${product.name}" as damaged${reason ? ` because ${reason}` : ""}`,
    stock_returned: `recorded ${quantityText} returned to sellable inventory for "${product.name}"${batch ? ` (batch ${batch})` : ""}`,
  };

  recordActivity(req, {
    action: `inventory.${action}`,
    entity: "inventory",
    entityId: product._id,
    entityName: product.name,
    actionType: "update",
    changes,
    description: phrases[action] || `updated inventory for "${product.name}"`,
  });
};
