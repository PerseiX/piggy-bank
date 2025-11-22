import type { WalletListItemDto } from "@/types";
import { ProgressCircle } from "./ProgressCircle";
import { PerformanceIndicator } from "./PerformanceIndicator";

/**
 * WalletCard Component
 * 
 * Displays a summary card for a single wallet.
 * Includes an edit button in the header and a "View Details" link in the footer.
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
    <div className="group rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-all hover:shadow-md hover:border-gray-300">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-gray-900">
              {name}
            </h2>
            {description && (
              <p className="mt-1 text-sm text-gray-600 line-clamp-2">{description}</p>
            )}
          </div>
          <a
            href={`/wallets/detail/${id}/edit`}
            className="flex-shrink-0 rounded-md p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors"
            aria-label={`Edit ${name}`}
            onClick={(e) => e.stopPropagation()}
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
            </svg>
          </a>
        </div>
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
          <a
            href={`/wallets/detail/${id}`}
            className="text-blue-600 hover:text-blue-700 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 rounded"
          >
            View Details →
          </a>
        </div>
      </footer>
    </div>
  );
}

