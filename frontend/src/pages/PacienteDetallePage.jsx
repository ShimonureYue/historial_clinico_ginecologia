import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft, User, Calendar, Phone, MapPin, Search,
  Stethoscope, ClipboardList, HeartPulse, Users, Baby,
  Eye, Plus, Pencil, Save, X, ChevronRight, FileText, Pill, Activity, CalendarDays,
  Mail, Home, Hash, Building, Map, Landmark, Globe,
  Syringe, Brain, Plane, Shield, Scissors, Droplets,
  Apple, Dumbbell, Moon, Wine, Cigarette, FlaskConical,
  Heart, AlertTriangle, Thermometer,
} from 'lucide-react'
import api from '../lib/api'
import useModulePermission from '../hooks/useModulePermission'
import toast from 'react-hot-toast'
import clsx from 'clsx'

/* ─── helpers ─── */
function calcAge(fechaNac) {
  if (!fechaNac) return '-'
  const b = new Date(fechaNac + 'T00:00:00'), n = new Date()
  let y = n.getFullYear() - b.getFullYear(), m = n.getMonth() - b.getMonth(), d = n.getDate() - b.getDate()
  if (d < 0) { m--; d += new Date(n.getFullYear(), n.getMonth(), 0).getDate() }
  if (m < 0) { y--; m += 12 }
  return y > 0 ? `${y}a ${m}m` : m > 0 ? `${m}m ${d}d` : `${d}d`
}

const inputCls = 'w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-100 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary'
const labelCls = 'block text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500 mb-1'
const readCls = 'text-xs text-slate-700 dark:text-slate-200 py-2'

const TABS = [
  { key: 'datos', label: 'Datos del Paciente', icon: User },
  { key: 'heredo', label: 'A. Heredo Familiares', icon: Users },
  { key: 'no_patologicos', label: 'A. No Patológicos', icon: HeartPulse },
  { key: 'patologicos', label: 'A. Patológicos', icon: ClipboardList },
  { key: 'gineco', label: 'A. Gineco-Obstétricos', icon: Baby },
  { key: 'consultas', label: 'Historial', icon: Stethoscope },
]

const diagBadgeColors = [
  'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
]
const dotColors = ['bg-green-400', 'bg-slate-400', 'bg-amber-400', 'bg-purple-400', 'bg-pink-400', 'bg-blue-400']
const borderColors = ['border-l-green-400', 'border-l-slate-300 dark:border-l-slate-500', 'border-l-amber-400', 'border-l-purple-400', 'border-l-pink-400', 'border-l-blue-400']
function diagBadge(i) { return diagBadgeColors[i % diagBadgeColors.length] }
function dotColor(i) { return i === 0 ? dotColors[0] : dotColors[1] }
function borderColor(i) { return i === 0 ? borderColors[0] : borderColors[1] }

/* ─── Consulta Card ─── */
function ConsultaCard({ c, i, onClick, active, asLink = true }) {
  const inner = (
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={clsx('w-2.5 h-2.5 rounded-full flex-shrink-0', dotColor(i))} />
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {c.created_at ? c.created_at.split('T')[0] : '-'}
          </span>
          {c.diagnostico && (
            <span className={clsx('text-[10px] px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wide', diagBadge(i))}>
              {c.diagnostico}
            </span>
          )}
        </div>
        {(c.padecimiento_actual || c.motivo) && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 ml-[18px] line-clamp-2">
            {c.padecimiento_actual || c.motivo}
          </p>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </div>
  )
  const cls = clsx(
    'block rounded-xl border border-l-4 p-4 hover:shadow-md transition-all group cursor-pointer',
    active
      ? 'bg-primary/5 border-primary/30 dark:bg-primary/10 dark:border-primary/40 shadow-sm'
      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500',
    borderColor(i)
  )
  if (asLink) return <Link to={`/consultas/${c.id}`} className={cls}>{inner}</Link>
  return <button type="button" onClick={onClick} className={cls + ' text-left w-full'}>{inner}</button>
}

const readInputCls = 'w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 cursor-default'

/* ─── Editable field ─── */
function Field({ label, value, name, editing, onChange, type = 'text', options, icon: Icon, placeholder }) {
  if (!editing) {
    if (type === 'textarea') return (
      <div>
        <p className={labelCls}>{Icon && <Icon className="w-3 h-3 inline mr-1 -mt-0.5 text-slate-400" />}{label}</p>
        <div className={readInputCls + ' min-h-[60px] whitespace-pre-wrap'}>{value || '-'}</div>
      </div>
    )
    return (
      <div>
        <p className={labelCls}>{Icon && <Icon className="w-3 h-3 inline mr-1 -mt-0.5 text-slate-400" />}{label}</p>
        <div className={readInputCls}>{value || '-'}</div>
      </div>
    )
  }
  if (options) return (
    <div>
      <label className={labelCls}>{Icon && <Icon className="w-3 h-3 inline mr-1 -mt-0.5 text-slate-400" />}{label}</label>
      <div className="relative">
        {Icon && <Icon className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />}
        <select name={name} value={value || ''} onChange={onChange} className={inputCls + (Icon ? ' pl-8' : '')}>
          <option value="">—</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    </div>
  )
  if (type === 'textarea') return (
    <div>
      <label className={labelCls}>{Icon && <Icon className="w-3 h-3 inline mr-1 -mt-0.5 text-slate-400" />}{label}</label>
      <textarea name={name} value={value || ''} onChange={onChange} rows={3} placeholder={placeholder} className={inputCls + ' resize-y'} />
    </div>
  )
  return (
    <div>
      <label className={labelCls}>{Icon && <Icon className="w-3 h-3 inline mr-1 -mt-0.5 text-slate-400" />}{label}</label>
      <div className="relative">
        {Icon && <Icon className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />}
        <input type={type} name={name} value={value || ''} onChange={onChange} placeholder={placeholder} className={inputCls + (Icon ? ' pl-8' : '')} />
      </div>
    </div>
  )
}

/* ─── Toggle field for boolean antecedentes ─── */
function ToggleField({ label, value, name, editing, onChange }) {
  if (!editing) return (
    <div className="flex items-center gap-2">
      <span className={clsx('w-2.5 h-2.5 rounded-full', value ? 'bg-red-400' : 'bg-slate-300 dark:bg-slate-600')} />
      <span className="text-xs text-slate-700 dark:text-slate-200">{label}</span>
    </div>
  )
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" name={name} checked={!!value} onChange={onChange}
        className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary" />
      <span className="text-xs text-slate-700 dark:text-slate-200">{label}</span>
    </label>
  )
}

