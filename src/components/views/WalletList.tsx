import type { WalletListItemDto } from "@/types";
import { WalletCard } from "./WalletCard";

/**
 * WalletList Component
 * 
 * Presentational component that displays wallets in a responsive grid layout.
 * Maps over the wallets array and renders a WalletCard for each item.
 */

interface WalletListProps {
  wallets: WalletListItemDto[];
}

export function WalletList({ wallets }: WalletListProps) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" data-test-id="wallet-list">
      {wallets.map((wallet) => (
        <WalletCard key={wallet.id} wallet={wallet} />
      ))}
    </div>
  );
}

