import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/library')({
  component: LibraryRoute,
})

/** Scaffold only — the programme editor arrives in Phase 7. */
function LibraryRoute() {
  return <main />
}
