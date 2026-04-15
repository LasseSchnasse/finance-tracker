"use client";

import { useEffect, useState } from "react";
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
  totalIncome: number;
  monthLabel: string;
}

export default function SankeyChart({ categories, totalSpending, totalIncome, monthLabel }: Props) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Sankey-Balancierung: Überschuss-Knoten wenn Einnahmen > Ausgaben
  const totalCategoryExpenses = categories.reduce((sum, c) => sum + c.total, 0);
  const surplus = totalIncome - totalCategoryExpenses;
  const displayCategories: CategoryData[] =
    surplus > 0.01 && totalIncome > 0
      ? [...categories, { name: "Überschuss", total: surplus, color: "#d1d5db", icon: "💰" }]
      : categories;

  const hasExpenses = displayCategories.length > 0 && displayCategories.some(c => c.total > 0);
  const hasIncome   = totalIncome > 0;

  if (!hasExpenses && !hasIncome) return null;

  const nodes: { name: string }[] = [];
  let incomeIdx = -1;
  let monthIdx  = 0;

  if (hasIncome) {
    incomeIdx = nodes.length;
    nodes.push({ name: "Einnahmen" });
  }
  monthIdx = nodes.length;
  nodes.push({ name: isMobile ? monthLabel.split(" ")[0] : monthLabel });

  const categoryStartIdx = nodes.length;
  if (hasExpenses) {
    displayCategories.forEach(c => nodes.push({ name: c.name }));
  }

  const links: { source: number; target: number; value: number }[] = [];
  if (hasIncome)   links.push({ source: incomeIdx, target: monthIdx, value: totalIncome });
  if (hasExpenses) displayCategories.forEach((c, i) => links.push({ source: monthIdx, target: categoryStartIdx + i, value: c.total }));

  const nodeColors: Record<number, string> = {};
  if (hasIncome) nodeColors[incomeIdx] = "#16a34a";
  nodeColors[monthIdx] = "#18181b";
  if (hasExpenses) displayCategories.forEach((c, i) => { nodeColors[categoryStartIdx + i] = c.color; });

  const margin = isMobile
    ? { top: 5, right: 85, bottom: 5, left: hasIncome ? 65 : 5 }
    : { top: 8, right: 180, bottom: 8, left: hasIncome ? 120 : 8 };

  const height = isMobile
    ? (hasIncome && hasExpenses ? 240 : 180)
    : (hasIncome && hasExpenses ? 320 : 240);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <Sankey
        data={{ nodes, links }}
        nodePadding={isMobile ? 8 : 12}
        nodeWidth={isMobile ? 10 : 16}
        margin={margin}
        node={({ x, y, width, height, index }: { x: number; y: number; width: number; height: number; index: number }) => (
          <Rectangle
            x={x} y={y} width={width} height={height}
            fill={nodeColors[index] ?? "#6366f1"}
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
            fontSize: isMobile ? "0.7rem" : "0.8rem",
            boxShadow: "0 1px 6px rgba(0,0,0,0.08)",
          }}
        />
      </Sankey>
    </ResponsiveContainer>
  );
}
