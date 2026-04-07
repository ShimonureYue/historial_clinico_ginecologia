import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Plus, Pencil, Trash2, ChevronLeft, ChevronRight, User, Eye } from 'lucide-react'
import api from '../lib/api'
import useModulePermission from '../hooks/useModulePermission'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const EMPTY_DIRECCION = {
  telefono: '', celular: '', calle: '', numero_int: '', numero_ext: '',
  codigo_postal: '', colonia: '', municipio: '', estado: '', ciudad: '',
}

const EMPTY_FORM = {
  nombre: '', a_paterno: '', a_materno: '',
  email: '', curp: '', fecha_nacimiento: '', genero: 'F', fotografia: '',
  direccion: { ...EMPTY_DIRECCION },
}

const PAGE_SIZE = 50

export default function PacientesPage() {
  const { canWrite, canUpdate, canDelete } = useModulePermission('pacientes')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(t)
  }, [search])

  const { data, isLoading } = useQuery({
    queryKey: ['pacientes', debouncedSearch, page],
    queryFn: () => api.get('/pacientes', { params: { search: debouncedSearch, page, limit: PAGE_SIZE } }).then((r) => r.data),
  })

  const pacientes = data?.data ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  const saveMutation = useMutation({
    mutationFn: (payload) =>
      editing
        ? api.put(`/pacientes/${editing.id}`, payload)
        : api.post('/pacientes', payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['pacientes'] })
      if (editing) {
        toast.success('Paciente actualizado')
        closeForm()
      } else {
        toast.success('Paciente creado')
        navigate(`/pacientes/${res.data.id}`)
      }
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Error al guardar'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/pacientes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pacientes'] })
      toast.success('Paciente eliminado')
    },
    onError: () => toast.error('Error al eliminar'),
  })

  const openNew = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  const openEdit = (pac) => {
    setEditing(pac)
    setForm({
      nombre: pac.nombre || '',
      a_paterno: pac.a_paterno || '',
      a_materno: pac.a_materno || '',
      email: pac.email || '',
      curp: pac.curp || '',
      fecha_nacimiento: pac.fecha_nacimiento || '',
      genero: pac.genero || 'F',
      fotografia: pac.fotografia || '',
      direccion: {
        telefono: pac.direccion?.telefono || '',
        celular: pac.direccion?.celular || '',
        calle: pac.direccion?.calle || '',
        numero_int: pac.direccion?.numero_int || '',
        numero_ext: pac.direccion?.numero_ext || '',
        codigo_postal: pac.direccion?.codigo_postal || '',
        colonia: pac.direccion?.colonia || '',
        municipio: pac.direccion?.municipio || '',
        estado: pac.direccion?.estado || '',
        ciudad: pac.direccion?.ciudad || '',
      },
    })
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditing(null)
    setForm(EMPTY_FORM)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const { direccion, ...paciente } = form
    saveMutation.mutate({ paciente, direccion })
  }

  const handleDelete = (pac) => {
    if (window.confirm(`¿Eliminar a ${pac.nombre} ${pac.a_paterno}?`)) {
      deleteMutation.mutate(pac.id)
    }
  }

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))
  const updateDireccion = (field, value) =>
    setForm((prev) => ({ ...prev, direccion: { ...prev.direccion, [field]: value } }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Pacientes</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Gestión de fichas de identificación
            {total > 0 && <span className="ml-2 text-slate-400 dark:text-slate-500">({total.toLocaleString()} registros)</span>}
          </p>
        </div>
        {canWrite && (
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-xl shadow-lg shadow-primary/30 hover:bg-primary-dark transition-all"
          >
            <Plus className="w-4 h-4" /> Nuevo Paciente
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, CURP o ID..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-slate-700 dark:text-slate-100"
        />
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {editing ? 'Modificar Paciente' : 'Nuevo Paciente'}
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Datos personales */}
              <div>
                <h4 className="text-[12px] font-semibold uppercase text-slate-400 dark:text-slate-500 mb-2 tracking-wider">Datos Personales</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[12px] font-semibold uppercase text-slate-400 dark:text-slate-500 mb-1">Nombre(s)</label>
                    <input value={form.nombre} onChange={(e) => updateField('nombre', e.target.value)}
                      className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" required />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold uppercase text-slate-400 dark:text-slate-500 mb-1">Apellido Paterno</label>
                    <input value={form.a_paterno} onChange={(e) => updateField('a_paterno', e.target.value)}
                      className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" required />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold uppercase text-slate-400 dark:text-slate-500 mb-1">Apellido Materno</label>
                    <input value={form.a_materno} onChange={(e) => updateField('a_materno', e.target.value)}
                      className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold uppercase text-slate-400 dark:text-slate-500 mb-1">CURP</label>
                    <input value={form.curp} onChange={(e) => updateField('curp', e.target.value.toUpperCase())} maxLength={18}
                      className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary font-mono" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold uppercase text-slate-400 dark:text-slate-500 mb-1">Email</label>
                    <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)}
                      className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold uppercase text-slate-400 dark:text-slate-500 mb-1">Fecha de Nacimiento</label>
                    <input type="date" value={form.fecha_nacimiento} onChange={(e) => updateField('fecha_nacimiento', e.target.value)}
                      className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" required />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold uppercase text-slate-400 dark:text-slate-500 mb-1">Género</label>
                    <select value={form.genero} onChange={(e) => updateField('genero', e.target.value)}
                      className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary">
                      <option value="F">Femenino</option>
                      <option value="M">Masculino</option>
                      <option value="X">Otro</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                <button type="button" onClick={closeForm}
                  className="px-5 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={saveMutation.isPending}
                  className="px-5 py-2 bg-primary text-white text-sm font-medium rounded-xl shadow-lg shadow-primary/30 hover:bg-primary-dark disabled:opacity-50 transition-all">
                  {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400 dark:text-slate-500">Cargando pacientes...</div>
      ) : pacientes.length === 0 ? (
        <div className="text-center py-12">
          <User className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-slate-500 dark:text-slate-400">No se encontraron pacientes</p>
        </div>
      ) : (
        <>
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-700 text-left">
                  <th className="px-4 py-3 text-[12px] font-semibold uppercase text-slate-400 dark:text-slate-500">ID</th>
                  <th className="px-4 py-3 text-[12px] font-semibold uppercase text-slate-400 dark:text-slate-500">Nombre completo</th>
                  <th className="px-4 py-3 text-[12px] font-semibold uppercase text-slate-400 dark:text-slate-500 hidden md:table-cell">CURP</th>
                  <th className="px-4 py-3 text-[12px] font-semibold uppercase text-slate-400 dark:text-slate-500 hidden md:table-cell">Género</th>
                  <th className="px-4 py-3 text-[12px] font-semibold uppercase text-slate-400 dark:text-slate-500 hidden lg:table-cell">Fecha Nac.</th>
                  <th className="px-4 py-3 text-[12px] font-semibold uppercase text-slate-400 dark:text-slate-500 hidden lg:table-cell">Teléfono</th>
                  <th className="px-4 py-3 text-[12px] font-semibold uppercase text-slate-400 dark:text-slate-500 hidden xl:table-cell">Ciudad</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                {pacientes.map((pac) => (
                  <tr key={pac.id} className="group hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-slate-400 dark:text-slate-500">{pac.id}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/pacientes/${pac.id}`)}
                        className="text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-primary dark:hover:text-primary transition-colors text-left"
                      >
                        {pac.nombre} {pac.a_paterno} {pac.a_materno}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-200 font-mono hidden md:table-cell">{pac.curp || '-'}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={clsx(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                        pac.genero === 'F' ? 'bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400'
                          : pac.genero === 'M' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                      )}>
                        {pac.genero === 'F' ? 'Femenino' : pac.genero === 'M' ? 'Masculino' : 'Otro'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-200 hidden lg:table-cell">{pac.fecha_nacimiento || '-'}</td>
                    <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-200 hidden lg:table-cell">{pac.direccion?.telefono || pac.direccion?.celular || '-'}</td>
                    <td className="px-4 py-3 text-xs text-slate-700 dark:text-slate-200 hidden xl:table-cell">{pac.direccion?.ciudad || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => navigate(`/pacientes/${pac.id}`)}
                          className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-primary/10 hover:text-primary transition-colors" title="Ver detalle">
                          <Eye className="w-4 h-4" />
                        </button>
                        {canUpdate && (
                          <button onClick={() => openEdit(pac)}
                            className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-primary/10 hover:text-primary transition-colors" title="Editar">
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                        {canDelete && (
                          <button onClick={() => handleDelete(pac)}
                            className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors" title="Eliminar">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Mostrando {((page - 1) * PAGE_SIZE) + 1}-{Math.min(page * PAGE_SIZE, total)} de {total.toLocaleString()}
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-slate-600 dark:text-slate-300 px-2">
                  Página {page} de {totalPages}
                </span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
