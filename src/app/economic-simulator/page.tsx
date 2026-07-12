'use client';

import React, { useState, useEffect } from 'react';
import { economicService } from '@/lib/mockServices';
import { mockMonthlyFinancials } from '@/lib/mockData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import { TrendingUp, TrendingDown, Minus, DollarSign, Brain, Download, Zap } from 'lucide-react';

const chartConfig = {
  revenue: { label: "Revenue", color: "hsl(var(--primary))" },
  fuel: { label: "Fuel Cost", color: "hsl(var(--destructive))" },
  maintenance: { label: "Maintenance", color: "hsl(var(--chart-3))" },
  labor: { label: "Labor", color: "hsl(var(--chart-4))" },
  other: { label: "Other", color: "hsl(var(--muted-foreground))" },
};

export default function EconomicSimulatorPage() {
  const [fuelPrice, setFuelPrice] = useState<any>(null);
  const [fuelForecast, setFuelForecast] = useState<any[]>([]);
  
  // Simulator State
  const [fuelChange, setFuelChange] = useState([0]);
  const [maintChange, setMaintChange] = useState([0]);
  const [fleetChange, setFleetChange] = useState([0]);
  const [demandChange, setDemandChange] = useState([0]);
  
  const [simResult, setSimResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [fPrice, fForecast] = await Promise.all([
        economicService.getFuelPrice(),
        economicService.getFuelForecast()
      ]);
      setFuelPrice(fPrice);
      setFuelForecast(fForecast);
      runSim();
      setLoading(false);
    }
    load();
  }, []);

  // Run simulation when sliders change
  const runSim = async () => {
    const res = await economicService.simulateScenario({
      fuelPriceChange: fuelChange[0],
      maintenanceCostChange: maintChange[0],
      fleetSizeChange: fleetChange[0],
      demandChange: demandChange[0]
    });
    setSimResult(res);
  };

  useEffect(() => {
    // Debounce simulation on slider change
    const t = setTimeout(runSim, 300);
    return () => clearTimeout(t);
  }, [fuelChange, maintChange, fleetChange, demandChange]);

  const getTrendIcon = (trend: string) => {
    if (trend === 'rising') return <TrendingUp className="h-4 w-4 text-destructive" />;
    if (trend === 'falling') return <TrendingDown className="h-4 w-4 text-emerald-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-primary" /> Economic Intelligence Center
        </h2>
        <p className="text-sm text-muted-foreground">AI-driven financial modeling and macro-economic impact simulator.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Market Indicators */}
        <div className="space-y-6 lg:col-span-1">
          {/* Fuel Widget */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground uppercase tracking-widest">Global Fuel Index</CardTitle>
            </CardHeader>
            <CardContent>
              {fuelPrice ? (
                <>
                  <div className="flex justify-between items-end mb-6">
                    <div>
                      <span className="text-3xl font-extrabold">${fuelPrice.price}</span>
                      <span className="text-sm text-muted-foreground ml-1">/ L</span>
                    </div>
                    <Badge variant="outline" className={`gap-1 ${fuelPrice.trend === 'rising' ? 'text-destructive border-destructive/50 bg-destructive/10' : 'text-emerald-500 border-emerald-500/50 bg-emerald-500/10'}`}>
                      {getTrendIcon(fuelPrice.trend)} {fuelPrice.changePercent}%
                    </Badge>
                  </div>
                  
                  <div className="h-[120px]">
                    <ChartContainer config={{ price: { label: "Forecast Price", color: "hsl(var(--destructive))" } }}>
                      <AreaChart data={fuelForecast}>
                        <defs>
                          <linearGradient id="fillPrice" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-price)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="var(--color-price)" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area dataKey="price" type="monotone" stroke="var(--color-price)" fill="url(#fillPrice)" strokeWidth={2} />
                      </AreaChart>
                    </ChartContainer>
                  </div>
                  
                  <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <p className="text-xs text-primary font-medium flex items-start gap-2">
                      <Brain className="h-4 w-4 shrink-0" /> AI suggests locking fuel contracts this week before anticipated 8% hike.
                    </p>
                  </div>
                </>
              ) : (
                <div className="h-40 animate-pulse bg-muted rounded-lg"></div>
              )}
            </CardContent>
          </Card>

          {/* Cost Impact Chart (Historical) */}
          <Card className="border-border/50 flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground uppercase tracking-widest">OpEx vs Revenue Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] mt-4">
                <ChartContainer config={chartConfig} className="h-full w-full">
                  <ComposedChart data={mockMonthlyFinancials} margin={{ left: -15, right: 10 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(v) => v.slice(0,3)} style={{ fontSize: '10px', fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000}k`} style={{ fontSize: '10px', fill: 'hsl(var(--muted-foreground))' }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="fuel" stackId="a" fill="var(--color-fuel)" radius={[0,0,4,4]} />
                    <Bar dataKey="maintenance" stackId="a" fill="var(--color-maintenance)" />
                    <Bar dataKey="labor" stackId="a" fill="var(--color-labor)" />
                    <Bar dataKey="other" stackId="a" fill="var(--color-other)" radius={[4,4,0,0]} />
                    <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={3} dot={{ r: 4, fill: "var(--background)", strokeWidth: 2 }} />
                    <ChartLegend content={<ChartLegendContent />} className="pt-4 text-xs" />
                  </ComposedChart>
                </ChartContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Economic Simulator */}
        <Card className="lg:col-span-2 border-border/50 bg-card shadow-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <TrendingUp className="h-64 w-64" />
          </div>
          
          <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
            <CardTitle>Scenario Simulator</CardTitle>
            <CardDescription>Adjust macro-economic factors to see projected impact on operating costs.</CardDescription>
          </CardHeader>
          
          <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            
            {/* Sliders */}
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <label className="text-sm font-medium">Fuel Price Change</label>
                  <span className="text-sm font-mono text-muted-foreground">{fuelChange[0] > 0 ? '+' : ''}{fuelChange[0]}%</span>
                </div>
                <Slider value={fuelChange} onValueChange={(val) => setFuelChange(Array.isArray(val) ? val : [val])} min={-50} max={50} step={1} className="w-full" />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <label className="text-sm font-medium">Maintenance Costs</label>
                  <span className="text-sm font-mono text-muted-foreground">{maintChange[0] > 0 ? '+' : ''}{maintChange[0]}%</span>
                </div>
                <Slider value={maintChange} onValueChange={(val) => setMaintChange(Array.isArray(val) ? val : [val])} min={-30} max={50} step={1} className="w-full" />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <label className="text-sm font-medium">Fleet Size Change</label>
                  <span className="text-sm font-mono text-muted-foreground">{fleetChange[0] > 0 ? '+' : ''}{fleetChange[0]}%</span>
                </div>
                <Slider value={fleetChange} onValueChange={(val) => setFleetChange(Array.isArray(val) ? val : [val])} min={-20} max={30} step={1} className="w-full" />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <label className="text-sm font-medium">Demand / Trips Volume</label>
                  <span className="text-sm font-mono text-muted-foreground">{demandChange[0] > 0 ? '+' : ''}{demandChange[0]}%</span>
                </div>
                <Slider value={demandChange} onValueChange={(val) => setDemandChange(Array.isArray(val) ? val : [val])} min={-30} max={30} step={1} className="w-full" />
              </div>

              <div className="pt-4 flex gap-3">
                <Button variant="outline" className="w-full" onClick={() => { setFuelChange([0]); setMaintChange([0]); setFleetChange([0]); setDemandChange([0]); }}>Reset Defaults</Button>
              </div>
            </div>

            {/* Results Panel */}
            <div className="bg-background rounded-xl border border-border p-6 shadow-inner space-y-6">
              {simResult ? (
                <>
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-4">Projected Monthly OpEx</h3>
                    <div className="flex items-end gap-3 mb-2">
                      <div className="text-4xl font-extrabold tracking-tight">${simResult.simulatedMonthlyCost.toLocaleString()}</div>
                      <Badge variant={simResult.changePercent > 0 ? 'destructive' : 'default'} className="mb-1 text-sm h-7">
                        {simResult.changePercent > 0 ? '+' : ''}{simResult.changePercent}%
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Base Cost: ${simResult.currentMonthlyCost.toLocaleString()}
                    </div>
                  </div>

                  <div className="border-t border-border/60 pt-4">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Zap className="h-3.5 w-3.5 text-primary" /> AI Mitigations
                    </h3>
                    <div className="space-y-3">
                      {simResult.recommendations.map((r: any, i: number) => (
                        <div key={i} className="flex justify-between items-start text-sm bg-muted/40 p-2.5 rounded-lg border border-border/50">
                          <div className="pr-4">
                            <span className="font-medium text-foreground block">{r.action}</span>
                            <span className="text-[10px] text-muted-foreground leading-tight">{r.impact}</span>
                          </div>
                          <span className="font-mono text-emerald-500 font-bold shrink-0">-${r.savings}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex justify-between items-center">
                    <span className="font-semibold text-primary text-sm">Net Impact with AI:</span>
                    <span className={`font-mono font-bold text-lg ${simResult.netImpactWithAI > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {simResult.netImpactWithAI > 0 ? '+' : ''}{simResult.netImpactWithAI > 0 ? '$' : '-$'}{Math.abs(simResult.netImpactWithAI).toLocaleString()}
                    </span>
                  </div>
                  
                  <Button className="w-full gap-2">
                    <Download className="h-4 w-4" /> Export Scenario PDF
                  </Button>
                </>
              ) : (
                <div className="h-full flex items-center justify-center animate-pulse">Calculating model...</div>
              )}
            </div>
            
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
