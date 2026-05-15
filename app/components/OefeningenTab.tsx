import type { useExercises } from '../hooks/useExercises'

type Props = ReturnType<typeof useExercises>

export function OefeningenTab(ex: Props) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">Handige links naar extra oefeningen om je Nederlands te verbeteren.</p>
        <button
          onClick={() => ex.setShowAddExercise(!ex.showAddExercise)}
          className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 shrink-0"
        >
          {ex.showAddExercise ? 'Annuleren' : '+ Toevoegen'}
        </button>
      </div>

      {ex.showAddExercise && (
        <div className="mb-4 p-3 border rounded bg-gray-50 space-y-2">
          <input
            type="text"
            value={ex.newExerciseName}
            onChange={(e) => ex.setNewExerciseName(e.target.value)}
            placeholder="Naam van de oefening"
            className="w-full p-2 border rounded"
          />
          <input
            type="url"
            value={ex.newExerciseUrl}
            onChange={(e) => ex.setNewExerciseUrl(e.target.value)}
            placeholder="https://..."
            className="w-full p-2 border rounded"
          />
          <button
            onClick={ex.handleAddExercise}
            disabled={!ex.newExerciseName.trim() || !ex.newExerciseUrl.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 text-sm"
          >
            Opslaan
          </button>
        </div>
      )}

      {ex.exercises.length === 0 && <p className="text-sm text-gray-400">Geen oefeningen. Voeg er een toe!</p>}

      <ul className="space-y-2">
        {ex.exercises.map((exercise) => (
          <li key={exercise.id} className="border rounded p-3 bg-white">
            {ex.editExerciseId === exercise.id ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={ex.editExerciseName}
                  onChange={(e) => ex.setEditExerciseName(e.target.value)}
                  className="w-full p-2 border rounded"
                />
                <input
                  type="url"
                  value={ex.editExerciseUrl}
                  onChange={(e) => ex.setEditExerciseUrl(e.target.value)}
                  className="w-full p-2 border rounded"
                />
                <div className="flex gap-2">
                  <button
                    onClick={ex.handleEditExercise}
                    disabled={!ex.editExerciseName.trim() || !ex.editExerciseUrl.trim()}
                    className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                  >
                    Opslaan
                  </button>
                  <button
                    onClick={() => ex.setEditExerciseId(null)}
                    className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
                  >
                    Annuleren
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <a
                  href={exercise.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline font-semibold"
                >
                  {exercise.name}
                </a>
                <div className="flex gap-2">
                  {ex.deleteExerciseConfirmId === exercise.id ? (
                    <>
                      <button
                        onClick={() => ex.handleDeleteExercise(exercise.id)}
                        className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Bevestigen
                      </button>
                      <button
                        onClick={() => ex.setDeleteExerciseConfirmId(null)}
                        className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
                      >
                        Annuleren
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => ex.startEditExercise(exercise)}
                        className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
                      >
                        Bewerken
                      </button>
                      <button
                        onClick={() => ex.setDeleteExerciseConfirmId(exercise.id)}
                        className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200"
                      >
                        Verwijderen
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
