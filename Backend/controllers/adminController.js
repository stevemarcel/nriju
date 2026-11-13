import asyncHandler from "express-async-handler";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import Review from "../models/Review.js";
import ActivityLog from "../models/ActivityLog.js";
import {
  uploadAvatarToCloudinary,
  deleteFromCloudinary,
  downloadAvatarFromCloudinary,
} from "../utils/cloudinaryUtils.js";

const USER_ROLES = ["customer", "admin", "superAdmin"];

const USER_UPDATE_FIELDS = [
  "name",
  "email",
  "phone",
  "role",
  "isActive",
  "isVerified",
  "addresses",
];

const ROLE_LABELS = {
  customer: "Customer",
  admin: "Admin",
  superAdmin: "Super Admin",
};

const USER_FIELD_LABELS = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  role: "Role",
  isActive: "Account status",
  isVerified: "Email verification",
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

const ADDRESS_FIELDS = [
  "_id",
  "label",
  "name",
  "phone",
  "line1",
  "line2",
  "city",
  "state",
  "isDefault",
];

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getPagination = (req, res, defaultLimit = 20) => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? defaultLimit);

  if (!Number.isInteger(page) || page < 1) {
    res.status(400);
    throw new Error("Page must be a positive integer.");
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    res.status(400);
    throw new Error("Limit must be an integer between 1 and 100.");
  }

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

const getPublicUser = (user) => {
  const result = user.toObject ? user.toObject() : { ...user };

  delete result.password;

  return result;
};

const assertCanManageUser = (req, res, user) => {
  if (user.role === "superAdmin" && req.user?.role !== "superAdmin") {
    res.status(403);
    throw new Error("You do not have permission to modify a Super Admin account.");
  }
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

const addressSummary = (address) => {
  const parts = [address.name, address.line1, address.line2, address.city, address.state].filter(
    Boolean,
  );

  return parts.join(", ") || `${address.label || "Shipping"} address`;
};

const addressIdentity = (address, index) => address._id || `address-without-id-${index}`;

/**
 * Returns granular address changes rather than only recording
 * the array length.
 *
 * The ActivityLog schema stores from/to as Mixed, so these
 * field-level values require no schema migration.
 */
const buildAddressChanges = (previousAddresses = [], nextAddresses = []) => {
  const previous = previousAddresses.map(normalizeAddress);
  const next = nextAddresses.map(normalizeAddress);

  const previousById = new Map(
    previous.map((address, index) => [addressIdentity(address, index), address]),
  );

  const nextById = new Map(
    next.map((address, index) => [addressIdentity(address, index), address]),
  );

  const changes = [];

  // Removed addresses.
  for (const [id, oldAddress] of previousById) {
    if (!nextById.has(id)) {
      changes.push({
        field: `Shipping address removed (${oldAddress.label})`,
        from: addressSummary(oldAddress),
        to: "Removed",
      });
    }
  }

  // Added and modified addresses.
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

      const oldValue =
        field === "isDefault"
          ? oldAddress[field]
            ? "Default"
            : "Not default"
          : String(oldAddress[field] || "—");

      const newValue =
        field === "isDefault"
          ? newAddress[field]
            ? "Default"
            : "Not default"
          : String(newAddress[field] || "—");

      changes.push({
        field: `${ADDRESS_FIELD_LABELS[field]} (${newAddress.label || oldAddress.label} address)`,
        from: oldValue,
        to: newValue,
      });
    }
  }

  return changes;
};

const sanitizeAddresses = (addresses, res) => {
  if (!Array.isArray(addresses)) {
    res.status(400);
    throw new Error("Addresses must be an array.");
  }

  const sanitized = addresses.map((address) => {
    if (!address || typeof address !== "object" || Array.isArray(address)) {
      res.status(400);
      throw new Error("Each address must be a valid object.");
    }

    const cleanAddress = {};

    for (const field of ADDRESS_FIELDS) {
      if (address[field] !== undefined) {
        cleanAddress[field] = address[field];
      }
    }

    if (cleanAddress.isDefault !== undefined && typeof cleanAddress.isDefault !== "boolean") {
      res.status(400);
      throw new Error("Address default status must be a boolean.");
    }

    return cleanAddress;
  });

  const defaultCount = sanitized.filter((address) => address.isDefault === true).length;

  if (defaultCount > 1) {
    res.status(400);
    throw new Error("Only one shipping address can be set as default.");
  }

  return sanitized;
};

