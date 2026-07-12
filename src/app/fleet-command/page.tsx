'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { mockVehicles, mockMonthlyFinancials, mockUtilization30Days } from '@/lib/mockData';
import { aiPredictionService } from '@/lib/mockServices';
import { ShieldAlert, AlertTriangle, Truck, MapPin, Activity, Settings } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function FleetCommandPage() {
  const [insights, setInsights] = useState<any[]>([]);

  useEffect(() => {
    aiPredictionService.getInsights().then(setInsights);
  }, []);

  const totalVehicles = mockVehicles.filter(v => v.status !== 'Retired').length;
  const activeVehicles = mockVehicles.filter(v => v.status === 'On Trip').length;
  const inShopVehicles = mockVehicles.filter(v => v.status === 'In Shop').length;
  const availableVehicles = mockVehicles.filter(v => v.status === 'Available').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" /> Fleet Command Center
        </h2>
        <p className="text-sm text-muted-foreground">High-level operational overview for Fleet Managers.</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Active Fleet</CardTitle>
            <Truck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalVehicles}</div>
            <p className="text-xs text-muted-foreground mt-1">Excludes retired units</p>
          </CardContent>
        </Card>
        
        <Card className="border-border/50 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Currently On Trip</CardTitle>
            <MapPin className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeVehicles}</div>
            <p className="text-xs text-muted-foreground mt-1">{Math.round((activeVehicles/totalVehicles)*100)}% utilization rate</p>
          </CardContent>
        </Card>
        
        <Card className="border-border/50 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Maintenance</CardTitle>
            <Settings className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inShopVehicles}</div>
            <p className="text-xs text-muted-foreground mt-1 text-destructive font-medium">Require immediate review</p>
          </CardContent>
        </Card>
        
        <Card className="border-border/50 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Available Units</CardTitle>
            <Truck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{availableVehicles}</div>
            <p className="text-xs text-muted-foreground mt-1">Ready for dispatch</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Utilization Chart */}
        <Card className="lg:col-span-2 border-border/50">
          <CardHeader>
            <CardTitle>30-Day Fleet Utilization Trend</CardTitle>
            <CardDescription>Percentage of fleet on active dispatch.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ChartContainer config={{ utilization: { label: "Utilization %", color: "hsl(var(--primary))" } }} className="h-full w-full">
                <AreaChart data={mockUtilization30Days} margin={{ left: -20, right: 10 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} style={{ fontSize: '10px', fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tickLine={false} axisLine={false} style={{ fontSize: '10px', fill: 'hsl(var(--muted-foreground))' }} domain={[0, 100]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <defs>
                    <linearGradient id="fillUtil" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-utilization)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-utilization)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area dataKey="utilization" type="monotone" stroke="var(--color-utilization)" fill="url(#fillUtil)" strokeWidth={2} />
                </AreaChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        {/* Actionable Insights */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>AI Control Center Alerts</CardTitle>
            <CardDescription>System generated operational insights.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[300px]">
              <div className="divide-y divide-border/50">
                {insights.map((ins, i) => (
                  <div key={i} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={`p-1.5 rounded-full shrink-0 ${ins.type === 'critical' ? 'bg-destructive/10 text-destructive' : ins.type === 'warning' ? 'bg-amber-500/10 text-amber-500' : ins.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                        {ins.type === 'critical' ? <ShieldAlert className="h-3 w-3" /> : ins.type === 'warning' ? <AlertTriangle className="h-3 w-3" /> : <Activity className="h-3 w-3" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium leading-snug mb-2">{ins.message}</p>
                        {ins.actionable && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="secondary" className="h-7 text-xs px-2">Take Action</Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
