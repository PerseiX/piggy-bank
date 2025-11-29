/**
 * ValueChangeHistory Component
 *
 * Displays the instrument's value change history in a collapsible accordion.
 * Implements lazy loading - data is fetched only when the accordion is expanded for the first time.
 */

import { useState, useEffect } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ValueChangeDto } from "@/types";

interface ValueChangeHistoryProps {
  instrumentId: string;
  accessToken: string;
}

type HistoryStatus = "idle" | "loading" | "success" | "error";

export function ValueChangeHistory({ instrumentId, accessToken }: ValueChangeHistoryProps) {
  const [status, setStatus] = useState<HistoryStatus>("idle");
  const [history, setHistory] = useState<ValueChangeDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true); // Open by default

  // Fetch history when accordion is expanded for the first time
  useEffect(() => {
    if (isExpanded && status === "idle") {
      fetchHistory();
    }
  }, [isExpanded]);

  const fetchHistory = async () => {
    try {
      setStatus("loading");
      setError(null);

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
      setStatus("success");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      setStatus("error");
    }
  };

  const handleAccordionChange = (value: string) => {
    setIsExpanded(value === "history");
  };

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

  return (
    <div className="mb-8">
      <Accordion type="single" collapsible onValueChange={handleAccordionChange} defaultValue="history">
        <AccordionItem value="history">
          <AccordionTrigger className="text-lg font-semibold">Value Change History</AccordionTrigger>
          <AccordionContent>
            {status === "loading" && (
              <div className="flex items-center justify-center py-8" role="status">
                <div className="flex flex-col items-center gap-3">
                  <div
                    className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600"
                    aria-hidden="true"
                  />
                  <span className="text-sm text-gray-600">Loading history...</span>
                </div>
              </div>
            )}

            {status === "error" && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4" role="alert">
                <p className="text-sm text-red-800">Failed to load value change history: {error}</p>
                <button
                  onClick={fetchHistory}
                  className="mt-2 text-sm font-semibold text-red-800 underline hover:no-underline"
                >
                  Try again
                </button>
              </div>
            )}

            {status === "success" && history.length === 0 && (
              <div className="py-8 text-center">
                <p className="text-sm text-gray-600">No value changes recorded yet.</p>
              </div>
            )}

            {status === "success" && history.length > 0 && (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
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
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