const ACTOR_ROLE_LABELS = {
  admin: "Admin",
  superAdmin: "Super Admin",
};

const getActivityActorLabel = (req) => {
  const name = req.user?.name?.trim() || "An administrator";
  const role = ACTOR_ROLE_LABELS[req.user?.role];

  if (!role) return name;

  // Avoid duplicating the role if the display name already includes it.
  return name.toLowerCase().endsWith(role.toLowerCase()) ? name : `${name} ${role}`;
};

const getAddressTypeLabel = (value) => {
  const labels = {
    home: "home",
    work: "work",
    other: "additional",
  };

  return labels[value?.toLowerCase()] || "shipping";
};

const formatAddressForActivity = (value, targetName) => {
  const address = String(value || "").trim();

  if (!address) return "";

  // Avoid repeating the recipient's name when it matches the target user.
  const recipientPrefix = `${targetName},`;

  if (address.toLowerCase().startsWith(recipientPrefix.toLowerCase())) {
    return address.slice(recipientPrefix.length).trim();
  }

  return address;
};

const quoteActivityValue = (value) => `"${String(value ?? "—")}"`;

const describeUserChange = (change, targetName) => {
  const { field, from, to } = change;

  // ── Role changes ──────────────────────────────────────────

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
      return to === "Customer"
        ? `revoked Super Admin privileges from ${targetName} and changed their role to Customer`
        : `revoked Super Admin privileges from ${targetName}, reducing their role to Admin`;
    }

    return `changed ${targetName}'s role from ${from} to ${to}`;
  }

  // ── Account status ────────────────────────────────────────

  if (field === "Account status") {
    return to === "Inactive"
      ? `deactivated ${targetName}'s account`
      : `reactivated ${targetName}'s account`;
  }

  // ── Email verification ────────────────────────────────────

  if (field === "Email verification") {
    return to === "Verified"
      ? `marked ${targetName}'s email address as verified`
      : `revoked email verification for ${targetName}`;
  }

  // ── Personal information ──────────────────────────────────

  const profileFields = {
    Name: "name",
    Email: "email address",
    Phone: "phone number",
  };

  if (profileFields[field]) {
    const label = profileFields[field];

    return `updated ${targetName}'s ${label} from ${quoteActivityValue(from)} to ${quoteActivityValue(to)}`;
  }

  // ── Shipping address additions ───────────────────────────

  const addedAddress = field.match(/^Shipping address added \((home|work|other)\)$/i);

  if (addedAddress) {
    const type = getAddressTypeLabel(addedAddress[1]);
    const article = type === "additional" ? "an" : "a";

    const details = formatAddressForActivity(to, targetName);

    return `added ${article} ${type} shipping address for ${targetName}${
      details ? `: ${details}` : ""
    }`;
  }

  // ── Shipping address removals ─────────────────────────────

  const removedAddress = field.match(/^Shipping address removed \((home|work|other)\)$/i);

  if (removedAddress) {
    const type = getAddressTypeLabel(removedAddress[1]);
    const details = formatAddressForActivity(from, targetName);

    return `removed the ${type} shipping address for ${targetName}${details ? `: ${details}` : ""}`;
  }

  // ── Shipping address modifications ────────────────────────

  const addressField = field.match(/^(.+?) \((home|work|other) address\)$/i);

  if (addressField) {
    const fieldLabel = addressField[1];
    const type = getAddressTypeLabel(addressField[2]);

    if (fieldLabel === "Default address") {
      return to === "Default"
        ? `made the ${type} shipping address the default address for ${targetName}`
        : `removed the default designation from ${targetName}'s ${type} shipping address`;
    }

    const addressFieldLabels = {
      "Recipient name": "recipient name",
      "Recipient phone": "recipient phone number",
      "Street address": "street address",
      "Address line 2": "address line 2",
      City: "city",
      State: "state",
    };

    const readableField = addressFieldLabels[fieldLabel] || fieldLabel.toLowerCase();

    return `changed the ${readableField} on ${targetName}'s ${type} shipping address from ${quoteActivityValue(from)} to ${quoteActivityValue(to)}`;
  }

  // ── Avatar changes ────────────────────────────────────────

  if (field === "Profile photo" || field === "Avatar") {
    return to === "Removed"
      ? `removed the profile photo for ${targetName}`
      : `updated the profile photo for ${targetName}`;
  }

  // ── Fallback for future user fields ───────────────────────

  return `updated ${targetName}'s ${field.toLowerCase()} from ${quoteActivityValue(from)} to ${quoteActivityValue(to)}`;
};

