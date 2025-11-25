/**
 * WalletDetailView Component
 * 
 * Main container for the wallet detail page.
 * Manages state, data fetching, and orchestrates all child components.
 */

import { useState } from "react";
import { toast } from "sonner";
import { useWalletDetail, type ModalState } from "@/components/hooks/useWalletDetail";
import { WalletHeader } from "./wallet-detail/WalletHeader";
import { AggregatesSummary } from "./wallet-detail/AggregatesSummary";
import { InstrumentList } from "./wallet-detail/InstrumentList";
import { WalletFormModal } from "./wallet-detail/WalletFormModal";
import { InstrumentFormModal } from "./wallet-detail/InstrumentFormModal";
import { QuickEditValuesModal } from "./wallet-detail/QuickEditValuesModal";
import { ConfirmDeleteDialog } from "./wallet-detail/ConfirmDeleteDialog";
import { LoadingState } from "./LoadingState";
import { ErrorState } from "./ErrorState";
import type { InstrumentDto, CreateInstrumentCommand, UpdateInstrumentCommand, UpdateWalletCommand } from "@/types";

interface WalletDetailViewProps {
  walletId: string;
  accessToken: string;
}

export default function WalletDetailView({ walletId, accessToken }: WalletDetailViewProps) {
  // ALL hooks must be called at the top, before any early returns
  const { viewModel, actions } = useWalletDetail(walletId, accessToken);
  const [modalState, setModalState] = useState<ModalState>({ type: "idle" });
  const [isDeletingWallet, setIsDeletingWallet] = useState(false);
  const [isDeletingInstrument, setIsDeletingInstrument] = useState(false);

  // Handle loading state
  if (viewModel.status === "loading") {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <LoadingState message="Loading wallet details..." />
      </div>
    );
  }

  // Handle error state
  if (viewModel.status === "error" || !viewModel.walletData) {
    return (
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <ErrorState
          title="Failed to Load Wallet"
          message={viewModel.error || "Could not load wallet details. Please try again."}
          onRetry={actions.refresh}
        />
      </div>
    );
  }

  const wallet = viewModel.walletData;

  // Event handlers for wallet actions
  const handleEditWallet = () => {
    setModalState({
      type: "edit-wallet",
      wallet: {
        id: wallet.id,
        name: wallet.name,
        description: wallet.description,
      },
    });
  };

  const handleDeleteWallet = () => {
    setModalState({
      type: "delete-wallet",
      walletId: wallet.id,
      walletName: wallet.name,
    });
  };

  // Event handlers for instrument actions
  const handleAddInstrument = () => {
    setModalState({ type: "create-instrument" });
  };

  const handleQuickEditValues = (instrument: InstrumentDto) => {
    setModalState({ type: "quick-edit-values", instrument });
  };

  const handleEditInstrument = (instrument: InstrumentDto) => {
    setModalState({
      type: "edit-instrument",
      instrument,
    });
  };

  const handleDeleteInstrument = (instrumentId: string) => {
    const instrument = wallet.instruments.find((i) => i.id === instrumentId);
    if (instrument) {
      setModalState({
        type: "delete-instrument",
        instrumentId: instrument.id,
        instrumentName: instrument.name,
      });
    }
  };

  // Close modal handler
  const closeModal = () => {
    setModalState({ type: "idle" });
  };

  // Handler for wallet update submission
  const handleWalletUpdate = async (command: UpdateWalletCommand) => {
    try {
      await actions.updateWallet(command);
      toast.success("Wallet updated successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update wallet");
      throw error; // Re-throw to prevent modal from closing
    }
  };

  // Handler for instrument creation
  const handleInstrumentCreate = async (command: CreateInstrumentCommand) => {
    try {
      await actions.createInstrument(command);
      toast.success("Instrument created successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create instrument");
      throw error;
    }
  };

  // Handler for instrument update
  const handleInstrumentUpdate = async (command: UpdateInstrumentCommand) => {
    if (modalState.type !== "edit-instrument") return;
    try {
      await actions.updateInstrument(modalState.instrument.id, command);
      toast.success("Instrument updated successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update instrument");
      throw error;
    }
  };

  // Handler for quick values update
  const handleQuickValuesUpdate = async (command: UpdateInstrumentCommand) => {
    if (modalState.type !== "quick-edit-values") return;
    try {
      await actions.updateInstrument(modalState.instrument.id, command);
      toast.success("Values updated successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update values");
      throw error;
    }
  };

  // Handler for wallet deletion confirmation
  const handleWalletDeleteConfirm = async () => {
    setIsDeletingWallet(true);
    try {
      await actions.deleteWallet();
      toast.success("Wallet deleted successfully!");
      // Note: deleteWallet action redirects to dashboard
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete wallet");
      setIsDeletingWallet(false);
    }
  };

  // Handler for instrument deletion confirmation
  const handleInstrumentDeleteConfirm = async () => {
    if (modalState.type !== "delete-instrument") return;
    setIsDeletingInstrument(true);
    try {
      await actions.deleteInstrument(modalState.instrumentId);
      toast.success("Instrument deleted successfully!");
      closeModal();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete instrument");
    } finally {
      setIsDeletingInstrument(false);
    }
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <WalletHeader
        wallet={wallet}
        onEdit={handleEditWallet}
        onDelete={handleDeleteWallet}
      />

      <AggregatesSummary aggregates={wallet.aggregates} />

      <InstrumentList
        instruments={wallet.instruments}
        onAddInstrument={handleAddInstrument}
        onQuickEditValues={handleQuickEditValues}
        onEditInstrument={handleEditInstrument}
        onDeleteInstrument={handleDeleteInstrument}
      />

      {/* Wallet Edit Modal */}
      {modalState.type === "edit-wallet" && (
        <WalletFormModal
          isOpen={true}
          onClose={closeModal}
          onSubmit={handleWalletUpdate}
          initialData={modalState.wallet}
        />
      )}

      {/* Instrument Create Modal */}
      {modalState.type === "create-instrument" && (
        <InstrumentFormModal
          isOpen={true}
          onClose={closeModal}
          onSubmit={handleInstrumentCreate}
          mode="create"
        />
      )}

      {/* Quick Edit Values Modal */}
      {modalState.type === "quick-edit-values" && (
        <QuickEditValuesModal
          isOpen={true}
          onClose={closeModal}
          onSubmit={handleQuickValuesUpdate}
          instrument={modalState.instrument}
        />
      )}

      {/* Instrument Edit Modal */}
      {modalState.type === "edit-instrument" && (
        <InstrumentFormModal
          isOpen={true}
          onClose={closeModal}
          onSubmit={handleInstrumentUpdate}
          mode="edit"
          initialData={modalState.instrument}
        />
      )}

      {/* Wallet Delete Confirmation */}
      {modalState.type === "delete-wallet" && (
        <ConfirmDeleteDialog
          isOpen={true}
          onClose={closeModal}
          onConfirm={handleWalletDeleteConfirm}
          title="Delete Wallet"
          description={`Are you sure you want to delete "${modalState.walletName}"? This action cannot be undone and will delete all instruments within this wallet.`}
          isLoading={isDeletingWallet}
        />
      )}

      {/* Instrument Delete Confirmation */}
      {modalState.type === "delete-instrument" && (
        <ConfirmDeleteDialog
          isOpen={true}
          onClose={closeModal}
          onConfirm={handleInstrumentDeleteConfirm}
          title="Delete Instrument"
          description={`Are you sure you want to delete "${modalState.instrumentName}"? This action cannot be undone.`}
          isLoading={isDeletingInstrument}
        />
      )}
    </div>
  );
}

