/**
 * ProfitLossIndicator Component
 *
 * Displays the absolute profit/loss amount in PLN with visual indicators.
 * Shows positive values (profit) in green and negative values (loss) in red.
 * Includes an icon and proper accessibility labels.
 */

interface ProfitLossIndicatorProps {
  currentValueGrosze: number;
  investedSumGrosze: number;
}

export function ProfitLossIndicator({ currentValueGrosze, investedSumGrosze }: ProfitLossIndicatorProps) {
  const profitLossGrosze = currentValueGrosze - investedSumGrosze;
  const profitLossPln = (profitLossGrosze / 100).toFixed(2);
  const isPositive = profitLossGrosze > 0;
  const isNeutral = profitLossGrosze === 0;

  const getColorClasses = () => {
    if (isNeutral) return "text-gray-600 bg-gray-100";
    if (isPositive) return "text-green-700 bg-green-50";
    return "text-red-700 bg-red-50";
  };

  const getIconClasses = () => {
    if (isNeutral) return "text-gray-500";
    if (isPositive) return "text-green-600";
    return "text-red-600";
  };

  const getIcon = () => {
    if (isNeutral) {
      return (
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M4 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H4.75A.75.75 0 014 10z"
            clipRule="evenodd"
          />
        </svg>
      );
    }

    if (isPositive) {
      return (
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path
            fillRule="evenodd"
            d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z"
            clipRule="evenodd"
          />
        </svg>
      );
    }

    return (
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path
          fillRule="evenodd"
          d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z"
          clipRule="evenodd"
        />
      </svg>
    );
  };

  const getStatusText = () => {
    if (isNeutral) return "Break-even";
    if (isPositive) return "Profit";
    return "Loss";
  };

  const formatAmount = () => {
    const absValue = Math.abs(Number(profitLossPln)).toLocaleString("pl-PL", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    if (isPositive) return `+${absValue}`;
    if (isNeutral) return absValue;
    return `-${absValue}`;
  };

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 ${getColorClasses()}`}
      role="status"
      aria-label={`${getStatusText()}: ${formatAmount()} PLN`}
    >
      <div className={getIconClasses()}>{getIcon()}</div>
      <div className="flex flex-col">
        <span className="text-xs font-medium text-gray-600">Profit / Loss</span>
        <span className="text-lg font-bold">{formatAmount()} PLN</span>
      </div>
    </div>
  );
}