/* ═══════════════════════════════════════════ MAIN ═══════════════════════════════════════════ */
export default function PacienteDetallePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const pacPerms = useModulePermission('pacientes')
  const consultasPerms = useModulePermission('consultas')

  const [tab, setTab] = useState('datos')
  const [masterEditing, setMasterEditing] = useState(false)
  const [savingAll, setSavingAll] = useState(false)
  const [form, setForm] = useState({})
  const [showNewConsulta, setShowNewConsulta] = useState(false)
  const [nuevaConsulta, setNuevaConsulta] = useState({ fecha: '', padecimiento_actual: '' })
  const [selectedConsultaId, setSelectedConsultaId] = useState(null)
  const [searchConsultas, setSearchConsultas] = useState('')

  /* refs for antecedentes tabs */
  const ppRef = useRef()
  const pnpRef = useRef()
  const hfRef = useRef()
  const goRef = useRef()

  /* ─── queries ─── */
  const { data: pac, isLoading } = useQuery({
    queryKey: ['paciente', id],
    queryFn: () => api.get(`/pacientes/${id}`).then(r => r.data),
  })

  const { data: consultas = [], isLoading: loadingC } = useQuery({
    queryKey: ['consultas', 'paciente', id],
    queryFn: () => api.get(`/consultas/paciente/${id}`).then(r => r.data),
  })

  const { data: antPP } = useQuery({
    queryKey: ['ant-pp', id],
    queryFn: () => api.get(`/antecedentes-patologicos/paciente/${id}`).then(r => r.data),
  })

  const { data: antPNP } = useQuery({
    queryKey: ['ant-pnp', id],
    queryFn: () => api.get(`/antecedentes-no-patologicos/paciente/${id}`).then(r => r.data),
  })

  const { data: antHF } = useQuery({
    queryKey: ['ant-hf', id],
    queryFn: () => api.get(`/antecedentes-heredo-familiares/paciente/${id}`).then(r => r.data),
  })

  const { data: antGO } = useQuery({
    queryKey: ['ant-go', id],
    queryFn: () => api.get(`/antecedentes-gineco-obstetricos/paciente/${id}`).then(r => r.data),
  })

  /* ─── pac mutation ─── */
  const updatePacMut = useMutation({
    mutationFn: (payload) => api.put(`/pacientes/${id}`, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['paciente', id] }); toast.success('Paciente actualizado') },
    onError: (e) => { const d = e.response?.data?.detail; toast.error(Array.isArray(d) ? d.map(x => x.msg).join(', ') : d || 'Error') },
  })

  const crearConsultaMut = useMutation({
    mutationFn: (p) => api.post('/consultas', p),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['consultas', 'paciente', id] })
      toast.success('Consulta creada')
      setShowNewConsulta(false)
      navigate(`/consultas/${res.data.id}`, { state: { editing: true } })
    },
    onError: (e) => { const d = e.response?.data?.detail; toast.error(Array.isArray(d) ? d.map(x => x.msg).join(', ') : d || 'Error') },
  })

  /* ─── pac form helpers ─── */
  const ch = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  function startEditPac() {
    const dir = pac.direccion || {}
    setForm({
      nombre: pac.nombre || '', a_paterno: pac.a_paterno || '', a_materno: pac.a_materno || '',
      fecha_nacimiento: pac.fecha_nacimiento || '', genero: pac.genero || '',
      email: pac.email || '', curp: pac.curp || '',
      telefono: dir.telefono || '', celular: dir.celular || '',
      calle: dir.calle || '', numero_ext: dir.numero_ext || '', numero_int: dir.numero_int || '',
      codigo_postal: dir.codigo_postal || '', colonia: dir.colonia || '',
      municipio: dir.municipio || '', ciudad: dir.ciudad || '', estado: dir.estado || '',
    })
  }

  function savePac() {
    return updatePacMut.mutateAsync({
      paciente: {
        nombre: form.nombre, a_paterno: form.a_paterno, a_materno: form.a_materno,
        email: form.email, curp: form.curp, fecha_nacimiento: form.fecha_nacimiento,
        genero: form.genero, fotografia: pac.fotografia || null,
      },
      direccion: {
        telefono: form.telefono, celular: form.celular, calle: form.calle,
        numero_ext: form.numero_ext, numero_int: form.numero_int,
        codigo_postal: form.codigo_postal, colonia: form.colonia,
        municipio: form.municipio, estado: form.estado, ciudad: form.ciudad,
      },
    })
  }

  /* ─── global edit / save / cancel ─── */
  function handleStartEditing() {
    startEditPac()
    setMasterEditing(true)
  }

  async function handleSaveAll() {
    setSavingAll(true)
    try {
      await Promise.all([
        savePac(),
        ppRef.current?.save(),
        pnpRef.current?.save(),
        hfRef.current?.save(),
        goRef.current?.save(),
      ].filter(Boolean))
      setMasterEditing(false)
    } catch {
      // individual errors shown via toast
    } finally {
      setSavingAll(false)
    }
  }

  function handleCancelAll() {
    ppRef.current?.cancel()
    pnpRef.current?.cancel()
    hfRef.current?.cancel()
    goRef.current?.cancel()
    setMasterEditing(false)
  }

  /* ─── loading / not found ─── */
  if (isLoading) return <div className="text-center py-12 text-slate-400">Cargando...</div>
  if (!pac) return (
    <div className="text-center py-12">
      <User className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
      <p className="text-slate-500">Paciente no encontrado</p>
    </div>
  )

  const fullName = [pac.nombre, pac.a_paterno, pac.a_materno].filter(Boolean).join(' ')
  const dir = pac.direccion || {}

  /* ═══════ RENDER ═══════ */
  return (
    <div className="space-y-4">
      {/* ── Patient Header ── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm p-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/pacientes')}
            className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-600 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 truncate">{fullName}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> {calcAge(pac.fecha_nacimiento)}
                <span className="text-[11px] text-slate-400">({pac.fecha_nacimiento})</span>
              </span>
              <span className={clsx(
                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                pac.genero === 'F' ? 'bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400'
                  : pac.genero === 'M' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-slate-100 text-slate-600'
              )}>
                {pac.genero === 'F' ? 'Femenino' : pac.genero === 'M' ? 'Masculino' : 'Otro'}
              </span>
              {dir.telefono && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {dir.telefono}</span>}
              <span className="text-xs font-mono text-slate-400">ID: {pac.id}</span>
            </div>
          </div>
          {pacPerms.canUpdate && !masterEditing && (
            <button onClick={handleStartEditing}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium flex-shrink-0">
              <Pencil className="w-3 h-3" /> Editar
            </button>
          )}
          {masterEditing && (
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={handleCancelAll}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium">
                <X className="w-3 h-3" /> Cancelar
              </button>
              <button onClick={handleSaveAll} disabled={savingAll}
                className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary-dark disabled:opacity-50 transition-colors font-medium shadow-sm shadow-primary/20">
                <Save className="w-3 h-3" /> {savingAll ? 'Guardando...' : 'Guardar todo'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-x-auto scrollbar-hide">
        <div className="flex min-w-max">
          {TABS.map(t => {
            const Icon = t.icon
            const active = tab === t.key
            return (
              <button key={t.key}
                onClick={() => setTab(t.key)}
                className={clsx(
                  'flex flex-col items-center gap-1 px-5 py-3 text-xs font-medium whitespace-nowrap transition-all border-t-2',
                  active
                    ? 'border-primary text-primary bg-primary/5'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200'
                )}>
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            )
          })}
        </div>
      </div>


      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
        <div className="p-4">
          {/* ═══ TAB: Datos del Paciente ═══ */}
          <div className={tab !== 'datos' ? 'hidden' : ''}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* LEFT: Ficha de Identificación */}
              <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4">
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" /> Ficha de Identificación
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <Field label="Nombre(s)" value={masterEditing ? form.nombre : pac.nombre} name="nombre" editing={masterEditing} onChange={ch} icon={User} placeholder="Ingrese el nombre" />
                  <Field label="Apellido Paterno" value={masterEditing ? form.a_paterno : pac.a_paterno} name="a_paterno" editing={masterEditing} onChange={ch} icon={User} placeholder="Ingrese el apellido paterno" />
                  <Field label="Apellido Materno" value={masterEditing ? form.a_materno : pac.a_materno} name="a_materno" editing={masterEditing} onChange={ch} icon={User} placeholder="Ingrese el apellido materno" />
                  <Field label="Fecha de Nacimiento" value={masterEditing ? form.fecha_nacimiento : pac.fecha_nacimiento} name="fecha_nacimiento" editing={masterEditing} onChange={ch} type="date" icon={Calendar} />
                  <Field label="Sexo" value={masterEditing ? form.genero : (pac.genero === 'F' ? 'Femenino' : pac.genero === 'M' ? 'Masculino' : pac.genero || '-')}
                    name="genero" editing={masterEditing} onChange={ch} icon={Users}
                    options={[{ value: 'F', label: 'Femenino' }, { value: 'M', label: 'Masculino' }, { value: 'O', label: 'Otro' }]} />
                  <Field label="CURP" value={masterEditing ? form.curp : pac.curp} name="curp" editing={masterEditing} onChange={ch} icon={FileText} placeholder="Ej. VARG850101HDFLGR09" />
                  <Field label="Email" value={masterEditing ? form.email : pac.email} name="email" editing={masterEditing} onChange={ch} type="email" icon={Mail} placeholder="correo@ejemplo.com" />
                </div>

                <div className="my-3 border-t border-slate-200 dark:border-slate-600 flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-700/30 pr-2 -mt-px">Dirección y Contacto</span>
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <Field label="Teléfono" value={masterEditing ? form.telefono : dir.telefono} name="telefono" editing={masterEditing} onChange={ch} icon={Phone} placeholder="(000) 000-0000" />
                  <Field label="Celular" value={masterEditing ? form.celular : dir.celular} name="celular" editing={masterEditing} onChange={ch} icon={Phone} placeholder="(000) 000-0000" />
                  <Field label="Calle" value={masterEditing ? form.calle : dir.calle} name="calle" editing={masterEditing} onChange={ch} icon={MapPin} placeholder="Nombre de la calle" />
                  <Field label="Núm. Ext." value={masterEditing ? form.numero_ext : dir.numero_ext} name="numero_ext" editing={masterEditing} onChange={ch} icon={Hash} placeholder="Ej. 123" />
                  <Field label="Núm. Int." value={masterEditing ? form.numero_int : dir.numero_int} name="numero_int" editing={masterEditing} onChange={ch} icon={Hash} placeholder="Ej. A" />
                  <Field label="C.P." value={masterEditing ? form.codigo_postal : dir.codigo_postal} name="codigo_postal" editing={masterEditing} onChange={ch} icon={Mail} placeholder="00000" />
                  <Field label="Colonia" value={masterEditing ? form.colonia : dir.colonia} name="colonia" editing={masterEditing} onChange={ch} icon={Building} placeholder="Nombre de la colonia" />
                  <Field label="Municipio" value={masterEditing ? form.municipio : dir.municipio} name="municipio" editing={masterEditing} onChange={ch} icon={Map} placeholder="Nombre del municipio" />
                  <Field label="Ciudad" value={masterEditing ? form.ciudad : dir.ciudad} name="ciudad" editing={masterEditing} onChange={ch} icon={Landmark} placeholder="Nombre de la ciudad" />
                  <Field label="Estado" value={masterEditing ? form.estado : dir.estado} name="estado" editing={masterEditing} onChange={ch} icon={Globe} placeholder="Nombre del estado" />
                </div>
              </div>

              {/* RIGHT: Consultas Timeline */}
              <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-primary" /> Consultas
                    {consultas.length > 0 && (
                      <span className="text-[10px] font-normal text-slate-400 ml-1">{consultas.length} registrada{consultas.length !== 1 ? 's' : ''}</span>
                    )}
                  </h3>
                  {consultasPerms.canWrite && (
                    <button onClick={() => {
                      setNuevaConsulta({ fecha: new Date().toISOString().split('T')[0], padecimiento_actual: '' })
                      setShowNewConsulta(true)
                    }}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors shadow-sm shadow-primary/20">
                      <Plus className="w-3.5 h-3.5" /> Nueva
                    </button>
                  )}
                </div>

                {loadingC ? (
                  <div className="text-center py-8 text-slate-400 text-sm">Cargando...</div>
                ) : consultas.length === 0 ? (
                  <div className="text-center py-10">
                    <Stethoscope className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-sm text-slate-400">Sin consultas registradas</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                    {consultas.map((c, i) => <ConsultaCard key={c.id} c={c} i={i} />)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ═══ TAB: A. Patológicos ═══ */}
          <div className={tab !== 'patologicos' ? 'hidden' : ''}>
            <AntPatologicos ref={ppRef} data={antPP} pacienteId={id} editing={masterEditing} canUpdate={pacPerms.canUpdate} />
          </div>

          {/* ═══ TAB: A. No Patológicos ═══ */}
          <div className={tab !== 'no_patologicos' ? 'hidden' : ''}>
            <AntNoPatologicos ref={pnpRef} data={antPNP} pacienteId={id} editing={masterEditing} canUpdate={pacPerms.canUpdate} />
          </div>

          {/* ═══ TAB: A. Heredo Familiares ═══ */}
          <div className={tab !== 'heredo' ? 'hidden' : ''}>
            <AntHeredoFamiliares ref={hfRef} data={antHF} pacienteId={id} editing={masterEditing} canUpdate={pacPerms.canUpdate} />
          </div>

          {/* ═══ TAB: A. Gineco-Obstétricos ═══ */}
          <div className={tab !== 'gineco' ? 'hidden' : ''}>
            <AntGinecoObstetricos ref={goRef} data={antGO} pacienteId={id} editing={masterEditing} canUpdate={pacPerms.canUpdate} />
          </div>

          {/* ═══ TAB: Historial de Consultas ═══ */}
          <div className={tab !== 'consultas' ? 'hidden' : ''}>
            {(() => {
              const uniqueDiags = new Set(consultas.filter(c => c.diagnostico).map(c => c.diagnostico))
              const totalMeds = consultas.reduce((s, c) => s + (c.medicamentos?.length || 0), 0)
              const lastDate = consultas.length > 0 ? (consultas[0].created_at?.split('T')[0] || '-') : '-'
              const q = searchConsultas.toLowerCase()
              const filtered = q
                ? consultas.filter(c =>
                    (c.created_at || '').toLowerCase().includes(q) ||
                    (c.padecimiento_actual || '').toLowerCase().includes(q) ||
                    (c.diagnostico || '').toLowerCase().includes(q) ||
                    (c.motivo || '').toLowerCase().includes(q) ||
                    (c.tratamiento || '').toLowerCase().includes(q)
                  )
                : consultas
              const selConsulta = selectedConsultaId ? consultas.find(c => c.id === selectedConsultaId) : null

              return (
                <div className="space-y-4">
                  {/* Stats row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { icon: FileText, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20', value: consultas.length, label: 'Consultas' },
                      { icon: Pill, color: 'text-green-500 bg-green-50 dark:bg-green-900/20', value: totalMeds, label: 'Medicamentos' },
                      { icon: Activity, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20', value: uniqueDiags.size, label: 'Diagnósticos' },
                      { icon: CalendarDays, color: 'text-primary bg-primary/10', value: lastDate, label: 'Última consulta' },
                    ].map(s => (
                      <div key={s.label} className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600 p-3.5">
                        <div className={clsx('p-2 rounded-lg', s.color)}><s.icon className="w-5 h-5" /></div>
                        <div>
                          <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{s.value}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">{s.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Search + Nueva Consulta */}
                  <div className="flex items-center gap-3">
                    <div className="flex-1 relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input type="text" value={searchConsultas} onChange={e => setSearchConsultas(e.target.value)}
                        placeholder="Buscar por fecha, padecimiento, diagnóstico, medicamento..."
                        className={inputCls + ' pl-9'} />
                    </div>
                    {consultasPerms.canWrite && (
                      <button onClick={() => {
                        setNuevaConsulta({ fecha: new Date().toISOString().split('T')[0], padecimiento_actual: '' })
                        setShowNewConsulta(true)
                      }}
                        className="flex items-center gap-1.5 text-xs px-4 py-2.5 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors shadow-sm shadow-primary/20 whitespace-nowrap font-medium">
                        <Plus className="w-4 h-4" /> Nueva Consulta
                      </button>
                    )}
                  </div>

                  {/* Master-Detail */}
                  {loadingC ? (
                    <div className="text-center py-8 text-slate-400 text-sm">Cargando...</div>
                  ) : consultas.length === 0 ? (
                    <div className="text-center py-10">
                      <Stethoscope className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                      <p className="text-sm text-slate-400">Sin consultas registradas</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-4">
                      {/* Left: list */}
                      <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                        {filtered.map((c, i) => (
                          <ConsultaCard key={c.id} c={c} i={i} asLink={false}
                            active={selectedConsultaId === c.id}
                            onClick={() => setSelectedConsultaId(c.id)} />
                        ))}
                        {filtered.length === 0 && (
                          <p className="text-sm text-slate-400 text-center py-6">Sin resultados para &ldquo;{searchConsultas}&rdquo;</p>
                        )}
                      </div>

                      {/* Right: detail */}
                      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-600 p-5">
                        {selConsulta ? (
                          <div className="space-y-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                                  <Stethoscope className="w-5 h-5" />
                                </div>
                                <div>
                                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                                    Consulta del {selConsulta.created_at?.split('T')[0]}
                                  </h4>
                                  <p className="text-[10px] text-slate-400">ID: {selConsulta.id}</p>
                                </div>
                              </div>
                              <Link to={`/consultas/${selConsulta.id}`}
                                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-medium">
                                <Pencil className="w-3 h-3" /> Editar
                              </Link>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                              <Field label="Padecimiento Actual" value={selConsulta.padecimiento_actual} editing={false} type="textarea" />
                              <Field label="Exploración Física" value={selConsulta.exploracion_fisica} editing={false} type="textarea" />
                              <Field label="Diagnóstico" value={selConsulta.diagnostico} editing={false} />
                              <Field label="Tratamiento" value={selConsulta.tratamiento} editing={false} type="textarea" />
                              <Field label="Motivo" value={selConsulta.motivo} editing={false} />
                              <Field label="Estudios" value={selConsulta.estudios} editing={false} />
                            </div>

                            {selConsulta.signos_vitales && (
                              <div>
                                <h5 className="text-[10px] font-semibold uppercase text-slate-400 mb-2 mt-2 border-t border-slate-100 dark:border-slate-700 pt-3">Signos Vitales</h5>
                                <div className="grid grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-2">
                                  {[
                                    ['Talla', selConsulta.signos_vitales.talla],
                                    ['Peso', selConsulta.signos_vitales.peso],
                                    ['Temperatura', selConsulta.signos_vitales.temperatura],
                                    ['F. Respiratoria', selConsulta.signos_vitales.frecuencia_respiratoria],
                                    ['F. Cardiaca', selConsulta.signos_vitales.frecuencia_cardiaca],
                                    ['P. Arterial', selConsulta.signos_vitales.presion_arterial],
                                    ['Saturación', selConsulta.signos_vitales.saturacion],
                                  ].map(([lbl, val]) => (
                                    <div key={lbl}>
                                      <p className="text-[9px] font-semibold uppercase text-slate-400">{lbl}</p>
                                      <div className={readInputCls + ' text-center'}>{val ?? '-'}</div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {selConsulta.medicamentos?.length > 0 && (
                              <div>
                                <h5 className="text-[10px] font-semibold uppercase text-slate-400 mb-2 mt-2 border-t border-slate-100 dark:border-slate-700 pt-3">
                                  Medicamentos ({selConsulta.medicamentos.length})
                                </h5>
                                <div className="space-y-1.5">
                                  {selConsulta.medicamentos.map(m => (
                                    <div key={m.id} className={readInputCls + ' flex items-center gap-2'}>
                                      <Pill className="w-3 h-3 text-green-500 flex-shrink-0" />
                                      <span className="font-medium">{m.nombre}</span>
                                      {m.dosis && <span className="text-slate-400">— {m.dosis}</span>}
                                      {m.via && <span className="text-slate-400">({m.via})</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                            <Stethoscope className="w-10 h-10 mb-3 text-slate-300 dark:text-slate-600" />
                            <p className="text-sm">Selecciona una consulta para ver el detalle</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
        </div>
      </div>

      {/* ── Modal: Nueva Consulta ── */}
      {showNewConsulta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Nueva Consulta</h3>
              <p className="text-xs text-slate-500 mt-0.5">{fullName}</p>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); crearConsultaMut.mutate({ paciente_id: Number(id), padecimiento_actual: nuevaConsulta.padecimiento_actual }) }}
              className="p-5 space-y-4">
              <div>
                <label className={labelCls}>Fecha de consulta</label>
                <input type="date" value={nuevaConsulta.fecha}
                  onChange={e => setNuevaConsulta(p => ({ ...p, fecha: e.target.value }))}
                  className={inputCls} required />
              </div>
              <div>
                <label className={labelCls}>Padecimiento actual</label>
                <textarea value={nuevaConsulta.padecimiento_actual}
                  onChange={e => setNuevaConsulta(p => ({ ...p, padecimiento_actual: e.target.value }))}
                  rows={4} className={inputCls + ' resize-y'} placeholder="Describa el padecimiento actual..." />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowNewConsulta(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={crearConsultaMut.isPending}
                  className="px-4 py-2 bg-primary text-white text-xs font-medium rounded-lg shadow-sm shadow-primary/20 hover:bg-primary-dark disabled:opacity-50 transition-all">
                  {crearConsultaMut.isPending ? 'Creando...' : 'Crear y continuar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════
   ANTECEDENTES SUB-COMPONENTS (forwardRef with own state)
   ═══════════════════════════════════════════════════════════════════ */

function useAntMutation(endpoint, queryKey, pacienteId) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ record_id, data }) =>
      record_id
        ? api.put(`${endpoint}/${record_id}`, data)
        : api.post(endpoint, { ...data, paciente_id: Number(pacienteId) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [queryKey, String(pacienteId)] })
      toast.success('Guardado')
    },
    onError: (e) => { const d = e.response?.data?.detail; toast.error(Array.isArray(d) ? d.map(x => x.msg).join(', ') : d || 'Error') },
  })
}

/* ── A. Patológicos ── */
const AntPatologicos = forwardRef(function AntPatologicos({ data, pacienteId, editing, canUpdate }, ref) {
  const [form, setForm] = useState({})
  const mutation = useAntMutation('/antecedentes-patologicos', 'ant-pp', pacienteId)
  const ch = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  useEffect(() => { setForm(data ? { ...data } : {}) }, [data])

  useImperativeHandle(ref, () => ({
    save: () => {
      const hasData = data?.id || Object.values(form).some(v => v)
      if (!hasData) return Promise.resolve()
      return mutation.mutateAsync({ record_id: data?.id, data: form })
    },
    cancel: () => setForm(data ? { ...data } : {}),
  }))

  const fields = [
    { label: 'Enfermedades', name: 'enfermedades', icon: HeartPulse, placeholder: 'Describa las enfermedades...' },
    { label: 'Hospitalizaciones', name: 'hospitalizaciones', icon: Building, placeholder: 'Describa las hospitalizaciones previas...' },
    { label: 'Cirugías', name: 'cirugias', icon: Scissors, placeholder: 'Describa las cirugías realizadas...' },
    { label: 'Traumatismos', name: 'traumatismos', icon: AlertTriangle, placeholder: 'Describa los traumatismos sufridos...' },
    { label: 'Transfusiones Sanguíneas', name: 'transfusiones_sanguineas', icon: Droplets, placeholder: 'Describa las transfusiones recibidas...' },
    { label: 'Inmunizaciones / Vacunas', name: 'immunizaciones_vacunas', icon: Syringe, placeholder: 'Describa el esquema de vacunación...' },
    { label: 'Historia Psiquiátrica', name: 'historia_psiquiatrica', icon: Brain, placeholder: 'Describa antecedentes psiquiátricos...' },
    { label: 'Viajes', name: 'viajes', icon: Plane, placeholder: 'Describa viajes recientes relevantes...' },
  ]
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">Antecedentes Patológicos</h3>
      {!data && !editing ? (
        <p className="text-sm text-slate-400 py-4 text-center">Sin registros. Haz clic en Editar antecedentes para agregar.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
          {fields.map(f => (
            <Field key={f.name} label={f.label} value={editing ? form[f.name] : data?.[f.name]}
              name={f.name} editing={editing} onChange={ch} type="textarea" icon={f.icon} placeholder={f.placeholder} />
          ))}
        </div>
      )}
    </div>
  )
})

/* ── A. No Patológicos ── */
const AntNoPatologicos = forwardRef(function AntNoPatologicos({ data, pacienteId, editing, canUpdate }, ref) {
  const [form, setForm] = useState({})
  const mutation = useAntMutation('/antecedentes-no-patologicos', 'ant-pnp', pacienteId)
  const ch = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  useEffect(() => { setForm(data ? { ...data } : {}) }, [data])

  useImperativeHandle(ref, () => ({
    save: () => {
      const hasData = data?.id || Object.values(form).some(v => v)
      if (!hasData) return Promise.resolve()
      return mutation.mutateAsync({ record_id: data?.id, data: form })
    },
    cancel: () => setForm(data ? { ...data } : {}),
  }))

  const sections = [
    { title: 'General', icon: User, fields: [
      { label: 'Nivel Socioeconómico', name: 'nivel_socioeconomico', icon: Landmark, placeholder: 'Ej. Medio' },
    ]},
    { title: 'Vivienda', icon: Home, fields: [
      { label: 'Tipo', name: 'vivienda_tipo', icon: Home, placeholder: 'Ej. Casa, Departamento' },
      { label: 'Renta', name: 'vivienda_renta', icon: Home, placeholder: 'Ej. Propia, Rentada' },
      { label: 'Agua', name: 'vivienda_agua', icon: Droplets, placeholder: 'Ej. Potable, Cisterna' },
      { label: 'Luz', name: 'vivienda_luz', icon: Home, placeholder: 'Ej. Sí, No' },
      { label: 'Drenaje', name: 'vivienda_drenaje', icon: Home, placeholder: 'Ej. Sí, No' },
      { label: 'Habitantes', name: 'vivienda_habitantes', icon: Users, placeholder: 'Número de habitantes' },
      { label: 'Habitaciones', name: 'vivienda_habitaciones', icon: Home, placeholder: 'Número de habitaciones' },
      { label: 'Zoonosis', name: 'vivienda_zoonosis', placeholder: 'Ej. Perro, Gato' },
      { label: 'Plagas', name: 'vivienda_plagas', placeholder: 'Ej. Cucarachas, Ratones' },
      { label: 'Hacinamiento', name: 'vivienda_hacinamiento', placeholder: 'Ej. Sí, No' },
      { label: 'Descripción', name: 'vivienda_descripcion', placeholder: 'Describa la vivienda...' },
    ]},
    { title: 'Alimentación', icon: Apple, fields: [
      { label: 'Calidad', name: 'alimentacion_calidad', icon: Apple, placeholder: 'Ej. Buena, Regular, Mala' },
      { label: 'Descripción', name: 'alimentacion_descripcion', icon: Apple, placeholder: 'Describa la dieta habitual...' },
      { label: 'Intolerancia', name: 'alimentacion_intolerancia', icon: AlertTriangle, placeholder: 'Ej. Lactosa, Gluten' },
    ]},
    { title: 'Actividad Física y Sueño', icon: Dumbbell, fields: [
      { label: 'Deportes', name: 'deportes_cuales', icon: Dumbbell, placeholder: 'Ej. Correr, Natación' },
      { label: 'Frecuencia', name: 'deportes_frecuencia', icon: Activity, placeholder: 'Ej. 3 veces por semana' },
      { label: 'Sueño', name: 'sueno_descripcion', icon: Moon, placeholder: 'Ej. 8 horas, insomnio' },
    ]},
    { title: 'Toxicomanías - Alcohol', icon: Wine, fields: [
      { label: 'Consume', name: 'toxicomanias_alcohol', icon: Wine, placeholder: 'Ej. Sí, No' },
      { label: 'Inicio', name: 'toxicomanias_alcohol_inicio', icon: Calendar, placeholder: 'Ej. 2010' },
      { label: 'Frecuencia', name: 'toxicomanias_alcohol_frecuencia', icon: Activity, placeholder: 'Ej. Ocasional, Semanal' },
      { label: 'Descripción', name: 'toxicomanias_alcohol_descripcion', placeholder: 'Describa el consumo...' },
    ]},
    { title: 'Toxicomanías - Tabaco', icon: Cigarette, fields: [
      { label: 'Consume', name: 'toxicomanias_tabaco', icon: Cigarette, placeholder: 'Ej. Sí, No' },
      { label: 'Inicio', name: 'toxicomanias_tabaco_inicio', icon: Calendar, placeholder: 'Ej. 2010' },
      { label: 'Frecuencia', name: 'toxicomanias_tabaco_frecuencia', icon: Activity, placeholder: 'Ej. Diario, Semanal' },
      { label: 'Descripción', name: 'toxicomanias_tabaco_descripcion', placeholder: 'Describa el consumo...' },
    ]},
    { title: 'Toxicomanías - Drogas', icon: FlaskConical, fields: [
      { label: 'Consume', name: 'toxicomanias_drogas', icon: FlaskConical, placeholder: 'Ej. Sí, No' },
      { label: 'Inicio', name: 'toxicomanias_drogas_inicio', icon: Calendar, placeholder: 'Ej. 2010' },
      { label: 'Frecuencia', name: 'toxicomanias_drogas_frecuencia', icon: Activity, placeholder: 'Ej. Ocasional' },
      { label: 'Descripción', name: 'toxicomanias_drogas_descripcion', placeholder: 'Describa el consumo...' },
    ]},
  ]
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">Antecedentes No Patológicos</h3>
      {!data && !editing ? (
        <p className="text-sm text-slate-400 py-4 text-center">Sin registros. Haz clic en Editar antecedentes para agregar.</p>
      ) : (
        <div className="space-y-5">
          {sections.map(s => {
            const SIcon = s.icon
            return (
              <div key={s.title}>
                <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2 border-b border-slate-200 dark:border-slate-600 pb-1 flex items-center gap-1.5">
                  {SIcon && <SIcon className="w-3.5 h-3.5 text-primary" />}{s.title}
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3">
                  {s.fields.map(f => (
                    <Field key={f.name} label={f.label} value={editing ? form[f.name] : data?.[f.name]}
                      name={f.name} editing={editing} onChange={ch} type={f.type} icon={f.icon} placeholder={f.placeholder} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
})

/* ── A. Heredo Familiares ── */
const AntHeredoFamiliares = forwardRef(function AntHeredoFamiliares({ data, pacienteId, editing, canUpdate }, ref) {
  const [form, setForm] = useState({})
  const mutation = useAntMutation('/antecedentes-heredo-familiares', 'ant-hf', pacienteId)
  const ch = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  const chBool = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.checked ? 1 : 0 }))

  useEffect(() => { setForm(data ? { ...data } : {}) }, [data])

  useImperativeHandle(ref, () => ({
    save: () => {
      const hasData = data?.id || Object.values(form).some(v => v)
      if (!hasData) return Promise.resolve()
      return mutation.mutateAsync({ record_id: data?.id, data: form })
    },
    cancel: () => setForm(data ? { ...data } : {}),
  }))

  const boolFields = [
    'tuberculosis', 'diabetes_mellitus', 'hipertencion', 'carcinomas', 'cardiopatias',
    'hepatopatias', 'nefropatias', 'enfermedades_endocrinas', 'enfermedades_mentales',
    'epilepsia', 'asma', 'enfermedades_hematologicas', 'sifilis',
  ]
  const familyFields = [
    { label: 'Abuelo Paterno', name: 'abuelo_paterno', icon: User, placeholder: 'Antecedentes del abuelo paterno...' },
    { label: 'Abuela Paterna', name: 'abuela_paterno', icon: User, placeholder: 'Antecedentes de la abuela paterna...' },
    { label: 'Abuelo Materno', name: 'abuelo_materno', icon: User, placeholder: 'Antecedentes del abuelo materno...' },
    { label: 'Abuela Materna', name: 'abuela_materno', icon: User, placeholder: 'Antecedentes de la abuela materna...' },
    { label: 'Padre', name: 'padre', icon: User, placeholder: 'Antecedentes del padre...' },
    { label: 'Madre', name: 'madre', icon: User, placeholder: 'Antecedentes de la madre...' },
    { label: 'Hermanos', name: 'hermanos', icon: Users, placeholder: 'Antecedentes de hermanos...' },
    { label: 'Otros Familiares', name: 'otros_familiares', icon: Users, placeholder: 'Antecedentes de otros familiares...' },
    { label: 'Comentarios', name: 'comentarios', icon: FileText, placeholder: 'Comentarios adicionales...' },
  ]
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">Antecedentes Heredo Familiares</h3>
      {!data && !editing ? (
        <p className="text-sm text-slate-400 py-4 text-center">Sin registros. Haz clic en Editar antecedentes para agregar.</p>
      ) : (
        <div className="space-y-5">
          <div>
            <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2 border-b border-slate-200 dark:border-slate-600 pb-1 flex items-center gap-1.5">
              <HeartPulse className="w-3.5 h-3.5 text-primary" />Enfermedades Familiares
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {boolFields.map(f => (
                <ToggleField key={f} label={f.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  value={editing ? form[f] : data?.[f]} name={f} editing={editing} onChange={chBool} />
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2 border-b border-slate-200 dark:border-slate-600 pb-1 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-primary" />Familiares
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
              {familyFields.map(f => (
                <Field key={f.name} label={f.label} value={editing ? form[f.name] : data?.[f.name]}
                  name={f.name} editing={editing} onChange={ch} type="textarea" icon={f.icon} placeholder={f.placeholder} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

/* ── A. Gineco-Obstétricos ── */
const AntGinecoObstetricos = forwardRef(function AntGinecoObstetricos({ data, pacienteId, editing, canUpdate }, ref) {
  const [form, setForm] = useState({})
  const mutation = useAntMutation('/antecedentes-gineco-obstetricos', 'ant-go', pacienteId)
  const ch = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  useEffect(() => { setForm(data ? { ...data } : {}) }, [data])

  useImperativeHandle(ref, () => ({
    save: () => {
      const hasData = data?.id || Object.values(form).some(v => v)
      if (!hasData) return Promise.resolve()
      return mutation.mutateAsync({ record_id: data?.id, data: form })
    },
    cancel: () => setForm(data ? { ...data } : {}),
  }))

  const sections = [
    { title: 'Obstétricos', icon: Baby, fields: [
      { label: 'Gravidez', name: 'gravidez', icon: Baby, placeholder: 'Número de embarazos' },
      { label: 'Partos', name: 'partos', icon: Baby, placeholder: 'Número de partos' },
      { label: 'Vaginales', name: 'vaginales', placeholder: 'Número de partos vaginales' },
      { label: 'Cesáreas', name: 'cesareas', icon: Scissors, placeholder: 'Número de cesáreas' },
      { label: 'Abortos', name: 'abortos', placeholder: 'Número de abortos' },
      { label: 'Ectópicos', name: 'ectopicos', placeholder: 'Número de ectópicos' },
      { label: 'Nacidos Vivos', name: 'nacidos_vivos', icon: Heart, placeholder: 'Número de nacidos vivos' },
      { label: 'Nacidos Muertos', name: 'nacidos_muertos', placeholder: 'Número de nacidos muertos' },
    ]},
    { title: 'Ginecológicos', icon: HeartPulse, fields: [
      { label: 'Menarca', name: 'menarca', icon: Calendar, placeholder: 'Edad de primera menstruación' },
      { label: 'Menopausia', name: 'menopausia', icon: Calendar, placeholder: 'Edad de menopausia' },
      { label: 'Última Regla', name: 'ultima_regla', icon: CalendarDays, type: 'date' },
      { label: 'Último Parto', name: 'ultimo_parto', icon: CalendarDays, type: 'date' },
      { label: 'Última Citología', name: 'ultima_citologia', icon: CalendarDays, type: 'date' },
      { label: 'Comentarios Citología', name: 'citologia_comentarios', icon: FileText, placeholder: 'Resultados o comentarios...' },
      { label: 'Ciclos Menstruales', name: 'ciclos_menstruales', icon: Activity, placeholder: 'Ej. Regulares, 28 días' },
      { label: 'Actividad Sexual', name: 'actividad_sexual', placeholder: 'Ej. Activa, Inactiva' },
      { label: 'Método de Planificación', name: 'metodo_planificacion', icon: Shield, placeholder: 'Ej. DIU, Hormonal' },
      { label: 'Patologías del Embarazo', name: 'patologias_relacionadas_embarazo', icon: AlertTriangle, placeholder: 'Describa patologías...' },
      { label: 'Fecha Próximo Parto', name: 'fecha_proxima_parto', icon: CalendarDays, type: 'date' },
    ]},
  ]
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-4">Antecedentes Gineco-Obstétricos</h3>
      {!data && !editing ? (
        <p className="text-sm text-slate-400 py-4 text-center">Sin registros. Haz clic en Editar antecedentes para agregar.</p>
      ) : (
        <div className="space-y-5">
          {sections.map(s => {
            const SIcon = s.icon
            return (
              <div key={s.title}>
                <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2 border-b border-slate-200 dark:border-slate-600 pb-1 flex items-center gap-1.5">
                  {SIcon && <SIcon className="w-3.5 h-3.5 text-primary" />}{s.title}
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3">
                  {s.fields.map(f => (
                    <Field key={f.name} label={f.label} value={editing ? form[f.name] : data?.[f.name]}
                      name={f.name} editing={editing} onChange={ch} type={f.type} icon={f.icon} placeholder={f.placeholder} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
})
