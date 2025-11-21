/**
 * WalletHeader Component
 * 
 * Presentational component that displays the wallet's name and description,
 * along with action buttons for editing and deleting the wallet.
 */

import { Button } from "@/components/ui/button";
import type { WalletDetailDto } from "@/types";

interface WalletHeaderProps {
  wallet: Pick<WalletDetailDto, "id" | "name" | "description">;
  onEdit: () => void;
  onDelete: () => void;
}

export function WalletHeader({ wallet, onEdit, onDelete }: WalletHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {wallet.name}
          </h1>
          {wallet.description && (
            <p className="text-gray-600 text-lg">
              {wallet.description}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={onEdit}
            variant="outline"
            aria-label="Edit wallet"
          >
            Edit
          </Button>
          <Button
            onClick={onDelete}
            variant="destructive"
            aria-label="Delete wallet"
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}

