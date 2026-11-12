import asyncHandler from "express-async-handler";
import ActivityLog from "../models/ActivityLog.js";

// Auto-logs user actions. Fire-and-forget — never blocks the request.
// `req.activity` can be set by controllers to provide richer context.
const activityLog = asyncHandler(async (req, res, next) => {
  const originalSend = res.send;
  res.send = function (body) {
    // Only log mutations with authenticated users
    const method = req.method.toLowerCase();
    const isMutation = ["post", "put", "patch", "delete"].includes(method);
    const hasCustomActivity = req.activity && Object.keys(req.activity).length > 0;

    if (!isMutation || !req.user || res.statusCode < 200 || res.statusCode >= 400) {
      return originalSend.call(this, body);
    }

    // Skip if no custom activity AND not an admin resource route
    if (!hasCustomActivity) {
      const isAdminResource = [
        "/api/v1/admin/users",
        "/api/v1/products",
        "/api/v1/orders",
        "/api/v1/coupons",
        "/api/v1/reviews",
        "/api/v1/inventory",
      ].some((p) => req.path.startsWith(p));
      if (!isAdminResource) return originalSend.call(this, body);
    }

    const activity = req.activity || {};
    const entityName = activity.entityName || inferEntity(req);

    ActivityLog.create({
      user: req.user._id,
      action: activity.action || `${method}`,
      entity: activity.entity || entityName,
      entityId: activity.entityId || req.params?.id,
      entityName: activity.entityName,
      description: activity.description || inferDescription(req, entityName),
      ip: req.ip,
      userAgent: req.get("User-Agent") || "",
      targetUser: activity.targetUser,
      targetUserRole: activity.targetUserRole,
      changes: activity.changes,
      actionType: activity.actionType,
    }).catch(() => {}); // never break the response

    return originalSend.call(this, body);
  };
  next();
});

const inferEntity = (req) => {
  const path = req.path.toLowerCase();
  if (path.includes("/products")) return "product";
  if (path.includes("/orders")) return "order";
  if (path.includes("/categories")) return "category";
  if (path.includes("/users")) return "user";
  if (path.includes("/coupons")) return "coupon";
  if (path.includes("/inventory")) return "inventory";
  if (path.includes("/reviews")) return "review";
  if (path.includes("/payments")) return "payment";
  return "system";
};

const inferDescription = (req, entityName) => {
  const user = req.user.name || "Unknown";
  const entityId = req.params?.id || "unknown";
  const method = req.method.toLowerCase();

  switch (method) {
    case "post":
      return `${user} created a new ${entityName}`;
    case "put":
      return `${user} updated ${entityName} ${entityId}`;
    case "patch":
      return `${user} patched ${entityName} ${entityId}`;
    case "delete":
      return `${user} deleted ${entityName} ${entityId}`;
    default:
      return `${user} performed ${method} on ${entityName}`;
  }
};

export default activityLog;
