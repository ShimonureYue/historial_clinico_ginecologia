import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, Users, Stethoscope } from 'lucide-react'
import api from '../lib/api'
import useModulePermission from '../hooks/useModulePermission'
import PatientSearchSelect from '../components/PatientSearchSelect'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const DISEASE_FIELDS = [
  { key: 'tuberculosis', label: 'Tuberculosis' },
  { key: 'diabetes_mellitus', label: 'Diabetes Mellitus' },
  { key: 'hipertencion', label: 'Hipertension' },
  { key: 'carcinomas', label: 'Carcinomas' },
  { key: 'cardiopatias', label: 'Cardiopatias' },
  { key: 'hepatopatias', label: 'Hepatopatias' },
  { key: 'nefropatias', label: 'Nefropatias' },
  { key: 'enfermedades_endocrinas', label: 'Enf. Endocrinas' },
  { key: 'enfermedades_mentales', label: 'Enf. Mentales' },
  { key: 'epilepsia', label: 'Epilepsia' },
  { key: 'asma', label: 'Asma' },
  { key: 'enfermedades_hematologicas', label: 'Enf. Hematologicas' },
  { key: 'sifilis', label: 'Sifilis' },
]

const FAMILY_FIELDS = [
  { key: 'abuelo_paterno', label: 'Abuelo Paterno' },
  { key: 'abuela_paterno', label: 'Abuela Paterna' },
  { key: 'abuelo_materno', label: 'Abuelo Materno' },
  { key: 'abuela_materno', label: 'Abuela Materna' },
  { key: 'padre', label: 'Padre' },
  { key: 'madre', label: 'Madre' },
  { key: 'hermanos', label: 'Hermanos' },
  { key: 'otros_familiares', label: 'Otros Familiares' },
  { key: 'comentarios', label: 'Comentarios' },
]

const buildEmpty = () => {
  const f = {}
  DISEASE_FIELDS.forEach(({ key }) => { f[key] = 0 })
  FAMILY_FIELDS.forEach(({ key }) => { f[key] = '' })
  return f
}

const EMPTY_FORM = buildEmpty()

const inputClass = "w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary dark:bg-slate-700 dark:text-slate-100"

export default function AntecedentesHeredoFamiliaresPage() {
  const { canWrite, canUpdate } = useModulePermission('antecedentes_hf')
  const queryClient = useQueryClient()
  const [selectedPaciente, setSelectedPaciente] = useState('')
  const [form, setForm] = useState(EMPTY_FORM)
  const [existingId, setExistingId] = useState(null)

  const { data: antData, isError } = useQuery({
    queryKey: ['antecedentes_hf', selectedPaciente],
    queryFn: () => api.get(`/antecedentes-heredo-familiares/paciente/${selectedPaciente}`).then((r) => r.data),
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
      DISEASE_FIELDS.forEach(({ key }) => { newForm[key] = antData[key] ?? 0 })
      FAMILY_FIELDS.forEach(({ key }) => { newForm[key] = antData[key] || '' })
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
        ? api.put(`/antecedentes-heredo-familiares/${existingId}`, data)
        : api.post('/antecedentes-heredo-familiares', { ...data, paciente_id: selectedPaciente }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['antecedentes_hf', selectedPaciente] })
      toast.success('Antecedentes heredo familiares guardados')
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
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">Antecedentes Heredo Familiares</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">Enfermedades familiares y antecedentes por familiar</p>
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
        <form onSubmit={handleSubmit} className="space-y-3">

          {/* Enfermedades familiares (checkboxes) */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <Stethoscope className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-300">Enfermedades Familiares</h3>
            </div>
            <div className="grid grid-cols-3 lg:grid-cols-4 gap-1.5">
              {DISEASE_FIELDS.map(({ key, label }) => (
                <label key={key} className={clsx(
                  'flex items-center gap-2 px-2 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors',
                  form[key] === 1
                    ? 'border-primary bg-primary/5 dark:bg-primary/10 text-primary font-medium'
                    : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-500',
                  dis && 'cursor-default opacity-70'
                )}>
                  <input type="checkbox" checked={form[key] === 1}
                    onChange={(e) => updateField(key, e.target.checked ? 1 : 0)}
                    disabled={dis}
                    className="rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary w-3.5 h-3.5" />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Familiares (text) */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <h3 className="text-xs font-semibold text-slate-600 dark:text-slate-300">Antecedentes por Familiar</h3>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5">
              {FAMILY_FIELDS.map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-[10px] font-semibold uppercase text-slate-400 dark:text-slate-500 mb-0.5">{label}</label>
                  <textarea value={form[key]} onChange={(e) => updateField(key, e.target.value)}
                    rows={2} disabled={dis}
                    placeholder={`${label}...`}
                    className={clsx(inputClass, 'min-h-[60px] resize-none', dis && 'bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400')} />
                </div>
              ))}
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
