import { purchaseCosts, type PurchaseCosts } from '@/domain/costs'
import { findConflicts, trancheIdsInConflict, type Conflict } from '@/domain/eligibility'
import { buildPortfolio, coverOf, type Cover, type Portfolio } from '@/domain/portfolio'
import { useSessionStore } from '@/state/session-context'
import type { SessionState } from '@/state/session-state'
import { useSession } from '@/state/use-session'

export type Calculation = {
  state: SessionState
  costs: PurchaseCosts
  portfolio: Portfolio
  cover: Cover
  conflicts: readonly Conflict[]
  /** Which tranches to mark as clashing. */
  conflictedTrancheIds: ReadonlySet<number>
}

/**
 * Everything the page shows, derived from the session state.
 *
 * Computed during render rather than cached in state (STANDARDS.md §5): these are
 * functions of the state, and storing them would give two sources of truth that can
 * disagree. The React Compiler memoises the work, so dragging a slider does not
 * re-amortise loans whose figures did not move.
 */
export function useCalculation(): Calculation {
  const store = useSessionStore()
  const state = useSession(store)

  const costs = purchaseCosts({
    price: state.price,
    down: state.down,
    stateCode: state.stateCode,
    notaryPercent: state.notaryPercent,
    registryPercent: state.registryPercent,
    agentPercent: state.agentPercent,
    agentInvolved: state.agentInvolved,
  })

  const portfolio = buildPortfolio(state.tranches, state.programmes, state.profile)
  const conflicts = findConflicts(state.tranches, state.programmes)

  return {
    state,
    costs,
    portfolio,
    cover: coverOf(portfolio.totalBorrowed, state.price, state.down),
    conflicts,
    conflictedTrancheIds: trancheIdsInConflict(conflicts),
  }
}
