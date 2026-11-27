"use client";
// RR-418 · the full test's countdown (the official window). At zero it tells the open part to submit what has been answered
// (event "celpip:time-up"), then ends the test on the server: every part not reached is marked with no answers.
import { useEffect, useRef, useState } from "react";

export const TIME_UP_EVENT = "celpip:time-up";

export function FullTestTimer({ secondsLeft, finish }: { secondsLeft: number; finish: () => Promise<void> }) {
  const [left, setLeft] = useState(secondsLeft);
  const fired = useRef(false);
  useEffect(() => {
    const t = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (left > 0 || fired.current) return;
    fired.current = true;
    window.dispatchEvent(new Event(TIME_UP_EVENT));
    const t = setTimeout(() => { void finish(); }, 2500);
    return () => clearTimeout(t);
  }, [left, finish]);
  const mm = String(Math.floor(left / 60)).padStart(2, "0"), ss = String(left % 60).padStart(2, "0");
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${left <= 300 ? "bg-almi-coral/20 text-almi-coral-text" : "bg-almi-bg-peach text-almi-text-muted"}`} data-full-test-timer={left}>
      {left > 0 ? `Time left ${mm}:${ss}` : "Time is up"}
    </span>
  );
}
