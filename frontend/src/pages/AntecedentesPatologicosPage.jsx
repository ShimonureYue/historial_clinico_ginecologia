import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import api from '../lib/api'
import useModulePermission from '../hooks/useModulePermission'
import PatientSearchSelect from '../components/PatientSearchSelect'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const EMPTY_FORM = {
  enfermedades: '',
  hospitalizaciones: '',
  cirugias: '',
  traumatismos: '',
  transfusiones_sanguineas: '',
  immunizaciones_vacunas: '',
  historia_psiquiatrica: '',
  viajes: '',
}

const inputClass = "w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-slate-700 dark:text-slate-100"

const FIELDS = [
  { key: 'enfermedades', label: 'Enfermedades' },
  { key: 'hospitalizaciones', label: 'Hospitalizaciones' },
  { key: 'cirugias', label: 'Cirugías' },
  { key: 'traumatismos', label: 'Traumatismos' },
  { key: 'transfusiones_sanguineas', label: 'Transfusiones Sanguíneas' },
  { key: 'immunizaciones_vacunas', label: 'Inmunizaciones / Vacunas' },
  { key: 'historia_psiquiatrica', label: 'Historia Psiquiátrica' },
  { key: 'viajes', label: 'Viajes' },
]

export default function AntecedentesPatologicosPage() {
  const { canWrite, canUpdate } = useModulePermission('antecedentes_pp')
  const queryClient = useQueryClient()
  const [selectedPaciente, setSelectedPaciente] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [existingId, setExistingId] = useState(null)

  const { data: antData, isError } = useQuery({
    queryKey: ['antecedentes_pp', selectedPaciente],
    queryFn: () => api.get(`/antecedentes-patologicos/paciente/${selectedPaciente}`).then((r) => r.data),
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
      FIELDS.forEach(({ key }) => { newForm[key] = antData[key] || '' })
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
        ? api.put(`/antecedentes-patologicos/${existingId}`, data)
        : api.post('/antecedentes-patologicos', { ...data, paciente_id: selectedPaciente }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['antecedentes_pp', selectedPaciente] })
      toast.success('Antecedentes patologicos guardados')
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
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Antecedentes Patologicos</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">Enfermedades previas, hospitalizaciones, cirugias y mas</p>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <PatientSearchSelect value={selectedPaciente} onChange={setSelectedPaciente} className="flex-1" />
          {selectedPaciente && (
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              {existingId ? 'Registro existente' : 'Nuevo registro'}
            </span>
          )}
        </div>
      </div>

      {selectedPaciente && (
        <form onSubmit={handleSubmit}>
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm p-4 space-y-2">
            <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">Antecedentes Patologicos Personales</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5">
              {FIELDS.map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500 mb-0.5">{label}</label>
                  <textarea value={form[key]} onChange={(e) => updateField(key, e.target.value)}
                    rows={3} disabled={dis}
                    placeholder={`${label}...`}
                    className={clsx(inputClass, 'min-h-[60px] resize-none', dis && 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400')} />
                </div>
              ))}
            </div>

            {canEdit && (
              <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-700">
                <button type="submit" disabled={saveMutation.isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg shadow-lg shadow-primary/30 hover:bg-primary-dark disabled:opacity-50 transition-all">
                  <Save className="w-3.5 h-3.5" />
                  {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            )}
          </div>
        </form>
      )}
    </div>
  )
}
