import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, Home, Utensils, Activity, Wine } from 'lucide-react'
import api from '../lib/api'
import useModulePermission from '../hooks/useModulePermission'
import PatientSearchSelect from '../components/PatientSearchSelect'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const EMPTY_FORM = {
  nivel_socioeconomico: '',
  vivienda_tipo: '',
  vivienda_renta: '',
  vivienda_agua: '',
  vivienda_luz: '',
  vivienda_drenaje: '',
  vivienda_habitantes: '',
  vivienda_habitaciones: '',
  vivienda_zoonosis: '',
  vivienda_plagas: '',
  vivienda_hacinamiento: '',
  vivienda_descripcion: '',
  alimentacion_calidad: '',
  alimentacion_descripcion: '',
  alimentacion_intolerancia: '',
  deportes_cuales: '',
  deportes_frecuencia: '',
  sueno_descripcion: '',
  toxicomanias_alcohol: '',
  toxicomanias_alcohol_inicio: '',
  toxicomanias_alcohol_frecuencia: '',
  toxicomanias_alcohol_descripcion: '',
  toxicomanias_tabaco: '',
  toxicomanias_tabaco_inicio: '',
  toxicomanias_tabaco_frecuencia: '',
  toxicomanias_tabaco_descripcion: '',
  toxicomanias_drogas: '',
  toxicomanias_drogas_inicio: '',
  toxicomanias_drogas_frecuencia: '',
  toxicomanias_drogas_descripcion: '',
}

const inputClass = "w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-slate-700 dark:text-slate-100"

const ALL_KEYS = Object.keys(EMPTY_FORM)

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

