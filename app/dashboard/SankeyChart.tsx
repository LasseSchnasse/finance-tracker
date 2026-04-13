"use client";

import { Sankey, Tooltip, ResponsiveContainer, Rectangle } from "recharts";

interface CategoryData {
  name: string;
  total: number;
  color: string;
  icon: string;
}

interface Props {
  categories: CategoryData[];
  totalSpending: number;
  monthLabel: string;
}

export default function SankeyChart({ categories, totalSpending, monthLabel }: Props) {
  const filtered = categories.filter((c) => c.total > 0);

  if (filtered.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "3rem", color: "#475569" }}>
        Keine Daten für diesen Monat
      </div>
    );
  }

  const nodes = [
    { name: monthLabel },
    ...filtered.map((c) => ({ name: `${c.icon} ${c.name}` })),
  ];

  const links = filtered.map((c, i) => ({
    source: 0,
    target: i + 1,
    value: Math.abs(c.total),
  }));

  const COLORS = filtered.map((c) => c.color);

  return (
    <ResponsiveContainer width="100%" height={320}>
      <Sankey
        data={{ nodes, links }}
        nodePadding={16}
        nodeWidth={20}
        margin={{ top: 10, right: 160, bottom: 10, left: 10 }}
        node={({ x, y, width, height, index }: { x: number; y: number; width: number; height: number; index: number }) => {
          const color = index === 0 ? "#6366f1" : COLORS[index - 1] ?? "#6366f1";
          return (
            <Rectangle
              x={x} y={y} width={width} height={height}
              fill={color} fillOpacity={0.9} radius={4}
            />
          );
        }}
        link={{ stroke: "#6366f1", strokeOpacity: 0.15 }}
      >
        <Tooltip
          formatter={(value) =>
            typeof value === "number"
              ? value.toLocaleString("de-DE", { style: "currency", currency: "EUR" })
              : String(value)
          }
          contentStyle={{
            background: "#13131a",
            border: "1px solid #2d2d44",
            borderRadius: "8px",
            color: "#e2e8f0",
            fontSize: "0.875rem",
          }}
        />
      </Sankey>
    </ResponsiveContainer>
  );
}
