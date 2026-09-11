import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: CalculatorRoute,
})

/** Scaffold only — the calculator sections arrive in Phase 7. */
function CalculatorRoute() {
  return <main />
}
