/**
 * PerformanceIndicator Component
 * 
 * Displays the investment performance percentage with visual indicators.
 * Shows positive performance in green and negative in red.
 * Includes an arrow icon and proper accessibility labels.
 */

interface PerformanceIndicatorProps {
  percent: number;
}

export function PerformanceIndicator({ percent }: PerformanceIndicatorProps) {
  const isPositive = percent > 0;
  const isNeutral = percent === 0;
  
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
          <path fillRule="evenodd" d="M4 10a.75.75 0 01.75-.75h10.5a.75.75 0 010 1.5H4.75A.75.75 0 014 10z" clipRule="evenodd" />
        </svg>
      );
    }
    
    if (isPositive) {
      return (
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
        </svg>
      );
    }
    
    return (
      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" />
      </svg>
    );
  };

  const getStatusText = () => {
    if (isNeutral) return "No change";
    if (isPositive) return "Gain";
    return "Loss";
  };

  return (
    <div 
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 ${getColorClasses()}`}
      role="status"
      aria-label={`Performance: ${getStatusText()} of ${Math.abs(percent).toFixed(2)}%`}
    >
      <div className={getIconClasses()}>
        {getIcon()}
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-medium text-gray-600">Performance</span>
        <span className="text-lg font-bold">
          {isPositive && "+"}
          {percent.toFixed(2)}%
        </span>
      </div>
    </div>
  );
}

