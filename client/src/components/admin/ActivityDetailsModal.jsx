import { Clock } from "lucide-react";
import usePageScrollLock from "../../hooks/usePageScrollLock";
import { ADMIN_SECONDARY_BUTTON_CLASS, AdminModalHeader } from "./AdminModalPrimitives";

export const ACTION_TYPE_MAP = {
  create: {
    label: "Created",
    cls: "bg-emerald-100 text-emerald-700",
    dotColor: "bg-emerald-500",
  },
  update: {
    label: "Updated",
    cls: "bg-amber-100 text-amber-700",
    dotColor: "bg-amber-500",
  },
  delete: {
    label: "Deleted",
    cls: "bg-rose-100 text-rose-700",
    dotColor: "bg-rose-500",
  },
  role_change: {
    label: "Role Change",
    cls: "bg-blue-100 text-blue-700",
    dotColor: "bg-blue-500",
  },
  status_toggle: {
    label: "Status Change",
    cls: "bg-violet-100 text-violet-700",
    dotColor: "bg-violet-500",
  },
};

const formatTimestamp = (isoString) => {
  if (!isoString) return "N/A";

  return new Date(isoString).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
};

const formatChangeValue = (field, value) => {
  if (value === null || value === undefined || value === "") return "N/A";

  const text = String(value);
  return String(field).toLowerCase().includes("status") ? text.replaceAll("_", " ") : text;
};

const ActivityDetailsModal = ({ activity, onClose }) => {
  usePageScrollLock(Boolean(activity));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none bg-black/60 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-details-title"
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-[20px] border border-border/60 bg-background text-text shadow-soft"
      >
        <AdminModalHeader
          icon={Clock}
          eyebrow="Audit log"
          title="Activity Details"
          titleId="activity-details-title"
          onClose={onClose}
          closeLabel="Close activity details"
        />

        <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-surface p-4">
              <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Date & Time
              </span>
              <p className="mt-1 text-sm font-medium text-text">
                {formatTimestamp(activity.createdAt)}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-surface p-4">
              <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Performer
              </span>
              <p className="mt-1 text-sm font-medium text-text">
                {activity.user?.name || "Unknown"}{" "}
                {activity.user?.role && (
                  <span className="ml-2 rounded bg-primary/10 px-2 py-0.5 text-xs capitalize text-primary">
                    {activity.user.role.replace(/([A-Z])/g, " $1").trim()}
                  </span>
                )}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-surface p-4">
              <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Action Type
              </span>
              <p className="mt-1 text-sm font-medium text-text">
                {ACTION_TYPE_MAP[activity.actionType]?.label || activity.action}
              </p>
            </div>
            <div className="rounded-xl border border-border/60 bg-surface p-4">
              <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Entity
              </span>
              <p className="mt-1 text-sm font-medium text-text">
                {activity.entityName || activity.entity || "N/A"}
              </p>
            </div>
          </div>

          {activity.description && (
            <div className="rounded-xl border border-border/60 bg-surface p-4">
              <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Description
              </span>
              <p className="mt-2 text-sm leading-relaxed text-text">{activity.description}</p>
            </div>
          )}

          {activity.changes && activity.changes.length > 0 && (
            <div className="rounded-xl border border-border/60 bg-surface p-4">
              <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Changes Made
              </span>
              <div className="mt-3 space-y-2">
                {activity.changes.map((change, index) => (
                  <div
                    key={`${change.field}-${index}`}
                    className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-lg bg-background-soft p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)] sm:gap-3"
                  >
                    <span className="col-span-3 text-xs font-medium capitalize text-text-muted sm:col-span-1 sm:w-24">
                      {change.field}
                    </span>
                    <span className="min-w-0 wrap-anywhere text-sm text-text-muted line-through">
                      {formatChangeValue(change.field, change.from)}
                    </span>
                    <span className="shrink-0 text-text" aria-hidden="true">
                      →
                    </span>
                    <span className="min-w-0 wrap-anywhere text-right text-sm font-medium text-emerald-600">
                      {formatChangeValue(change.field, change.to)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(activity.ip || activity.userAgent) && (
            <div className="rounded-xl border border-border/60 bg-surface p-4">
              <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Additional Info
              </span>
              <div className="mt-3 space-y-2 text-sm">
                {activity.ip && (
                  <div className="flex gap-2">
                    <span className="text-text-muted">IP:</span>
                    <span className="font-mono text-text">{activity.ip}</span>
                  </div>
                )}
                {activity.userAgent && (
                  <div className="flex min-w-0 gap-2">
                    <span className="text-text-muted">Browser:</span>
                    <span className="truncate text-text">{activity.userAgent}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {activity.metadata && Object.keys(activity.metadata).length > 0 && (
            <div className="rounded-xl border border-border/60 bg-surface p-4">
              <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Metadata
              </span>
              <pre className="mt-2 overflow-x-auto rounded-lg bg-background p-3 font-mono text-xs text-text-muted">
                {JSON.stringify(activity.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-border/60 bg-background px-6 py-4">
          <button type="button" onClick={onClose} className={ADMIN_SECONDARY_BUTTON_CLASS}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActivityDetailsModal;
