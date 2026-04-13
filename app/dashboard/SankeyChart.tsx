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
  if (categories.length === 0 || totalSpending === 0) return null;

  const nodes = [
    { name: monthLabel },
    ...categories.map(c => ({ name: c.name })),
  ];

  const links = categories.map((c, i) => ({
    source: 0,
    target: i + 1,
    value: c.total,
  }));

  const colors = categories.map(c => c.color);

  return (
    <ResponsiveContainer width="100%" height={280}>
      <Sankey
        data={{ nodes, links }}
        nodePadding={12}
        nodeWidth={16}
        margin={{ top: 8, right: 180, bottom: 8, left: 8 }}
        node={({ x, y, width, height, index }: { x: number; y: number; width: number; height: number; index: number }) => (
          <Rectangle
            x={x} y={y} width={width} height={height}
            fill={index === 0 ? "#18181b" : (colors[index - 1] ?? "#6366f1")}
            fillOpacity={0.85}
            radius={3}
          />
        )}
        link={{ stroke: "#e4e4e7", strokeOpacity: 0.8 }}
      >
        <Tooltip
          formatter={(value) =>
            typeof value === "number"
              ? value.toLocaleString("de-DE", { style: "currency", currency: "EUR" })
              : String(value)
          }
          contentStyle={{
            background: "#ffffff",
            border: "1px solid #e4e4e7",
            borderRadius: "6px",
            color: "#18181b",
            fontSize: "0.8rem",
            boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
          }}
        />
      </Sankey>
    </ResponsiveContainer>
  );
}
