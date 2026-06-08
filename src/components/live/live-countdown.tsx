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
      {title && <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-[#b26d39]">{title}</p>}
      <div className="flex gap-4 sm:gap-6">
        <TimeUnit value={timeLeft.days} label="Days" />
        <TimeUnit value={timeLeft.hours} label="Hours" />
        <TimeUnit value={timeLeft.minutes} label="Minutes" />
        <TimeUnit value={timeLeft.seconds} label="Seconds" />
      </div>
    </div>
  );
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white text-2xl font-bold text-[#2f241c] shadow-sm ring-1 ring-inset ring-[#e6d9cb] sm:h-20 sm:w-20 sm:text-4xl">
        {String(value).padStart(2, "0")}
      </div>
      <span className="mt-2 text-[0.65rem] font-bold uppercase tracking-wider text-[#8a6a52] sm:text-xs">{label}</span>
    </div>
  );
}
