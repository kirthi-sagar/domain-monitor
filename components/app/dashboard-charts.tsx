"use client";

import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, BarChart, Bar, Cell, PieChart, Pie, Legend } from "recharts";

const COLORS = { info: "#4338ca", warning: "#d97706", critical: "#dc2626" } as const;

export function EventsOverTimeChart({ data }: { data: { day: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 5, right: 8, left: -28, bottom: 0 }}>
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#6b7280" }} tickFormatter={(v) => v.slice(5)} />
        <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} allowDecimals={false} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #e5e7eb" }} />
        <Line type="monotone" dataKey="count" stroke="#4338ca" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SeverityPie({ data }: { data: { name: keyof typeof COLORS; value: number }[] }) {
  const filtered = data.filter((d) => d.value > 0);
  if (filtered.length === 0) {
    return <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">No events yet</div>;
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={filtered} dataKey="value" nameKey="name" innerRadius={50} outerRadius={75} paddingAngle={2}>
          {filtered.map((d) => <Cell key={d.name} fill={COLORS[d.name]} />)}
        </Pie>
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function ExpiryBuckets({ data }: { data: { bucket: string; count: number; color: string }[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 8, left: -28, bottom: 0 }}>
        <XAxis dataKey="bucket" tick={{ fontSize: 11, fill: "#6b7280" }} />
        <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} allowDecimals={false} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: "1px solid #e5e7eb" }} />
        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
          {data.map((d) => <Cell key={d.bucket} fill={d.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
