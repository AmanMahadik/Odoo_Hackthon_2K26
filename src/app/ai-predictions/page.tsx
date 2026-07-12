'use client';

import React, { useState, useEffect } from 'react';
import { aiPredictionService } from '@/lib/mockServices';
import { mockVehicles, VehicleHealthReport } from '@/lib/mockData';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress, ProgressTrack, ProgressIndicator } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertCircle,
  ShieldAlert,
  Wrench,
  TrendingUp,
  CheckCircle2,
  Clock,
  Zap,
  DollarSign,
  Activity,
  AlertTriangle,
} from 'lucide-react';

export default function AIPredictionsPage() {
  const [selectedVehicle, setSelectedVehicle] = useState<string>(mockVehicles[0].id);
  const [report, setReport] = useState<VehicleHealthReport | null>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const activeVehicles = mockVehicles.filter((v) => v.status !== 'Retired');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const [fleetInsights, vehicleReport] = await Promise.all([
        aiPredictionService.getInsights(),
        aiPredictionService.predictMaintenance(selectedVehicle),
      ]);
      setInsights(fleetInsights.filter((i) => i.type === 'critical' || i.type === 'warning'));
      setReport(vehicleReport);
      setLoading(false);
    }
    loadData();
  }, [selectedVehicle]);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return 'text-destructive border-destructive/40 bg-destructive/10';
      case 'high':
      case 'medium':
        return 'text-foreground border-border bg-muted';
      default:
        return 'text-muted-foreground border-border bg-muted/50';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'critical':
        return <ShieldAlert className="h-4 w-4 text-destructive" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-foreground" />;
      case 'medium':
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
      default:
        return <CheckCircle2 className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-5 font-normal">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl tracking-tight font-medium">Prediction</h2>
          <p className="text-sm text-muted-foreground">
            Component failure forecasts and health scores from telematics models
          </p>
        </div>
        <div className="w-full sm:w-64">
          <Select value={selectedVehicle} onValueChange={(val) => val && setSelectedVehicle(val)}>
            <SelectTrigger className="font-normal">
              <SelectValue placeholder="Select vehicle" />
            </SelectTrigger>
            <SelectContent>
              {activeVehicles.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.registration_number} · {v.model}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading || !report ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 animate-pulse">
          <div className="lg:col-span-2 h-[420px] bg-muted/50 rounded-xl border border-border" />
          <div className="h-[420px] bg-muted/50 rounded-xl border border-border" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 space-y-3">
            {report.fleetOptimization && (
              <Card>
                <CardContent className="pt-5 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-muted border border-border shrink-0">
                    <Zap className="h-4 w-4 text-foreground" />
                  </div>
                  <div className="min-w-0 space-y-2">
                    <h4 className="text-sm font-medium">Fleet optimization suggestion</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {report.fleetOptimization.reason}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="font-normal">
                        Suggest −{report.fleetOptimization.recommendedTripReduction * 100}% load
                      </Badge>
                      <Badge variant="outline" className="font-normal">
                        Shift to {report.fleetOptimization.alternativeVehicle}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4" /> Component health analysis
                </CardTitle>
                <CardDescription className="font-normal">
                  Predicted failure windows and service cost impact
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {report.predictions.map((pred, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-border p-4 space-y-4"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`p-2 rounded-lg border shrink-0 ${getUrgencyColor(pred.urgency)}`}
                        >
                          {getUrgencyIcon(pred.urgency)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-medium leading-tight">{pred.component}</h4>
                          <span className="text-[11px] text-muted-foreground">
                            Health {Math.round(pred.health * 100)}% · {pred.urgency}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge variant="outline" className="font-normal text-[10px]">
                          Fail est. {pred.predictedFailureDate}
                        </Badge>
                        <div className="text-[10px] text-muted-foreground mt-1 tabular-nums">
                          @ {pred.predictedFailureKm.toLocaleString()} km
                        </div>
                      </div>
                    </div>

                    <Progress value={pred.health * 100}>
                      <ProgressTrack className="h-2">
                        <ProgressIndicator
                          className={
                            pred.health <= 0.4 ? 'bg-destructive' : 'bg-primary'
                          }
                        />
                      </ProgressTrack>
                    </Progress>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                          <DollarSign className="h-3 w-3" /> Cost impact
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Preventive service</span>
                          <span className="tabular-nums font-medium">${pred.estimatedCost.current}</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Post-failure fix</span>
                          <span className="line-through tabular-nums">${pred.estimatedCost.delayed}</span>
                        </div>
                        <div className="text-[11px] font-medium text-foreground pt-1">
                          Save ${pred.estimatedCost.savings} by servicing now
                        </div>
                      </div>

                      <div className="space-y-2">
                        {pred.riskAssessment && (
                          <div className="rounded-lg border border-border bg-muted/40 text-muted-foreground text-xs p-2.5 flex items-start gap-2">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-foreground" />
                            <span className="leading-snug">{pred.riskAssessment}</span>
                          </div>
                        )}
                        {pred.economicInsight && (
                          <div className="rounded-lg border border-border bg-muted/40 text-xs p-2.5 flex items-start gap-2 text-muted-foreground">
                            <TrendingUp className="h-3.5 w-3.5 shrink-0 mt-0.5 text-foreground" />
                            <span className="leading-snug">{pred.economicInsight}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        className="font-normal gap-1.5"
                        variant={
                          pred.urgency === 'critical' || pred.urgency === 'high'
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        <Wrench className="h-4 w-4" /> Schedule maintenance
                      </Button>
                      <Button size="sm" variant="outline" className="font-normal gap-1.5">
                        <Clock className="h-4 w-4" /> Snooze 1 week
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-center">
                  Overall health score
                </CardTitle>
                <CardDescription className="font-normal text-center">
                  {report.vehicleReg}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center pb-5">
                <div className="relative h-28 w-28 flex items-center justify-center my-2">
                  <svg className="absolute inset-0 h-full w-full -rotate-90">
                    <circle
                      cx="56"
                      cy="56"
                      r="48"
                      className="stroke-muted fill-none"
                      strokeWidth="7"
                    />
                    <circle
                      cx="56"
                      cy="56"
                      r="48"
                      className={`fill-none transition-all duration-700 ${
                        report.healthScore <= 40
                          ? 'stroke-destructive'
                          : 'stroke-foreground'
                      }`}
                      strokeWidth="7"
                      strokeDasharray="301"
                      strokeDashoffset={301 - (301 * report.healthScore) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="flex flex-col items-center">
                    <span className="text-3xl tracking-tight font-medium tabular-nums">
                      {report.healthScore}
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      / 100
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" /> Actionable insights
                </CardTitle>
                <CardDescription className="font-normal">
                  Critical and warning signals across the fleet
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-72">
                  <div className="divide-y divide-border">
                    {insights.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground text-center">
                        No urgent insights right now
                      </p>
                    ) : (
                      insights.map((ins, i) => (
                        <div key={i} className="p-4 hover:bg-muted/40 transition-colors">
                          <div className="flex items-start gap-3">
                            <div
                              className={`p-1.5 rounded-md shrink-0 border ${
                                ins.type === 'critical'
                                  ? 'bg-destructive/10 text-destructive border-destructive/30'
                                  : 'bg-muted text-foreground border-border'
                              }`}
                            >
                              {ins.type === 'critical' ? (
                                <ShieldAlert className="h-3.5 w-3.5" />
                              ) : (
                                <AlertTriangle className="h-3.5 w-3.5" />
                              )}
                            </div>
                            <div className="min-w-0 space-y-2">
                              <p className="text-sm leading-snug">{ins.message}</p>
                              {ins.actionable && (
                                <div className="flex gap-2">
                                  <Button size="sm" variant="secondary" className="h-7 text-xs font-normal">
                                    Review
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 text-xs font-normal">
                                    Dismiss
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
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