const setUserActivity = ({ req, user, actionType, changes, action }) => {
  if (!changes?.length) return;

  const actor = getActivityActorLabel(req);
  const targetName = user.name || "this user";

  const descriptions = changes.map((change) => describeUserChange(change, targetName));

  req.activity = {
    action: action || `user.${actionType}`,
    entity: "user",
    entityId: user._id,
    entityName: user.name,
    targetUser: user.name,
    targetUserRole: user.role,
    changes,
    actionType,
    description: `${actor} ${descriptions.join("; ")}.`,
  };
};

// @DESCRIPTION Get high-level stats for the admin dashboard
// @ROUTE       GET /api/v1/admin/stats
// @ACCESS      Admin
const getStats = asyncHandler(async (_req, res) => {
  const [totalOrders, totalProducts, totalUsers, pendingReviews, recentOrders, revenueAgg] =
    await Promise.all([
      Order.countDocuments(),
      Product.countDocuments(),
      User.countDocuments({ role: "customer" }),
      Review.countDocuments({ status: "pending" }),
      Order.find().sort("-createdAt").limit(5).populate("user", "name email"),
      Order.aggregate([
        {
          $match: {
            status: {
              $nin: ["pending", "cancelled", "refunded"],
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$total" },
          },
        },
      ]),
    ]);

  res.json({
    success: true,
    data: {
      counts: {
        orders: totalOrders,
        products: totalProducts,
        customers: totalUsers,
        pendingReviews,
      },
      revenue: revenueAgg[0]?.total ?? 0,
      recentOrders,
    },
  });
});

// @DESCRIPTION List all users with filtering (admin)
// @ROUTE       GET /api/v1/admin/users
// @ACCESS      Admin
const getUsers = asyncHandler(async (req, res) => {
  const { role, roles, isActive, search } = req.query;

  const { page, limit, skip } = getPagination(req, res, 20);

  const query = {};

  // Multiple roles: ?roles=admin,superAdmin
  // Legacy single role: ?role=admin
  let selectedRoles = [];

  if (roles !== undefined) {
    if (typeof roles !== "string") {
      res.status(400);
      throw new Error("The roles filter must be a comma-separated string.");
    }

    selectedRoles = roles
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
  } else if (role !== undefined && role !== "") {
    if (typeof role !== "string") {
      res.status(400);
      throw new Error("The role filter must be a string.");
    }

    selectedRoles = [role];
  }

  const invalidRoles = selectedRoles.filter((value) => !USER_ROLES.includes(value));

  if (invalidRoles.length) {
    res.status(400);
    throw new Error(`Invalid role filter: ${invalidRoles.join(", ")}.`);
  }

  if (selectedRoles.length) {
    query.role = {
      $in: [...new Set(selectedRoles)],
    };
  }

  // Account status filtering.
  if (isActive !== undefined) {
    if (isActive !== "true" && isActive !== "false") {
      res.status(400);
      throw new Error("isActive must be either true or false.");
    }

    query.isActive = isActive === "true";
  }

  // Search by name or email.
  if (search !== undefined) {
    if (typeof search !== "string") {
      res.status(400);
      throw new Error("Search must be a string.");
    }

    const trimmedSearch = search.trim();

    if (trimmedSearch) {
      const safeSearch = new RegExp(escapeRegex(trimmedSearch), "i");

      query.$or = [{ name: safeSearch }, { email: safeSearch }];
    }
  }

  const [users, total] = await Promise.all([
    User.find(query).select("-password").sort("-createdAt").skip(skip).limit(limit),

    User.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: users,
    meta: {
      page,
      limit,
      total,
    },
  });
});

// @DESCRIPTION Get a single user by id with full profile data
// @ROUTE       GET /api/v1/admin/users/:id
// @ACCESS      Admin
const getUser = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400);
    throw new Error("Invalid user ID.");
  }

  const user = await User.findById(req.params.id).select("-password");

  if (!user) {
    res.status(404);
    throw new Error("User not found.");
  }

  res.json({
    success: true,
    data: getPublicUser(user),
  });
});

