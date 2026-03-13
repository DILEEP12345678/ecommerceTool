'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function DailyRevenueChart({ data }: { data: { date: string; revenuePence: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} barSize={14} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          interval={1}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
          domain={[0, 'auto']}
          tickFormatter={(v) => `£${(v / 100).toFixed(0)}`}
        />
        <Tooltip
          contentStyle={{
            background: 'rgba(255,255,255,0.95)',
            border: '1px solid #f3f4f6',
            borderRadius: 12,
            fontSize: 12,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }}
          cursor={{ fill: 'rgba(99,102,241,0.06)' }}
          formatter={(v: any) => [`£${(v / 100).toFixed(2)}`, 'Revenue']}
        />
        <Bar dataKey="revenuePence" fill="#6366f1" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
