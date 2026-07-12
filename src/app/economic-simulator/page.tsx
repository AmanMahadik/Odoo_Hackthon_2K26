'use client';

import React, { useState, useEffect } from 'react';
import { economicService } from '@/lib/mockServices';
import { mockMonthlyFinancials } from '@/lib/mockData';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Line,
  ComposedChart,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  Zap,
  Sliders,
  Fuel,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useRole } from '@/lib/roleContext';

const chartConfig = {
  revenue: { label: 'Revenue', color: '#fbbf24' },
  fuel: { label: 'Fuel', color: '#f87171' },
  maintenance: { label: 'Maintenance', color: '#60a5fa' },
  labor: { label: 'Labor', color: '#a78bfa' },
  other: { label: 'Other', color: '#94a3b8' },
};

export default function EconomicSimulatorPage() {
  const { resolvedTheme } = useTheme();
  const { formatCurrency } = useRole();
  const isDark = resolvedTheme === 'dark';
  const chartTick = isDark ? '#e2e8f0' : '#334155';
  const chartGrid = isDark ? '#334155' : '#e2e8f0';

  const [fuelPrice, setFuelPrice] = useState<any>(null);
  const [fuelForecast, setFuelForecast] = useState<any[]>([]);
  const [fuelChange, setFuelChange] = useState(0);
  const [maintChange, setMaintChange] = useState(0);
  const [fleetChange, setFleetChange] = useState(0);
  const [demandChange, setDemandChange] = useState(0);
  const [simResult, setSimResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [fPrice, fForecast] = await Promise.all([
        economicService.getFuelPrice(),
        economicService.getFuelForecast(),
      ]);
      setFuelPrice(fPrice);
      setFuelForecast(fForecast);
      setLoading(false);
    }
    load();
  }, []);

  const runSim = async () => {
    const res = await economicService.simulateScenario({
      fuelPriceChange: fuelChange,
      maintenanceCostChange: maintChange,
      fleetSizeChange: fleetChange,
      demandChange,
    });
    setSimResult(res);
  };

  useEffect(() => {
    const t = setTimeout(runSim, 300);
    return () => clearTimeout(t);
  }, [fuelChange, maintChange, fleetChange, demandChange]);

  const getTrendIcon = (trend: string) => {
    if (trend === 'rising') return <TrendingUp className="h-3.5 w-3.5 text-destructive" />;
    if (trend === 'falling') return <TrendingDown className="h-3.5 w-3.5 text-emerald-500" />;
    return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  return (
    <div className="space-y-5 font-normal">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl tracking-tight font-medium">Economics scenario lab</h2>
          <p className="text-sm text-muted-foreground">
            Model fuel, labor, and demand swings against operating cost
          </p>
        </div>
        <Button variant="outline" size="sm" className="font-normal gap-1.5 shrink-0">
          <Download className="h-4 w-4" /> Export scenario
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-5 text-center space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
              Global fuel index
            </span>
            {fuelPrice ? (
              <>
                <span className="text-2xl tabular-nums font-medium block">
                  {formatCurrency(Number(fuelPrice.price))}
                  <span className="text-sm text-muted-foreground font-normal"> / L</span>
                </span>
                <Badge
                  variant="outline"
                  className={`gap-1 font-normal ${
                    fuelPrice.trend === 'rising'
                      ? 'text-destructive border-destructive/40'
                      : 'text-emerald-500 border-emerald-500/40'
                  }`}
                >
                  {getTrendIcon(fuelPrice.trend)} {fuelPrice.changePercent}%
                </Badge>
              </>
            ) : (
              <div className="h-10 animate-pulse bg-muted rounded-md" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
              Projected monthly OpEx
            </span>
            {simResult ? (
              <>
                <span className="text-2xl tabular-nums font-medium block">
                  {formatCurrency(simResult.simulatedMonthlyCost)}
                </span>
                <Badge
                  variant={simResult.changePercent > 0 ? 'destructive' : 'secondary'}
                  className="font-normal"
                >
                  {simResult.changePercent > 0 ? '+' : ''}
                  {simResult.changePercent}% vs base
                </Badge>
              </>
            ) : (
              <div className="h-10 animate-pulse bg-muted rounded-md" />
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 text-center space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">
              Net impact with AI
            </span>
            {simResult ? (
              <>
                <span
                  className={`text-2xl tabular-nums font-medium block ${
                    simResult.netImpactWithAI > 0 ? 'text-amber-500' : 'text-emerald-500'
                  }`}
                >
                  {simResult.netImpactWithAI > 0 ? '+' : '−'}
                  {formatCurrency(Math.abs(simResult.netImpactWithAI))}
                </span>
                <span className="text-[11px] text-muted-foreground">
                  After recommended mitigations
                </span>
              </>
            ) : (
              <div className="h-10 animate-pulse bg-muted rounded-md" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="space-y-3 lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Fuel className="h-4 w-4" /> Fuel price forecast
              </CardTitle>
              <CardDescription className="font-normal">
                Forward curve used in scenario baselining
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[140px] animate-pulse bg-muted rounded-lg" />
              ) : (
                <>
                  <div className="h-[140px] w-full">
                    <ChartContainer
                      config={{ price: { label: 'Price', color: '#fbbf24' } }}
                      className="h-full w-full aspect-auto"
                    >
                      <AreaChart data={fuelForecast} margin={{ left: 0, right: 4, top: 4, bottom: 0 }}>
                        <defs>
                          <linearGradient id="fillPriceEco" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area
                          dataKey="price"
                          type="monotone"
                          stroke="#fbbf24"
                          fill="url(#fillPriceEco)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ChartContainer>
                  </div>
                  <p className="mt-3 text-[11px] text-muted-foreground leading-snug flex items-start gap-2">
                    <Zap className="h-3.5 w-3.5 shrink-0 mt-0.5 text-foreground" />
                    Consider locking fuel contracts this week ahead of a projected near-term hike.
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">OpEx vs revenue trend</CardTitle>
              <CardDescription className="font-normal">
                Monthly stack of costs against revenue line
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[240px] w-full">
                <ChartContainer config={chartConfig} className="h-full w-full aspect-auto">
                  <ComposedChart
                    data={mockMonthlyFinancials}
                    margin={{ left: -8, right: 8, top: 4, bottom: 0 }}
                  >
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke={chartGrid} />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(v) => String(v).slice(0, 3)}
                      tick={{ fill: chartTick, fontSize: 10 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => formatCurrency(v).replace(/\.00$/, '')}
                      tick={{ fill: chartTick, fontSize: 10 }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="fuel" stackId="a" fill="#f87171" radius={[0, 0, 2, 2]} />
                    <Bar dataKey="maintenance" stackId="a" fill="#60a5fa" />
                    <Bar dataKey="labor" stackId="a" fill="#a78bfa" />
                    <Bar dataKey="other" stackId="a" fill="#94a3b8" radius={[2, 2, 0, 0]} />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#fbbf24"
                      strokeWidth={2}
                      dot={{ r: 3, fill: '#fbbf24', strokeWidth: 0 }}
                    />
                    <ChartLegend content={<ChartLegendContent />} className="pt-2 text-xs" />
                  </ComposedChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Sliders className="h-4 w-4" /> Scenario parameters
            </CardTitle>
            <CardDescription className="font-normal">
              Adjust macro factors to project operating cost impact
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fuel price change</span>
                  <span className="tabular-nums">
                    {fuelChange > 0 ? `+${fuelChange}%` : `${fuelChange}%`}
                  </span>
                </div>
                <Slider
                  value={[fuelChange]}
                  min={-50}
                  max={50}
                  step={1}
                  onValueChange={(v) => setFuelChange(Array.isArray(v) ? v[0] : v)}
                />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Maintenance costs</span>
                  <span className="tabular-nums">
                    {maintChange > 0 ? `+${maintChange}%` : `${maintChange}%`}
                  </span>
                </div>
                <Slider
                  value={[maintChange]}
                  min={-30}
                  max={50}
                  step={1}
                  onValueChange={(v) => setMaintChange(Array.isArray(v) ? v[0] : v)}
                />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fleet size change</span>
                  <span className="tabular-nums">
                    {fleetChange > 0 ? `+${fleetChange}%` : `${fleetChange}%`}
                  </span>
                </div>
                <Slider
                  value={[fleetChange]}
                  min={-20}
                  max={30}
                  step={1}
                  onValueChange={(v) => setFleetChange(Array.isArray(v) ? v[0] : v)}
                />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Demand / trip volume</span>
                  <span className="tabular-nums">
                    {demandChange > 0 ? `+${demandChange}%` : `${demandChange}%`}
                  </span>
                </div>
                <Slider
                  value={[demandChange]}
                  min={-30}
                  max={30}
                  step={1}
                  onValueChange={(v) => setDemandChange(Array.isArray(v) ? v[0] : v)}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full font-normal"
                onClick={() => {
                  setFuelChange(0);
                  setMaintChange(0);
                  setFleetChange(0);
                  setDemandChange(0);
                }}
              >
                Reset defaults
              </Button>
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-5">
              {simResult ? (
                <>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-2">
                      Base monthly cost
                    </span>
                    <span className="text-sm text-muted-foreground tabular-nums">
                      {formatCurrency(simResult.currentMonthlyCost)}
                    </span>
                    <div className="mt-3 flex items-end gap-2">
                      <span className="text-2xl font-medium tabular-nums tracking-tight">
                        {formatCurrency(simResult.simulatedMonthlyCost)}
                      </span>
                      <Badge
                        variant={simResult.changePercent > 0 ? 'destructive' : 'secondary'}
                        className="mb-0.5 font-normal"
                      >
                        {simResult.changePercent > 0 ? '+' : ''}
                        {simResult.changePercent}%
                      </Badge>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4 space-y-3">
                    <h3 className="text-sm font-medium flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5" /> AI mitigations
                    </h3>
                    <div className="space-y-2">
                      {simResult.recommendations.map((r: any, i: number) => (
                        <div
                          key={i}
                          className="flex justify-between items-start gap-3 text-sm rounded-lg border border-border bg-background p-2.5"
                        >
                          <div className="min-w-0">
                            <span className="font-medium block text-sm">{r.action}</span>
                            <span className="text-[11px] text-muted-foreground leading-snug">
                              {r.impact}
                            </span>
                          </div>
                          <span className="tabular-nums text-emerald-500 font-medium shrink-0 text-sm">
                            −{formatCurrency(r.savings)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-border bg-background p-3 flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Net impact with AI</span>
                    <span
                      className={`tabular-nums font-medium ${
                        simResult.netImpactWithAI > 0 ? 'text-amber-500' : 'text-emerald-500'
                      }`}
                    >
                      {simResult.netImpactWithAI > 0 ? '+' : '−'}
                      {formatCurrency(Math.abs(simResult.netImpactWithAI))}
                    </span>
                  </div>

                  <Button size="sm" className="w-full font-normal gap-1.5">
                    <Download className="h-4 w-4" /> Export scenario PDF
                  </Button>
                </>
              ) : (
                <div className="h-full min-h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                  Calculating model…
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
