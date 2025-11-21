/**
 * AggregatesSummary Component
 * 
 * Displays key financial aggregates and two circle graphs for progress and performance.
 * Shows current value, invested sum, target, and visual indicators.
 */

import { ProgressCircle } from "@/components/views/ProgressCircle";
import { PerformanceIndicator } from "@/components/views/PerformanceIndicator";
import type { WalletAggregatesDto } from "@/types";

interface AggregatesSummaryProps {
  aggregates: WalletAggregatesDto;
}

export function AggregatesSummary({ aggregates }: AggregatesSummaryProps) {
  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Overview</h2>
      
      {/* Monetary values grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Current Value */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Current Value</div>
          <div className="text-2xl font-bold text-gray-900">
            {aggregates.current_value_pln} PLN
          </div>
        </div>

        {/* Invested Sum */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Invested</div>
          <div className="text-2xl font-bold text-gray-900">
            {aggregates.invested_sum_pln} PLN
          </div>
        </div>

        {/* Target */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">Target</div>
          <div className="text-2xl font-bold text-gray-900">
            {aggregates.target_pln} PLN
          </div>
        </div>
      </div>

      {/* Progress and Performance visualizations */}
      <div className="flex flex-wrap gap-6 items-center justify-center md:justify-start">
        <div className="flex flex-col items-center gap-2">
          <ProgressCircle percent={aggregates.progress_percent} />
          <span className="text-sm text-gray-600 font-medium">Target Progress</span>
        </div>
        
        <div className="flex flex-col items-center gap-2">
          <PerformanceIndicator percent={aggregates.performance_percent} />
          <span className="text-sm text-gray-600 font-medium">Investment Performance</span>
        </div>
      </div>
    </div>
  );
}

