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

  const { role, isActive } = req.body;
  const changes = [];
  let actionDescription = "";
  let actionType = null;

  if (role) {
    user.role = role;
    const roleNames = { admin: "administrator", customer: "customer", superAdmin: "superAdmin" };
    changes.push({
      field: "role",
      from: roleNames[user.role] || user.role,
      to: roleNames[role] || role,
    });
    actionType = "role_change";
    actionDescription = `${req.user.name} ${user.role === "admin" || user.role === "superAdmin" ? "removed administrator access from" : "granted administrator access to"} ${user.name}`;
  }

  if (isActive !== undefined) {
    user.isActive = isActive;
    changes.push({
      field: "isActive",
      from: user.isActive ? "Active" : "Inactive",
      to: isActive ? "Active" : "Inactive",
    });
    actionType = actionType || "status_toggle";
    actionDescription = `${req.user.name} ${isActive ? "reactivated" : "deactivated"} ${user.name}'s account`;
  }

  await user.save();

  if (changes.length > 0) {
    req.activity = {
      action: `user.${actionType}`,
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

export { getStats, getUsers, updateUser, getActivityLogs };
