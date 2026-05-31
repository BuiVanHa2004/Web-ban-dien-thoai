"use client";

import { useState, useRef, useCallback, useEffect } from "react";

type Edge = "top-left" | "top-right" | "bottom-left" | "bottom-right";

interface DraggableConfig {
  /** initial edge to dock at */
  initialEdge?: Edge;
  /** margin from viewport edge in px */
  margin?: number;
  /** unique key to persist position in localStorage */
  storageKey?: string;
}

/**
 * Makes a fixed element draggable but snaps to the nearest
 * corner/edge of the viewport when released.
 */
export function useDraggableEdge(config: DraggableConfig = {}) {
  const { initialEdge = "bottom-right", margin = 24, storageKey } = config;

  // Start hidden (off-screen) to avoid hydration mismatch,
  // then position correctly in useEffect after mount.
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: -9999, y: -9999 });
  const [mounted, setMounted] = useState(false);

  const dragging = useRef(false);
  const hasMoved = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const elRef = useRef<HTMLDivElement | null>(null);

  // Resolve edge to position (client-side only)
  const edgeToPos = useCallback(
    (edge: Edge) => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const el = elRef.current;
      const w = el ? el.offsetWidth : 200;
      const h = el ? el.offsetHeight : 56;
      switch (edge) {
        case "top-left":
          return { x: margin, y: margin };
        case "top-right":
          return { x: vw - w - margin, y: margin };
        case "bottom-left":
          return { x: margin, y: vh - h - margin };
        case "bottom-right":
        default:
          return { x: vw - w - margin, y: vh - h - margin };
      }
    },
    [margin]
  );

  // On mount, set the real position
  useEffect(() => {
    let initial: { x: number; y: number } | null = null;

    if (storageKey) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) initial = JSON.parse(saved);
      } catch { /* ignore */ }
    }

    if (!initial) {
      initial = edgeToPos(initialEdge);
    }

    setPos(initial);
    setMounted(true);
  }, [edgeToPos, initialEdge, storageKey]);

  const snapToEdge = useCallback(
    (cx: number, cy: number) => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const el = elRef.current;
      const w = el ? el.offsetWidth : 0;
      const h = el ? el.offsetHeight : 0;

      let snapX: number;
      let snapY: number;

      // snap X to nearest horizontal edge
      const distLeft = cx;
      const distRight = vw - cx - w;
      if (distLeft < distRight) {
        snapX = margin;
      } else {
        snapX = vw - w - margin;
      }

      // clamp Y
      snapY = Math.max(margin, Math.min(vh - h - margin, cy));

      const newPos = { x: snapX, y: snapY };
      setPos(newPos);
      if (storageKey) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(newPos));
        } catch { /* ignore */ }
      }
    },
    [margin, storageKey]
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      dragging.current = true;
      hasMoved.current = false;
      const rect = elRef.current?.getBoundingClientRect();
      offset.current = {
        x: e.clientX - (rect?.left ?? 0),
        y: e.clientY - (rect?.top ?? 0),
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      e.preventDefault();
    },
    []
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      hasMoved.current = true;
      const nx = e.clientX - offset.current.x;
      const ny = e.clientY - offset.current.y;
      setPos({ x: nx, y: ny });
    },
    []
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      dragging.current = false;
      if (hasMoved.current) {
        const rect = elRef.current?.getBoundingClientRect();
        snapToEdge(rect?.left ?? pos.x, rect?.top ?? pos.y);
      }
    },
    [snapToEdge, pos]
  );

  // on resize, re-snap
  useEffect(() => {
    function handleResize() {
      const el = elRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      snapToEdge(rect.left, rect.top);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [snapToEdge]);

  const style: React.CSSProperties = {
    position: "fixed",
    zIndex: 60,
    touchAction: "none",
    transition: dragging.current ? "none" : "left 0.3s ease, top 0.3s ease, right 0.3s ease, bottom 0.3s ease",
    cursor: dragging.current ? "grabbing" : "grab",
    // Use coordinates if positioned, otherwise fall back to edge-based docking via CSS
    left: pos.x === -9999 ? "auto" : pos.x,
    top: pos.y === -9999 ? "auto" : pos.y,
    right: pos.x === -9999 && initialEdge.includes("right") ? margin : "auto",
    bottom: pos.x === -9999 && initialEdge.includes("bottom") ? margin : "auto",
    opacity: 1,
  };

  return {
    ref: elRef,
    style,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
    },
    /** true if the pointer actually moved (vs just a click) */
    wasDragged: () => hasMoved.current,
  };
}
