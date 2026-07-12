'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Line, ComposedChart } from 'recharts';
import { mockMonthlyFinancials } from '@/lib/mockData';
import { DollarSign, TrendingUp, TrendingDown, Wallet, Landmark } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function FinancialWarRoomPage() {
  const currentMonth = mockMonthlyFinancials[mockMonthlyFinancials.length - 1];
  const prevMonth = mockMonthlyFinancials[mockMonthlyFinancials.length - 2];

  const calcChange = (curr: number, prev: number) => {
    const diff = curr - prev;
    const percent = (diff / prev) * 100;
    return { val: diff, percent: percent.toFixed(1) };
  };

  const revenueChange = calcChange(currentMonth.revenue, prevMonth.revenue);
  const costChange = calcChange(
    currentMonth.fuel + currentMonth.maintenance + currentMonth.labor + currentMonth.other,
    prevMonth.fuel + prevMonth.maintenance + prevMonth.labor + prevMonth.other
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Landmark className="h-6 w-6 text-primary" /> Financial War Room
          </h2>
          <p className="text-sm text-muted-foreground">Macro-economic P&L analytics and revenue projections.</p>
        </div>
        <Button variant="outline" className="gap-2">
          <DollarSign className="h-4 w-4" /> Export P&L Report
        </Button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/50 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Revenue</CardTitle>
            <Wallet className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${currentMonth.revenue.toLocaleString()}</div>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="outline" className={Number(revenueChange.percent) > 0 ? 'text-emerald-500 border-emerald-500/50 bg-emerald-500/10' : 'text-destructive border-destructive/50 bg-destructive/10'}>
                {Number(revenueChange.percent) > 0 ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
                {revenueChange.percent}%
              </Badge>
              <span className="text-xs text-muted-foreground">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total OpEx</CardTitle>
            <TrendingDown className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${(currentMonth.fuel + currentMonth.maintenance + currentMonth.labor + currentMonth.other).toLocaleString()}</div>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="outline" className={Number(costChange.percent) < 0 ? 'text-emerald-500 border-emerald-500/50 bg-emerald-500/10' : 'text-destructive border-destructive/50 bg-destructive/10'}>
                {Number(costChange.percent) > 0 ? <TrendingUp className="mr-1 h-3 w-3" /> : <TrendingDown className="mr-1 h-3 w-3" />}
                {costChange.percent}%
              </Badge>
              <span className="text-xs text-muted-foreground">vs last month</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Margin</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              {(((currentMonth.revenue - (currentMonth.fuel + currentMonth.maintenance + currentMonth.labor + currentMonth.other)) / currentMonth.revenue) * 100).toFixed(1)}%
            </div>
            <div className="mt-2 text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Healthy Target: {'>'} 25%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 gap-6">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>YTD Revenue vs OpEx Analysis</CardTitle>
            <CardDescription>Comprehensive breakdown of costs against total revenue.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <ChartContainer 
                config={{ 
                  revenue: { label: "Revenue", color: "hsl(var(--primary))" },
                  fuel: { label: "Fuel Cost", color: "hsl(var(--destructive))" },
                  maintenance: { label: "Maintenance", color: "hsl(var(--chart-3))" },
                  labor: { label: "Labor", color: "hsl(var(--chart-4))" },
                  other: { label: "Other OpEx", color: "hsl(var(--muted-foreground))" }
                }} 
                className="h-full w-full"
              >
                <ComposedChart data={mockMonthlyFinancials} margin={{ left: -15, right: 10 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} style={{ fontSize: '12px', fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000}k`} style={{ fontSize: '12px', fill: 'hsl(var(--muted-foreground))' }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="fuel" stackId="a" fill="var(--color-fuel)" radius={[0,0,4,4]} />
                  <Bar dataKey="maintenance" stackId="a" fill="var(--color-maintenance)" />
                  <Bar dataKey="labor" stackId="a" fill="var(--color-labor)" />
                  <Bar dataKey="other" stackId="a" fill="var(--color-other)" radius={[4,4,0,0]} />
                  <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={4} dot={{ r: 4, fill: "var(--background)", strokeWidth: 2 }} activeDot={{ r: 6, fill: "var(--color-revenue)" }} />
                  <ChartLegend content={<ChartLegendContent />} className="pt-6" />
                </ComposedChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
