import { Bell, CheckCheck } from "lucide-react";
import NotificationItem from "./NotificationItem";

const NotificationPanel = ({
  notifications = [],
  unread = 0,
  loading,
  onSelect,
  onMarkAll,
  onViewAll,
  markingAll,
  mobile = false,
}) => (
  <div
    className={`flex min-h-0 flex-col bg-background ${mobile ? "h-full" : "w-92 max-w-[calc(100vw-2rem)]"}`}
  >
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border-soft px-4 py-3">
      <div>
        <h2 className="font-heading text-base font-bold text-text">Notifications</h2>
        <p className="mt-0.5 text-xs text-text-muted">
          {unread ? `${unread} unread` : "You're all caught up"}
        </p>
      </div>
      {unread > 0 && (
        <button
          type="button"
          onClick={onMarkAll}
          disabled={markingAll}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-button px-2.5 text-xs font-semibold text-primary outline-none transition-colors hover:bg-accent-soft focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
        >
          <CheckCheck className="h-4 w-4" aria-hidden="true" />
          Mark all read
        </button>
      )}
    </div>

    <div className={`min-h-0 flex-1 overflow-y-auto ${mobile ? "" : "max-h-100"}`}>
      {loading ? (
        <div className="space-y-1 p-3" aria-label="Loading notifications">
          {[0, 1, 2].map((item) => (
            <div key={item} className="flex gap-3 px-1 py-3">
              <div className="h-9 w-9 animate-pulse rounded-full bg-border-soft" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-3 w-2/3 animate-pulse rounded bg-border-soft" />
                <div className="h-3 w-full animate-pulse rounded bg-border-soft" />
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length ? (
        notifications.map((notification) => (
          <NotificationItem
            key={notification._id}
            notification={notification}
            onSelect={onSelect}
            compact
          />
        ))
      ) : (
        <div className="flex flex-col items-center px-6 py-12 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-background text-text-muted">
            <Bell className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="mt-3 font-heading text-sm font-semibold text-text">No notifications yet</p>
          <p className="mt-1 max-w-56 text-xs leading-5 text-text-muted">
            Order updates and useful account messages will appear here.
          </p>
        </div>
      )}
    </div>

    <div className="shrink-0 border-t border-border-soft p-3">
      <button
        type="button"
        onClick={onViewAll}
        className="flex min-h-10 w-full items-center justify-center rounded-button text-sm font-semibold text-primary outline-none transition-colors hover:bg-accent-soft focus-visible:ring-2 focus-visible:ring-primary"
      >
        View all notifications
      </button>
    </div>
  </div>
);

export default NotificationPanel;
