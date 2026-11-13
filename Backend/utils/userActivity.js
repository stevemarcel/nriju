import { recordActivity } from "./activityUtils.js";

const ROLE_LABELS = {
  customer: "Customer",
  admin: "Admin",
  superAdmin: "Super Admin",
};

const ADDRESS_FIELD_LABELS = {
  label: "Address type",
  name: "Recipient name",
  phone: "Recipient phone",
  line1: "Street address",
  line2: "Address line 2",
  city: "City",
  state: "State",
  isDefault: "Default address",
};

const normalizeAddress = (address) => {
  const value = typeof address?.toObject === "function" ? address.toObject() : address;

  return {
    _id: value?._id ? String(value._id) : "",
    label: value?.label || "home",
    name: value?.name || "",
    phone: value?.phone || "",
    line1: value?.line1 || "",
    line2: value?.line2 || "",
    city: value?.city || "",
    state: value?.state || "",
    isDefault: Boolean(value?.isDefault),
  };
};

const addressSummary = (address) =>
  [address.name, address.line1, address.line2, address.city, address.state]
    .filter(Boolean)
    .join(", ") || `${address.label || "Shipping"} address`;

const addressIdentity = (address, index) => address._id || `address-without-id-${index}`;

export const buildAddressChanges = (previousAddresses = [], nextAddresses = []) => {
  const previous = previousAddresses.map(normalizeAddress);
  const next = nextAddresses.map(normalizeAddress);

  const previousById = new Map(
    previous.map((address, index) => [addressIdentity(address, index), address]),
  );
  const nextById = new Map(
    next.map((address, index) => [addressIdentity(address, index), address]),
  );

  const changes = [];

  for (const [id, oldAddress] of previousById) {
    if (!nextById.has(id)) {
      changes.push({
        field: `Shipping address removed (${oldAddress.label})`,
        from: addressSummary(oldAddress),
        to: "Removed",
      });
    }
  }

  for (const [id, newAddress] of nextById) {
    const oldAddress = previousById.get(id);

    if (!oldAddress) {
      changes.push({
        field: `Shipping address added (${newAddress.label})`,
        from: "—",
        to: addressSummary(newAddress),
      });
      continue;
    }

    for (const field of Object.keys(ADDRESS_FIELD_LABELS)) {
      if (oldAddress[field] === newAddress[field]) continue;

      const from =
        field === "isDefault"
          ? oldAddress[field]
            ? "Default"
            : "Not default"
          : String(oldAddress[field] || "—");
      const to =
        field === "isDefault"
          ? newAddress[field]
            ? "Default"
            : "Not default"
          : String(newAddress[field] || "—");

      changes.push({
        field: `${ADDRESS_FIELD_LABELS[field]} (${newAddress.label || oldAddress.label} address)`,
        from,
        to,
      });
    }
  }

  return changes;
};

const addressTypeLabel = (value) => {
  const labels = { home: "home", work: "work", other: "additional" };
  return labels[String(value || "").toLowerCase()] || "shipping";
};

const withoutRecipientPrefix = (value, targetName) => {
  const text = String(value || "").trim();
  const prefix = `${targetName},`;
  return text.toLowerCase().startsWith(prefix.toLowerCase())
    ? text.slice(prefix.length).trim()
    : text;
};

const quoted = (value) => `"${String(value ?? "—")}"`;

const describeUserChange = (change, targetName) => {
  const { field, from, to } = change;

  if (field === "Role") {
    if (from === "Admin" && to === "Customer") {
      return `removed administrator access from ${targetName}`;
    }
    if (from === "Customer" && to === "Admin") {
      return `granted administrator access to ${targetName}`;
    }
    if (to === "Super Admin") {
      return `granted Super Admin privileges to ${targetName}`;
    }
    if (from === "Super Admin" && to !== "Super Admin") {
      return `revoked Super Admin privileges from ${targetName} and changed their role to ${to}`;
    }
    return `changed ${targetName}'s role from ${from} to ${to}`;
  }

  if (field === "Account status") {
    return to === "Inactive"
      ? `deactivated ${targetName}'s account`
      : `reactivated ${targetName}'s account`;
  }

  if (field === "Email verification") {
    return to === "Verified"
      ? `marked ${targetName}'s email address as verified`
      : `revoked email verification for ${targetName}`;
  }

  const profileFields = {
    Name: "name",
    Email: "email address",
    Phone: "phone number",
  };

  if (profileFields[field]) {
    return `updated ${targetName}'s ${profileFields[field]} from ${quoted(from)} to ${quoted(to)}`;
  }

  const added = field.match(/^Shipping address added \((home|work|other)\)$/i);
  if (added) {
    const type = addressTypeLabel(added[1]);
    const article = type === "additional" ? "an" : "a";
    const details = withoutRecipientPrefix(to, targetName);
    return `added ${article} ${type} shipping address for ${targetName}${details ? `: ${details}` : ""}`;
  }

  const removed = field.match(/^Shipping address removed \((home|work|other)\)$/i);
  if (removed) {
    const type = addressTypeLabel(removed[1]);
    const details = withoutRecipientPrefix(from, targetName);
    return `removed the ${type} shipping address for ${targetName}${details ? `: ${details}` : ""}`;
  }

  const addressField = field.match(/^(.+?) \((home|work|other) address\)$/i);
  if (addressField) {
    const [, label, rawType] = addressField;
    const type = addressTypeLabel(rawType);

    if (label === "Default address") {
      return to === "Default"
        ? `made the ${type} shipping address the default address for ${targetName}`
        : `removed the default designation from ${targetName}'s ${type} shipping address`;
    }

    const labels = {
      "Recipient name": "recipient name",
      "Recipient phone": "recipient phone number",
      "Street address": "street address",
      "Address line 2": "address line 2",
      City: "city",
      State: "state",
      "Address type": "address type",
    };

    return `changed the ${labels[label] || label.toLowerCase()} on ${targetName}'s ${type} shipping address from ${quoted(from)} to ${quoted(to)}`;
  }

  if (field === "Profile photo" || field === "Avatar") {
    return to === "Removed"
      ? `removed the profile photo for ${targetName}`
      : `updated the profile photo for ${targetName}`;
  }

  return `updated ${targetName}'s ${String(field).toLowerCase()} from ${quoted(from)} to ${quoted(to)}`;
};

export const setUserActivity = ({ req, user, actionType, changes, action }) => {
  if (!changes?.length) return;

  const targetName = user.name || "this user";
  const description = changes.map((change) => describeUserChange(change, targetName)).join("; ");

  recordActivity(req, {
    action: action || `user.${actionType}`,
    entity: "user",
    entityId: user._id,
    entityName: user.name,
    targetUser: user.name,
    targetUserRole: user.role,
    actionType,
    changes,
    description,
  });
};