export default function AntecedentesNoPatologicosPage() {
  const { canWrite, canUpdate } = useModulePermission('antecedentes_pnp')
  const queryClient = useQueryClient()
  const [selectedPaciente, setSelectedPaciente] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [existingId, setExistingId] = useState(null)

  const { data: antData, isError } = useQuery({
    queryKey: ['antecedentes_pnp', selectedPaciente],
    queryFn: () => api.get(`/antecedentes-no-patologicos/paciente/${selectedPaciente}`).then((r) => r.data),
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
        ? api.put(`/antecedentes-no-patologicos/${existingId}`, data)
        : api.post('/antecedentes-no-patologicos', { ...data, paciente_id: selectedPaciente }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['antecedentes_pnp', selectedPaciente] })
      toast.success('Antecedentes no patologicos guardados')
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
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Antecedentes No Patologicos</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">Vivienda, alimentacion, actividad fisica y toxicomanias</p>
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

          {/* Vivienda */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <Home className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-300">Vivienda</h3>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5">
              <MiniField label="Nivel socioecon." value={form.nivel_socioeconomico} onChange={(v) => updateField('nivel_socioeconomico', v)} disabled={dis} />
              <MiniField label="Tipo vivienda" value={form.vivienda_tipo} onChange={(v) => updateField('vivienda_tipo', v)} disabled={dis} />
              <MiniField label="Renta" value={form.vivienda_renta} onChange={(v) => updateField('vivienda_renta', v)} disabled={dis} />
              <MiniField label="Agua" value={form.vivienda_agua} onChange={(v) => updateField('vivienda_agua', v)} disabled={dis} />
              <MiniField label="Luz" value={form.vivienda_luz} onChange={(v) => updateField('vivienda_luz', v)} disabled={dis} />
              <MiniField label="Drenaje" value={form.vivienda_drenaje} onChange={(v) => updateField('vivienda_drenaje', v)} disabled={dis} />
              <MiniField label="Habitantes" type="number" value={form.vivienda_habitantes} onChange={(v) => updateField('vivienda_habitantes', v)} disabled={dis} />
              <MiniField label="Habitaciones" type="number" value={form.vivienda_habitaciones} onChange={(v) => updateField('vivienda_habitaciones', v)} disabled={dis} />
              <MiniField label="Zoonosis" value={form.vivienda_zoonosis} onChange={(v) => updateField('vivienda_zoonosis', v)} disabled={dis} />
              <MiniField label="Plagas" value={form.vivienda_plagas} onChange={(v) => updateField('vivienda_plagas', v)} disabled={dis} />
              <MiniField label="Hacinamiento" value={form.vivienda_hacinamiento} onChange={(v) => updateField('vivienda_hacinamiento', v)} disabled={dis} />
            </div>
            <div className="mt-1.5">
              <MiniField label="Descripcion vivienda" value={form.vivienda_descripcion} onChange={(v) => updateField('vivienda_descripcion', v)} disabled={dis} rows={2} placeholder="Descripcion general de la vivienda..." />
            </div>
          </div>

          {/* Alimentacion */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <Utensils className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-300">Alimentacion</h3>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5">
              <MiniField label="Calidad" value={form.alimentacion_calidad} onChange={(v) => updateField('alimentacion_calidad', v)} disabled={dis} />
              <MiniField label="Intolerancia" value={form.alimentacion_intolerancia} onChange={(v) => updateField('alimentacion_intolerancia', v)} disabled={dis} />
            </div>
            <div className="mt-1.5">
              <MiniField label="Descripcion alimentacion" value={form.alimentacion_descripcion} onChange={(v) => updateField('alimentacion_descripcion', v)} disabled={dis} rows={2} placeholder="Descripcion de habitos alimenticios..." />
            </div>
          </div>

          {/* Actividad */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-300">Actividad</h3>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5">
              <MiniField label="Deportes" value={form.deportes_cuales} onChange={(v) => updateField('deportes_cuales', v)} disabled={dis} />
              <MiniField label="Frecuencia" value={form.deportes_frecuencia} onChange={(v) => updateField('deportes_frecuencia', v)} disabled={dis} />
            </div>
            <div className="mt-1.5">
              <MiniField label="Sueno" value={form.sueno_descripcion} onChange={(v) => updateField('sueno_descripcion', v)} disabled={dis} rows={2} placeholder="Horas de sueno, calidad..." />
            </div>
          </div>

          {/* Toxicomanias */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wine className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-300">Toxicomanias</h3>
            </div>

            {/* Alcohol */}
            <p className="text-[12px] font-semibold uppercase text-slate-400 dark:text-slate-500 mt-2 mb-1">Alcohol</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5">
              <MiniField label="Consumo" value={form.toxicomanias_alcohol} onChange={(v) => updateField('toxicomanias_alcohol', v)} disabled={dis} />
              <MiniField label="Inicio" value={form.toxicomanias_alcohol_inicio} onChange={(v) => updateField('toxicomanias_alcohol_inicio', v)} disabled={dis} />
              <MiniField label="Frecuencia" value={form.toxicomanias_alcohol_frecuencia} onChange={(v) => updateField('toxicomanias_alcohol_frecuencia', v)} disabled={dis} />
              <MiniField label="Descripcion" value={form.toxicomanias_alcohol_descripcion} onChange={(v) => updateField('toxicomanias_alcohol_descripcion', v)} disabled={dis} />
            </div>

            {/* Tabaco */}
            <p className="text-[12px] font-semibold uppercase text-slate-400 dark:text-slate-500 mt-3 mb-1">Tabaco</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5">
              <MiniField label="Consumo" value={form.toxicomanias_tabaco} onChange={(v) => updateField('toxicomanias_tabaco', v)} disabled={dis} />
              <MiniField label="Inicio" value={form.toxicomanias_tabaco_inicio} onChange={(v) => updateField('toxicomanias_tabaco_inicio', v)} disabled={dis} />
              <MiniField label="Frecuencia" value={form.toxicomanias_tabaco_frecuencia} onChange={(v) => updateField('toxicomanias_tabaco_frecuencia', v)} disabled={dis} />
              <MiniField label="Descripcion" value={form.toxicomanias_tabaco_descripcion} onChange={(v) => updateField('toxicomanias_tabaco_descripcion', v)} disabled={dis} />
            </div>

            {/* Drogas */}
            <p className="text-[12px] font-semibold uppercase text-slate-400 dark:text-slate-500 mt-3 mb-1">Drogas</p>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5">
              <MiniField label="Consumo" value={form.toxicomanias_drogas} onChange={(v) => updateField('toxicomanias_drogas', v)} disabled={dis} />
              <MiniField label="Inicio" value={form.toxicomanias_drogas_inicio} onChange={(v) => updateField('toxicomanias_drogas_inicio', v)} disabled={dis} />
              <MiniField label="Frecuencia" value={form.toxicomanias_drogas_frecuencia} onChange={(v) => updateField('toxicomanias_drogas_frecuencia', v)} disabled={dis} />
              <MiniField label="Descripcion" value={form.toxicomanias_drogas_descripcion} onChange={(v) => updateField('toxicomanias_drogas_descripcion', v)} disabled={dis} />
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
