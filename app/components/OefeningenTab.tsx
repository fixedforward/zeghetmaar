import type { useExercises } from '../hooks/useExercises'

type Props = ReturnType<typeof useExercises>

export function OefeningenTab(ex: Props) {
  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">Handige links naar extra oefeningen om je Nederlands te verbeteren.</p>

      {ex.exercises.length === 0 && <p className="text-sm text-gray-400">Geen oefeningen beschikbaar.</p>}

      <ul className="space-y-2">
        {ex.exercises.map((exercise) => (
          <li key={exercise.id} className="border rounded p-3 bg-white">
            <a
              href={exercise.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline font-semibold"
            >
              {exercise.name}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
