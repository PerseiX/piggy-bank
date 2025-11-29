/**
 * InstrumentHeader Component
 *
 * Displays the instrument's name and type, with action buttons for editing and deleting.
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { InstrumentType } from "@/types";

export interface InstrumentHeaderViewModel {
  name: string;
  type: InstrumentType;
}

interface InstrumentHeaderProps {
  instrument: InstrumentHeaderViewModel;
  instrumentId: string;
  onDelete: () => void;
}

const instrumentTypeLabels: Record<InstrumentType, string> = {
  stocks: "Stocks",
  bonds: "Bonds",
  etf: "ETF",
};

export function InstrumentHeader({ instrument, instrumentId, onDelete }: InstrumentHeaderProps) {
  const handleViewHistory = () => {
    window.location.href = `/instruments/${instrumentId}/history`;
  };

  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">{instrument.name}</h1>
        <Badge variant="secondary" className="w-fit">
          {instrumentTypeLabels[instrument.type]}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleViewHistory} variant="default" aria-label="View full history with charts">
          <svg className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
            />
          </svg>
          View History
        </Button>
        <Button onClick={onDelete} variant="destructive" aria-label="Delete instrument">
          Delete
        </Button>
      </div>
    </div>
  );
}
