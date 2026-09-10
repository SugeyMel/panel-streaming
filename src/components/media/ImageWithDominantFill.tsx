"use client";

import { useEffect, useState } from "react";

function colorFromImage(image: HTMLImageElement): string | null {
  const canvas = document.createElement("canvas");
  const size = 32;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  try {
    ctx.drawImage(image, 0, 0, size, size);
  } catch {
    return null;
  }
  let data: ImageData;
  try {
    data = ctx.getImageData(0, 0, size, size);
  } catch {
    return null;
  }

  const buckets = new Map<string, { n: number; r: number; g: number; b: number; score: number }>();
  for (let i = 0; i < data.data.length; i += 4) {
    const alpha = data.data[i + 3];
    if (alpha < 180) continue;
    const r = data.data[i];
    const g = data.data[i + 1];
    const b = data.data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    if (luma < 16 || luma > 248) continue;
    const sat = max === 0 ? 0 : (max - min) / max;
    const qr = Math.round(r / 24) * 24;
    const qg = Math.round(g / 24) * 24;
    const qb = Math.round(b / 24) * 24;
    const key = `${qr},${qg},${qb}`;
    const current = buckets.get(key) ?? { n: 0, r: 0, g: 0, b: 0, score: 0 };
    current.n += 1;
    current.r += r;
    current.g += g;
    current.b += b;
    current.score += 0.4 + sat * 1.6;
    buckets.set(key, current);
  }

  let best: { n: number; r: number; g: number; b: number; score: number } | null = null;
  for (const bucket of buckets.values()) {
    if (!best || bucket.score > best.score) best = bucket;
  }
  if (!best || best.n < 4) return null;
  const r = Math.round((best.r / best.n) * 0.88);
  const g = Math.round((best.g / best.n) * 0.88);
  const b = Math.round((best.b / best.n) * 0.88);
  return `rgb(${r}, ${g}, ${b})`;
}

export function ImageWithDominantFill({
  src,
  alt,
  fallback = "#0D1320",
  className = "",
}: {
  src: string;
  alt: string;
  fallback?: string;
  className?: string;
}) {
  const [fill, setFill] = useState(fallback);

  useEffect(() => {
    let cancelled = false;
    const image = new Image();
    if (!src.startsWith("blob:")) image.crossOrigin = "anonymous";
    image.onload = () => {
      if (cancelled) return;
      setFill(colorFromImage(image) || fallback);
    };
    image.onerror = () => {
      if (!cancelled) setFill(fallback);
    };
    image.src = src;
    return () => {
      cancelled = true;
    };
  }, [src, fallback]);

  return (
    <span className={`absolute inset-0 overflow-hidden ${className}`} style={{ backgroundColor: fill }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="absolute inset-0 h-full w-full object-contain object-center" />
    </span>
  );
}
