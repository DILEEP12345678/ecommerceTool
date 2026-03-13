'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

export default function TopProductsPie({ data }: { data: { name: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="42%"
          outerRadius={72}
          paddingAngle={2}
          dataKey="count"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => (
            <span style={{ fontSize: 11, color: '#6b7280' }}>
              {value.length > 24 ? value.slice(0, 23) + '…' : value}
            </span>
          )}
        />
        <Tooltip
          contentStyle={{
            background: 'rgba(255,255,255,0.95)',
            border: '1px solid #f3f4f6',
            borderRadius: 12,
            fontSize: 12,
          }}
          formatter={(v: any, name: any) => [`${v} units`, name]}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
