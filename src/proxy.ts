import { NextResponse } from "next/server";

// Cost fix (Oct 2026, owner ruling 17 Oct): the old programmatic hub pages were
// deleted, with no redirects. They rendered on demand for every URL a bot asked
// for, and each render was an ISR write. Every URL below /celpip/ now answers
// 410 Gone here, with no rendering, ISR or database:
//   /celpip/<hub>  /celpip/occupation/*  /celpip/pathway/*  /celpip/province/*
// The /celpip index page itself is NOT matched and stays. Nothing else kept
// lives under /celpip/. New pages are built only by AlmiVisibility.
//
// Next 16 "proxy" convention (the renamed middleware).
export function proxy() {
  return new NextResponse("410 Gone — this page has been removed.", {
    status: 410,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=86400",
      "x-robots-tag": "noindex",
    },
  });
}

export const config = {
  matcher: ["/celpip/:path+"],
};
