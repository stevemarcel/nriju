import { useLayoutEffect } from "react";

let activeLocks = 0;
let restorePageStyles = null;

const lockPageScroll = () => {
  const root = document.documentElement;
  const body = document.body;
  const previous = {
    rootOverflow: root.style.overflow,
    rootOverscrollBehavior: root.style.overscrollBehavior,
    bodyOverflow: body.style.overflow,
    bodyOverscrollBehavior: body.style.overscrollBehavior,
    bodyPaddingRight: body.style.paddingRight,
  };
  const scrollbarWidth = Math.max(0, window.innerWidth - root.clientWidth);

  root.style.overflow = "hidden";
  root.style.overscrollBehavior = "none";
  body.style.overflow = "hidden";
  body.style.overscrollBehavior = "none";

  if (scrollbarWidth > 0) {
    const currentPadding =
      Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;
    body.style.paddingRight = `${currentPadding + scrollbarWidth}px`;
  }

  return () => {
    root.style.overflow = previous.rootOverflow;
    root.style.overscrollBehavior = previous.rootOverscrollBehavior;
    body.style.overflow = previous.bodyOverflow;
    body.style.overscrollBehavior = previous.bodyOverscrollBehavior;
    body.style.paddingRight = previous.bodyPaddingRight;
  };
};

const usePageScrollLock = (locked = true) => {
  useLayoutEffect(() => {
    if (!locked) return undefined;

    activeLocks += 1;
    if (activeLocks === 1) restorePageStyles = lockPageScroll();

    return () => {
      activeLocks = Math.max(0, activeLocks - 1);

      if (activeLocks === 0 && restorePageStyles) {
        restorePageStyles();
        restorePageStyles = null;
      }
    };
  }, [locked]);
};

export default usePageScrollLock;
