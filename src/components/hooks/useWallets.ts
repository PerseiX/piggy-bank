import { useEffect, useState } from "react";
import type { WalletListItemDto } from "@/types";

// ============================================================================
// Types
// ============================================================================

type DashboardStatus = "loading" | "success" | "error" | "empty";

interface DashboardViewModel {
  status: DashboardStatus;
  wallets: WalletListItemDto[];
  error: string | null;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Custom hook to fetch wallet data from the API.
 * Manages loading, success, empty, and error states.
 *
 * @param accessToken - The user's access token for API authentication
 * @returns DashboardViewModel containing the current state and wallet data
 */
export function useWallets(accessToken: string): DashboardViewModel {
  const [viewModel, setViewModel] = useState<DashboardViewModel>({
    status: "loading",
    wallets: [],
    error: null,
  });

  useEffect(() => {
    const fetchWallets = async () => {
      try {
        const response = await fetch("/api/wallets", {
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

        // Handle other error responses
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Failed to fetch wallets: ${response.status}`);
        }

        // Parse successful response
        const result = await response.json();
        const wallets = result.data as WalletListItemDto[];

        // Check if the response is empty
        if (!wallets || wallets.length === 0) {
          setViewModel({
            status: "empty",
            wallets: [],
            error: null,
          });
        } else {
          setViewModel({
            status: "success",
            wallets,
            error: null,
          });
        }
      } catch (error) {
        // Handle fetch errors
        const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";

        setViewModel({
          status: "error",
          wallets: [],
          error: errorMessage,
        });
      }
    };

    fetchWallets();
  }, [accessToken]);

  return viewModel;
}
