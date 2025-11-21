/**
 * ErrorState Component
 * 
 * Displays an error message when data fails to load.
 * Provides a user-friendly error message and fallback text.
 */

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ 
  title = "Something went wrong",
  message,
  onRetry,
}: ErrorStateProps) {
  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div 
      className="rounded-lg border border-red-200 bg-red-50 p-6"
      role="alert"
      aria-live="assertive"
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 text-red-400"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-semibold text-red-800">
            {title}
          </h3>
          <div className="mt-2 text-sm text-red-700">
            {message}
          </div>
          <div className="mt-4">
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-md bg-red-100 px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

