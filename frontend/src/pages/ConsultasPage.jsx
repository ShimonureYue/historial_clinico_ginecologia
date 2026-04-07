import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Eye, ChevronLeft, ChevronRight, X, Stethoscope } from 'lucide-react'
import api from '../lib/api'
import useAuthStore from '../store/auth'
import PatientSearchSelect from '../components/PatientSearchSelect'
import toast from 'react-hot-toast'

export default function ConsultasPage() {
  const navigate = useNavigate()
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canRead = hasPermission('consultas', 'lectura')
  const canWrite = hasPermission('consultas', 'escritura')

  const [consultas, setConsultas] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(50)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)

  // New consulta form
  const [pacienteId, setPacienteId] = useState('')
  const [motivo, setMotivo] = useState('')
  const [saving, setSaving] = useState(false)

  const searchTimer = useRef(null)

  const fetchConsultas = useCallback(async (s, p) => {
    if (!canRead) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: p, limit })
      if (s) params.set('search', s)
      const { data } = await api.get(`/consultas?${params}`)
      setConsultas(data.data || [])
      setTotal(data.total || 0)
    } catch (err) {
      toast.error('Error al cargar consultas')
    } finally {
      setLoading(false)
    }
  }, [canRead, limit])

  useEffect(() => {
    fetchConsultas(search, page)
  }, [page])

  const handleSearchChange = (e) => {
    const val = e.target.value
    setSearch(val)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setPage(1)
      fetchConsultas(val, 1)
    }, 300)
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))

  const formatDate = (iso) => {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!pacienteId) { toast.error('Selecciona un paciente'); return }
    if (!motivo.trim()) { toast.error('Ingresa el motivo de consulta'); return }
    setSaving(true)
    try {
      const { data } = await api.post('/consultas', { paciente_id: Number(pacienteId), motivo: motivo.trim() })
      toast.success('Consulta creada')
      setShowModal(false)
      setPacienteId('')
      setMotivo('')
      navigate(`/consultas/${data.id}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al crear consulta')
    } finally {
      setSaving(false)
    }
  }

  if (!canRead) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-slate-400">No tienes permiso para ver consultas.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">Consultas</h1>
          <span className="text-xs text-slate-400 dark:text-slate-500">({total})</span>
        </div>
        {canWrite && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-lg shadow-sm hover:bg-primary-dark transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Nueva Consulta
          </button>
        )}
      </div>

      {/* Search + Table Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
        {/* Search */}
        <div className="mb-3">
          <label className="text-[12px] font-semibold uppercase text-slate-400 dark:text-slate-500 mb-1 block">
            Buscar
          </label>
          <div className="relative max-w-sm">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Paciente, motivo, diagnóstico..."
              className="w-full pl-7 pr-2 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <th className="text-left py-2 px-2 text-[12px] font-semibold uppercase text-slate-400 dark:text-slate-500">ID</th>
                <th className="text-left py-2 px-2 text-[12px] font-semibold uppercase text-slate-400 dark:text-slate-500">Fecha</th>
                <th className="text-left py-2 px-2 text-[12px] font-semibold uppercase text-slate-400 dark:text-slate-500">Paciente</th>
                <th className="text-left py-2 px-2 text-[12px] font-semibold uppercase text-slate-400 dark:text-slate-500">Motivo</th>
                <th className="text-left py-2 px-2 text-[12px] font-semibold uppercase text-slate-400 dark:text-slate-500">Diagnóstico</th>
                <th className="text-right py-2 px-2 text-[12px] font-semibold uppercase text-slate-400 dark:text-slate-500">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">Cargando...</td>
                </tr>
              ) : consultas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400">Sin resultados</td>
                </tr>
              ) : (
                consultas.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/consultas/${c.id}`)}
                    className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/40 cursor-pointer transition-colors"
                  >
                    <td className="py-2 px-2 text-slate-500 dark:text-slate-400">{c.id}</td>
                    <td className="py-2 px-2 text-slate-700 dark:text-slate-300">{formatDate(c.created_at)}</td>
                    <td className="py-2 px-2 font-medium text-slate-700 dark:text-slate-200">{c.paciente_nombre || '—'}</td>
                    <td className="py-2 px-2 text-slate-600 dark:text-slate-300 max-w-[200px] truncate">{c.motivo || '—'}</td>
                    <td className="py-2 px-2 text-slate-600 dark:text-slate-300 max-w-[200px] truncate">{c.diagnostico || '—'}</td>
                    <td className="py-2 px-2 text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/consultas/${c.id}`) }}
                        className="inline-flex items-center gap-1 px-2 py-1 text-[12px] font-medium text-primary hover:bg-primary/10 rounded-md transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        Ver
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <span className="text-[12px] text-slate-400 dark:text-slate-500">
              Página {page} de {totalPages} · {total} registros
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="w-4 h-4 text-slate-500" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors"
              >
                <ChevronRight className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Nueva Consulta Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">Nueva Consulta</h2>
              <button
                onClick={() => { setShowModal(false); setPacienteId(''); setMotivo('') }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-[12px] font-semibold uppercase text-slate-400 dark:text-slate-500 mb-1 block">
                  Paciente
                </label>
                <PatientSearchSelect value={pacienteId} onChange={setPacienteId} />
              </div>

              <div>
                <label className="text-[12px] font-semibold uppercase text-slate-400 dark:text-slate-500 mb-1 block">
                  Motivo de consulta
                </label>
                <textarea
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  rows={3}
                  className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  placeholder="Describe el motivo de la consulta..."
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setPacienteId(''); setMotivo('') }}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-primary rounded-lg shadow-sm hover:bg-primary-dark disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Creando...' : 'Crear Consulta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
