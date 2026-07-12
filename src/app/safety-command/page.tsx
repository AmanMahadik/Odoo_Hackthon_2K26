'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis, Cell } from 'recharts';
import { mockDrivers, mockVehicles } from '@/lib/mockData';
import { ShieldCheck, ShieldAlert, AlertTriangle, Users, FileWarning, Eye } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

export default function SafetyCommandPage() {
  const avgSafetyScore = Math.round(mockDrivers.reduce((acc, curr) => acc + curr.safety_score, 0) / mockDrivers.length);
  
  const highRiskDrivers = mockDrivers.filter(d => d.safety_score < 75);
  const excellentDrivers = mockDrivers.filter(d => d.safety_score >= 90);
  
  // Group drivers by score range for chart
  const scoreDistribution = [
    { name: '90-100 (Excellent)', count: excellentDrivers.length, fill: "hsl(var(--emerald-500))" },
    { name: '75-89 (Average)', count: mockDrivers.length - highRiskDrivers.length - excellentDrivers.length, fill: "hsl(var(--amber-500))" },
    { name: '<75 (High Risk)', count: highRiskDrivers.length, fill: "hsl(var(--destructive))" },
  ];

  const getSafetyBadge = (score: number) => {
    if (score >= 90) return <Badge variant="outline" className="text-emerald-500 border-emerald-500/50 gap-1"><ShieldCheck className="h-3 w-3"/> {score}</Badge>;
    if (score >= 75) return <Badge variant="outline" className="text-amber-500 border-amber-500/50 gap-1"><AlertTriangle className="h-3 w-3"/> {score}</Badge>;
    return <Badge variant="outline" className="text-destructive border-destructive/50 gap-1"><ShieldAlert className="h-3 w-3"/> {score}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-primary" /> Safety & Compliance Command
        </h2>
        <p className="text-sm text-muted-foreground">Driver behavioral scores, license compliance, and risk analytics.</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-border/50 bg-card col-span-1 md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Average Fleet Safety Score</CardTitle>
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <div>
              <div className="text-4xl font-extrabold flex items-end gap-2">
                {avgSafetyScore} <span className="text-sm text-muted-foreground font-medium mb-1">/ 100</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Based on telematics & AI analytics</p>
            </div>
            
            <div className="h-16 w-32 relative">
               <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 50">
                  <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" strokeLinecap="round" />
                  <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="hsl(var(--emerald-500))" strokeWidth="10" strokeLinecap="round" 
                        strokeDasharray="125.6" strokeDashoffset={125.6 - (125.6 * avgSafetyScore) / 100} />
               </svg>
               <div className="absolute bottom-0 inset-x-0 text-center text-xs font-bold text-emerald-500">Good</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">High Risk Drivers</CardTitle>
            <ShieldAlert className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{highRiskDrivers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Require retraining immediately</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">License Warnings</CardTitle>
            <FileWarning className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-500">2</div>
            <p className="text-xs text-muted-foreground mt-1">Expiring within 30 days</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Score Distribution Chart */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle>Safety Score Distribution</CardTitle>
            <CardDescription>Number of drivers in each tier.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ChartContainer config={{
                count: { label: "Drivers" },
                excellent: { color: "hsl(var(--emerald-500))" },
                average: { color: "hsl(var(--amber-500))" },
                risk: { color: "hsl(var(--destructive))" }
              }} className="h-full w-full">
                <BarChart data={scoreDistribution} layout="vertical" margin={{ left: 10, right: 30, top: 10, bottom: 10 }}>
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} style={{ fontSize: '12px', fill: 'hsl(var(--foreground))', fontWeight: 500 }} width={120} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {scoreDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        {/* High Risk Drivers Table */}
        <Card className="border-border/50 lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Critical Watchlist
            </CardTitle>
            <CardDescription>Drivers with safety scores below 75 or expiring compliance documents.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[250px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Driver</TableHead>
                    <TableHead>License No.</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {highRiskDrivers.map(d => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell className="font-mono text-xs">{d.license_number}</TableCell>
                      <TableCell>{getSafetyBadge(d.safety_score)}</TableCell>
                      <TableCell className="text-xs text-destructive">Harsh Braking Incidents</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
                          <Eye className="h-3 w-3 mr-1" /> View Logs
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {/* Mock Expiring Licenses */}
                  <TableRow>
                    <TableCell className="font-medium">Sarah Jenkins</TableCell>
                    <TableCell className="font-mono text-xs">DL-987654</TableCell>
                    <TableCell>{getSafetyBadge(92)}</TableCell>
                    <TableCell className="text-xs text-amber-500">License Expiring (12 days)</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs">
                        <FileWarning className="h-3 w-3 mr-1" /> Request Renew
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
        
      </div>
    </div>
  );
}
