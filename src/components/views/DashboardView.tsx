import { useWallets } from "@/components/hooks/useWallets";
import { LoadingState } from "./LoadingState";
import { ErrorState } from "./ErrorState";
import { EmptyState } from "./EmptyState";
import { WalletList } from "./WalletList";

// ============================================================================
// Types
// ============================================================================

interface DashboardViewProps {
  accessToken: string;
}

// ============================================================================
// Component
// ============================================================================

export function DashboardView({ accessToken }: DashboardViewProps) {
  const viewModel = useWallets(accessToken);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100" data-test-id="dashboard">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Page Header */}
          <header className="mb-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">
                  Dashboard
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  Manage and track your financial wallets
                </p>
              </div>
              <a
                href="/wallets/new"
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 transition-colors"
                data-test-id="create-wallet-button"
              >
                <svg
                  className="-ml-0.5 mr-1.5 h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
                </svg>
                Add Wallet
              </a>
            </div>
          </header>

          {/* Main Content - Conditional Rendering Based on Status */}
          <main>
            {viewModel.status === "loading" && <LoadingState />}
            {viewModel.status === "error" && <ErrorState title="Failed to load wallets" message={viewModel.error || "An unexpected error occurred. Please check your connection and try again."} />}
            {viewModel.status === "empty" && <EmptyState />}
            {viewModel.status === "success" && <WalletList wallets={viewModel.wallets} />}
          </main>
        </div>
      </div>
  );
}

