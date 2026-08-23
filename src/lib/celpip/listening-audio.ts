// WHERE A LISTENING CLIP COMES FROM.
//
// Standing network rule (schema.prisma, CelpipItem.audioUrl): audio is rendered
// ONCE to a stored URL, and a learner request must never trigger a synthesiser.
// Until every active Listening item has an audioUrl, /api/celpip/audio/[attemptId]
// is the fallback and must stay.
//
// This module is the single place that decides between the two, and it is written
// so that "the stored path does not call the route" is STRUCTURAL rather than a
// promise: in the stored branch the fetch implementation is never resolved, never
// mind called. A test cannot observe a call that the code has no path to make.
//
// It takes its effects by injection (fetchImpl / createObjectUrl) so the real code
// path — not a re-implementation of it — can be exercised off the browser.

export type AudioSourceKind = "stored" | "route";

export type AudioSource = {
  kind: AudioSourceKind;
  /** Stored: the rendered clip's URL. Route: the fallback endpoint to fetch. */
  url: string;
};

/** The route that synthesises on demand. Deleted once coverage is 48/48. */
export function fallbackAudioRoute(attemptId: string): string {
  return `/api/celpip/audio/${attemptId}`;
}

/**
 * Prefer the stored clip; fall back to the paid route only when there is none.
 * A blank or whitespace-only audioUrl counts as "none" — an empty string is not a
 * clip, and treating it as one would hand the player a src it cannot load.
 */
export function resolveAudioSource(
  attemptId: string,
  audioUrl: string | null | undefined,
): AudioSource {
  const stored = typeof audioUrl === "string" ? audioUrl.trim() : "";
  if (stored.length > 0) return { kind: "stored", url: stored };
  return { kind: "route", url: fallbackAudioRoute(attemptId) };
}

export type LoadedAudio = {
  /** Hand this to the player. */
  playbackUrl: string;
  /** Non-null only when we created an object URL that the caller must revoke. */
  objectUrl: string | null;
  kind: AudioSourceKind;
};

/**
 * Resolve a clip to something playable.
 *
 *   stored  → return the URL as-is. No fetch, no blob, no route call, no synthesiser.
 *   none    → today's behaviour exactly: GET the route, read the blob, object-URL it.
 */
export async function loadListeningAudio(args: {
  attemptId: string;
  audioUrl: string | null | undefined;
  fetchImpl?: (input: string) => Promise<{ ok: boolean; blob: () => Promise<Blob> }>;
  createObjectUrl?: (blob: Blob) => string;
}): Promise<LoadedAudio> {
  const source = resolveAudioSource(args.attemptId, args.audioUrl);

  if (source.kind === "stored") {
    // Return BEFORE touching fetchImpl. There is no path from here to the route.
    return { playbackUrl: source.url, objectUrl: null, kind: "stored" };
  }

  const doFetch =
    args.fetchImpl ??
    ((input: string) => fetch(input) as unknown as Promise<{ ok: boolean; blob: () => Promise<Blob> }>);
  const toObjectUrl = args.createObjectUrl ?? ((blob: Blob) => URL.createObjectURL(blob));

  const res = await doFetch(source.url);
  if (!res.ok) throw new Error("audio");
  const objectUrl = toObjectUrl(await res.blob());
  return { playbackUrl: objectUrl, objectUrl, kind: "route" };
}
