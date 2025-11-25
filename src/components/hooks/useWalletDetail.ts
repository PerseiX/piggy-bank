import { useState, useEffect, useCallback } from "react";
import type {
  WalletDetailDto,
  InstrumentDto,
  CreateInstrumentCommand,
  UpdateInstrumentCommand,
  UpdateWalletCommand,
} from "@/types";

// ============================================================================
// ViewModel Types
// ============================================================================

/**
 * Describes the data-fetching status of the view
 */
type ViewStatus = "loading" | "success" | "error" | "idle";

/**
 * The main state object for the WalletDetailView component
 */
export type WalletDetailViewModel = {
  status: ViewStatus;
  walletData: WalletDetailDto | null;
  error: string | null;
};

/**
 * Represents the currently active modal and its required data
 */
export type ModalState =
  | { type: "idle" }
  | { type: "create-instrument" }
  | { type: "quick-edit-values"; instrument: InstrumentDto }
  | { type: "edit-instrument"; instrument: InstrumentDto }
  | { type: "edit-wallet"; wallet: Pick<WalletDetailDto, "id" | "name" | "description"> }
  | { type: "delete-instrument"; instrumentId: string; instrumentName: string }
  | { type: "delete-wallet"; walletId: string; walletName: string };

// ============================================================================
// Hook Return Type
// ============================================================================

export type UseWalletDetailReturn = {
  viewModel: WalletDetailViewModel;
  actions: {
    createInstrument: (command: CreateInstrumentCommand) => Promise<void>;
    updateInstrument: (instrumentId: string, command: UpdateInstrumentCommand) => Promise<void>;
    deleteInstrument: (instrumentId: string) => Promise<void>;
    updateWallet: (command: UpdateWalletCommand) => Promise<void>;
    deleteWallet: () => Promise<void>;
    refresh: () => Promise<void>;
  };
};

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Custom hook to manage wallet detail view state and API interactions.
 * Handles data fetching, mutations, and error states.
 * 
 * @param walletId - The UUID of the wallet to fetch
 * @param accessToken - The user's access token for API authentication
 * @returns ViewModel and actions object with mutation functions
 */
export function useWalletDetail(
  walletId: string,
  accessToken: string
): UseWalletDetailReturn {
  const [viewModel, setViewModel] = useState<WalletDetailViewModel>({
    status: "loading",
    walletData: null,
    error: null,
  });

  /**
   * Fetches wallet details from the API.
   * Updates the viewModel state based on the response.
   */
  const fetchWalletDetail = useCallback(async () => {
    try {
      setViewModel((prev) => ({ ...prev, status: "loading", error: null }));

      const response = await fetch(`/api/wallets/${walletId}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      // Handle unauthorized access
      if (response.status === 401) {
        window.location.href = "/signin";
        return;
      }

      // Handle not found
      if (response.status === 404) {
        setViewModel({
          status: "error",
          walletData: null,
          error: "Wallet not found",
        });
        return;
      }

      // Handle forbidden access
      if (response.status === 403) {
        setViewModel({
          status: "error",
          walletData: null,
          error: "You do not have permission to view this wallet",
        });
        return;
      }

      // Handle other error responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Failed to fetch wallet: ${response.status}`
        );
      }

      // Parse successful response
      const result = await response.json();
      const walletData = result.data as WalletDetailDto;

      setViewModel({
        status: "success",
        walletData,
        error: null,
      });
    } catch (error) {
      // Handle fetch errors
      const errorMessage =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred";

      setViewModel({
        status: "error",
        walletData: null,
        error: errorMessage,
      });
    }
  }, [walletId, accessToken]);

  /**
   * Creates a new instrument in this wallet.
   * 
   * @param command - The instrument creation data
   * @throws Error if the API call fails
   */
  const createInstrument = useCallback(
    async (command: CreateInstrumentCommand): Promise<void> => {
      const response = await fetch(`/api/wallets/${walletId}/instruments`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
      });

      if (response.status === 401) {
        window.location.href = "/signin";
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create instrument");
      }

      // Refresh wallet data after successful creation
      await fetchWalletDetail();
    },
    [walletId, accessToken, fetchWalletDetail]
  );

  /**
   * Updates an existing instrument.
   * 
   * @param instrumentId - The UUID of the instrument to update
   * @param command - The instrument update data
   * @throws Error if the API call fails
   */
  const updateInstrument = useCallback(
    async (
      instrumentId: string,
      command: UpdateInstrumentCommand
    ): Promise<void> => {
      const response = await fetch(`/api/instruments/${instrumentId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
      });

      if (response.status === 401) {
        window.location.href = "/signin";
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update instrument");
      }

      // Refresh wallet data after successful update
      await fetchWalletDetail();
    },
    [accessToken, fetchWalletDetail]
  );

  /**
   * Deletes an instrument.
   * 
   * @param instrumentId - The UUID of the instrument to delete
   * @throws Error if the API call fails
   */
  const deleteInstrument = useCallback(
    async (instrumentId: string): Promise<void> => {
      const response = await fetch(`/api/instruments/${instrumentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401) {
        window.location.href = "/signin";
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to delete instrument");
      }

      // Refresh wallet data after successful deletion
      await fetchWalletDetail();
    },
    [accessToken, fetchWalletDetail]
  );

  /**
   * Updates the wallet's basic information.
   * 
   * @param command - The wallet update data
   * @throws Error if the API call fails
   */
  const updateWallet = useCallback(
    async (command: UpdateWalletCommand): Promise<void> => {
      const response = await fetch(`/api/wallets/${walletId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
      });

      if (response.status === 401) {
        window.location.href = "/signin";
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update wallet");
      }

      // Refresh wallet data after successful update
      await fetchWalletDetail();
    },
    [walletId, accessToken, fetchWalletDetail]
  );

  /**
   * Deletes the wallet.
   * Note: This will redirect the user to the dashboard after successful deletion.
   * 
   * @throws Error if the API call fails
   */
  const deleteWallet = useCallback(async (): Promise<void> => {
    const response = await fetch(`/api/wallets/${walletId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (response.status === 401) {
      window.location.href = "/signin";
      return;
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Failed to delete wallet");
    }

    // Redirect to dashboard after successful deletion
    window.location.href = "/";
  }, [walletId, accessToken]);

  /**
   * Manually refresh the wallet data.
   */
  const refresh = useCallback(async () => {
    await fetchWalletDetail();
  }, [fetchWalletDetail]);

  // Fetch wallet details on mount or when walletId/accessToken changes
  useEffect(() => {
    fetchWalletDetail();
  }, [fetchWalletDetail]);

  return {
    viewModel,
    actions: {
      createInstrument,
      updateInstrument,
      deleteInstrument,
      updateWallet,
      deleteWallet,
      refresh,
    },
  };
}

