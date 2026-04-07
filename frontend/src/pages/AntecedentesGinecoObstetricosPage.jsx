import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, Baby, HeartPulse } from 'lucide-react'
import api from '../lib/api'
import useModulePermission from '../hooks/useModulePermission'
import PatientSearchSelect from '../components/PatientSearchSelect'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const EMPTY_FORM = {
  gravidez: '',
  partos: '',
  vaginales: '',
  cesareas: '',
  abortos: '',
  ectopicos: '',
  nacidos_vivos: '',
  nacidos_muertos: '',
  menarca: '',
  menopausia: '',
  ultima_regla: '',
  ultimo_parto: '',
  ultima_citologia: '',
  citologia_comentarios: '',
  ciclos_menstruales: '',
  actividad_sexual: '',
  metodo_planificacion: '',
  patologias_relacionadas_embarazo: '',
  fecha_proxima_parto: '',
}

const ALL_KEYS = Object.keys(EMPTY_FORM)

const OBSTETRIC_FIELDS = [
  { key: 'gravidez', label: 'Gravidez' },
  { key: 'partos', label: 'Partos' },
  { key: 'vaginales', label: 'Vaginales' },
  { key: 'cesareas', label: 'Cesareas' },
  { key: 'abortos', label: 'Abortos' },
  { key: 'ectopicos', label: 'Ectopicos' },
  { key: 'nacidos_vivos', label: 'Nacidos Vivos' },
  { key: 'nacidos_muertos', label: 'Nacidos Muertos' },
]

const GYNECO_FIELDS = [
  { key: 'menarca', label: 'Menarca' },
  { key: 'menopausia', label: 'Menopausia' },
  { key: 'ultima_regla', label: 'Ultima Regla' },
  { key: 'ultimo_parto', label: 'Ultimo Parto' },
  { key: 'ultima_citologia', label: 'Ultima Citologia' },
  { key: 'citologia_comentarios', label: 'Comentarios Citologia' },
  { key: 'ciclos_menstruales', label: 'Ciclos Menstruales' },
  { key: 'actividad_sexual', label: 'Actividad Sexual' },
  { key: 'metodo_planificacion', label: 'Metodo Planificacion' },
]

const inputClass = "w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-slate-700 dark:text-slate-100"

function MiniField({ label, value, onChange, type = 'text', disabled, rows, placeholder }) {
  return (
    <div>
      <label className="block text-[12px] font-semibold uppercase text-slate-400 dark:text-slate-500 mb-0.5">{label}</label>
      {rows ? (
        <textarea value={value ?? ''} rows={rows}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled} placeholder={placeholder}
          className={clsx(inputClass, 'min-h-[60px] resize-none', disabled && 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400')} />
      ) : (
        <input type={type} value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled} placeholder={placeholder}
          className={clsx(inputClass, disabled && 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400')} />
      )}
    </div>
  )
}

export default function AntecedentesGinecoObstetricosPage() {
  const { canWrite, canUpdate } = useModulePermission('antecedentes_go')
  const queryClient = useQueryClient()
  const [selectedPaciente, setSelectedPaciente] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [existingId, setExistingId] = useState(null)

  const { data: antData, isError } = useQuery({
    queryKey: ['antecedentes_go', selectedPaciente],
    queryFn: () => api.get(`/antecedentes-gineco-obstetricos/paciente/${selectedPaciente}`).then((r) => r.data),
    enabled: !!selectedPaciente,
  })

  useEffect(() => {
    if (isError || !selectedPaciente) {
      setForm(EMPTY_FORM)
      setExistingId(null)
      return
    }
    if (antData) {
      const newForm = {}
      ALL_KEYS.forEach((key) => { newForm[key] = antData[key] ?? '' })
      setForm(newForm)
      setExistingId(antData.id)
    } else if (antData === null || antData === undefined) {
      setForm(EMPTY_FORM)
      setExistingId(null)
    }
  }, [antData, isError, selectedPaciente])

  const saveMutation = useMutation({
    mutationFn: (data) =>
      existingId
        ? api.put(`/antecedentes-gineco-obstetricos/${existingId}`, data)
        : api.post('/antecedentes-gineco-obstetricos', { ...data, paciente_id: selectedPaciente }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['antecedentes_go', selectedPaciente] })
      toast.success('Antecedentes gineco obstetricos guardados')
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Error al guardar'),
  })

  const handleSubmit = (e) => { e.preventDefault(); saveMutation.mutate(form) }
  const updateField = (f, v) => setForm((prev) => ({ ...prev, [f]: v }))
  const canEdit = existingId ? canUpdate : canWrite
  const dis = !canEdit

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Antecedentes Gineco Obstetricos</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">Datos obstetricos, ginecologicos y de embarazo</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <PatientSearchSelect value={selectedPaciente} onChange={setSelectedPaciente} className="flex-1" />
          {selectedPaciente && (
            <span className="text-[12px] text-slate-400 dark:text-slate-500 font-medium">
              {existingId ? 'Registro existente' : 'Nuevo registro'}
            </span>
          )}
        </div>
      </div>

      {selectedPaciente && (
        <form onSubmit={handleSubmit} className="space-y-3">

          {/* Obstetricos */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <Baby className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-300">Obstetricos</h3>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5">
              {OBSTETRIC_FIELDS.map(({ key, label }) => (
                <MiniField key={key} label={label} type="number" value={form[key]} onChange={(v) => updateField(key, v)} disabled={dis} />
              ))}
            </div>
          </div>

          {/* Ginecologicos */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <HeartPulse className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-300">Ginecologicos</h3>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5">
              {GYNECO_FIELDS.map(({ key, label }) => (
                <MiniField key={key} label={label} value={form[key]} onChange={(v) => updateField(key, v)} disabled={dis} />
              ))}
            </div>
          </div>

          {/* Embarazo */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <Baby className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-300">Embarazo</h3>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5">
              <MiniField label="Fecha prox. parto" value={form.fecha_proxima_parto} onChange={(v) => updateField('fecha_proxima_parto', v)} disabled={dis} />
            </div>
            <div className="mt-1.5">
              <MiniField label="Patologias relacionadas al embarazo" value={form.patologias_relacionadas_embarazo} onChange={(v) => updateField('patologias_relacionadas_embarazo', v)} disabled={dis} rows={2} placeholder="Patologias relacionadas al embarazo..." />
            </div>
          </div>

          {canEdit && (
            <div className="flex justify-end">
              <button type="submit" disabled={saveMutation.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg shadow-lg shadow-primary/30 hover:bg-primary-dark disabled:opacity-50 transition-all">
                <Save className="w-3.5 h-3.5" />
                {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  )
}
