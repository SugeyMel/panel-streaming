"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const MIN_ZOOM = 0.18;
const MAX_ZOOM = 1.8;

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(value.toFixed(3))));
}

function isDesktopZoom() {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches;
}

/**
 * Muestra su contenido (una tabla ancha) igual que en computadora.
 * En celular se ve completo "de lejos" y se puede acercar con los botones o pellizcando,
 * igual que la pantalla de Clientes. En computadora no cambia nada.
 */
export function ZoomSheet({ width = 1050, children }: { width?: number; children: ReactNode }) {
  const [zoom, setZoom] = useState(0.3);
  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(zoom);
  const pinchRef = useRef<{ dist: number; zoom: number } | null>(null);
  const userAdjustedZoom = useRef(false);
  zoomRef.current = zoom;

  function fitZoomNow() {
    const viewport = sheetRef.current;
    if (!viewport || isDesktopZoom()) return;
    const measured = contentRef.current?.offsetWidth ?? 0;
    const natural = Math.max(width, measured);
    const next = clampZoom((viewport.clientWidth - 4) / natural);
    viewport.scrollLeft = 0;
    setZoom(next);
  }

  function changeZoom(next: number) {
    userAdjustedZoom.current = true;
    setZoom(clampZoom(next));
  }

  useEffect(() => {
    const node = sheetRef.current;
    if (!node) return;

    const distance = (event: TouchEvent) => {
      const [a, b] = [event.touches[0], event.touches[1]];
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    };
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      if (isDesktopZoom()) return;
      event.preventDefault();
      changeZoom(zoomRef.current + (event.deltaY > 0 ? -0.08 : 0.08));
    };
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        pinchRef.current = { dist: distance(event), zoom: zoomRef.current };
      }
    };
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 2 || !pinchRef.current) return;
      event.preventDefault();
      changeZoom(pinchRef.current.zoom * (distance(event) / pinchRef.current.dist));
    };
    const onTouchEnd = () => {
      pinchRef.current = null;
    };
    const onResize = () => {
      if (!userAdjustedZoom.current) fitZoomNow();
    };

    const observer = new ResizeObserver(onResize);
    observer.observe(node);
    onResize();

    node.addEventListener("wheel", onWheel, { passive: false });
    node.addEventListener("touchstart", onTouchStart, { passive: true });
    node.addEventListener("touchmove", onTouchMove, { passive: false });
    node.addEventListener("touchend", onTouchEnd);
    node.addEventListener("touchcancel", onTouchEnd);
    return () => {
      observer.disconnect();
      node.removeEventListener("wheel", onWheel);
      node.removeEventListener("touchstart", onTouchStart);
      node.removeEventListener("touchmove", onTouchMove);
      node.removeEventListener("touchend", onTouchEnd);
      node.removeEventListener("touchcancel", onTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width]);

  const button =
    "rounded-md border border-[#253047] bg-[#111827] px-2.5 py-1.5 text-[12px] font-semibold text-[#E2E8F0]";

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2 lg:hidden">
        <p className="text-[11px] text-[#94A3B8]">Pellizca o usa los botones para acercar.</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={button}
            onClick={() => {
              userAdjustedZoom.current = false;
              fitZoomNow();
            }}
          >
            Ver todo
          </button>
          <button type="button" className={button} aria-label="Alejar" onClick={() => changeZoom(zoom - 0.08)}>
            −
          </button>
          <span className="min-w-10 text-center text-[11px] text-[#94A3B8]">{Math.round(zoom * 100)}%</span>
          <button type="button" className={button} aria-label="Acercar" onClick={() => changeZoom(zoom + 0.08)}>
            +
          </button>
        </div>
      </div>
      <div ref={sheetRef} className="overflow-auto overscroll-contain">
        <div
          className="clientes-sheet-zoom origin-top-left max-lg:w-max"
          style={{ ["--sheet-zoom" as string]: String(zoom), ["--sheet-width" as string]: `${width}px` }}
        >
          <div ref={contentRef} className="max-lg:min-w-[var(--sheet-width)]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
