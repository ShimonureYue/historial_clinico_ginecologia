import { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import api from '../lib/api'

export default function PatientSearchSelect({ value, onChange, className = '' }) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)
  const timerRef = useRef(null)

  useEffect(() => {
    if (value && !selected) {
      api.get(`/pacientes/${value}`).then((r) => {
        const p = r.data
        setSelected({ id: p.id, nombre: `${p.nombre} ${p.a_paterno} ${p.a_materno || ''}`.trim(), fecha_nacimiento: p.fecha_nacimiento })
      }).catch(() => {})
    }
  }, [value])

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const doSearch = (q) => {
    setSearch(q)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (q.length < 2) { setResults([]); return }
    timerRef.current = setTimeout(() => {
      setLoading(true)
      api.get(`/pacientes?search=${encodeURIComponent(q)}&limit=15`)
        .then((r) => { setResults(r.data.data || []); setOpen(true) })
        .finally(() => setLoading(false))
    }, 250)
  }

  const handleSelect = (p) => {
    const nombre = `${p.nombre} ${p.a_paterno} ${p.a_materno || ''}`.trim()
    setSelected({ id: p.id, nombre, fecha_nacimiento: p.fecha_nacimiento })
    onChange(String(p.id))
    setOpen(false)
    setSearch('')
  }

  const handleClear = () => {
    setSelected(null)
    onChange('')
    setSearch('')
  }

  if (selected) {
    return (
      <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 ${className}`}>
        <span className="flex-1 text-xs text-slate-700 dark:text-slate-200 truncate">
          <span className="font-medium">{selected.nombre}</span>
          {selected.fecha_nacimiento && (
            <span className="text-slate-400 dark:text-slate-500 ml-1">({selected.fecha_nacimiento})</span>
          )}
        </span>
        <button onClick={handleClear} className="text-slate-400 hover:text-red-500 transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => doSearch(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Buscar paciente..."
          className="w-full pl-7 pr-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg">
          {results.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelect(p)}
              className="w-full text-left px-3 py-2 text-xs hover:bg-primary/10 dark:hover:bg-primary/20 transition-colors"
            >
              <span className="font-medium text-slate-700 dark:text-slate-200">
                {p.nombre} {p.a_paterno} {p.a_materno || ''}
              </span>
              <span className="text-slate-400 dark:text-slate-500 ml-2">
                {p.fecha_nacimiento} · ID:{p.id}
              </span>
            </button>
          ))}
        </div>
      )}
      {open && loading && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg px-3 py-2 text-xs text-slate-400">
          Buscando...
        </div>
      )}
    </div>
  )
}
