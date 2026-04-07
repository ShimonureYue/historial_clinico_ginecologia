import { useState, useEffect } from 'react'
import { Users, Plus, Pencil, Trash2, X, Shield } from 'lucide-react'
import api from '../lib/api'
import useAuthStore from '../store/auth'
import toast from 'react-hot-toast'

const ROLES = [
  { value: 'admin', label: 'Administrador' },
  { value: 'medico', label: 'Médico' },
  { value: 'asistente', label: 'Asistente' },
]

const MODULES = [
  { key: 'pacientes', label: 'Pacientes' },
  { key: 'consultas', label: 'Consultas' },
  { key: 'antecedentes_pp', label: 'Antecedentes PP' },
  { key: 'antecedentes_pnp', label: 'Antecedentes PNP' },
  { key: 'antecedentes_hf', label: 'Antecedentes HF' },
  { key: 'antecedentes_go', label: 'Antecedentes GO' },
  { key: 'usuarios', label: 'Usuarios' },
]

const PERMISSION_TYPES = [
  { key: 'lectura', label: 'Lectura' },
  { key: 'escritura', label: 'Escritura' },
  { key: 'actualizacion', label: 'Actualización' },
  { key: 'eliminacion', label: 'Eliminación' },
]

const emptyPerms = () =>
  Object.fromEntries(
    MODULES.map((m) => [m.key, { lectura: false, escritura: false, actualizacion: false, eliminacion: false }])
  )

const emptyForm = () => ({
  nombre: '',
  correo: '',
  rol: 'medico',
  password: '',
  activo: true,
  permisos: emptyPerms(),
})

