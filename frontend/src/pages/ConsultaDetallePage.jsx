import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Save, Pencil, Printer, Plus, Trash2, Upload, Image, FileText, ArrowLeft,
  Stethoscope, HeartPulse, Microscope, Pill, ClipboardList, Activity, Thermometer,
  Ruler, Weight, Droplets, Brain, Bone, Wind, Hand, Baby, CircleEllipsis, Search as SearchIcon, Calendar,
  ListChecks, Zap, Eye, Heart, UtensilsCrossed, Droplet, CircleDot, Dumbbell, BrainCog, Layers, Syringe, Shield,
} from 'lucide-react'
import { jsPDF } from 'jspdf'
import toast from 'react-hot-toast'
import api from '../lib/api'
import useModulePermission from '../hooks/useModulePermission'
import clsx from 'clsx'
import RichTextEditor from '../components/RichTextEditor'

/* ────────── htmlToLines: convert HTML to plain text lines for PDF ────────── */
function htmlToLines(html, doc, maxWidth) {
  if (!html) return []
  function nodeToText(node) {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent
    if (node.nodeType !== Node.ELEMENT_NODE) return ''
    const tag = node.tagName.toLowerCase()
    if (tag === 'ol') {
      let i = 0
      return Array.from(node.childNodes).map(c => {
        if (c.nodeType === Node.ELEMENT_NODE && c.tagName.toLowerCase() === 'li') {
          i++
          return `${i}. ${Array.from(c.childNodes).map(nodeToText).join('').replace(/\n/g, '')}\n`
        }
        return nodeToText(c)
      }).join('')
    }
    if (tag === 'ul') {
      return Array.from(node.childNodes).map(c => {
        if (c.nodeType === Node.ELEMENT_NODE && c.tagName.toLowerCase() === 'li') {
          return `• ${Array.from(c.childNodes).map(nodeToText).join('').replace(/\n/g, '')}\n`
        }
        return nodeToText(c)
      }).join('')
    }
    if (tag === 'br') return '\n'
    const inner = Array.from(node.childNodes).map(nodeToText).join('')
    if (['p', 'div', 'h1', 'h2', 'h3', 'h4'].includes(tag)) return inner + '\n'
    return inner
  }
  const parsed = new DOMParser().parseFromString(html, 'text/html')
  const plain = nodeToText(parsed.body).replace(/\n{3,}/g, '\n\n').trim()
  if (!plain) return []
  return doc.splitTextToSize(plain, maxWidth)
}

/* ────────── formatDateEs: "15 de Marzo de 2026" ────────── */
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
function formatDateEs(dateStr) {
  if (!dateStr) return ''
  const s = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.slice(0, 10)
  const [y, m, d] = s.split('-').map(Number)
  if (!y || !m || !d) return dateStr
  const mes = MESES[m - 1] || ''
  return `${d} de ${mes.charAt(0).toUpperCase() + mes.slice(1)} de ${y}`
}

/* ────────── helpers ────────── */
function calcAge(fechaNac, refDate) {
  if (!fechaNac || fechaNac.length < 10) return '-'
  const b = new Date(fechaNac.slice(0, 10) + 'T00:00:00')
  if (isNaN(b.getTime())) return '-'
  const ref = refDate && refDate.length >= 10 ? refDate.slice(0, 10) : null
  const n = ref ? new Date(ref + 'T00:00:00') : new Date()
  if (isNaN(n.getTime())) return '-'
  let y = n.getFullYear() - b.getFullYear(), m = n.getMonth() - b.getMonth(), d = n.getDate() - b.getDate()
  if (d < 0) { m--; d += new Date(n.getFullYear(), n.getMonth(), 0).getDate() }
  if (m < 0) { y--; m += 12 }
  return y > 0 ? `${y}a ${m}m ${d}d` : m > 0 ? `${m}m ${d}d` : `${d}d`
}

