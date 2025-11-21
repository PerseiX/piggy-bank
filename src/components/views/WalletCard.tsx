import type { WalletListItemDto } from "@/types";
import { ProgressCircle } from "./ProgressCircle";
import { PerformanceIndicator } from "./PerformanceIndicator";

/**
 * WalletCard Component
 * 
 * Displays a summary card for a single wallet.
 * The entire card is clickable and navigates to the wallet detail view.
 * Shows key metrics including current value, target, progress, and performance.
 */

interface WalletCardProps {
  wallet: WalletListItemDto;
}

export function WalletCard({ wallet }: WalletCardProps) {
  const { id, name, description, updated_at, aggregates } = wallet;

  // Format the updated_at timestamp
  const formattedDate = new Date(updated_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <a
      href={`/wallets/${id}`}
      className="group block rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-gray-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
    >
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
          {name}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-gray-600 line-clamp-2">{description}</p>
        )}
      </div>

      {/* Main Metrics */}
      <div className="mb-4 space-y-2">
        <div>
          <span className="text-sm text-gray-500">Current Value</span>
          <div className="text-2xl font-bold text-gray-900">
            {aggregates.current_value_pln} PLN
          </div>
        </div>
        <div>
          <span className="text-sm text-gray-500">Target</span>
          <div className="text-lg font-semibold text-gray-700">
            {aggregates.target_pln} PLN
          </div>
        </div>
        <div>
          <span className="text-sm text-gray-500">Invested</span>
          <div className="text-lg font-semibold text-gray-700">
            {aggregates.invested_sum_pln} PLN
          </div>
        </div>
      </div>

      {/* Visual Indicators */}
      <div className="mb-4 flex items-center gap-6">
        <div className="flex-shrink-0">
          <ProgressCircle percent={aggregates.progress_percent} />
        </div>
        <div className="flex-1">
          <PerformanceIndicator percent={aggregates.performance_percent} />
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-100 pt-4">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Updated {formattedDate}</span>
          <span className="text-blue-600 group-hover:text-blue-700 font-medium">
            View Details →
          </span>
        </div>
      </footer>
    </a>
  );
}