export default function UsuariosPage() {
  const user = useAuthStore((s) => s.user)
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const canRead = hasPermission('usuarios', 'lectura')
  const isAdmin = user?.rol === 'admin'

  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm())
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const fetchUsuarios = async () => {
    if (!canRead) return
    setLoading(true)
    try {
      const { data } = await api.get('/usuarios')
      setUsuarios(Array.isArray(data) ? data : data.data || [])
    } catch (err) {
      toast.error('Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsuarios()
  }, [])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm())
    setShowModal(true)
  }

  const openEdit = (u) => {
    setEditingId(u.id)
    const permisos = emptyPerms()
    if (u.permisos) {
      for (const mod of MODULES) {
        if (u.permisos[mod.key]) {
          permisos[mod.key] = { ...permisos[mod.key], ...u.permisos[mod.key] }
        }
      }
    }
    setForm({
      nombre: u.nombre || '',
      correo: u.correo || '',
      rol: u.rol || 'medico',
      password: '',
      activo: u.activo !== false,
      permisos,
    })
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingId(null)
    setForm(emptyForm())
  }

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const togglePermission = (mod, tipo) => {
    setForm((prev) => ({
      ...prev,
      permisos: {
        ...prev.permisos,
        [mod]: { ...prev.permisos[mod], [tipo]: !prev.permisos[mod][tipo] },
      },
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nombre.trim() || !form.correo.trim()) {
      toast.error('Nombre y correo son obligatorios')
      return
    }
    if (!editingId && !form.password) {
      toast.error('La contraseña es obligatoria para nuevos usuarios')
      return
    }

    setSaving(true)
    try {
      const payload = {
        nombre: form.nombre.trim(),
        correo: form.correo.trim(),
        rol: form.rol,
        activo: form.activo,
        permisos: form.permisos,
      }
      if (form.password) payload.password = form.password

      if (editingId) {
        await api.put(`/usuarios/${editingId}`, payload)
        toast.success('Usuario actualizado')
      } else {
        await api.post('/usuarios', payload)
        toast.success('Usuario creado')
      }
      closeModal()
      fetchUsuarios()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al guardar usuario')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      await api.delete(`/usuarios/${id}`)
      toast.success('Usuario eliminado')
      setConfirmDelete(null)
      fetchUsuarios()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al eliminar usuario')
    }
  }

  if (!canRead) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-slate-400">No tienes permiso para ver usuarios.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">Usuarios</h1>
          <span className="text-xs text-slate-400 dark:text-slate-500">({usuarios.length})</span>
        </div>
        {isAdmin && (
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-lg shadow-sm hover:bg-primary-dark transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Nuevo Usuario
          </button>
        )}
      </div>

      {/* Table Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <th className="text-left py-2 px-2 text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500">Nombre</th>
                <th className="text-left py-2 px-2 text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500">Correo</th>
                <th className="text-left py-2 px-2 text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500">Rol</th>
                <th className="text-center py-2 px-2 text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500">Estado</th>
                {isAdmin && (
                  <th className="text-right py-2 px-2 text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500">Acciones</th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="text-center py-8 text-slate-400">Cargando...</td>
                </tr>
              ) : usuarios.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="text-center py-8 text-slate-400">Sin usuarios registrados</td>
                </tr>
              ) : (
                usuarios.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
                  >
                    <td className="py-2 px-2 font-medium text-slate-700 dark:text-slate-200">{u.nombre}</td>
                    <td className="py-2 px-2 text-slate-600 dark:text-slate-300">{u.correo}</td>
                    <td className="py-2 px-2">
                      <span className="inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full bg-primary/10 text-primary capitalize">
                        {u.rol}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center">
                      <span
                        className={`inline-flex px-2 py-0.5 text-[10px] font-medium rounded-full ${
                          u.activo !== false
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {u.activo !== false ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="py-2 px-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(u)}
                            className="p-1 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                            title="Editar"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(u.id)}
                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-sm p-5">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2">Confirmar eliminación</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Esta acción no se puede deshacer. ¿Estás seguro de que deseas eliminar este usuario?
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="px-4 py-1.5 text-xs font-medium text-white bg-red-500 rounded-lg shadow-sm hover:bg-red-600 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {editingId ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h2>
              <button
                onClick={closeModal}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Basic fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500 mb-1 block">
                    Nombre
                  </label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={(e) => handleFieldChange('nombre', e.target.value)}
                    className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500 mb-1 block">
                    Correo
                  </label>
                  <input
                    type="email"
                    value={form.correo}
                    onChange={(e) => handleFieldChange('correo', e.target.value)}
                    className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500 mb-1 block">
                    Rol
                  </label>
                  <select
                    value={form.rol}
                    onChange={(e) => handleFieldChange('rol', e.target.value)}
                    className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500 mb-1 block">
                    Contraseña {editingId && <span className="normal-case">(dejar vacío para no cambiar)</span>}
                  </label>
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => handleFieldChange('password', e.target.value)}
                    className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    {...(!editingId ? { required: true } : {})}
                  />
                </div>
              </div>

              {/* Activo checkbox */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="activo"
                  checked={form.activo}
                  onChange={(e) => handleFieldChange('activo', e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary"
                />
                <label htmlFor="activo" className="text-xs text-slate-600 dark:text-slate-300">
                  Usuario activo
                </label>
              </div>

              {/* Permissions Matrix */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Shield className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500">
                    Matriz de Permisos
                  </span>
                </div>
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-600 rounded-lg">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-700/50">
                        <th className="text-left py-2 px-3 text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500">
                          Módulo
                        </th>
                        {PERMISSION_TYPES.map((pt) => (
                          <th
                            key={pt.key}
                            className="text-center py-2 px-2 text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500"
                          >
                            {pt.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {MODULES.map((mod) => (
                        <tr
                          key={mod.key}
                          className="border-t border-slate-100 dark:border-slate-700"
                        >
                          <td className="py-1.5 px-3 text-slate-700 dark:text-slate-300 font-medium">
                            {mod.label}
                          </td>
                          {PERMISSION_TYPES.map((pt) => (
                            <td key={pt.key} className="text-center py-1.5 px-2">
                              <input
                                type="checkbox"
                                checked={!!form.permisos[mod.key]?.[pt.key]}
                                onChange={() => togglePermission(mod.key, pt.key)}
                                className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary"
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-primary rounded-lg shadow-sm hover:bg-primary-dark disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
