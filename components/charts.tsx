'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface ActivityChartProps {
  data: Array<{ name: string; listings: number; matches: number }>;
}

export function ActivityChart({ data }: ActivityChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="name" stroke="var(--muted)" />
        <YAxis stroke="var(--muted)" />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: '8px'
          }}
        />
        <Bar dataKey="listings" fill="var(--accent)" name="Listings" />
        <Bar dataKey="matches" fill="#3b82f6" name="Matches" />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface StatusChartProps {
  data: Array<{ name: string; value: number; color: string }>;
}

export function StatusChart({ data }: StatusChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={5}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: '8px'
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}