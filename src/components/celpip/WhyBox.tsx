// RR-418 · the explanation of one Listening or Reading answer, shown after submit under the result, labelled "Why". A question without an
// explanation shows nothing at all — not an empty box.
export function WhyBox({ text }: { text: string | null | undefined }) {
  const t = typeof text === "string" ? text.trim() : "";
  if (!t) return null;
  return (
    <div className="mt-2 ml-6 rounded-lg border border-almi-teal/30 bg-almi-teal/5 px-3 py-2" data-why="">
      <p className="text-xs font-bold uppercase tracking-wider text-almi-teal-text">Why</p>
      <p className="mt-0.5 text-sm text-almi-text">{t}</p>
    </div>
  );
}
