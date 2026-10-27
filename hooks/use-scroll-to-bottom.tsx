"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useScrollToBottom({
  status,
}: {
  status?: string;
} = {}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const isAtBottomRef = useRef(true);
  const userScrolledUpRef = useRef(false);
  const isProgrammaticScrollRef = useRef(false);

  useEffect(() => {
    isAtBottomRef.current = isAtBottom;
  }, [isAtBottom]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (!containerRef.current) {
      return;
    }
    isProgrammaticScrollRef.current = true;
    containerRef.current.scrollTo({
      behavior,
      top: containerRef.current.scrollHeight,
    });
    userScrolledUpRef.current = false;
    setIsAtBottom(true);
    isAtBottomRef.current = true;
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const handleScroll = () => {
      // If triggered programmatically, do not treat as user scroll
      if (isProgrammaticScrollRef.current) {
        isProgrammaticScrollRef.current = false;
        return;
      }

      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);

      // If user scrolls up more than 150px from bottom, honor user reading intent
      if (distanceFromBottom > 150) {
        userScrolledUpRef.current = true;
        setIsAtBottom(false);
        isAtBottomRef.current = false;
      } else {
        userScrolledUpRef.current = false;
        setIsAtBottom(true);
        isAtBottomRef.current = true;
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // When status changes to submitted, reset scroll to bottom immediately
  useEffect(() => {
    if (status === "submitted") {
      userScrolledUpRef.current = false;
      setIsAtBottom(true);
      isAtBottomRef.current = true;
      scrollToBottom("instant");
    }
  }, [status, scrollToBottom]);

  // When status finishes streaming (ready), smooth scroll to bottom so user sees final content
  const prevStatusRef = useRef(status);
  useEffect(() => {
    if (prevStatusRef.current === "streaming" && (status === "ready" || !status)) {
      if (!userScrolledUpRef.current) {
        scrollToBottom("smooth");
      }
    }
    prevStatusRef.current = status;
  }, [status, scrollToBottom]);

  // Aggressive tracking during streaming or content mutation
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const scrollIfNeeded = () => {
      // If user has actively scrolled up, don't hijack scroll
      if (userScrolledUpRef.current) {
        return;
      }

      // During streaming or if user was at bottom, follow content down
      isProgrammaticScrollRef.current = true;
      requestAnimationFrame(() => {
        if (!container) return;
        container.scrollTo({
          behavior: "instant",
          top: container.scrollHeight,
        });
        setIsAtBottom(true);
        isAtBottomRef.current = true;
      });
    };

    const mutationObserver = new MutationObserver(scrollIfNeeded);
    mutationObserver.observe(container, {
      characterData: true,
      childList: true,
      subtree: true,
    });

    const resizeObserver = new ResizeObserver(scrollIfNeeded);
    resizeObserver.observe(container);

    for (const child of container.children) {
      resizeObserver.observe(child);
    }

    return () => {
      mutationObserver.disconnect();
      resizeObserver.disconnect();
    };
  }, []);

  function onViewportEnter() {
    setIsAtBottom(true);
    isAtBottomRef.current = true;
    userScrolledUpRef.current = false;
  }

  function onViewportLeave() {
    setIsAtBottom(false);
    isAtBottomRef.current = false;
  }

  const reset = useCallback(() => {
    userScrolledUpRef.current = false;
    setIsAtBottom(true);
    isAtBottomRef.current = true;
    scrollToBottom("instant");
  }, [scrollToBottom]);

  return {
    containerRef,
    endRef,
    isAtBottom,
    onViewportEnter,
    onViewportLeave,
    reset,
    scrollToBottom,
  };
}
