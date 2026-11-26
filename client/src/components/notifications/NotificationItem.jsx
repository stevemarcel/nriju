import { Bell, CreditCard, Package, ShieldCheck, Star, Tag } from "lucide-react";

const TYPE_ICONS = {
  order: Package,
  payment: CreditCard,
  review: Star,
  security: ShieldCheck,
  promo: Tag,
};

const formatRelativeTime = (value) => {
  const timestamp = new Date(value).getTime();
  const seconds = Math.round((timestamp - Date.now()) / 1000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const units = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];

  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit);
  }
  return "just now";
};

const NotificationItem = ({ notification, onSelect, compact = false }) => {
  const Icon = TYPE_ICONS[notification.type] || Bell;
  const occurredAt = notification.lastTriggeredAt || notification.createdAt;

  return (
    <button
      type="button"
      onClick={() => onSelect(notification)}
      className={`group flex w-full gap-3 border-b border-border-soft text-left outline-none transition-colors last:border-b-0 hover:bg-accent-soft focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset ${
        compact ? "px-4 py-3" : "px-4 py-4 sm:px-5"
      } ${notification.read ? "bg-surface" : "bg-primary/4.5"}`}
      aria-label={`${notification.read ? "Read" : "Unread"} notification: ${notification.title}`}
    >
      <span
        className={`mt-0.5 flex shrink-0 items-center justify-center rounded-full ${
          compact ? "h-9 w-9" : "h-10 w-10"
        } ${notification.read ? "bg-background text-text-secondary" : "bg-accent-soft text-primary"}`}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-2">
          <span className="min-w-0 flex-1 font-heading text-sm font-semibold text-text">
            {notification.title}
          </span>
          {!notification.read && (
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
          )}
        </span>
        <span
          className={`mt-1 block text-xs leading-5 text-text-secondary ${compact ? "line-clamp-2" : ""}`}
        >
          {notification.message}
        </span>
        <span className="mt-1.5 block text-[0.6875rem] font-medium text-text-muted">
          {formatRelativeTime(occurredAt)}
        </span>
      </span>
    </button>
  );
};

export default NotificationItem;
