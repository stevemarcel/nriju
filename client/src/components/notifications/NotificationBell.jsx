import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bell, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import usePageScrollLock from "../../hooks/usePageScrollLock";
import {
  useNotificationActions,
  useNotifications,
  useUnreadNotificationCount,
} from "../../hooks/useNotifications";
import Dropdown from "../ui/Dropdown";
import NotificationPanel from "./NotificationPanel";

const CountBadge = ({ count }) =>
  count > 0 ? (
    <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.5625rem] font-bold leading-none text-on-accent ring-2 ring-surface">
      {count > 99 ? "99+" : count}
    </span>
  ) : null;

const NotificationBell = () => {
  const navigate = useNavigate();
  const [desktopOpen, setDesktopOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);
  const { data: unread = 0 } = useUnreadNotificationCount(true);
  const { data, isPending } = useNotifications({ limit: 7 });
  const { markRead, markAllRead } = useNotificationActions();
  const notifications = data?.data || [];

  usePageScrollLock(mobileOpen);

  useEffect(() => {
    if (!mobileOpen) return undefined;
    previousFocusRef.current = document.activeElement;
    closeButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setMobileOpen(false);
      if (event.key !== "Tab") return;

      const drawer = closeButtonRef.current?.closest("[role='dialog']");
      const focusable = drawer?.querySelectorAll(
        'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [mobileOpen]);

  const handleSelect = (notification) => {
    if (!notification.read) markRead.mutate(notification._id);
    setDesktopOpen(false);
    setMobileOpen(false);
    navigate(notification.link || "/account/notifications");
  };

  const handleViewAll = () => {
    setDesktopOpen(false);
    setMobileOpen(false);
    navigate("/account/notifications");
  };

  const panelProps = {
    notifications,
    unread,
    loading: isPending,
    onSelect: handleSelect,
    onMarkAll: () => markAllRead.mutate(),
    onViewAll: handleViewAll,
    markingAll: markAllRead.isPending,
  };

  return (
    <>
      <div className="hidden md:block">
        <Dropdown
          trigger={
            <span className="relative flex h-5 w-5 items-center justify-center">
              <Bell className="h-4 w-4" aria-hidden="true" />
              <CountBadge count={unread} />
            </span>
          }
          color="surface"
          noChevron
          noBorder
          open={desktopOpen}
          onOpenChange={setDesktopOpen}
          openOnHover={false}
          align="right"
          portal
          ariaLabel={unread ? `Notifications, ${unread} unread` : "Notifications"}
          menuClassName="p-0"
        >
          <NotificationPanel {...panelProps} />
        </Dropdown>
      </div>

      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-text outline-none transition-colors hover:bg-background focus-visible:ring-2 focus-visible:ring-primary md:hidden"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        <CountBadge count={unread} />
      </button>

      {mobileOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-100 md:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-text/45"
              onClick={() => setMobileOpen(false)}
              aria-label="Close notifications"
            />
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="mobile-notifications-title"
              className="absolute inset-y-0 right-0 flex w-[min(92vw,24rem)] flex-col border-l border-border bg-surface shadow-soft"
            >
              <div className="flex shrink-0 items-center justify-between border-b border-border-soft px-4 py-3">
                <h2
                  id="mobile-notifications-title"
                  className="font-heading text-lg font-bold text-text"
                >
                  Notifications
                </h2>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-text-secondary outline-none hover:bg-background focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="Close notifications"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <div className="min-h-0 flex-1">
                <NotificationPanel {...panelProps} mobile />
              </div>
            </section>
          </div>,
          document.body,
        )}
    </>
  );
};

export default NotificationBell;
