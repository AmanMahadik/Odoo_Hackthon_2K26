'use client';

import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Fuel, TrendingUp, TrendingDown, Minus, Bell, Sparkles } from 'lucide-react';
import { economicService } from '@/lib/mockServices';
import { FuelPriceData, FuelForecast } from '@/lib/mockData';

export default function FuelPriceWidget() {
  const [fuelData, setFuelData] = useState<FuelPriceData | null>(null);
  const [forecast, setForecast] = useState<FuelForecast[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertSet, setAlertSet] = useState(false);

  useEffect(() => {
    async function load() {
      const [price, fc] = await Promise.all([
        economicService.getFuelPrice(),
        economicService.getFuelForecast(),
      ]);
      setFuelData(price);
      setForecast(fc);
      setLoading(false);
    }
    load();
  }, []);

  const trendIcon = () => {
    if (!fuelData) return null;
    if (fuelData.trend === 'rising')
      return <TrendingUp className="w-5 h-5 text-red-400" />;
    if (fuelData.trend === 'falling')
      return <TrendingDown className="w-5 h-5 text-emerald-400" />;
    return <Minus className="w-5 h-5 text-slate-400" />;
  };

  const trendColor =
    fuelData?.trend === 'rising'
      ? 'text-red-400'
      : fuelData?.trend === 'falling'
        ? 'text-emerald-400'
        : 'text-slate-400';

  const trendBg =
    fuelData?.trend === 'rising'
      ? 'bg-red-500/15 border-red-500/30'
      : fuelData?.trend === 'falling'
        ? 'bg-emerald-500/15 border-emerald-500/30'
        : 'bg-slate-500/15 border-slate-500/30';

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-xl p-6 animate-pulse">
        <div className="h-6 bg-slate-700 rounded w-1/2 mb-4" />
        <div className="h-20 bg-slate-700 rounded mb-4" />
        <div className="h-48 bg-slate-700 rounded" />
      </div>
    );
  }

  // Format forecast dates for chart display
  const chartData = forecast.map((f) => ({
    ...f,
    label: f.date.slice(5), // MM-DD
  }));

  return (
    <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 backdrop-blur-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
            <Fuel className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-400">Fuel Price (Diesel)</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-2xl font-bold text-slate-100">
                ${fuelData?.price.toFixed(2)}
              </span>
              <span className="text-xs text-slate-500">/{fuelData?.currency}/L</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {trendIcon()}
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${trendBg} ${trendColor}`}
          >
            {fuelData?.trend === 'rising' ? '+' : fuelData?.trend === 'falling' ? '-' : ''}
            {fuelData?.changePercent}%
          </span>
        </div>
      </div>

      {/* 14-Day Forecast Chart */}
      <div className="mb-4">
        <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-medium">
          14-Day Price Forecast
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="label"
              stroke="#475569"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={{ stroke: '#334155' }}
            />
            <YAxis
              stroke="#475569"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              domain={['dataMin - 0.02', 'dataMax + 0.02']}
              tickFormatter={(v: number) => `$${v.toFixed(2)}`}
              axisLine={{ stroke: '#334155' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '12px',
                color: '#f1f5f9',
              }}
              labelStyle={{ color: '#94a3b8' }}
              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Price']}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke="#f59e0b"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#f59e0b', stroke: '#0B0F19', strokeWidth: 2 }}
              activeDot={{ r: 5, fill: '#f59e0b', stroke: '#fbbf24', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* AI Suggestion */}
      <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-3 mb-4">
        <div className="flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-300 leading-relaxed">
            <span className="font-semibold text-blue-200">AI Insight:</span> Fuel prices
            are projected to rise 5-8% over the next 2 weeks. Consider locking in a fuel
            contract now to save an estimated{' '}
            <span className="font-bold text-blue-200">$2,400/month</span>. Optimal contract
            window closes in 3 days.
          </p>
        </div>
      </div>

      {/* Set Alert Button */}
      <button
        onClick={() => setAlertSet(!alertSet)}
        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
          alertSet
            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
            : 'bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 hover:border-slate-600'
        }`}
      >
        <Bell className="w-4 h-4" />
        {alertSet ? 'Alert Active — Notify at $1.55/L' : 'Set Price Alert'}
      </button>
    </div>
  );
}
