import { useState } from "react";
import { Bell, CheckCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import NotificationItem from "../../components/notifications/NotificationItem";
import { Breadcrumb } from "../../components/ui/Navigation";
import {
  useNotificationActions,
  useNotifications,
  useUnreadNotificationCount,
} from "../../hooks/useNotifications";

const NotificationsPage = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const { data, isPending, isError, refetch } = useNotifications({
    page,
    limit: 20,
    unreadOnly,
  });
  const { data: unread = 0 } = useUnreadNotificationCount();
  const { markRead, markAllRead } = useNotificationActions();
  const notifications = data?.data || [];
  const total = data?.meta?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  const selectFilter = (value) => {
    setUnreadOnly(value);
    setPage(1);
  };

  const handleSelect = (notification) => {
    if (!notification.read) markRead.mutate(notification._id);
    navigate(notification.link || "/account/notifications");
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="border-b border-border-soft bg-surface">
        <div className="container mx-auto px-4 py-4">
          <Breadcrumb crumbs={[{ label: "Account", to: "/account" }, { label: "Notifications" }]} />
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-8 sm:py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-bold text-text sm:text-3xl">Notifications</h1>
            <p className="mt-1 text-sm text-text-muted">
              Order updates, review reminders, and account messages in one place.
            </p>
          </div>
          {unread > 0 && (
            <button
              type="button"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-button border border-primary px-4 text-sm font-semibold text-primary outline-none transition-colors hover:bg-accent-soft focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50 sm:self-auto"
            >
              <CheckCheck className="h-4 w-4" aria-hidden="true" />
              Mark all read
            </button>
          )}
        </div>

        <div className="mt-6 flex gap-2" role="group" aria-label="Notification filters">
          {[
            { label: "All", value: false },
            { label: `Unread${unread ? ` (${unread})` : ""}`, value: true },
          ].map((filter) => (
            <button
              key={filter.label}
              type="button"
              onClick={() => selectFilter(filter.value)}
              aria-pressed={unreadOnly === filter.value}
              className={`min-h-10 rounded-full border px-4 text-sm font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary ${
                unreadOnly === filter.value
                  ? "border-primary bg-primary text-on-accent"
                  : "border-border bg-surface text-text-secondary hover:border-primary hover:text-primary"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <section
          className="mt-5 overflow-hidden rounded-card border border-border bg-surface shadow-soft"
          aria-live="polite"
        >
          {isPending ? (
            <div className="space-y-2 p-4" aria-label="Loading notifications">
              {[0, 1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="flex gap-3 border-b border-border-soft px-1 py-4 last:border-0"
                >
                  <div className="h-10 w-10 animate-pulse rounded-full bg-border-soft" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3 w-2/5 animate-pulse rounded bg-border-soft" />
                    <div className="h-3 w-4/5 animate-pulse rounded bg-border-soft" />
                  </div>
                </div>
              ))}
            </div>
          ) : isError ? (
            <div className="px-6 py-14 text-center">
              <p className="font-heading font-semibold text-text">
                Notifications could not be loaded.
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-4 min-h-10 rounded-button px-4 text-sm font-semibold text-primary hover:bg-accent-soft focus-visible:ring-2 focus-visible:ring-primary"
              >
                Try again
              </button>
            </div>
          ) : notifications.length ? (
            notifications.map((notification) => (
              <NotificationItem
                key={notification._id}
                notification={notification}
                onSelect={handleSelect}
              />
            ))
          ) : (
            <div className="flex flex-col items-center px-6 py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-background text-text-muted">
                <Bell className="h-6 w-6" aria-hidden="true" />
              </span>
              <h2 className="mt-4 font-heading text-lg font-semibold text-text">
                {unreadOnly ? "No unread notifications" : "No notifications yet"}
              </h2>
              <p className="mt-1 max-w-sm text-sm leading-6 text-text-muted">
                {unreadOnly
                  ? "You have read everything. New updates will appear here."
                  : "Order updates and useful account messages will appear here."}
              </p>
            </div>
          )}
        </section>

        {totalPages > 1 && (
          <nav className="mt-5 flex items-center justify-between" aria-label="Notification pages">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              className="inline-flex min-h-10 items-center gap-1 rounded-button border border-border bg-surface px-3 text-sm font-semibold text-text outline-none hover:border-primary focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Previous
            </button>
            <span className="text-xs font-medium text-text-muted">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page === totalPages}
              className="inline-flex min-h-10 items-center gap-1 rounded-button border border-border bg-surface px-3 text-sm font-semibold text-text outline-none hover:border-primary focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </nav>
        )}
      </div>
    </main>
  );
};

export default NotificationsPage;
