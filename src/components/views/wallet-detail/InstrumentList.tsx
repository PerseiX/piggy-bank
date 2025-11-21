/**
 * InstrumentList Component
 * 
 * Renders the list of instruments in a table format and provides
 * an "Add Instrument" button.
 */

import { Button } from "@/components/ui/button";
import { InstrumentRow } from "./InstrumentRow";
import type { InstrumentDto } from "@/types";

interface InstrumentListProps {
  instruments: InstrumentDto[];
  onAddInstrument: () => void;
  onEditInstrument: (instrument: InstrumentDto) => void;
  onDeleteInstrument: (instrumentId: string) => void;
}

export function InstrumentList({
  instruments,
  onAddInstrument,
  onEditInstrument,
  onDeleteInstrument,
}: InstrumentListProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Instruments</h2>
        <Button onClick={onAddInstrument} aria-label="Add new instrument">
          Add Instrument
        </Button>
      </div>

      {instruments.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">
            No instruments yet. Add your first instrument to get started.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="py-3 px-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                  >
                    Name
                  </th>
                  <th
                    scope="col"
                    className="py-3 px-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider"
                  >
                    Type
                  </th>
                  <th
                    scope="col"
                    className="py-3 px-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider"
                  >
                    Invested
                  </th>
                  <th
                    scope="col"
                    className="py-3 px-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider"
                  >
                    Current Value
                  </th>
                  <th
                    scope="col"
                    className="py-3 px-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider"
                  >
                    Goal
                  </th>
                  <th
                    scope="col"
                    className="py-3 px-4 text-right text-xs font-medium text-gray-700 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {instruments.map((instrument) => (
                  <InstrumentRow
                    key={instrument.id}
                    instrument={instrument}
                    onEdit={onEditInstrument}
                    onDelete={onDeleteInstrument}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

