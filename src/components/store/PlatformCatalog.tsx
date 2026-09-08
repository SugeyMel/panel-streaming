"use client";

import { useMemo, useState } from "react";
import { SearchBar } from "@/components/ui/SearchBar";
import { PlatformCard } from "@/components/store/PlatformCard";
import { platforms as mockPlatforms, products } from "@/data/mock";
import type { Platform } from "@/lib/types";

export function PlatformCatalog({ platforms = mockPlatforms }: { platforms?: Platform[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return platforms;
    return platforms.filter((platform) =>
      `${platform.name} ${platform.tagline}`.toLowerCase().includes(value),
    );
  }, [platforms, query]);

  return (
    <section id="plataformas" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Plataformas disponibles</h2>
          <p className="mt-2 text-sm text-slate-400">
            Explora el catálogo y elige el servicio que deseas solicitar.
          </p>
        </div>
        <SearchBar
          value={query}
          onChange={setQuery}
          placeholder="Buscar plataformas"
        />
      </div>
      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-[#253047] bg-[#111827] px-5 py-10 text-center text-sm text-[#94A3B8]">
          No encontramos plataformas con ese nombre.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2 md:grid-cols-4 md:gap-3 xl:grid-cols-6">
          {filtered.map((platform) => {
            const prices = products
              .filter((product) => product.platformId === platform.id)
              .map((product) => product.salePrice);
            return (
              <PlatformCard
                key={platform.id}
                platform={platform}
                priceFrom={prices.length ? Math.min(...prices) : 18}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
