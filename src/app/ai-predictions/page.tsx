'use client';

import React, { useState, useEffect } from 'react';
import { aiPredictionService, economicService } from '@/lib/mockServices';
import { mockVehicles, MaintenancePrediction, VehicleHealthReport } from '@/lib/mockData';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress, ProgressTrack, ProgressIndicator } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, ShieldAlert, ShieldCheck, Wrench, Brain, TrendingUp, CheckCircle2, Clock, CalendarDays, Zap, DollarSign, Activity, AlertTriangle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function AIPredictionsPage() {
  const [selectedVehicle, setSelectedVehicle] = useState<string>(mockVehicles[0].id);
  const [report, setReport] = useState<VehicleHealthReport | null>(null);
  const [fleetHealth, setFleetHealth] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const activeVehicles = mockVehicles.filter(v => v.status !== 'Retired');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [fleet, ins] = await Promise.all([
        aiPredictionService.getFleetHealth(),
        aiPredictionService.getInsights()
      ]);
      setFleetHealth(fleet);
      setInsights(ins.filter(i => i.type === 'critical' || i.type === 'warning')); // Just show urgent AI stuff
      
      const vehicleReport = await aiPredictionService.predictMaintenance(selectedVehicle);
      setReport(vehicleReport);
      setLoading(false);
    }
    loadData();
  }, [selectedVehicle]);

  const getUrgencyColor = (urgency: string) => {
    switch(urgency) {
      case 'critical': return 'text-destructive border-destructive/50 bg-destructive/10';
      case 'high': return 'text-orange-500 border-orange-500/50 bg-orange-500/10';
      case 'medium': return 'text-amber-500 border-amber-500/50 bg-amber-500/10';
      default: return 'text-emerald-500 border-emerald-500/50 bg-emerald-500/10';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch(urgency) {
      case 'critical': return <ShieldAlert className="h-4 w-4 text-destructive" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium': return <AlertCircle className="h-4 w-4 text-amber-500" />;
      default: return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" /> AI Predictive Maintenance
          </h2>
          <p className="text-sm text-muted-foreground">Machine learning models predicting component failures before they happen.</p>
        </div>

        <div className="w-full sm:w-64">
          <Select value={selectedVehicle} onValueChange={(val) => val && setSelectedVehicle(val)}>
            <SelectTrigger>
              <SelectValue placeholder="Select Vehicle" />
            </SelectTrigger>
            <SelectContent>
              {activeVehicles.map(v => (
                <SelectItem key={v.id} value={v.id}>{v.registration_number} - {v.model}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading || !report ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
          <div className="lg:col-span-2 h-[500px] bg-muted/50 rounded-xl border border-border"></div>
          <div className="h-[500px] bg-muted/50 rounded-xl border border-border"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main AI Predictions Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Optimization Suggestion (if any) */}
            {report.fleetOptimization && (
              <Card className="bg-primary/5 border-primary/20 shadow-none">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="p-2 bg-primary/20 rounded-full text-primary shrink-0 mt-0.5">
                    <Zap className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-primary mb-1">AI Fleet Optimization Suggestion</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{report.fleetOptimization.reason}</p>
                    <div className="mt-3 flex gap-2">
                      <Badge variant="outline" className="border-primary/30">
                        Suggest: -{report.fleetOptimization.recommendedTripReduction * 100}% Load
                      </Badge>
                      <Badge variant="outline" className="border-primary/30">
                        Shift to: {report.fleetOptimization.alternativeVehicle}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Predictions List */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Activity className="h-5 w-5 text-muted-foreground" /> Component Health Analysis
              </h3>
              
              {report.predictions.map((pred, i) => (
                <Card key={i} className="border-border/50 overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg border ${getUrgencyColor(pred.urgency)}`}>
                          {getUrgencyIcon(pred.urgency)}
                        </div>
                        <div>
                          <h4 className="font-bold text-lg leading-none mb-1">{pred.component}</h4>
                          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                            Health: {Math.round(pred.health * 100)}%
                          </span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <Badge variant="outline" className="bg-muted text-foreground mb-1">
                          Fail Est: {pred.predictedFailureDate}
                        </Badge>
                        <div className="text-[10px] text-muted-foreground text-right mt-1 font-mono">
                          @ {pred.predictedFailureKm.toLocaleString()} km
                        </div>
                      </div>
                    </div>

                    <Progress value={pred.health * 100} className="mb-4">
                      <ProgressTrack className="h-2">
                        <ProgressIndicator className={pred.health > 0.7 ? 'bg-emerald-500' : pred.health > 0.4 ? 'bg-amber-500' : 'bg-destructive'} />
                      </ProgressTrack>
                    </Progress>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      <div className="bg-muted/30 rounded-lg p-3 border border-border">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                          <DollarSign className="h-3 w-3" /> Cost Impact
                        </div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm">Preventive Service:</span>
                          <span className="text-sm font-bold">${pred.estimatedCost.current}</span>
                        </div>
                        <div className="flex justify-between items-center text-muted-foreground">
                          <span className="text-xs">Post-Failure Fix:</span>
                          <span className="text-xs line-through">${pred.estimatedCost.delayed}</span>
                        </div>
                        <div className="mt-2 text-xs font-bold text-emerald-500 bg-emerald-500/10 py-1 px-2 rounded inline-block">
                          Save ${pred.estimatedCost.savings} by servicing now
                        </div>
                      </div>

                      <div className="space-y-3">
                        {pred.riskAssessment && (
                          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs p-2 rounded-md flex items-start gap-2">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            <span className="leading-snug">{pred.riskAssessment}</span>
                          </div>
                        )}
                        {pred.economicInsight && (
                          <div className="bg-blue-500/10 border border-blue-500/20 text-blue-500 text-xs p-2 rounded-md flex items-start gap-2">
                            <TrendingUp className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            <span className="leading-snug">{pred.economicInsight}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-5 flex gap-3">
                      <Button className="w-full sm:w-auto" variant={pred.urgency === 'critical' || pred.urgency === 'high' ? 'default' : 'secondary'}>
                        <Wrench className="mr-2 h-4 w-4" /> Schedule Maintenance
                      </Button>
                      <Button variant="outline" className="w-full sm:w-auto">
                        <Clock className="mr-2 h-4 w-4" /> Snooze 1 Week
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Right Column (Score & Fleet Insights) */}
          <div className="space-y-6">
            
            {/* Overall Score */}
            <Card className="border-border/50 bg-card overflow-hidden relative">
              <div className={`absolute top-0 inset-x-0 h-1 ${report.healthScore > 70 ? 'bg-emerald-500' : report.healthScore > 40 ? 'bg-amber-500' : 'bg-destructive'}`}></div>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground uppercase tracking-widest text-center">Overall Health Score</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center pb-6">
                <div className="relative h-32 w-32 flex items-center justify-center my-4">
                  {/* CSS Circular Gauge Mockup */}
                  <svg className="absolute inset-0 h-full w-full transform -rotate-90">
                    <circle cx="64" cy="64" r="56" className="stroke-muted fill-none" strokeWidth="8" />
                    <circle 
                      cx="64" cy="64" r="56" 
                      className={`fill-none transition-all duration-1000 ${report.healthScore > 70 ? 'stroke-emerald-500' : report.healthScore > 40 ? 'stroke-amber-500' : 'stroke-destructive'}`} 
                      strokeWidth="8" 
                      strokeDasharray="351" 
                      strokeDashoffset={351 - (351 * report.healthScore) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="flex flex-col items-center">
                    <span className="text-4xl font-extrabold tracking-tighter">{report.healthScore}</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">/ 100</span>
                  </div>
                </div>
                <h3 className="font-mono font-bold text-lg">{report.vehicleReg}</h3>
              </CardContent>
            </Card>

            {/* Urgent Fleet Insights */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="text-md flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-primary" /> Actionable Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-64">
                  <div className="divide-y divide-border/50">
                    {insights.map((ins, i) => (
                      <div key={i} className="p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start gap-3">
                          <div className={`p-1.5 rounded-full shrink-0 ${ins.type === 'critical' ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-500'}`}>
                            {ins.type === 'critical' ? <ShieldAlert className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                          </div>
                          <div>
                            <p className="text-sm font-medium leading-snug mb-2">{ins.message}</p>
                            {ins.actionable && (
                              <div className="flex gap-2">
                                <Button size="sm" variant="secondary" className="h-7 text-xs px-2">Review</Button>
                                <Button size="sm" variant="ghost" className="h-7 text-xs px-2">Dismiss</Button>
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
      )}
    </div>
  );
}
