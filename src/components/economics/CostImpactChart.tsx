'use client';

import React from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface FinancialRow {
  month: string;
  revenue: number;
  fuel: number;
  maintenance: number;
  labor: number;
  other: number;
}

interface CostImpactChartProps {
  data: FinancialRow[];
}

export default function CostImpactChart({ data }: CostImpactChartProps) {
  const formatCurrency = (value: number) => `$${(value / 1000).toFixed(0)}k`;

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">Cost Breakdown vs Revenue</h3>
          <p className="text-sm text-slate-400 mt-0.5">
            12-month stacked cost analysis with revenue overlay
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#3b82f6]" />
            <span className="text-xs text-slate-400">Fuel</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#f59e0b]" />
            <span className="text-xs text-slate-400">Maintenance</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#8b5cf6]" />
            <span className="text-xs text-slate-400">Labor</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#64748b]" />
            <span className="text-xs text-slate-400">Other</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-0.5 bg-[#10b981]" />
            <span className="text-xs text-slate-400">Revenue</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={350}>
        <ComposedChart data={data} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="month"
            stroke="#475569"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            axisLine={{ stroke: '#334155' }}
          />
          <YAxis
            stroke="#475569"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickFormatter={formatCurrency}
            axisLine={{ stroke: '#334155' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '12px',
              color: '#f1f5f9',
            }}
            labelStyle={{ color: '#94a3b8', fontWeight: 600 }}
            formatter={(value: number, name: string) => [
              `$${value.toLocaleString()}`,
              name.charAt(0).toUpperCase() + name.slice(1),
            ]}
          />
          <Legend
            wrapperStyle={{ paddingTop: '12px' }}
            iconType="circle"
            iconSize={8}
            formatter={(value: string) => (
              <span className="text-xs text-slate-400">
                {value.charAt(0).toUpperCase() + value.slice(1)}
              </span>
            )}
          />
          <Bar dataKey="fuel" stackId="costs" fill="#3b82f6" radius={[0, 0, 0, 0]} />
          <Bar dataKey="maintenance" stackId="costs" fill="#f59e0b" radius={[0, 0, 0, 0]} />
          <Bar dataKey="labor" stackId="costs" fill="#8b5cf6" radius={[0, 0, 0, 0]} />
          <Bar
            dataKey="other"
            stackId="costs"
            fill="#64748b"
            radius={[4, 4, 0, 0]}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#10b981"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#10b981', stroke: '#0B0F19', strokeWidth: 2 }}
            activeDot={{ r: 6, fill: '#10b981', stroke: '#34d399', strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
