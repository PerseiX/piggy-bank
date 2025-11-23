import { useState, useEffect, useCallback } from "react";
import type { InstrumentDto } from "@/types";

// ============================================================================
// ViewModel Types
// ============================================================================

/**
 * Describes the data-fetching status of the view
 */
type ViewStatus = "loading" | "success" | "error" | "idle";

/**
 * The main state object for the InstrumentDetailsView component
 */
export type InstrumentDetailsViewModel = {
  status: ViewStatus;
  instrument: InstrumentDto | null;
  error: { status: number; message: string } | null;
};

// ============================================================================
// Hook Return Type
// ============================================================================

export type UseInstrumentDetailsReturn = {
  viewModel: InstrumentDetailsViewModel;
  actions: {
    deleteInstrument: () => Promise<void>;
    refresh: () => Promise<void>;
  };
};

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Custom hook to manage instrument details view state and API interactions.
 * Handles data fetching, mutations, and error states.
 * 
 * @param instrumentId - The UUID of the instrument to fetch
 * @param accessToken - The user's access token for API authentication
 * @returns ViewModel and actions object with mutation functions
 */
export function useInstrumentDetails(
  instrumentId: string,
  accessToken: string
): UseInstrumentDetailsReturn {
  const [viewModel, setViewModel] = useState<InstrumentDetailsViewModel>({
    status: "loading",
    instrument: null,
    error: null,
  });

  /**
   * Fetches instrument details from the API.
   * Updates the viewModel state based on the response.
   */
  const fetchInstrumentDetails = useCallback(async () => {
    try {
      setViewModel((prev) => ({ ...prev, status: "loading", error: null }));

      const response = await fetch(`/api/instruments/${instrumentId}`, {
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
          instrument: null,
          error: {
            status: 404,
            message: "Instrument not found",
          },
        });
        return;
      }

      // Handle forbidden access
      if (response.status === 403) {
        setViewModel({
          status: "error",
          instrument: null,
          error: {
            status: 403,
            message: "You do not have permission to view this instrument",
          },
        });
        return;
      }

      // Handle other error responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setViewModel({
          status: "error",
          instrument: null,
          error: {
            status: response.status,
            message: errorData.message || `Failed to fetch instrument: ${response.status}`,
          },
        });
        return;
      }

      // Parse successful response
      const result = await response.json();
      const instrument = result.data as InstrumentDto;

      setViewModel({
        status: "success",
        instrument,
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
        instrument: null,
        error: {
          status: 500,
          message: errorMessage,
        },
      });
    }
  }, [instrumentId, accessToken]);

  /**
   * Deletes the instrument.
   * Note: This will redirect the user to the dashboard after successful deletion.
   * 
   * @throws Error if the API call fails
   */
  const deleteInstrument = useCallback(async (): Promise<void> => {
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

    // Redirect to dashboard after successful deletion
    window.location.href = "/";
  }, [instrumentId, accessToken]);

  /**
   * Manually refresh the instrument data.
   */
  const refresh = useCallback(async () => {
    await fetchInstrumentDetails();
  }, [fetchInstrumentDetails]);

  // Fetch instrument details on mount or when instrumentId/accessToken changes
  useEffect(() => {
    fetchInstrumentDetails();
  }, [fetchInstrumentDetails]);

  return {
    viewModel,
    actions: {
      deleteInstrument,
      refresh,
    },
  };
}

