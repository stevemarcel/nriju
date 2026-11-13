import { recordActivity, formatNairaFromKobo, formatActivityList } from "./activityUtils.js";

const FIELD_LABELS = {
  name: "product name",
  description: "description",
  price: "price",
  compareAtPrice: "compare-at price",
  costPrice: "cost price",
  unit: "unit",
  productType: "product type",
  category: "category",
  tags: "tags",
  isActive: "availability",
  isFeatured: "featured status",
  notifyOnOutOfStock: "out-of-stock notifications",
  region: "region",
  prepLeadTime: "preparation lead time",
  maxDailyQty: "maximum daily quantity",
  images: "product images",
};

const formatValue = (field, value) => {
  if (field === "price" || field === "compareAtPrice" || field === "costPrice") {
    return formatNairaFromKobo(value);
  }
  if (Array.isArray(value)) return formatActivityList(value);
  if (field === "isActive") return value ? "Active" : "Archived";
  if (field === "isFeatured" || field === "notifyOnOutOfStock") {
    return value ? "Enabled" : "Disabled";
  }
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
};

const describeChange = (change, productName, compact = false) => {
  const field = change.field;
  const label = FIELD_LABELS[field] || field;
  const from = formatValue(field, change.from);
  const to = formatValue(field, change.to);

  if (field === "isActive") {
    const active = change.to === true || change.to === "Active";
    return active ? `restored product "${productName}"` : `archived product "${productName}"`;
  }

  if (field === "isFeatured") {
    const featured = change.to === true || change.to === "Enabled";
    return featured
      ? `featured product "${productName}"`
      : `removed the featured designation from product "${productName}"`;
  }

  if (field === "images") {
    return `updated the images for product "${productName}" from ${from} to ${to}`;
  }

  if (field === "name") {
    return `renamed product ${JSON.stringify(change.from)} to ${JSON.stringify(change.to)}`;
  }

  const isMoneyField = ["price", "compareAtPrice", "costPrice"].includes(field);
  const formattedFrom = isMoneyField ? from : JSON.stringify(from);
  const formattedTo = isMoneyField ? to : JSON.stringify(to);

  return compact
    ? `changed the ${label} of product "${productName}" from ${formattedFrom} to ${formattedTo}`
    : `changed the ${label} from ${formattedFrom} to ${formattedTo}`;
};

export const recordProductCreated = (req, product) => {
  recordActivity(req, {
    action: "product.created",
    entity: "product",
    entityId: product._id,
    entityName: product.name,
    actionType: "create",
    changes: [{ field: "Product", from: "—", to: product.name }],
    description: `created product "${product.name}"`,
  });
};

export const recordProductUpdated = (req, product, changes = []) => {
  if (!changes.length) return;

  const activeChange = changes.find((change) => change.field === "isActive");
  const isSingleStatusChange = changes.length === 1 && activeChange;

  const isRestored = activeChange?.to === true || activeChange?.to === "Active";
  const actionType = isSingleStatusChange ? "status_toggle" : "update";
  const action = isSingleStatusChange
    ? isRestored
      ? "product.restored"
      : "product.archived"
    : "product.updated";

  const descriptions = changes.map((change) =>
    describeChange(change, product.name, changes.length === 1),
  );

  const description =
    changes.length === 1
      ? descriptions[0]
      : `updated product "${product.name}": ${descriptions.join("; ")}`;

  const auditChanges = changes.map((change) => ({
    field: FIELD_LABELS[change.field] || change.field,
    from: formatValue(change.field, change.from),
    to: formatValue(change.field, change.to),
  }));

  recordActivity(req, {
    action,
    entity: "product",
    entityId: product._id,
    entityName: product.name,
    actionType,
    changes: auditChanges,
    description,
  });
};

export const recordProductDeleted = (req, product) => {
  recordActivity(req, {
    action: "product.deleted",
    entity: "product",
    entityId: product._id,
    entityName: product.name,
    actionType: "delete",
    changes: [{ field: "Product", from: product.name, to: "Permanently deleted" }],
    description: `permanently deleted product "${product.name}"`,
  });
};
