"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/format";

export function HomeCountUp({
  value,
  money = false,
  className = "",
}: {
  value: number;
  money?: boolean;
  className?: string;
}) {
  const [current, setCurrent] = useState(value);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || value === 0) {
      setCurrent(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const duration = 900;
    function tick(now: number) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      setCurrent(value * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    }
    setCurrent(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  const text = money ? formatCurrency(current) : String(Math.round(current));
  return <span className={className}>{text}</span>;
}
