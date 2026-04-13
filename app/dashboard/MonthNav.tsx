"use client";

import { useRouter } from "next/navigation";

const MONTHS = ["Januar","Februar","März","April","Mai","Juni","Juli","August","September","Oktober","November","Dezember"];

export default function MonthNav({ year, month }: { year: number; month: number }) {
  const router = useRouter();

  const navigate = (offset: number) => {
    let m = month + offset;
    let y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1)  { m = 12; y--; }
    router.push(`/dashboard?year=${y}&month=${m}`);
  };

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={() => navigate(-1)}
        className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors text-base"
      >
        ‹
      </button>
      <span className="text-sm font-medium text-zinc-700 w-36 text-center">
        {MONTHS[month - 1]} {year}
      </span>
      <button
        onClick={() => navigate(1)}
        className="w-7 h-7 flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors text-base"
      >
        ›
      </button>
    </div>
  );
}
