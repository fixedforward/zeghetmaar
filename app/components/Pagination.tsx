import { buildPageList } from '../lib/pagination'

type Props = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, onPageChange }: Props) {
  if (totalPages <= 1) return null

  return (
    <div className="flex flex-wrap justify-center items-center gap-2 mt-4">
      <button
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="px-3 py-1 text-sm border rounded bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40"
      >
        ‹
      </button>
      {buildPageList(page, totalPages).map((item, i) =>
        item === 'ellipsis' ? (
          <span key={`ellipsis-${i}`} className="px-1 text-sm text-gray-400">
            …
          </span>
        ) : (
          <button
            key={item}
            onClick={() => onPageChange(item)}
            className={`px-3 py-1 text-sm border rounded ${item === page ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
          >
            {item}
          </button>
        )
      )}
      <button
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="px-3 py-1 text-sm border rounded bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-40"
      >
        ›
      </button>
    </div>
  )
}
