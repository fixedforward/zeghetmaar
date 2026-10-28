type Props = {
  value: string
  onChange: (value: string) => void
  placeholder: string
}

export function SearchInput({ value, onChange, placeholder }: Props) {
  return (
    <div className="relative flex-1 min-w-[160px]">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full p-1.5 pr-7 text-sm border rounded"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-sm"
          title="Wissen"
        >
          ✕
        </button>
      )}
    </div>
  )
}
