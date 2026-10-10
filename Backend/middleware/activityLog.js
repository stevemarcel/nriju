import asyncHandler from "express-async-handler";
import ActivityLog from "../models/ActivityLog.js";

// Auto-logs user actions. Fire-and-forget — never blocks the request.
// `req.activity` can be set by controllers to provide richer context.
const activityLog = asyncHandler(async (req, res, next) => {
  const originalSend = res.send;
  res.send = function (body) {
    // Only log successful responses
    if (res.statusCode >= 200 && res.statusCode < 400 && req.user) {
      const action = req.activity?.action || `${req.method.toLowerCase()}`;
      const entity = req.activity?.entity || req.activity?.entityName || inferEntity(req);
      const entityId = req.activity?.entityId || req.activity?.entity || req.params?.id;

      ActivityLog.create({
        user: req.user._id,
        action,
        entity,
        entityId,
        description: req.activity?.description || `${req.user.name} ${action} on ${entity}`,
        ip: req.ip,
        userAgent: req.get("User-Agent") || "",
      }).catch(() => {}); // never break the response
    }
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

export default activityLog;
