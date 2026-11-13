import asyncHandler from "express-async-handler";
import ActivityLog from "../models/ActivityLog.js";
import { getActivityActorLabel } from "../utils/activityUtils.js";

// Captures successful mutations after authentication. Controllers can set
// req.activity for a detailed business description and structured changes.
// Logging is fire-and-forget and must never block the original response.
const activityLog = asyncHandler(async (req, res, next) => {
  const originalSend = res.send;

  res.send = function (body) {
    if (req.skipActivityLog) {
      return originalSend.call(this, body);
    }

    const method = req.method.toLowerCase();
    const isMutation = ["post", "put", "patch", "delete"].includes(method);
    const hasCustomActivity = req.activity && Object.keys(req.activity).length > 0;

    if (!isMutation || !req.user || res.statusCode < 200 || res.statusCode >= 400) {
      return originalSend.call(this, body);
    }

    if (!hasCustomActivity) {
      const isAdminResource = [
        "/api/v1/admin/users",
        "/api/v1/products",
        "/api/v1/orders",
        "/api/v1/coupons",
        "/api/v1/reviews",
        "/api/v1/inventory",
      ].some((prefix) => req.path.startsWith(prefix));

      if (!isAdminResource) {
        return originalSend.call(this, body);
      }
    }

    const activity = req.activity || {};
    const entity = activity.entity || inferEntity(req);
    const entityName = activity.entityName || entity;

    ActivityLog.create({
      user: req.user._id,
      action: activity.action || method,
      entity,
      entityId: activity.entityId || req.params?.id,
      entityName,
      description: activity.description || inferDescription(req, entity),
      ip: req.ip,
      userAgent: req.get("User-Agent") || "",
      targetUser: activity.targetUser,
      targetUserRole: activity.targetUserRole,
      changes: activity.changes,
      actionType: activity.actionType,
      actorRole: activity.actorRole || req.user.role,
    }).catch((error) => {
      // Do not fail the business operation because an audit write failed.
      console.error("Activity log write failed:", error.message);
    });

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

const inferDescription = (req, entity) => {
  const actor = getActivityActorLabel(req);
  const entityId = req.params?.id || "unknown";
  const method = req.method.toLowerCase();

  switch (method) {
    case "post":
      return `${actor} created a new ${entity}.`;
    case "put":
    case "patch":
      return `${actor} updated ${entity} ${entityId}.`;
    case "delete":
      return `${actor} deleted ${entity} ${entityId}.`;
    default:
      return `${actor} performed ${method} on ${entity}.`;
  }
};

export default activityLog;
