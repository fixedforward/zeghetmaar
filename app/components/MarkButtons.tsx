// Fout/Goed once the answer shows. On a phone they're big and stay at the bottom of the
// FocusScreen, so a thumb can reach them.
export function MarkButtons({ onMark }: { onMark: (correct: boolean) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3 max-sm:sticky max-sm:bottom-0 max-sm:-mx-4 max-sm:px-4 max-sm:py-3 max-sm:bg-[#0e141b] sm:flex sm:justify-center">
      <button
        type="button"
        onClick={() => onMark(false)}
        title="Sneltoets: 1"
        className="min-h-14 sm:min-h-11 px-6 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600"
      >
        ✗ Fout (1)
      </button>
      <button
        type="button"
        onClick={() => onMark(true)}
        title="Sneltoets: 2"
        className="min-h-14 sm:min-h-11 px-6 rounded-xl bg-green-500 text-white font-semibold hover:bg-green-600"
      >
        ✓ Goed (2)
      </button>
    </div>
  )
}
