const ACTOR_ROLE_LABELS = {
  customer: "Customer",
  admin: "Admin",
  superAdmin: "Super Admin",
};

const ensureSentence = (value) => {
  const sentence = String(value || "").trim();
  if (!sentence) return "";
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
};

export const getActivityActorLabel = (req) => {
  const name = req.user?.name?.trim() || "Nriju";
  const role = ACTOR_ROLE_LABELS[req.user?.role];

  if (!role) return name;
  if (name.toLowerCase().endsWith(role.toLowerCase())) return name;
  return `${name} ${role}`;
};

/**
 * Attach a normalized activity payload to the request. The activityLog
 * middleware remains responsible for persisting it after a successful response.
 * `description` must be the action phrase, without the actor prefix.
 */
export const recordActivity = (
  req,
  {
    action,
    entity,
    entityId,
    entityName,
    actionType,
    description,
    changes = [],
    targetUser,
    targetUserRole,
  },
) => {
  if (!req || !action || !entity || !description) return;

  const actor = getActivityActorLabel(req);

  req.activity = {
    action,
    entity,
    entityId,
    entityName,
    actionType,
    actorRole: req.user?.role,
    description: ensureSentence(`${actor} ${description}`),
    ...(Array.isArray(changes) && changes.length ? { changes } : {}),
    ...(targetUser ? { targetUser } : {}),
    ...(targetUserRole ? { targetUserRole } : {}),
  };
};

/**
 * Tell the activity middleware not to create a generic fallback entry.
 * Useful for staging endpoints and successful no-op updates.
 */
export const skipActivityLog = (req) => {
  if (req) req.skipActivityLog = true;
};

export const formatNairaFromKobo = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return String(value);

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount / 100);
};

export const formatActivityList = (values) => {
  if (!Array.isArray(values) || values.length === 0) return "none";
  return values.map((value) => String(value)).join(", ");
};
