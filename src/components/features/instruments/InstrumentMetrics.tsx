/**
 * InstrumentMetrics Component
 * 
 * Displays key financial metrics for an instrument including current value,
 * invested money, goal, and calculated delta with visual indicators.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ValueChangeDirection } from "@/types";

export interface InstrumentMetricsViewModel {
  currentValuePln: string;
  investedPln: string;
  goalPln: string | null;
  deltaPln: string;
  deltaDirection: ValueChangeDirection;
}

interface InstrumentMetricsProps {
  metrics: InstrumentMetricsViewModel;
}

export function InstrumentMetrics({ metrics }: InstrumentMetricsProps) {
  const getDeltaIcon = () => {
    if (metrics.deltaDirection === "increase") {
      return (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 10l7-7m0 0l7 7m-7-7v18"
          />
        </svg>
      );
    }
    if (metrics.deltaDirection === "decrease") {
      return (
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      );
    }
    return (
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 12h14"
        />
      </svg>
    );
  };

  const getDeltaColorClasses = () => {
    if (metrics.deltaDirection === "increase") {
      return "text-green-700 bg-green-50 border-green-200";
    }
    if (metrics.deltaDirection === "decrease") {
      return "text-red-700 bg-red-50 border-red-200";
    }
    return "text-gray-700 bg-gray-50 border-gray-200";
  };

  const formatCurrency = (value: string) => {
    return `${value} PLN`;
  };

  return (
    <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Current Value */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-600">
            Current Value
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(metrics.currentValuePln)}
          </div>
        </CardContent>
      </Card>

      {/* Invested Money */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-600">
            Invested Money
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(metrics.investedPln)}
          </div>
        </CardContent>
      </Card>

      {/* Goal */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-gray-600">
            Goal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-gray-900">
            {metrics.goalPln ? formatCurrency(metrics.goalPln) : "—"}
          </div>
        </CardContent>
      </Card>

      {/* Delta (Gain/Loss) */}
      <Card className={`border ${getDeltaColorClasses()}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            Gain/Loss
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            {getDeltaIcon()}
            <div className="text-2xl font-bold">
              {formatCurrency(metrics.deltaPln)}
            </div>
          </div>
          <div className="sr-only">
            {metrics.deltaDirection === "increase" && "Positive gain"}
            {metrics.deltaDirection === "decrease" && "Loss"}
            {metrics.deltaDirection === "unchanged" && "No change"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

