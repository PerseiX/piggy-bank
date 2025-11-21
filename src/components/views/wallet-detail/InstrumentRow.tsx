/**
 * InstrumentRow Component
 * 
 * Displays a single instrument in a table row format with its key data
 * and action buttons for editing and deleting.
 */

import { Button } from "@/components/ui/button";
import type { InstrumentDto } from "@/types";

interface InstrumentRowProps {
  instrument: InstrumentDto;
  onEdit: (instrument: InstrumentDto) => void;
  onDelete: (instrumentId: string) => void;
}

export function InstrumentRow({ instrument, onEdit, onDelete }: InstrumentRowProps) {
  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50">
      {/* Name */}
      <td className="py-4 px-4">
        <div className="font-medium text-gray-900">{instrument.name}</div>
        {instrument.short_description && (
          <div className="text-sm text-gray-600 mt-1">
            {instrument.short_description}
          </div>
        )}
      </td>

      {/* Type */}
      <td className="py-4 px-4 text-gray-700">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {instrument.type}
        </span>
      </td>

      {/* Invested Money */}
      <td className="py-4 px-4 text-right text-gray-900 font-medium">
        {instrument.invested_money_pln} PLN
      </td>

      {/* Current Value */}
      <td className="py-4 px-4 text-right text-gray-900 font-medium">
        {instrument.current_value_pln} PLN
      </td>

      {/* Goal */}
      <td className="py-4 px-4 text-right text-gray-700">
        {instrument.goal_pln || "—"}
        {instrument.goal_pln && " PLN"}
      </td>

      {/* Actions */}
      <td className="py-4 px-4">
        <div className="flex gap-2 justify-end">
          <Button
            onClick={() => onEdit(instrument)}
            variant="outline"
            size="sm"
            aria-label={`Edit ${instrument.name}`}
          >
            Edit
          </Button>
          <Button
            onClick={() => onDelete(instrument.id)}
            variant="destructive"
            size="sm"
            aria-label={`Delete ${instrument.name}`}
          >
            Delete
          </Button>
        </div>
      </td>
    </tr>
  );
}

