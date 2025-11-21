/**
 * EmptyState Component
 * 
 * Displayed when the user has no wallets yet.
 * Encourages the user to create their first wallet.
 */
export function EmptyState() {
  return (
    <div className="text-center py-12" role="status" aria-live="polite">
      <svg
        className="mx-auto h-12 w-12 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
      </svg>
      <h3 className="mt-4 text-lg font-semibold text-gray-900">
        No wallets yet
      </h3>
      <p className="mt-2 text-sm text-gray-500">
        Get started by creating your first financial wallet.
      </p>
      <div className="mt-6">
        <a
          href="/wallets/new"
          className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors"
        >
          <svg
            className="-ml-0.5 mr-1.5 h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
          Create First Wallet
        </a>
      </div>
    </div>
  );
}