// @DESCRIPTION Update user profile, role, account status,
// verification and addresses
// @ROUTE       PATCH /api/v1/admin/users/:id
// @ACCESS      Admin
const updateUser = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400);
    throw new Error("Invalid user ID.");
  }

  const user = await User.findById(req.params.id).select("-password");

  if (!user) {
    res.status(404);
    throw new Error("User not found.");
  }

  assertCanManageUser(req, res, user);

  const updates = {};

  for (const field of USER_UPDATE_FIELDS) {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  }

  // Validate role changes.
  if (updates.role !== undefined) {
    if (!USER_ROLES.includes(updates.role)) {
      res.status(400);
      throw new Error("Invalid user role.");
    }

    if (updates.role === "superAdmin" && req.user?.role !== "superAdmin") {
      res.status(403);
      throw new Error("Only a Super Admin can grant Super Admin privileges.");
    }
  }

  // Validate boolean fields.
  for (const field of ["isActive", "isVerified"]) {
    if (updates[field] !== undefined && typeof updates[field] !== "boolean") {
      res.status(400);
      throw new Error(`${field} must be a boolean.`);
    }
  }

  if (updates.addresses !== undefined) {
    updates.addresses = sanitizeAddresses(updates.addresses, res);
  }

  const previous = user.toObject({
    depopulate: true,
  });

  // Assign first so Mongoose casts address subdocuments
  // and creates their _ids.
  Object.assign(user, updates);

  const changes = [];

  // Track profile field changes.
  for (const field of ["name", "email", "phone", "role", "isActive", "isVerified"]) {
    if (updates[field] === undefined) continue;

    const before = previous[field] ?? null;
    const after = user[field] ?? null;

    if (String(before) === String(after)) continue;

    let from = before;
    let to = after;

    if (field === "role") {
      from = ROLE_LABELS[before] || before || "—";
      to = ROLE_LABELS[after] || after || "—";
    } else if (field === "isActive") {
      from = before ? "Active" : "Inactive";
      to = after ? "Active" : "Inactive";
    } else if (field === "isVerified") {
      from = before ? "Verified" : "Unverified";
      to = after ? "Verified" : "Unverified";
    } else {
      from = String(before ?? "—");
      to = String(after ?? "—");
    }

    changes.push({
      field: USER_FIELD_LABELS[field],
      from,
      to,
    });
  }

  // Track individual address changes.
  if (updates.addresses !== undefined) {
    changes.push(...buildAddressChanges(previous.addresses || [], user.addresses || []));
  }

  await user.save();

  if (changes.length) {
    let actionType = "update";

    if (changes.length === 1 && changes[0].field === "Role") {
      actionType = "role_change";
    } else if (changes.length === 1 && changes[0].field === "Account status") {
      actionType = "status_toggle";
    }

    setUserActivity({
      req,
      user,
      actionType,
      changes,
    });
  }

  res.json({
    success: true,
    data: getPublicUser(user),
  });
});

// @DESCRIPTION Return target user's avatar source bytes
// @ROUTE       GET /api/v1/admin/users/:id/avatar/source
// @ACCESS      Admin
const getUserAvatarSource = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400);
    throw new Error("Invalid user ID.");
  }

  const user = await User.findById(req.params.id).select("avatarPublicId");

  if (!user) {
    res.status(404);
    throw new Error("User not found.");
  }

  if (!user.avatarPublicId) {
    res.status(404);
    throw new Error("No profile picture has been saved.");
  }

  try {
    const { buffer, contentType } = await downloadAvatarFromCloudinary(user.avatarPublicId);

    res.set({
      "Content-Type": contentType,
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    });

    return res.status(200).send(buffer);
  } catch (error) {
    console.error("Could not load avatar for cropping:", error.message);

    res.status(502);
    throw new Error("Could not load the current profile photo. Please try again.");
  }
});

