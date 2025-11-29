/**
 * ProgressCircle Component
 *
 * Visual circular progress indicator showing the percentage of target achieved.
 * Uses SVG to draw a circular progress bar with proper accessibility attributes.
 */

interface ProgressCircleProps {
  percent: number;
}

export function ProgressCircle({ percent }: ProgressCircleProps) {
  // Normalize percentage to 0-100 range
  const normalizedPercent = Math.max(0, Math.min(100, percent));

  // SVG circle properties
  const size = 80;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (normalizedPercent / 100) * circumference;

  // Determine color based on progress
  const getColor = () => {
    if (normalizedPercent >= 100) return "text-green-600";
    if (normalizedPercent >= 75) return "text-blue-600";
    if (normalizedPercent >= 50) return "text-yellow-600";
    return "text-gray-600";
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90" aria-hidden="true">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${getColor()} transition-all duration-500`}
        />
      </svg>
      {/* Percentage text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-lg font-bold ${getColor()}`}>{normalizedPercent.toFixed(0)}%</span>
        <span className="text-xs text-gray-500">progress</span>
      </div>
      {/* Screen reader text */}
      <span className="sr-only">Progress: {normalizedPercent.toFixed(1)}% of target achieved</span>
    </div>
  );
}
