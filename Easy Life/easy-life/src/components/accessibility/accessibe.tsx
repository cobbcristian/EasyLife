"use client";

import Script from "next/script";

export function AccessiBe() {
  const key = process.env.NEXT_PUBLIC_ACCESSIBE_KEY;
  if (!key) return null;

  return (
    <Script
      id="accessibe"
      src="https://acsbapp.com/apps/app/dist/js/app.js"
      strategy="afterInteractive"
      onLoad={() => {
        const w = window as Window & { acsbJS?: { init: () => void } };
        w.acsbJS?.init();
      }}
      data-acsb-js="true"
      data-acsb-key={key}
    />
  );
}
