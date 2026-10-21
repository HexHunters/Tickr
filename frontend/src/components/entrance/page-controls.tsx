'use client'

export function PageControls({
  page,
  totalPages,
  onPage,
}: {
  page: number
  totalPages: number
  onPage: (page: number) => void
}) {
  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        className="button button-outline"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        Précédent
      </button>
      <span>
        Page {page} sur {Math.max(1, totalPages)}
      </span>
      <button
        className="button button-outline"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        Suivant
      </button>
    </nav>
  )
}
