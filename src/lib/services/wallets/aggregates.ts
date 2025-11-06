import type { WalletAggregatesDto } from "../../../types"

const ZERO_PLN = "0.00"

const emptyAggregates: WalletAggregatesDto = {
  target_grosze: 0,
  target_pln: ZERO_PLN,
  current_value_grosze: 0,
  current_value_pln: ZERO_PLN,
  invested_sum_grosze: 0,
  invested_sum_pln: ZERO_PLN,
  progress_percent: 0,
  performance_percent: 0,
}

export function buildEmptyWalletAggregates(): WalletAggregatesDto {
  return { ...emptyAggregates }
}

