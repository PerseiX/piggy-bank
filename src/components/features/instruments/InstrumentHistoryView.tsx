/**
 * InstrumentHistoryView Component
 *
 * Displays the full history of an instrument with charts and detailed table.
 * This is a dedicated page for viewing and analyzing value changes over time.
 */

import { useState, useEffect, useCallback } from "react";
import { useInstrumentDetails } from "@/components/hooks/useInstrumentDetails";
import { ValueChangeChart } from "./ValueChangeChart";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingState } from "@/components/views/LoadingState";
import { ErrorState } from "@/components/views/ErrorState";
import type { ValueChangeDto } from "@/types";

interface InstrumentHistoryViewProps {
  instrumentId: string;
  accessToken: string;
}

type HistoryStatus = "idle" | "loading" | "success" | "error";

export default function InstrumentHistoryView({ instrumentId, accessToken }: InstrumentHistoryViewProps) {
  // Fetch instrument details
  const { viewModel: instrumentViewModel, actions } = useInstrumentDetails(instrumentId, accessToken);

  // Fetch history data
  const [historyStatus, setHistoryStatus] = useState<HistoryStatus>("idle");
  const [history, setHistory] = useState<ValueChangeDto[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      setHistoryStatus("loading");
      setHistoryError(null);

      const response = await fetch(`/api/instruments/${instrumentId}/value-changes`, {
        method: "GET",
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
        throw new Error(errorData.message || "Failed to fetch value change history");
      }

      const result = await response.json();
      const historyData = result.data as ValueChangeDto[];

      setHistory(historyData);
      setHistoryStatus("success");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      setHistoryError(errorMessage);
      setHistoryStatus("error");
    }
  }, [instrumentId, accessToken]);

  useEffect(() => {
    if (instrumentViewModel.status === "success") {
      fetchHistory();
    }
  }, [instrumentViewModel.status, fetchHistory]);

  // Handle loading state
  if (instrumentViewModel.status === "loading" || historyStatus === "loading") {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <LoadingState message="Loading instrument history..." />
      </div>
    );
  }

  // Handle error state for instrument
  if (instrumentViewModel.status === "error" || !instrumentViewModel.instrument) {
    const errorTitle =
      instrumentViewModel.error?.status === 404
        ? "Instrument Not Found"
        : instrumentViewModel.error?.status === 403
          ? "Access Denied"
          : "Failed to Load Instrument";

    const errorMessage = instrumentViewModel.error?.message || "Could not load instrument details. Please try again.";

    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <ErrorState title={errorTitle} message={errorMessage} onRetry={actions.refresh} />
        <div className="mt-4">
          <a href="/" className="text-sm font-medium text-blue-600 hover:text-blue-500">
            ← Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  const instrument = instrumentViewModel.instrument;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const formatCurrency = (value: string) => {
    return `${value} PLN`;
  };

  const getDeltaColorClass = (direction: string) => {
    if (direction === "increase") return "text-green-700";
    if (direction === "decrease") return "text-red-700";
    return "text-gray-700";
  };

  const getDeltaPrefix = (direction: string) => {
    if (direction === "increase") return "+";
    if (direction === "decrease") return "";
    return "";
  };

  const instrumentTypeLabels: Record<string, string> = {
    stocks: "Stocks",
    bonds: "Bonds",
    etf: "ETF",
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* Navigation */}
      <div className="mb-4 flex items-center gap-4">
        <a href={`/instruments/${instrumentId}`} className="text-sm font-medium text-blue-600 hover:text-blue-500">
          ← Back to Instrument Details
        </a>
        <span className="text-gray-300">|</span>
        <a href="/" className="text-sm font-medium text-blue-600 hover:text-blue-500">
          Dashboard
        </a>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">{instrument.name} - Value History</h1>
          <Badge variant="secondary" className="w-fit">
            {instrumentTypeLabels[instrument.type]}
          </Badge>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-sm font-medium text-gray-600">Current Value</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{formatCurrency(instrument.current_value_pln)}</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-sm font-medium text-gray-600">Invested Money</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{formatCurrency(instrument.invested_money_pln)}</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-sm font-medium text-gray-600">Total Changes</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{history.length}</div>
        </div>
      </div>

      {/* Chart Section */}
      {historyStatus === "error" && (
        <div className="mb-8">
          <ErrorState
            title="Failed to Load History"
            message={historyError || "Could not load value change history. Please try again."}
            onRetry={fetchHistory}
          />
        </div>
      )}

      {historyStatus === "success" && history.length === 0 && (
        <div className="mb-8 rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-sm text-gray-600">
            No value changes recorded yet. Start tracking changes to see the chart and history.
          </p>
        </div>
      )}

      {historyStatus === "success" && history.length > 0 && (
        <>
          {/* Chart */}
          <div className="mb-8">
            <ValueChangeChart history={history} currentValuePln={instrument.current_value_pln} />
          </div>

          {/* Detailed Table */}
          <div className="rounded-lg border border-gray-200 bg-white">
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
              <h3 className="text-lg font-semibold text-gray-900">Detailed History</h3>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead className="text-right">Before</TableHead>
                    <TableHead className="text-right">After</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((change) => (
                    <TableRow key={change.id}>
                      <TableCell className="font-medium">{formatDate(change.created_at)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(change.before_value_pln)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(change.after_value_pln)}</TableCell>
                      <TableCell className={`text-right font-semibold ${getDeltaColorClass(change.direction)}`}>
                        {getDeltaPrefix(change.direction)}
                        {formatCurrency(change.delta_pln)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
