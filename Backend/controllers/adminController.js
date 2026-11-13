import asyncHandler from "express-async-handler";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/User.js";
import Review from "../models/Review.js";
import ActivityLog from "../models/ActivityLog.js";

// @DESCRIPTION Get high-level stats for the admin dashboard
// @ROUTE       GET /api/v1/admin/stats
// @ACCESS      Admin
const getStats = asyncHandler(async (req, res) => {
  const [totalOrders, totalProducts, totalUsers, pendingReviews, recentOrders, revenueAgg] =
    await Promise.all([
      Order.countDocuments(),
      Product.countDocuments(),
      User.countDocuments({ role: "customer" }),
      Review.countDocuments({ status: "pending" }),
      Order.find().sort("-createdAt").limit(5).populate("user", "name email"),
      Order.aggregate([
        { $match: { status: { $nin: ["pending", "cancelled", "refunded"] } } },
        { $group: { _id: null, total: { $sum: "$total" } } },
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
      revenue: revenueAgg[0]?.total ?? 0, // integer kobo
      recentOrders,
    },
  });
});

// @DESCRIPTION List all users with filtering (admin)
// @ROUTE       GET /api/v1/admin/users
// @ACCESS      Admin
const getUsers = asyncHandler(async (req, res) => {
  const { role, roles, isActive, search, page = 1, limit = 20 } = req.query;

  const query = {};

  // Role filtering (supports one or multiple roles).
  // Example: ?roles=admin,superAdmin
  // Backward compatible: ?role=admin
  const selectedRoles = roles
    ? roles
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean)
    : role
      ? [role]
      : [];

  if (selectedRoles.length) {
    query.role = { $in: selectedRoles };
  }

  // Account status filtering.
  if (isActive !== undefined) {
    query.isActive = isActive === "true";
  }

  // Search by name or email.
  if (search) {
    query.$or = [{ name: new RegExp(search, "i") }, { email: new RegExp(search, "i") }];
  }

  const users = await User.find(query)
    .select("-password")
    .sort("-createdAt")
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  const total = await User.countDocuments(query);

  res.json({
    success: true,
    data: users,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
    },
  });
});

// @DESCRIPTION Get a single user by id with full profile data (admin)
// @ROUTE       GET /api/v1/admin/users/:id
// @ACCESS      Admin
const getUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select("-password");

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  res.json({ success: true, data: user });
});

// @DESCRIPTION Update a user role or status (admin)
// @ROUTE       PATCH /api/v1/admin/users/:id
// @ACCESS      Admin
const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  // Super admin protection: cannot be edited or deleted by other admins
  if (user.role === "superAdmin" && req.user.role !== "superAdmin") {
    res.status(403);
    throw new Error("Cannot edit a superAdmin account");
  }

  const allowedFields = [
    "name",
    "email",
    "phone",
    "role",
    "isActive",
    "isVerified",
    "addresses",
    "avatar",
    "avatarPublicId",
  ];
  const updates = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  }

  const oldSnapshot = { ...user.toObject(), password: undefined };
  Object.assign(user, updates);
  await user.save();

  const changes = [];
  const fieldLabels = {
    name: "Name",
    email: "Email",
    phone: "Phone",
    role: "Role",
    isActive: "Status",
    isVerified: "Verification",
    addresses: "Addresses",
    avatar: "Avatar",
    avatarPublicId: "Avatar public ID",
  };

  for (const [field, value] of Object.entries(updates)) {
    if (JSON.stringify(oldSnapshot[field]) !== JSON.stringify(value)) {
      let fromLabel = oldSnapshot[field];
      let toLabel = value;
      if (field === "role") {
        const roleNames = { admin: "Admin", customer: "Customer", superAdmin: "Super Admin" };
        fromLabel = roleNames[fromLabel] || fromLabel || "—";
        toLabel = roleNames[toLabel] || toLabel || "—";
      } else if (field === "isActive") {
        fromLabel = fromLabel ? "Active" : "Inactive";
        toLabel = toLabel ? "Active" : "Inactive";
      } else if (field === "isVerified") {
        fromLabel = fromLabel ? "Verified" : "Unverified";
        toLabel = toLabel ? "Verified" : "Unverified";
      } else if (field === "addresses" && Array.isArray(value)) {
        fromLabel = `${oldSnapshot[field]?.length ?? 0} address(es)`;
        toLabel = `${value.length} address(es)`;
      } else {
        fromLabel = String(fromLabel ?? "—");
        toLabel = String(toLabel ?? "—");
      }
      changes.push({
        field: fieldLabels[field] || field,
        from: fromLabel,
        to: toLabel,
      });
    }
  }

  const actionType = changes.length
    ? changes.some((c) => c.field === "Status")
      ? "status_toggle"
      : changes.some((c) => c.field === "Role")
        ? "role_change"
        : "update"
    : null;

  let actionDescription = changes
    .map((c) => `${fieldLabels[c.field]} changed from ${c.from} to ${c.to}`)
    .join(", ");

  if (changes.length > 0) {
    req.activity = {
      action: `user.${actionType || "update"}`,
      entity: "user",
      entityId: user._id,
      entityName: user.name,
      targetUser: user.name,
      targetUserRole: user.role,
      changes,
      actionType,
      description: actionDescription,
    };
  }

  res.json({ success: true, data: user });
});

// @DESCRIPTION Get full system activity logs (admin)
// @ROUTE       GET /api/v1/admin/activity-logs
// @ACCESS      Admin
const getActivityLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, user, entity, action } = req.query;

  const query = {};
  if (user) query.user = user;
  if (entity) query.entity = entity;
  if (action) query.action = action;

  const logs = await ActivityLog.find(query)
    .sort("-createdAt")
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .populate("user", "name email role");

  const total = await ActivityLog.countDocuments(query);

  res.json({
    success: true,
    data: logs,
    meta: { page: Number(page), limit: Number(limit), total },
  });
});

export { getStats, getUsers, getUser, updateUser, getActivityLogs };
