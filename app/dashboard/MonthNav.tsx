"use client";

import { useRouter } from "next/navigation";

interface Props {
  year: number;
  month: number;
}

const MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

export default function MonthNav({ year, month }: Props) {
  const router = useRouter();

  const navigate = (offset: number) => {
    let m = month + offset;
    let y = year;
    if (m > 12) { m = 1; y++; }
    if (m < 1)  { m = 12; y--; }
    router.push(`/dashboard?year=${y}&month=${m}`);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
      <button onClick={() => navigate(-1)} style={btnStyle}>‹</button>
      <span style={{ fontWeight: 600, fontSize: "1.1rem", color: "#e2e8f0", minWidth: "160px", textAlign: "center" }}>
        {MONTHS[month - 1]} {year}
      </span>
      <button onClick={() => navigate(1)} style={btnStyle}>›</button>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: "#1e1e2e",
  border: "1px solid #2d2d44",
  color: "#94a3b8",
  width: "36px",
  height: "36px",
  borderRadius: "8px",
  cursor: "pointer",
  fontSize: "1.2rem",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.15s",
};