/* ────────── tiny field helpers ────────── */
function MiniField({ label, value, onChange, disabled, type = 'text', className = '', icon: Icon }) {
  return (
    <div className={className}>
      <label className="block text-[12px] font-semibold uppercase text-slate-400 dark:text-slate-500 mb-0.5">
        {label}
      </label>
      <div className="relative">
        {Icon && <Icon className="w-3.5 h-3.5 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />}
        <input
          type={type}
          value={value ?? ''}
          onChange={onChange}
          disabled={disabled}
          className={clsx(
            'w-full text-xs py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors',
            Icon ? 'pl-7 pr-2' : 'px-2'
          )}
        />
      </div>
    </div>
  )
}

function MiniTextarea({ label, value, onChange, disabled, rows = 3, icon: Icon }) {
  return (
    <div>
      <label className="text-[12px] font-semibold uppercase text-slate-400 dark:text-slate-500 mb-0.5 flex items-center gap-1.5">
        {Icon && <Icon className="w-3.5 h-3.5 text-primary/60" />}
        {label}
      </label>
      <textarea
        value={value ?? ''}
        onChange={onChange}
        disabled={disabled}
        rows={rows}
        className="w-full text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors min-h-[60px] resize-y"
      />
    </div>
  )
}

function SectionCard({ icon: Icon, title, children, className = '' }) {
  return (
    <div className={clsx('bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700', className)}>
      <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-3">
        {Icon && <div className="p-1 rounded-md bg-primary/10 text-primary"><Icon className="w-3.5 h-3.5" /></div>}
        {title}
      </h3>
      {children}
    </div>
  )
}

/* ─── Toggle field for boolean fields ─── */
function ToggleField({ label, value, name, editing, onChange }) {
  if (!editing) return (
    <div className="flex items-center gap-1.5 py-0.5">
      <span className={clsx('w-2 h-2 rounded-full flex-shrink-0', value ? 'bg-red-400' : 'bg-slate-300 dark:bg-slate-600')} />
      <span className={clsx('text-[11px] leading-tight', value ? 'text-slate-800 dark:text-slate-100 font-medium' : 'text-slate-500 dark:text-slate-400')}>{label}</span>
    </div>
  )
  return (
    <label className="flex items-center gap-1.5 cursor-pointer py-0.5">
      <input type="checkbox" name={name} checked={!!value} onChange={onChange}
        className="w-3.5 h-3.5 rounded border-slate-300 text-primary focus:ring-primary" />
      <span className={clsx('text-[11px] leading-tight', value ? 'text-slate-800 dark:text-slate-100 font-medium' : 'text-slate-600 dark:text-slate-300')}>{label}</span>
    </label>
  )
}

/* ─── Collapsible interrogatorio section ─── */
function InterrogatorioSection({ groupKey, title, icon: Icon, fields, interrogatorio, editing, intBoolChange, intTextChange, dis }) {
  const [open, setOpen] = useState(true)
  const activeCount = fields.filter(f => interrogatorio[`${groupKey}_${f}`]).length
  const comment = interrogatorio[`${groupKey}_comentarios`] ?? ''

  return (
    <div className="border border-slate-100 dark:border-slate-700 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors text-left"
      >
        <div className="p-1 rounded-md bg-primary/10 text-primary"><Icon className="w-3 h-3" /></div>
        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 flex-1">{title}</span>
        {activeCount > 0 && (
          <span className="px-1.5 py-0.5 text-[12px] font-bold rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
            {activeCount}
          </span>
        )}
        {comment && !activeCount && <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
        <svg className={clsx('w-3.5 h-3.5 text-slate-400 transition-transform', open && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="px-3 py-2 space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-3 gap-y-0.5">
            {fields.map((field) => {
              const dbField = `${groupKey}_${field}`
              return (
                <ToggleField key={dbField} label={humanLabel(field)} value={interrogatorio[dbField]}
                  name={dbField} editing={editing} onChange={intBoolChange(dbField)} />
              )
            })}
          </div>
          <textarea
            placeholder="Comentarios..."
            value={comment}
            onChange={intTextChange(`${groupKey}_comentarios`)}
            disabled={dis}
            rows={1}
            className="w-full text-[11px] px-2 py-1 rounded-md border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 placeholder-slate-400 disabled:opacity-60 disabled:cursor-not-allowed focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-y"
          />
        </div>
      )}
    </div>
  )
}

/* ────────── interrogatorio groups ────────── */
const INTERROGATORIO_GROUPS = [
  { key: 'generales', title: 'Generales', icon: Zap, fields: ['fiebre', 'astenia', 'adinamia', 'perdida_peso', 'hiporexia', 'anorexia'] },
  { key: 'nervioso', title: 'Sistema Nervioso', icon: Brain, fields: ['cefalea', 'vertigo', 'perdida_sensibilidad', 'debilidad', 'letargo', 'somnolencia', 'movimientos_anormales', 'temblores', 'espasmos_musculares', 'coma', 'sincope', 'deficit_marcha', 'ataxia', 'ceguera', 'dolor_neurologico', 'alucinaciones_acusticas', 'alucinaciones_visuales'] },
  { key: 'organos', title: 'Órganos de los Sentidos', icon: Eye, fields: ['dolor_ocular', 'dolor_auditivo', 'perdida_audicion', 'disnea', 'dolor_encias', 'sensibilidad_dental', 'disminucion_agudeza_visual', 'disminucion_agudeza_auditiva', 'hiposmia', 'anosmia', 'tinitus'] },
  { key: 'cardiovascular', title: 'Cardiovascular', icon: Heart, fields: ['vertigo', 'mareo', 'sincope', 'dolor_precordial', 'palpitacion', 'disnea', 'edema', 'acufenos', 'fosfenos'] },
  { key: 'respiratorio', title: 'Respiratorio', icon: Wind, fields: ['disnea', 'apnea', 'tos', 'sibilancia', 'congestion_nasal', 'dolor_toracico', 'hemoptisis', 'espectoracion', 'vomica'] },
  { key: 'gastrointestinal', title: 'Gastrointestinal', icon: UtensilsCrossed, fields: ['pirosis', 'taquifagia', 'alitosis', 'disfagia', 'onicofagia', 'vomito', 'rectoragia', 'melena', 'tenesmo', 'nauseas', 'distencion_abdominal', 'hematemesis', 'diarrea', 'constipacion', 'regurgitacion_esofagica'] },
  { key: 'genitourinario', title: 'Genitourinario', icon: Droplet, fields: ['colico_renal', 'disuria', 'coliuria', 'hematuria', 'anuria', 'nicturia', 'poliuria', 'lesiones_genitales', 'tenesmo_vesical', 'pujo', 'prurito_valvulal'] },
  { key: 'endocrino', title: 'Endocrino', icon: CircleDot, fields: ['dibilidad', 'fatiga', 'polifagia'] },
  { key: 'osteomuscular', title: 'Osteomuscular', icon: Dumbbell, fields: ['dolor_maxilar', 'rigidez_articular', 'inflamacion_articular', 'debilidad_muscular', 'sensibilidad_osea', 'calambres_musculares', 'hormigueo', 'sensasion_ardor', 'pesadez', 'mialguia', 'artralgias'] },
  { key: 'psicologico', title: 'Psicológico', icon: BrainCog, fields: ['ansiedad', 'fatiga', 'panico', 'irritabilidad', 'insomnio', 'somnolencia', 'alucinaciones', 'depresion'] },
  { key: 'tegumentario', title: 'Tegumentario', icon: Layers, fields: ['prurito_cutaneo', 'dolor_urente', 'hiperestesias', 'hipoestesias', 'disestesia', 'rubicundez', 'exantemas', 'clanosis', 'ictericia', 'hipersensibilidad'] },
  { key: 'hematopoyetico', title: 'Hematopoyético', icon: Syringe, fields: ['astenia', 'vertigo'] },
  { key: 'inmunologico', title: 'Inmunológico', icon: Shield, fields: ['edema', 'urticaria'] },
]

function humanLabel(field) {
  return field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

/* ────────── empty row templates ────────── */
const emptyMedicamento = { nombre: '', presentacion: '', dosis: '', frecuencia: '', duracion: '' }

const emptySignos = {
  talla: '', peso: '', temperatura: '', frecuencia_respiratoria: '',
  frecuencia_cardiaca: '', presion_arterial: '', saturacion: '',
  fondo_uterino: '', frecuencia_cardiaca_fetal: '',
  craneo: '', cuello: '', torax: '', abdomen: '',
  extremidades: '', genitales: '', movimientos_fetales: '', otros: '',
}

const emptyColposcopia = {
  detalle: '',
  foto_1: null, foto_2: null, foto_3: null, foto_4: null, foto_5: null,
  comentario_1: '', comentario_2: '', comentario_3: '', comentario_4: '', comentario_5: '',
  foto_1_url: null, foto_2_url: null, foto_3_url: null, foto_4_url: null, foto_5_url: null,
  // Hallazgos Colposcopicos
  hc_cervix: '', hc_colposcopia: '', hc_epitelio_acetoblanco: '',
  hc_puntilleo: '', hc_mosaico: '', hc_vasos_atipicos: '', hc_tumor: '',
  hc_localizacion_lesion: '', hc_extension_fondos_saco: '', hc_metaplasia: '',
  hc_eversion_glandular: '', hc_atrofia_epitelial: '', hc_reaccion_inflamatoria: '',
  hc_exudado_vaginal: '', hc_add: '', hc_diagnostico_colposcopico: '',
}

const HC_FIELDS = [
  { key: 'hc_cervix', label: 'Cervix' },
  { key: 'hc_colposcopia', label: 'Colposcopía' },
  { key: 'hc_epitelio_acetoblanco', label: 'Epitelio Acetoblanco' },
  { key: 'hc_puntilleo', label: 'Puntilleo' },
  { key: 'hc_mosaico', label: 'Mosaico' },
  { key: 'hc_vasos_atipicos', label: 'Vasos Atípicos' },
  { key: 'hc_tumor', label: 'Tumor' },
  { key: 'hc_localizacion_lesion', label: 'Localización de la lesión' },
  { key: 'hc_extension_fondos_saco', label: 'Extensión a fondos de saco' },
  { key: 'hc_metaplasia', label: 'Metaplasia' },
  { key: 'hc_eversion_glandular', label: 'Eversión Glandular' },
  { key: 'hc_atrofia_epitelial', label: 'Atrofia Epitelial' },
  { key: 'hc_reaccion_inflamatoria', label: 'Reacción Inflamatoria' },
  { key: 'hc_exudado_vaginal', label: 'Exudado Vaginal' },
  { key: 'hc_add', label: 'ADD' },
]

const TABS = [
  { id: 'consulta', label: 'Consulta', icon: Stethoscope },
  { id: 'exploracion', label: 'Exploración Física', icon: ClipboardList },
  { id: 'interrogatorio', label: 'Interrogatorio', icon: ListChecks },
  { id: 'colposcopia', label: 'Colposcopía', icon: Microscope },
]

/* ────────── main page ────────── */
export default function ConsultaDetallePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { canUpdate } = useModulePermission('consultas')

  const [activeTab, setActiveTab] = useState('consulta')
  const [editing, setEditing] = useState(location.state?.editing ?? false)
  const [uploadingSlot, setUploadingSlot] = useState(null)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState(null)

  /* form state */
  const [form, setForm] = useState({
    motivo: '', padecimiento_actual: '', exploracion_fisica: '',
    diagnostico: '', tratamiento: '', estudios: '', notas_adicionales: '',
  })
  const [signos, setSignos] = useState({ ...emptySignos })
  const [medicamentos, setMedicamentos] = useState([{ ...emptyMedicamento }])
  const [colpo, setColpo] = useState({ ...emptyColposcopia })
  const [interrogatorio, setInterrogatorio] = useState({})
  const [pacienteNombre, setPacienteNombre] = useState('')
  const [pacienteId, setPacienteId] = useState(null)
  const [fechaConsulta, setFechaConsulta] = useState('')

  const fileInputRefs = useRef({})

  /* ── fetch consulta ── */
  const { data: consulta, isLoading } = useQuery({
    queryKey: ['consulta', id],
    queryFn: () => api.get(`/consultas/${id}`).then((r) => r.data),
  })

  /* ── fetch interrogatorio ── */
  const { data: interrogatorioData } = useQuery({
    queryKey: ['interrogatorio', id],
    queryFn: () => api.get(`/interrogatorio/consulta/${id}`).then((r) => r.data),
  })

  useEffect(() => {
    if (interrogatorioData) setInterrogatorio(interrogatorioData)
  }, [interrogatorioData])

  /* populate state when data arrives */
  useEffect(() => {
    if (!consulta) return
    setForm({
      motivo: consulta.motivo || '',
      padecimiento_actual: consulta.padecimiento_actual || '',
      exploracion_fisica: consulta.exploracion_fisica || '',
      diagnostico: consulta.diagnostico || '',
      tratamiento: consulta.tratamiento || '',
      estudios: consulta.estudios || '',
      notas_adicionales: consulta.notas_adicionales || '',
    })
    const sv = consulta.signos_vitales || {}
    setSignos({
      talla: sv.talla ?? '', peso: sv.peso ?? '', temperatura: sv.temperatura ?? '',
      frecuencia_respiratoria: sv.frecuencia_respiratoria ?? '',
      frecuencia_cardiaca: sv.frecuencia_cardiaca ?? '',
      presion_arterial: sv.presion_arterial ?? '', saturacion: sv.saturacion ?? '',
      fondo_uterino: sv.fondo_uterino ?? '',
      frecuencia_cardiaca_fetal: sv.frecuencia_cardiaca_fetal ?? '',
      craneo: sv.craneo ?? '', cuello: sv.cuello ?? '', torax: sv.torax ?? '',
      abdomen: sv.abdomen ?? '', extremidades: sv.extremidades ?? '',
      genitales: sv.genitales ?? '', movimientos_fetales: sv.movimientos_fetales ?? '',
      otros: sv.otros ?? '',
    })
    setMedicamentos(
      consulta.medicamentos?.length ? consulta.medicamentos : [{ ...emptyMedicamento }]
    )
    if (consulta.colposcopia) {
      setColpo({ ...emptyColposcopia, ...consulta.colposcopia })
    } else {
      setColpo({ ...emptyColposcopia })
    }
    setPacienteNombre(consulta.paciente_nombre || '')
    setPacienteId(consulta.paciente_id)
    setFechaConsulta((consulta.fecha || consulta.created_at || '').slice(0, 10))
  }, [consulta])

  /* ── mutations ── */
  const saveConsultaMut = useMutation({
    mutationFn: (payload) => api.put(`/consultas/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consulta', id] })
      toast.success('Consulta guardada')
    },
    onError: (e) => { console.error('422 consulta:', e?.response?.data); toast.error('Error al guardar consulta') },
  })

  const saveMedsMut = useMutation({
    mutationFn: (meds) => api.put(`/medicamentos/bulk/${id}`, meds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consulta', id] })
      toast.success('Medicamentos guardados')
    },
    onError: (e) => { console.error('422 medicamentos:', e?.response?.data); toast.error('Error al guardar medicamentos') },
  })

  const createColpoMut = useMutation({
    mutationFn: (payload) => api.post('/colposcopias', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consulta', id] })
      toast.success('Colposcopía creada')
    },
    onError: () => toast.error('Error al crear colposcopía'),
  })

  const updateColpoMut = useMutation({
    mutationFn: ({ colpoId, payload }) => api.put(`/colposcopias/${colpoId}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['consulta', id] })
      toast.success('Colposcopía actualizada')
    },
    onError: () => toast.error('Error al actualizar colposcopía'),
  })

  const uploadPhotoMut = useMutation({
    mutationFn: ({ colpoId, fotoNum, file }) => {
      setUploadingSlot(fotoNum)
      const fd = new FormData()
      fd.append('file', file)
      return api.post(`/colposcopias/${colpoId}/upload/${fotoNum}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    },
    onSuccess: () => {
      setUploadingSlot(null)
      queryClient.invalidateQueries({ queryKey: ['consulta', id] })
      toast.success('Imagen subida')
    },
    onError: () => {
      setUploadingSlot(null)
      toast.error('Error al subir imagen')
    },
  })

  const createInterrogatorioMut = useMutation({
    mutationFn: (payload) => api.post('/interrogatorio', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interrogatorio', id] })
      toast.success('Interrogatorio guardado')
    },
    onError: () => toast.error('Error al guardar interrogatorio'),
  })

  const updateInterrogatorioMut = useMutation({
    mutationFn: ({ recordId, payload }) => api.put(`/interrogatorio/${recordId}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interrogatorio', id] })
      toast.success('Interrogatorio actualizado')
    },
    onError: () => toast.error('Error al actualizar interrogatorio'),
  })

  /* ── handlers ── */
  const handleSaveConsulta = async () => {
    const cleanSignos = Object.fromEntries(
      Object.entries(signos).map(([k, v]) => [k, v === '' ? null : v])
    )
    const consultaPayload = {
      paciente_id: pacienteId,
      fecha: fechaConsulta,
      ...form,
      ...cleanSignos,
    }
    await saveConsultaMut.mutateAsync(consultaPayload)

    const validMeds = medicamentos
      .filter((m) => m.nombre?.trim())
      .map((m) => ({ ...m, consulta_id: Number(id) }))
    if (validMeds.length) {
      await saveMedsMut.mutateAsync(validMeds)
    }

    setEditing(false)
  }

  const handleSaveColpo = async () => {
    const colpoPayload = {
      consulta_id: Number(id),
      detalle: colpo.detalle,
      comentario_1: colpo.comentario_1, comentario_2: colpo.comentario_2,
      comentario_3: colpo.comentario_3, comentario_4: colpo.comentario_4,
      comentario_5: colpo.comentario_5,
      hc_cervix: colpo.hc_cervix, hc_colposcopia: colpo.hc_colposcopia,
      hc_epitelio_acetoblanco: colpo.hc_epitelio_acetoblanco,
      hc_puntilleo: colpo.hc_puntilleo, hc_mosaico: colpo.hc_mosaico,
      hc_vasos_atipicos: colpo.hc_vasos_atipicos, hc_tumor: colpo.hc_tumor,
      hc_localizacion_lesion: colpo.hc_localizacion_lesion,
      hc_extension_fondos_saco: colpo.hc_extension_fondos_saco,
      hc_metaplasia: colpo.hc_metaplasia,
      hc_eversion_glandular: colpo.hc_eversion_glandular,
      hc_atrofia_epitelial: colpo.hc_atrofia_epitelial,
      hc_reaccion_inflamatoria: colpo.hc_reaccion_inflamatoria,
      hc_exudado_vaginal: colpo.hc_exudado_vaginal,
      hc_add: colpo.hc_add,
      hc_diagnostico_colposcopico: colpo.hc_diagnostico_colposcopico,
    }
    if (colpo.id) {
      await updateColpoMut.mutateAsync({ colpoId: colpo.id, payload: colpoPayload })
    } else {
      await createColpoMut.mutateAsync(colpoPayload)
    }
    setEditing(false)
  }

  const handlePhotoUpload = async (fotoNum, file) => {
    let colpoId = colpo.id
    if (!colpoId) {
      try {
        const res = await createColpoMut.mutateAsync({
          consulta_id: Number(id),
          detalle: colpo.detalle || '',
          comentario_1: colpo.comentario_1, comentario_2: colpo.comentario_2,
          comentario_3: colpo.comentario_3, comentario_4: colpo.comentario_4,
          comentario_5: colpo.comentario_5,
          hc_cervix: colpo.hc_cervix, hc_colposcopia: colpo.hc_colposcopia,
          hc_epitelio_acetoblanco: colpo.hc_epitelio_acetoblanco,
          hc_puntilleo: colpo.hc_puntilleo, hc_mosaico: colpo.hc_mosaico,
          hc_vasos_atipicos: colpo.hc_vasos_atipicos, hc_tumor: colpo.hc_tumor,
          hc_localizacion_lesion: colpo.hc_localizacion_lesion,
          hc_extension_fondos_saco: colpo.hc_extension_fondos_saco,
          hc_metaplasia: colpo.hc_metaplasia,
          hc_eversion_glandular: colpo.hc_eversion_glandular,
          hc_atrofia_epitelial: colpo.hc_atrofia_epitelial,
          hc_reaccion_inflamatoria: colpo.hc_reaccion_inflamatoria,
          hc_exudado_vaginal: colpo.hc_exudado_vaginal,
          hc_add: colpo.hc_add,
          hc_diagnostico_colposcopico: colpo.hc_diagnostico_colposcopico,
        })
        colpoId = res.data.id
        setColpo((p) => ({ ...p, id: colpoId }))
      } catch {
        toast.error('Error al crear colposcopía')
        return
      }
    }
    uploadPhotoMut.mutate({ colpoId, fotoNum, file })
  }

  const handleColpoPdf = async () => {
    if (!colpo.id) return toast.error('No hay colposcopía guardada')
    setPdfLoading(true)
    try {
      const res = await api.get(`/colposcopias/${colpo.id}/pdf`, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.target = '_blank'
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url) }, 200)
    } catch (err) {
      console.error('PDF error:', err)
      toast.error('Error al generar PDF de colposcopía')
    } finally {
      setPdfLoading(false)
    }
  }

  /* ── prescription PDF (half-letter landscape) ── */
  const handlePrescriptionPdf = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [140, 216] })
    const pw = 216
    const margin = 10
    const pageBottom = 130
    const lineH = 4.5
    let y = 45 // top margin (4.5cm header space)

    const checkPage = (needed = 10) => {
      if (y + needed > pageBottom) { doc.addPage(); y = 20 }
    }

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.text(`Paciente: ${pacienteNombre}`, margin, y)
    doc.text(`Fecha: ${formatDateEs(fechaConsulta)}`, pw - margin, y, { align: 'right' })
    y += 5

    const svItems = [
      signos.talla ? `Talla: ${signos.talla}` : '',
      signos.peso ? `Peso: ${signos.peso}` : '',
      signos.temperatura ? `Temp: ${signos.temperatura}` : '',
      signos.presion_arterial ? `PA: ${signos.presion_arterial}` : '',
      signos.frecuencia_cardiaca ? `FC: ${signos.frecuencia_cardiaca}` : '',
      signos.frecuencia_respiratoria ? `FR: ${signos.frecuencia_respiratoria}` : '',
      signos.saturacion ? `SatO2: ${signos.saturacion}` : '',
    ].filter(Boolean)
    if (svItems.length) {
      doc.text(svItems.join('    '), margin, y)
      y += 6
    }

    const meds = medicamentos.filter((m) => m.nombre?.trim())
    if (meds.length) {
      meds.forEach((m, i) => {
        checkPage(12)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text(`${i + 1}.`, margin, y)
        const nombreText = m.nombre || ''
        doc.text(nombreText, margin + 7, y)
        doc.setFont('helvetica', 'normal')
        const presentacionText = m.presentacion ? `   ${m.presentacion}` : ''
        if (presentacionText) doc.text(presentacionText, margin + 7 + doc.getTextWidth(nombreText), y)
        y += lineH
        // indented: Dosis + Frecuencia + Duración
        const line2Parts = [m.dosis, m.frecuencia, m.duracion].filter(Boolean)
        if (line2Parts.length) {
          doc.text(line2Parts.join('    '), margin + 7, y)
          y += lineH
        }
        y += 1
      })
      y += 2
    }

    if (form.notas_adicionales) {
      checkPage(10)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      const notasLines = htmlToLines(form.notas_adicionales, doc, pw - margin * 2)
      notasLines.forEach((line) => {
        checkPage(lineH + 1)
        doc.text(line, margin, y)
        y += lineH
      })
      y += 2
    }

    if (form.tratamiento) {
      checkPage(10)
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('Tratamiento:', margin, y)
      y += lineH + 1
      doc.setFont('helvetica', 'normal')
      const lines = doc.splitTextToSize(form.tratamiento, pw - margin * 2)
      lines.forEach((line) => {
        checkPage(lineH + 1)
        doc.text(line, margin, y)
        y += lineH
      })
      y += 2
    }

    const pdfBlob = doc.output('blob')
    const pdfUrl = URL.createObjectURL(pdfBlob)
    const a = document.createElement('a')
    a.href = pdfUrl
    a.target = '_blank'
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(pdfUrl) }, 200)
  }

  /* ── helpers for form updates ── */
  const f = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }))
  const s = (field) => (e) => setSignos((p) => ({ ...p, [field]: e.target.value }))
  const medChange = (idx, field) => (e) => {
    setMedicamentos((prev) => prev.map((m, i) => (i === idx ? { ...m, [field]: e.target.value } : m)))
  }
  const addMed = () => setMedicamentos((prev) => [...prev, { ...emptyMedicamento }])
  const removeMed = (idx) => setMedicamentos((prev) => prev.filter((_, i) => i !== idx))
  const colpoChange = (field) => (e) => setColpo((p) => ({ ...p, [field]: e.target.value }))
  const intBoolChange = (field) => (e) => setInterrogatorio((p) => ({ ...p, [field]: e.target.checked ? 1 : 0 }))
  const intTextChange = (field) => (e) => setInterrogatorio((p) => ({ ...p, [field]: e.target.value }))

  const handleSaveInterrogatorio = async () => {
    const payload = { consulta_id: Number(id), ...interrogatorio }
    delete payload.id
    delete payload.created_at
    delete payload.updated_at
    if (interrogatorio.id) {
      await updateInterrogatorioMut.mutateAsync({ recordId: interrogatorio.id, payload })
    } else {
      const res = await createInterrogatorioMut.mutateAsync(payload)
      if (res?.data?.id) setInterrogatorio((p) => ({ ...p, id: res.data.id }))
    }
    setEditing(false)
  }

  /* ── loading state ── */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    )
  }

  const dis = !editing

  /* ────────── render ────────── */
  return (
    <div className="space-y-4">
      {/* Header — flat compact bar, no card */}
      <div className="flex items-center gap-2.5 px-1 py-1">
        <button onClick={() => pacienteId ? navigate(`/pacientes/${pacienteId}`) : navigate('/consultas')}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          <ArrowLeft className="w-4.5 h-4.5" />
        </button>

        {(() => {
          const initials = pacienteNombre.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase()
          return <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[11px] font-bold flex-shrink-0">{initials || '?'}</div>
        })()}

        <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{pacienteNombre}</span>
        <span className="text-[12px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 flex-shrink-0">#{id}</span>

        {consulta?.paciente_fecha_nacimiento && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 font-medium flex-shrink-0 hidden sm:inline">
            {calcAge(consulta.paciente_fecha_nacimiento, fechaConsulta)}
          </span>
        )}
        {consulta?.paciente_genero && (
          <span className={clsx(
            'text-[11px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 hidden sm:inline',
            consulta.paciente_genero === 'F' ? 'bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400'
              : 'bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400'
          )}>
            {consulta.paciente_genero === 'F' ? 'Femenino' : consulta.paciente_genero === 'M' ? 'Masculino' : consulta.paciente_genero}
          </span>
        )}
        {consulta?.paciente_fecha_nacimiento && (
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 font-medium flex-shrink-0 hidden md:inline">
            Nac. {consulta.paciente_fecha_nacimiento}
          </span>
        )}

        <div className="flex-1" />

        <span className="text-xs text-slate-400 flex-shrink-0 hidden sm:inline">
          <Calendar className="w-3.5 h-3.5 inline mr-1" />
          {fechaConsulta ? fechaConsulta.split('T')[0] : ''}
        </span>

        {activeTab === 'consulta' && (
          <button onClick={handlePrescriptionPdf}
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors flex-shrink-0">
            <Printer className="w-3.5 h-3.5" /> Receta
          </button>
        )}
        {activeTab === 'colposcopia' && colpo.id && (
          <button onClick={handleColpoPdf} disabled={pdfLoading}
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors flex-shrink-0 disabled:opacity-60 disabled:cursor-not-allowed">
            {pdfLoading
              ? <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/></svg>
              : <FileText className="w-3.5 h-3.5" />
            }
            {pdfLoading ? 'Generando…' : 'PDF'}
          </button>
        )}

        {canUpdate && !editing && (
          <button onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors font-medium shadow-sm shadow-primary/20 flex-shrink-0">
            <Pencil className="w-3 h-3" /> Editar
          </button>
        )}
        {editing && (activeTab === 'consulta' || activeTab === 'exploracion') && (
          <>
            <button onClick={() => setEditing(false)}
              className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 hover:text-slate-700 transition-colors flex-shrink-0">Cancelar</button>
            <button onClick={handleSaveConsulta} disabled={saveConsultaMut.isPending || saveMedsMut.isPending}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary-dark disabled:opacity-50 transition-colors font-medium shadow-sm shadow-primary/20 flex-shrink-0">
              <Save className="w-3 h-3" /> Guardar
            </button>
          </>
        )}
        {editing && activeTab === 'interrogatorio' && (
          <>
            <button onClick={() => setEditing(false)}
              className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 hover:text-slate-700 transition-colors flex-shrink-0">Cancelar</button>
            <button onClick={handleSaveInterrogatorio} disabled={createInterrogatorioMut.isPending || updateInterrogatorioMut.isPending}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary-dark disabled:opacity-50 transition-colors font-medium shadow-sm shadow-primary/20 flex-shrink-0">
              <Save className="w-3 h-3" /> Guardar
            </button>
          </>
        )}
        {editing && activeTab === 'colposcopia' && (
          <>
            <button onClick={() => setEditing(false)}
              className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 hover:text-slate-700 transition-colors flex-shrink-0">Cancelar</button>
            <button onClick={handleSaveColpo} disabled={createColpoMut.isPending || updateColpoMut.isPending}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary-dark disabled:opacity-50 transition-colors font-medium shadow-sm shadow-primary/20 flex-shrink-0">
              <Save className="w-3 h-3" /> Guardar
            </button>
          </>
        )}
      </div>

      {/* ── Tab Bar ── */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-x-auto scrollbar-hide">
        <div className="flex min-w-max">
          {TABS.map(({ id: tabId, label, icon: Icon }) => (
            <button
              key={tabId}
              onClick={() => setActiveTab(tabId)}
              className={clsx(
                'flex flex-col items-center gap-1 px-5 py-3 text-xs font-medium whitespace-nowrap transition-all border-t-2',
                activeTab === tabId
                  ? 'border-primary text-primary bg-primary/5'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-200'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════ TAB: CONSULTA ═══════ */}
      {activeTab === 'consulta' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* LEFT */}
          <div className="space-y-4">
            <SectionCard icon={ClipboardList} title="Datos de Consulta">
              <div className="space-y-3">
                <MiniField label="Fecha de consulta" value={fechaConsulta} onChange={(e) => setFechaConsulta(e.target.value)} disabled={dis} type="date" icon={Calendar} />
                <MiniTextarea label="Motivo de consulta" value={form.motivo} onChange={f('motivo')} disabled={dis} rows={2} />
                <MiniTextarea label="Padecimiento actual" value={form.padecimiento_actual} onChange={f('padecimiento_actual')} disabled={dis} rows={5} />
              </div>
            </SectionCard>

            <SectionCard icon={HeartPulse} title="Signos Vitales">
              <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-3 xl:grid-cols-5 gap-2">
                <MiniField label="Talla" value={signos.talla} onChange={s('talla')} disabled={dis} icon={Ruler} />
                <MiniField label="Peso" value={signos.peso} onChange={s('peso')} disabled={dis} icon={Weight} />
                <MiniField label="Temp °C" value={signos.temperatura} onChange={s('temperatura')} disabled={dis} icon={Thermometer} />
                <MiniField label="F. Resp." value={signos.frecuencia_respiratoria} onChange={s('frecuencia_respiratoria')} disabled={dis} icon={Activity} />
                <MiniField label="F. Card." value={signos.frecuencia_cardiaca} onChange={s('frecuencia_cardiaca')} disabled={dis} icon={HeartPulse} />
                <MiniField label="P. Arterial" value={signos.presion_arterial} onChange={s('presion_arterial')} disabled={dis} icon={Droplets} />
                <MiniField label="SatO₂" value={signos.saturacion} onChange={s('saturacion')} disabled={dis} />
                <MiniField label="Fondo Ut." value={signos.fondo_uterino} onChange={s('fondo_uterino')} disabled={dis} />
                <MiniField label="FCF" value={signos.frecuencia_cardiaca_fetal} onChange={s('frecuencia_cardiaca_fetal')} disabled={dis} />
              </div>
            </SectionCard>
          </div>

          {/* RIGHT */}
          <div className="space-y-4">
            <SectionCard icon={Stethoscope} title="Diagnóstico y Tratamiento">
              <div className="space-y-3">
                <MiniTextarea label="Diagnóstico" value={form.diagnostico} onChange={f('diagnostico')} disabled={dis} />
                <MiniTextarea label="Tratamiento" value={form.tratamiento} onChange={f('tratamiento')} disabled={dis} />
                <MiniTextarea label="Estudios" value={form.estudios} onChange={f('estudios')} disabled={dis} />
              </div>
            </SectionCard>

            <SectionCard icon={Pill} title="Medicamentos">
              <div className="flex items-center justify-end mb-3">
                {editing && (
                  <button
                    onClick={addMed}
                    className="flex items-center gap-1 text-[12px] px-2.5 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
                  >
                    <Plus className="w-3 h-3" /> Agregar
                  </button>
                )}
              </div>
              <div className="space-y-3">
                {medicamentos.map((med, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 pt-1.5 w-5 flex-shrink-0">{idx + 1}.</span>
                    <div className="flex-1 space-y-1.5">
                      {/* Línea 1: Medicamento + Presentación */}
                      <div className="flex gap-2">
                        <input value={med.nombre} onChange={medChange(idx, 'nombre')} disabled={dis}
                          placeholder="Medicamento"
                          className="flex-1 text-xs px-1.5 py-1 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed focus:border-primary focus:outline-none" />
                        <input value={med.presentacion ?? ''} onChange={medChange(idx, 'presentacion')} disabled={dis}
                          placeholder="Presentación"
                          className="flex-1 text-xs px-1.5 py-1 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed focus:border-primary focus:outline-none" />
                      </div>
                      {/* Línea 2: Dosis + Frecuencia + Duración */}
                      <div className="flex gap-2">
                        <input value={med.dosis} onChange={medChange(idx, 'dosis')} disabled={dis}
                          placeholder="Dosis"
                          className="flex-1 text-xs px-1.5 py-1 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed focus:border-primary focus:outline-none" />
                        <input value={med.frecuencia} onChange={medChange(idx, 'frecuencia')} disabled={dis}
                          placeholder="Frecuencia"
                          className="flex-1 text-xs px-1.5 py-1 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed focus:border-primary focus:outline-none" />
                        <input value={med.duracion} onChange={medChange(idx, 'duracion')} disabled={dis}
                          placeholder="Duración"
                          className="flex-1 text-xs px-1.5 py-1 rounded border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed focus:border-primary focus:outline-none" />
                      </div>
                    </div>
                    {editing && (
                      <button onClick={() => removeMed(idx)} className="text-red-400 hover:text-red-600 transition-colors p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 mt-0.5 flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard icon={FileText} title="Indicaciones y comentarios">
              <RichTextEditor
                value={form.notas_adicionales}
                onChange={(html) => setForm((p) => ({ ...p, notas_adicionales: html }))}
                disabled={dis}
                placeholder="Indicaciones, comentarios adicionales, próxima cita..."
              />
            </SectionCard>
          </div>
        </div>
      )}

      {/* ═══════ TAB: EXPLORACIÓN FÍSICA ═══════ */}
      {activeTab === 'exploracion' && (
        <div className="space-y-4">
          <SectionCard icon={SearchIcon} title="Exploración Física General">
            <MiniTextarea label="Exploración Física General" value={form.exploracion_fisica} onChange={f('exploracion_fisica')} disabled={dis} rows={4} icon={ClipboardList} />
          </SectionCard>

          <SectionCard icon={ClipboardList} title="Exploración por Regiones">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              <MiniTextarea label="Cráneo" value={signos.craneo} onChange={s('craneo')} disabled={dis} rows={4} icon={Brain} />
              <MiniTextarea label="Cuello" value={signos.cuello} onChange={s('cuello')} disabled={dis} rows={4} icon={Bone} />
              <MiniTextarea label="Tórax" value={signos.torax} onChange={s('torax')} disabled={dis} rows={4} icon={Wind} />
              <MiniTextarea label="Abdomen" value={signos.abdomen} onChange={s('abdomen')} disabled={dis} rows={4} icon={Activity} />
              <MiniTextarea label="Extremidades" value={signos.extremidades} onChange={s('extremidades')} disabled={dis} rows={4} icon={Hand} />
              <MiniTextarea label="Genitales" value={signos.genitales} onChange={s('genitales')} disabled={dis} rows={4} icon={Stethoscope} />
              <MiniTextarea label="Movimientos Fetales" value={signos.movimientos_fetales} onChange={s('movimientos_fetales')} disabled={dis} rows={4} icon={Baby} />
              <MiniTextarea label="Otros" value={signos.otros} onChange={s('otros')} disabled={dis} rows={4} icon={CircleEllipsis} />
            </div>
          </SectionCard>
        </div>
      )}

      {/* ═══════ TAB: INTERROGATORIO ═══════ */}
      {activeTab === 'interrogatorio' && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <div className="p-1 rounded-md bg-primary/10 text-primary"><ListChecks className="w-3.5 h-3.5" /></div>
              Interrogatorio por Aparatos y Sistemas
            </h3>
            {(() => {
              const total = INTERROGATORIO_GROUPS.reduce((sum, g) => sum + g.fields.filter(f => interrogatorio[`${g.key}_${f}`]).length, 0)
              return total > 0 ? (
                <span className="px-2 py-0.5 text-[12px] font-bold rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                  {total} hallazgo{total !== 1 ? 's' : ''}
                </span>
              ) : null
            })()}
          </div>
          <div className="space-y-1.5">
            {INTERROGATORIO_GROUPS.map(({ key, title, icon, fields }) => (
              <InterrogatorioSection
                key={key}
                groupKey={key}
                title={title}
                icon={icon}
                fields={fields}
                interrogatorio={interrogatorio}
                editing={editing}
                intBoolChange={intBoolChange}
                intTextChange={intTextChange}
                dis={dis}
              />
            ))}
          </div>
        </div>
      )}

      {/* ═══════ TAB: COLPOSCOPÍA ═══════ */}
      {activeTab === 'colposcopia' && (
        <div className="space-y-4">
          <SectionCard icon={Microscope} title="Hallazgos Colposcopicos">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {HC_FIELDS.map(({ key, label }) => (
                <MiniField key={key} label={label} value={colpo[key] ?? ''} onChange={colpoChange(key)} disabled={dis} />
              ))}
            </div>
            <div className="mt-3">
              <MiniTextarea label="Diagnóstico Colposcópico" value={colpo.hc_diagnostico_colposcopico ?? ''} onChange={colpoChange('hc_diagnostico_colposcopico')} disabled={dis} rows={2} />
            </div>
          </SectionCard>

          <SectionCard icon={Microscope} title="Detalle de Colposcopía">
            <MiniTextarea label="Detalle / Hallazgos" value={colpo.detalle} onChange={colpoChange('detalle')} disabled={dis} rows={4} />
          </SectionCard>

          <SectionCard icon={Image} title="Imágenes">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map((n) => {
                const urlKey = `foto_${n}_url`
                const commentKey = `comentario_${n}`
                const imageUrl = colpo[urlKey]
                const isUploading = uploadingSlot === n

                return (
                  <div key={n} className={clsx(
                    'border rounded-xl p-2.5 space-y-2 transition-colors',
                    isUploading
                      ? 'border-primary/50 bg-primary/5 dark:bg-primary/10'
                      : 'border-slate-200 dark:border-slate-600'
                  )}>
                    <label className="block text-[12px] font-semibold uppercase text-slate-400 dark:text-slate-500">
                      Foto {n}
                    </label>

                    {isUploading ? (
                      <div className="w-full h-32 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-700/50 rounded-lg gap-2">
                        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                        <span className="text-[12px] text-primary font-medium animate-pulse">Subiendo imagen...</span>
                      </div>
                    ) : imageUrl ? (
                      <button type="button" onClick={() => setLightboxUrl(imageUrl)} className="w-full focus:outline-none">
                        <img src={imageUrl} alt={`Colposcopía foto ${n}`} className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity" />
                      </button>
                    ) : (
                      <div className="w-full h-32 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                        {editing ? (
                          <>
                            <input type="file" accept="image/*" className="hidden"
                              ref={(el) => { fileInputRefs.current[n] = el }}
                              onChange={(e) => { if (e.target.files?.[0]) handlePhotoUpload(n, e.target.files[0]) }} />
                            <button onClick={() => fileInputRefs.current[n]?.click()}
                              disabled={uploadingSlot !== null}
                              className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium">
                              <Upload className="w-3 h-3" /> Subir imagen
                            </button>
                          </>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <Image className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                            <span className="text-[12px] text-slate-400">Sin imagen</span>
                          </div>
                        )}
                      </div>
                    )}

                    {imageUrl && editing && !isUploading && (
                      <div>
                        <input type="file" accept="image/*" className="hidden"
                          ref={(el) => { fileInputRefs.current[`re_${n}`] = el }}
                          onChange={(e) => { if (e.target.files?.[0]) handlePhotoUpload(n, e.target.files[0]) }} />
                        <button onClick={() => fileInputRefs.current[`re_${n}`]?.click()}
                          disabled={uploadingSlot !== null}
                          className="flex items-center gap-1 text-[12px] px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 hover:text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                          <Upload className="w-3 h-3" /> Reemplazar
                        </button>
                      </div>
                    )}

                    <textarea
                      value={colpo[commentKey] ?? ''}
                      onChange={colpoChange(commentKey)}
                      disabled={dis}
                      placeholder="Comentario..."
                      rows={2}
                      className="w-full text-xs px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 disabled:opacity-60 disabled:cursor-not-allowed focus:border-primary focus:outline-none resize-y min-h-[40px]"
                    />
                  </div>
                )
              })}
            </div>
          </SectionCard>
        </div>
      )}

      {/* Lightbox modal */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-pointer"
          onClick={() => setLightboxUrl(null)}
        >
          <img
            src={lightboxUrl}
            alt="Colposcopía"
            className="max-w-full max-h-[90vh] rounded-xl shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
