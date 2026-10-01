"use client";

import { DISNEY_CODE_WARNING } from "@/lib/disney-code-policy";

/** Aviso obligatorio antes de ver un código de Disney o la pantalla de espera. */
export function DisneyCodeWarning({ onAccept }: { onAccept: () => void }) {
  return (
    <div className="mt-3 rounded-xl border border-red-500 bg-red-950 px-3 py-3">
      <p className="text-sm font-semibold leading-snug text-red-50">{DISNEY_CODE_WARNING}</p>
      <button
        type="button"
        onClick={onAccept}
        className="mt-3 inline-flex h-9 items-center rounded-lg bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-500"
      >
        Entendido
      </button>
    </div>
  );
}
