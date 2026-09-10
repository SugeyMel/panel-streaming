"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { WhatsAppIcon } from "@/components/icons";

const SIZE = 56;
const MARGIN = 16;
const DRAG_THRESHOLD = 8;
const STORAGE_KEY = "store-wa-bubble";

type Side = "left" | "right";
type Point = { x: number; y: number };

function bottomClearance() {
  return window.matchMedia("(min-width: 1024px)").matches ? 24 : 92;
}

function clamp(point: Point): Point {
  const maxX = Math.max(MARGIN, window.innerWidth - SIZE - MARGIN);
  const maxY = Math.max(MARGIN, window.innerHeight - SIZE - bottomClearance());
  return {
    x: Math.min(maxX, Math.max(MARGIN, point.x)),
    y: Math.min(maxY, Math.max(MARGIN, point.y)),
  };
}

function pointFromSide(y: number, side: Side): Point {
  const clamped = clamp({
    x: side === "left" ? MARGIN : window.innerWidth,
    y,
  });
  return {
    x: side === "left" ? MARGIN : Math.max(MARGIN, window.innerWidth - SIZE - MARGIN),
    y: clamped.y,
  };
}

function sideOf(point: Point): Side {
  return point.x + SIZE / 2 < window.innerWidth / 2 ? "left" : "right";
}

function defaultPoint(): Point {
  return pointFromSide(window.innerHeight - SIZE - bottomClearance(), "right");
}

function loadPoint(): { point: Point; side: Side } {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { point: defaultPoint(), side: "right" };
    const parsed = JSON.parse(raw) as { y?: number; side?: Side };
    const side: Side = parsed.side === "left" ? "left" : "right";
    const y = typeof parsed.y === "number" ? parsed.y : defaultPoint().y;
    return { point: pointFromSide(y, side), side };
  } catch {
    return { point: defaultPoint(), side: "right" };
  }
}

function savePoint(point: Point, side: Side) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ y: point.y, side }));
}

export function WhatsAppBubble({ href }: { href: string }) {
  const [point, setPoint] = useState<Point | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef(false);
  const movedRef = useRef(false);
  const startRef = useRef({ pointerX: 0, pointerY: 0, x: 0, y: 0 });
  const pointRef = useRef<Point | null>(null);
  const sideRef = useRef<Side>("right");

  const commit = useCallback((next: Point, persist: boolean, side?: Side) => {
    const resolvedSide = side ?? (persist ? sideOf(next) : sideRef.current);
    const placed = persist ? pointFromSide(next.y, resolvedSide) : clamp(next);
    pointRef.current = placed;
    if (persist) {
      sideRef.current = resolvedSide;
      savePoint(placed, resolvedSide);
    }
    setPoint(placed);
  }, []);

  useEffect(() => {
    const loaded = loadPoint();
    sideRef.current = loaded.side;
    commit(loaded.point, true, loaded.side);
    function onResize() {
      const current = pointRef.current ?? defaultPoint();
      commit(current, true, sideRef.current);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [commit]);

  useEffect(() => {
    function onMove(event: PointerEvent) {
      if (!dragRef.current) return;
      const dx = event.clientX - startRef.current.pointerX;
      const dy = event.clientY - startRef.current.pointerY;
      if (!movedRef.current && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      movedRef.current = true;
      setDragging(true);
      event.preventDefault();
      commit(
        {
          x: startRef.current.x + dx,
          y: startRef.current.y + dy,
        },
        false,
      );
    }

    function onUp() {
      if (!dragRef.current) return;
      dragRef.current = false;
      setDragging(false);
      const current = pointRef.current;
      if (movedRef.current && current) commit(current, true);
    }

    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [commit]);

  function onPointerDown(event: React.PointerEvent<HTMLAnchorElement>) {
    if (event.button !== 0) return;
    const current = pointRef.current;
    if (!current) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      /* some browsers reject synthetic pointers */
    }
    dragRef.current = true;
    movedRef.current = false;
    startRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      x: current.x,
      y: current.y,
    };
  }

  function onClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (movedRef.current) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      draggable={false}
      aria-label="Contactar por WhatsApp"
      onPointerDown={onPointerDown}
      onClick={onClick}
      onDragStart={(event) => event.preventDefault()}
      className={`fixed z-40 grid h-14 w-14 touch-none place-items-center rounded-full bg-[#25D366] text-white shadow-[0_10px_28px_rgba(37,211,102,0.45)] select-none ${
        dragging ? "cursor-grabbing" : "cursor-grab hover:brightness-110"
      } ${point && !dragging ? "transition-transform duration-200 ease-out" : ""} ${
        point ? "top-0 left-0" : "right-4 bottom-[5.75rem] lg:bottom-6"
      }`}
      style={
        point
          ? {
              transform: `translate3d(${point.x}px, ${point.y}px, 0) scale(${dragging ? 1.08 : 1})`,
            }
          : undefined
      }
    >
      <WhatsAppIcon className="pointer-events-none h-7 w-7" />
    </a>
  );
}
