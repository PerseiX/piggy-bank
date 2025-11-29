/**
 * LoadingState Component
 *
 * Displays a loading spinner while data is being fetched.
 * Includes proper ARIA attributes for accessibility.
 */

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = "Loading..." }: LoadingStateProps) {
  return (
    <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"
          aria-hidden="true"
        />
        <span className="text-sm text-gray-600">{message}</span>
        <span className="sr-only">{message}, please wait</span>
      </div>
    </div>
  );
}
