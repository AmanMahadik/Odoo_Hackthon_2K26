'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  ChevronRight,
  Clock,
  DollarSign,
  Gauge,
  Info,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  Wrench,
} from 'lucide-react';
import type { MaintenancePrediction } from '@/lib/mockData';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AIPredictionCardProps {
  prediction: MaintenancePrediction;
  vehicleReg: string;
}

const urgencyConfig = {
  critical: {
    icon: '🔴',
    color: 'text-destructive',
    bg: 'bg-destructive/10',
    border: 'border-destructive/30',
    badgeVariant: 'destructive' as const,
  },
  high: {
    icon: '🟠',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    badgeVariant: 'secondary' as const,
  },
  medium: {
    icon: '🟡',
    color: 'text-yellow-500',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    badgeVariant: 'outline' as const,
  },
  low: {
    icon: '🟢',
    color: 'text-primary',
    bg: 'bg-primary/10',
    border: 'border-primary/30',
    badgeVariant: 'default' as const,
  },
};

function getHealthBgColor(health: number): string {
  if (health >= 0.7) return 'bg-primary';
  if (health >= 0.4) return 'bg-amber-500';
  return 'bg-destructive';
}

export default function AIPredictionCard({ prediction, vehicleReg }: AIPredictionCardProps) {
  const [snoozed, setSnoozed] = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const config = urgencyConfig[prediction.urgency];
  const healthPercent = Math.round(prediction.health * 100);

  if (snoozed) {
    return (
      <Card className="opacity-60 border-dashed">
        <CardContent className="p-4 flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span className="text-sm">
            {prediction.component} — snoozed for 1 week
          </span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden group hover:shadow-md transition-shadow">
      <CardContent className="p-5 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-10 h-10 rounded-lg ${config.bg} border ${config.border}`}>
              <Wrench className={`h-5 w-5 ${config.color}`} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-lg leading-tight">
                {prediction.component}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">{vehicleReg}</p>
            </div>
          </div>
          <Badge variant={config.badgeVariant} className="gap-1.5 flex items-center">
            <span className="text-[10px]">{config.icon}</span>
            {prediction.urgency.charAt(0).toUpperCase() + prediction.urgency.slice(1)}
          </Badge>
        </div>

        {/* Health Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Gauge className="h-4 w-4" />
              Component Health
            </span>
            <span className={`font-bold tabular-nums ${config.color}`}>
              {healthPercent}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className={`h-full rounded-full ${getHealthBgColor(prediction.health)} transition-all duration-1000`}
              style={{ width: `${healthPercent}%` }}
            />
          </div>
        </div>

        {/* Predicted Failure Info */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-start gap-2 rounded-md bg-muted/50 border border-border/50 p-3">
            <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Predicted Failure
              </p>
              <p className="text-sm font-bold text-foreground mt-0.5">
                {new Date(prediction.predictedFailureDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-md bg-muted/50 border border-border/50 p-3">
            <TrendingDown className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                Failure At
              </p>
              <p className="text-sm font-bold text-foreground mt-0.5">
                {prediction.predictedFailureKm.toLocaleString()} km
              </p>
            </div>
          </div>
        </div>

        {/* Recommended Action */}
        <div className="flex items-start gap-2.5 rounded-md bg-primary/10 border border-primary/20 p-3">
          <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-foreground leading-relaxed font-medium">
            {prediction.recommendedAction}
          </p>
        </div>

        {/* Risk Assessment */}
        {prediction.riskAssessment && (
          <div className="flex items-start gap-2.5 rounded-md bg-amber-500/10 border border-amber-500/20 p-3">
            <ShieldAlert className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-bold mb-1">
                Risk Assessment
              </p>
              <p className="text-sm text-foreground leading-relaxed">
                {prediction.riskAssessment}
              </p>
            </div>
          </div>
        )}

        {/* Cost Comparison */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-md bg-muted border border-border/50 p-2 text-center">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
              Service Now
            </p>
            <p className="text-md font-bold text-foreground mt-1">
              ${prediction.estimatedCost.current}
            </p>
          </div>
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-2 text-center">
            <p className="text-[10px] uppercase tracking-wider text-destructive font-semibold">
              If Delayed
            </p>
            <p className="text-md font-bold text-destructive mt-1">
              ${prediction.estimatedCost.delayed}
            </p>
          </div>
          <div className="rounded-md bg-primary/10 border border-primary/20 p-2 text-center">
            <p className="text-[10px] uppercase tracking-wider text-primary font-semibold">
              Savings
            </p>
            <p className="text-md font-bold text-primary mt-1">
              ${prediction.estimatedCost.savings}
            </p>
          </div>
        </div>

        {/* Optimal Service Window */}
        {prediction.optimalServiceWindow && (
          <div className="flex items-start gap-2.5 rounded-md bg-muted border border-border p-3">
            <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">
                Optimal Window
              </p>
              <p className="text-sm font-semibold text-foreground">
                {new Date(prediction.optimalServiceWindow.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                {' — '}
                {new Date(prediction.optimalServiceWindow.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {prediction.optimalServiceWindow.reason}
              </p>
            </div>
          </div>
        )}

        {/* Economic Insight */}
        {prediction.economicInsight && (
          <div className="flex items-start gap-2.5 rounded-md bg-muted border border-border p-3">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1">
                Economic Insight
              </p>
              <p className="text-sm text-foreground leading-relaxed">
                {prediction.economicInsight}
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            onClick={() => setScheduled(true)}
            disabled={scheduled}
            className="flex-1"
            variant={scheduled ? "secondary" : "default"}
          >
            {scheduled ? (
              <>
                <DollarSign className="h-4 w-4 mr-2" />
                Scheduled ✓
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Now
                <ChevronRight className="h-4 w-4 ml-1" />
              </>
            )}
          </Button>
          {!scheduled && (
            <Button
              variant="outline"
              onClick={() => setSnoozed(true)}
            >
              <Clock className="h-4 w-4 mr-2" />
              Snooze
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
