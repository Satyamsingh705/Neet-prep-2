"use client";

import { useEffect, useState } from "react";

type LiveCountdownProps = {
  targetDate: string;
  onEnd?: () => void;
  title?: string;
};

export function LiveCountdown({ targetDate, onEnd, title }: LiveCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    const target = new Date(targetDate).getTime();

    const update = () => {
      const now = new Date().getTime();
      const distance = target - now;

      if (distance < 0) {
        setTimeLeft(null);
        onEnd?.();
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      });
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate, onEnd]);

  if (!timeLeft) return null;

  return (
    <div className="flex flex-col items-center">
      {title && <p className="mb-8 text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400">{title}</p>}
      <div className="flex gap-4 sm:gap-10">
        <TimeUnit value={timeLeft.days} label="Days" />
        <TimeUnit value={timeLeft.hours} label="Hours" />
        <TimeUnit value={timeLeft.minutes} label="Mins" />
        <TimeUnit value={timeLeft.seconds} label="Secs" />
      </div>
    </div>
  );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-[20px] bg-white/5 border border-white/10 text-3xl font-black text-white shadow-xl backdrop-blur-md sm:h-24 sm:w-24 sm:text-5xl tabular-nums tracking-tighter">
        {String(value).padStart(2, "0")}
      </div>
      <span className="mt-4 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">{label}</span>
    </div>
  );
}
