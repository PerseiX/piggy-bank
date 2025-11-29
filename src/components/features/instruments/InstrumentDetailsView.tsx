/**
 * InstrumentDetailsView Component
 *
 * Main container for the instrument detail page.
 * Manages state, data fetching, and orchestrates all child components.
 */

import { useState } from "react";
import { toast } from "sonner";
import { useInstrumentDetails } from "@/components/hooks/useInstrumentDetails";
import { InstrumentHeader, type InstrumentHeaderViewModel } from "./InstrumentHeader";
import { InstrumentMetrics, type InstrumentMetricsViewModel } from "./InstrumentMetrics";
import { ValueChangeHistory } from "./ValueChangeHistory";
import { ConfirmDeleteDialog } from "@/components/views/wallet-detail/ConfirmDeleteDialog";
import { LoadingState } from "@/components/views/LoadingState";
import { ErrorState } from "@/components/views/ErrorState";
import type { InstrumentDto, ValueChangeDirection } from "@/types";

interface InstrumentDetailsViewProps {
  instrumentId: string;
  accessToken: string;
}

export default function InstrumentDetailsView({ instrumentId, accessToken }: InstrumentDetailsViewProps) {
  // ALL hooks must be called at the top, before any early returns
  const { viewModel, actions } = useInstrumentDetails(instrumentId, accessToken);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Handle loading state
  if (viewModel.status === "loading") {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <LoadingState message="Loading instrument details..." />
      </div>
    );
  }

  // Handle error state
  if (viewModel.status === "error" || !viewModel.instrument) {
    const errorTitle =
      viewModel.error?.status === 404
        ? "Instrument Not Found"
        : viewModel.error?.status === 403
          ? "Access Denied"
          : "Failed to Load Instrument";

    const errorMessage = viewModel.error?.message || "Could not load instrument details. Please try again.";

    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <ErrorState title={errorTitle} message={errorMessage} onRetry={actions.refresh} />
        <div className="mt-4">
          <a href="/" className="text-sm font-medium text-blue-600 hover:text-blue-500">
            ← Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  const instrument = viewModel.instrument;

  // Transform data for child components
  const headerViewModel: InstrumentHeaderViewModel = {
    name: instrument.name,
    type: instrument.type,
  };

  const metricsViewModel: InstrumentMetricsViewModel = {
    currentValuePln: instrument.current_value_pln,
    investedPln: instrument.invested_money_pln,
    goalPln: instrument.goal_pln,
    deltaPln: calculateDeltaPln(instrument),
    deltaDirection: calculateDeltaDirection(instrument),
  };

  // Event handlers
  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    try {
      await actions.deleteInstrument();
      toast.success("Instrument deleted successfully!");
      // Note: deleteInstrument action redirects to dashboard
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete instrument");
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {/* Back to Wallet Link */}
      <div className="mb-4">
        <a
          href={`/wallets/detail/${instrument.wallet_id}`}
          className="text-sm font-medium text-blue-600 hover:text-blue-500"
        >
          ← Back to Wallet
        </a>
      </div>

      {/* Header with name, type, and action buttons */}
      <InstrumentHeader instrument={headerViewModel} instrumentId={instrumentId} onDelete={handleDelete} />

      {/* Financial metrics cards */}
      <InstrumentMetrics metrics={metricsViewModel} />

      {/* Value change history accordion */}
      <ValueChangeHistory instrumentId={instrumentId} accessToken={accessToken} />

      {/* Delete confirmation dialog */}
      {showDeleteDialog && (
        <ConfirmDeleteDialog
          isOpen={true}
          onClose={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
          title="Delete Instrument"
          description={`Are you sure you want to delete "${instrument.name}"? This action cannot be undone and will delete all value change history for this instrument.`}
          isLoading={isDeleting}
        />
      )}
    </div>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculates the delta (difference) between current value and invested money.
 */
function calculateDeltaPln(instrument: InstrumentDto): string {
  const current = parseFloat(instrument.current_value_pln);
  const invested = parseFloat(instrument.invested_money_pln);
  const delta = current - invested;

  // Format with 2 decimal places, always show sign for non-zero values
  return Math.abs(delta).toFixed(2);
}

/**
 * Determines the direction of the delta.
 */
function calculateDeltaDirection(instrument: InstrumentDto): ValueChangeDirection {
  const current = parseFloat(instrument.current_value_pln);
  const invested = parseFloat(instrument.invested_money_pln);
  const delta = current - invested;

  if (delta > 0) return "increase";
  if (delta < 0) return "decrease";
  return "unchanged";
}
