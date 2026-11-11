import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

const isElementVisible = (element) => {
  if (!element) return false;

  const rect = element.getBoundingClientRect();

  // Start with the browser viewport.
  let clip = {
    top: 0,
    left: 0,
    right: window.innerWidth,
    bottom: window.innerHeight,
  };

  // Check every ancestor that clips overflowing content.
  let parent = element.parentElement;

  while (parent && parent !== document.body) {
    const style = window.getComputedStyle(parent);
    const parentRect = parent.getBoundingClientRect();

    const clipsX = ["auto", "scroll", "hidden", "clip"].includes(style.overflowX);

    const clipsY = ["auto", "scroll", "hidden", "clip"].includes(style.overflowY);

    if (clipsX) {
      clip.left = Math.max(clip.left, parentRect.left);
      clip.right = Math.min(clip.right, parentRect.right);
    }

    if (clipsY) {
      clip.top = Math.max(clip.top, parentRect.top);
      clip.bottom = Math.min(clip.bottom, parentRect.bottom);
    }

    parent = parent.parentElement;
  }

  // Return false when the trigger is completely outside
  // any of its clipping boundaries.
  return (
    rect.bottom > clip.top &&
    rect.top < clip.bottom &&
    rect.right > clip.left &&
    rect.left < clip.right
  );
};

const Dropdown = ({
  trigger,
  color = "primary",
  open: controlledOpen,
  onOpenChange,
  children,
  menuClassName = "",
  align = "left",
  fullWidth = false,
  noChevron = false,
  noBorder = false,
  direction = "down",
  portal = false,
}) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);

  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const portalRef = useRef(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = (next) => {
    const value = typeof next === "function" ? next(open) : next;

    if (isControlled) {
      onOpenChange?.(value);
    } else {
      setInternalOpen(value);
    }
  };

  // Close when clicking outside both the trigger and portaled menu.
  useEffect(() => {
    if (!open) return;

    const handleClick = (e) => {
      const clickedTrigger = wrapperRef.current?.contains(e.target);
      const clickedMenu = portalRef.current?.contains(e.target);

      if (!clickedTrigger && !clickedMenu) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);

    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [open, portal]);

  // Position the portaled menu relative to its trigger.
  useLayoutEffect(() => {
    if (!portal || !open) {
      setMenuPosition(null);
      return;
    }

    const updatePosition = () => {
      const triggerEl = triggerRef.current;
      const menuEl = menuRef.current;

      if (!triggerEl || !menuEl) return;

      // Close the dropdown when its trigger is no longer visible.
      if (!isElementVisible(triggerEl)) {
        setMenuPosition(null);
        setOpen(false);
        return;
      }

      const triggerRect = triggerEl.getBoundingClientRect();
      const menuRect = menuEl.getBoundingClientRect();

      const gap = 6;
      const menuWidth = Math.max(menuRect.width, triggerRect.width);

      const shouldOpenUp =
        direction === "up" ||
        (direction === "down" &&
          window.innerHeight - triggerRect.bottom < menuRect.height + gap &&
          triggerRect.top > menuRect.height + gap);

      const top = shouldOpenUp ? triggerRect.top - menuRect.height - gap : triggerRect.bottom;

      const left = align === "right" ? triggerRect.right - menuWidth : triggerRect.left;

      setMenuPosition({
        top: Math.max(8, Math.min(top, window.innerHeight - menuRect.height - 8)),
        left: Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8)),
        triggerWidth: triggerRect.width,
        openUp: shouldOpenUp,
      });
    };

    updatePosition();

    // Reposition when the page or a scrollable ancestor scrolls.
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    let observer;

    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(updatePosition);

      if (triggerRef.current) observer.observe(triggerRef.current);
      if (menuRef.current) observer.observe(menuRef.current);
    }

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
      observer?.disconnect();
    };
  }, [portal, open, direction, align, fullWidth]);

  const triggerClass =
    color === "surface"
      ? `bg-surface hover:bg-background ${noBorder ? "" : "border border-border"}`
      : color === "table"
        ? `bg-surface hover:bg-amber-100 text-text-muted hover:text-amber-500 ${noBorder ? "" : "border border-border"}`
        : color === "muted"
          ? `bg-primary/5 hover:bg-primary/10 ${noBorder ? "" : "border border-border"}`
          : "bg-primary text-white hover:bg-primary/90";

  const menu = (
    <div
      ref={portal ? menuRef : null}
      onClick={() => setOpen(false)}
      className={`${
        portal ? "w-max" : "absolute z-50 w-full"
      } bg-surface rounded-xl shadow-soft border border-border py-1 overflow-hidden transition-opacity duration-150 ${
        portal ? "" : open ? "opacity-100 visible" : "opacity-0 invisible"
      } ${!portal ? "group-hover:opacity-100 group-hover:visible" : ""} ${menuClassName} ${
        !portal && direction === "down" ? "top-full left-0 mt-0.5" : ""
      } ${
        !portal && direction === "up" ? "bottom-full left-0 mb-0.5" : ""
      } ${!portal && align === "right" ? "right-0 left-auto" : ""}`}
      style={
        portal
          ? {
              minWidth: menuPosition?.triggerWidth,
              width: fullWidth ? menuPosition?.triggerWidth : undefined,
            }
          : undefined
      }
    >
      {children}
    </div>
  );

  return (
    <div
      ref={wrapperRef}
      onMouseEnter={portal ? () => setOpen(true) : undefined}
      onMouseLeave={
        portal
          ? (e) => {
              if (!portalRef.current?.contains(e.relatedTarget)) {
                setOpen(false);
              }
            }
          : undefined
      }
      className={`relative group ${
        fullWidth ? "w-full block" : "inline-flex"
      } ${align === "right" ? "flex-row-reverse" : ""}`}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-0.5 px-3 py-2 rounded-lg ${color === "table" ? "text-xs" : "text-sm"} font-medium transition-colors text-left ${triggerClass} ${
          fullWidth ? "w-full justify-start" : ""
        }`}
      >
        {trigger}

        {!noChevron && (
          <ChevronDown
            className={`w-4 h-4 opacity-70 transition-transform ml-auto ${
              open ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      {/* Original hover bridge for non-portaled dropdowns */}
      {!portal && (
        <div
          className={`absolute left-0 w-full h-1.5 ${
            direction === "down" ? "top-full" : "bottom-full"
          }`}
        />
      )}

      {!portal && menu}

      {/* Render the menu outside the scrollable table */}
      {portal &&
        open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={portalRef}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={(e) => {
              if (!wrapperRef.current?.contains(e.relatedTarget)) {
                setOpen(false);
              }
            }}
            className="fixed z-9999"
            style={{
              top: menuPosition?.top ?? 0,
              left: menuPosition?.left ?? 0,
              paddingTop: menuPosition?.openUp ? 0 : 6,
              paddingBottom: menuPosition?.openUp ? 6 : 0,
              visibility: menuPosition ? "visible" : "hidden",
            }}
          >
            {menu}
          </div>,
          document.body,
        )}
    </div>
  );
};

export default Dropdown;