// @DESCRIPTION Upload or replace a user's profile picture
// @ROUTE       POST /api/v1/admin/users/:id/avatar
// @ACCESS      Admin
const uploadUserAvatar = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400);
    throw new Error("Invalid user ID.");
  }

  if (!req.file?.buffer) {
    res.status(400);
    throw new Error("Please select a profile picture to upload.");
  }

  const user = await User.findById(req.params.id).select("-password");

  if (!user) {
    res.status(404);
    throw new Error("User not found.");
  }

  assertCanManageUser(req, res, user);

  const previousPublicId = user.avatarPublicId;
  let uploadedAvatar;

  try {
    uploadedAvatar = await uploadAvatarToCloudinary(req.file.buffer);

    user.avatar = uploadedAvatar.url;
    user.avatarPublicId = uploadedAvatar.publicId;

    await user.save();
  } catch (error) {
    if (uploadedAvatar?.publicId) {
      try {
        await deleteFromCloudinary(uploadedAvatar.publicId);
      } catch (cleanupError) {
        console.error("Could not clean up avatar after failed save:", cleanupError.message);
      }
    }

    throw error;
  }

  // Clean up the previous image after the new image
  // has been successfully saved.
  if (previousPublicId && previousPublicId !== uploadedAvatar.publicId) {
    try {
      await deleteFromCloudinary(previousPublicId);
    } catch (cleanupError) {
      console.error("Could not delete previous avatar:", cleanupError.message);
    }
  }

  setUserActivity({
    req,
    user,
    actionType: "update",
    action: "user.avatar_updated",
    changes: [
      {
        field: "Profile photo",
        from: previousPublicId ? "Previous photo" : "No photo",
        to: "New photo",
      },
    ],
  });

  res.json({
    success: true,
    data: getPublicUser(user),
  });
});

// @DESCRIPTION Delete a user's profile picture
// @ROUTE       DELETE /api/v1/admin/users/:id/avatar
// @ACCESS      Admin
const deleteUserAvatar = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400);
    throw new Error("Invalid user ID.");
  }

  const user = await User.findById(req.params.id).select("-password");

  if (!user) {
    res.status(404);
    throw new Error("User not found.");
  }

  assertCanManageUser(req, res, user);

  const previousPublicId = user.avatarPublicId;

  if (!previousPublicId && !user.avatar) {
    return res.json({
      success: true,
      data: getPublicUser(user),
    });
  }

  // Clear the database reference first.
  // If the database write fails, the Cloudinary asset
  // remains available.
  user.avatar = "";
  user.avatarPublicId = "";

  await user.save();

  // A Cloudinary cleanup failure can leave an orphaned
  // asset but won't leave the user pointing to a deleted image.
  if (previousPublicId) {
    try {
      await deleteFromCloudinary(previousPublicId);
    } catch (cleanupError) {
      console.error("Could not delete avatar from Cloudinary:", cleanupError.message);
    }
  }

  setUserActivity({
    req,
    user,
    actionType: "delete",
    action: "user.avatar_deleted",
    changes: [
      {
        field: "Profile photo",
        from: "Existing photo",
        to: "Removed",
      },
    ],
  });

  res.json({
    success: true,
    data: getPublicUser(user),
  });
});

// @DESCRIPTION Get full system activity logs
// @ROUTE       GET /api/v1/admin/activity-logs
// @ACCESS      Admin
const getActivityLogs = asyncHandler(async (req, res) => {
  const { user, entity, action } = req.query;

  const { page, limit, skip } = getPagination(req, res, 50);

  const query = {};

  if (user !== undefined && user !== "") {
    if (typeof user !== "string" || !mongoose.isValidObjectId(user)) {
      res.status(400);
      throw new Error("Invalid activity-log user ID.");
    }

    query.user = user;
  }

  if (entity !== undefined && entity !== "") {
    if (typeof entity !== "string") {
      res.status(400);
      throw new Error("Entity filter must be a string.");
    }

    query.entity = entity;
  }

  if (action !== undefined && action !== "") {
    if (typeof action !== "string") {
      res.status(400);
      throw new Error("Action filter must be a string.");
    }

    query.action = action;
  }

  const [logs, total] = await Promise.all([
    ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "name email role"),

    ActivityLog.countDocuments(query),
  ]);

  res.json({
    success: true,
    data: logs,
    meta: {
      page,
      limit,
      total,
    },
  });
});

export {
  getStats,
  getUsers,
  getUser,
  getUserAvatarSource,
  uploadUserAvatar,
  deleteUserAvatar,
  updateUser,
  getActivityLogs,
};
