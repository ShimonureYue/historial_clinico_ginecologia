import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Users, Stethoscope, Microscope, CalendarDays, UserPlus, TrendingUp,
  ArrowRight, Clock, Baby, Activity, Heart, ClipboardList,
} from 'lucide-react'
import api from '../lib/api'
import clsx from 'clsx'

/* ─── helpers ─── */
const MONTH_NAMES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

function fmtMonth(ym) {
  if (!ym) return ''
  const [y, m] = ym.split('-')
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} ${y.slice(2)}`
}

function fmtDate(d) {
  if (!d || d.length < 10) return '-'
  return d.slice(0, 10)
}

/* ─── mini bar chart ─── */
function BarChart({ data, label, color = 'bg-primary' }) {
  const max = Math.max(...data.map(d => d.total), 1)
  const barH = 112 // px
  return (
    <div>
      <h4 className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase mb-3">{label}</h4>
      <div className="flex items-end gap-2">
        {data.map((d) => {
          const h = Math.max((d.total / max) * barH, 6)
          return (
            <div key={d.mes} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">{d.total}</span>
              <div className={clsx('w-full rounded-t-md', color)} style={{ height: `${h}px` }} />
              <span className="text-[9px] text-slate-400">{fmtMonth(d.mes)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─── KPI card ─── */
function KpiCard({ icon: Icon, label, value, sub, color = 'text-primary', bg = 'bg-primary/10' }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-3">
      <div className={clsx('p-2.5 rounded-xl', bg)}>
        <Icon className={clsx('w-5 h-5', color)} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 leading-none">{value}</p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
        {sub && <p className="text-[10px] text-slate-400 dark:text-slate-500">{sub}</p>}
      </div>
    </div>
  )
}

/* ─── main page ─── */
export default function DashboardPage() {
  const navigate = useNavigate()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then(r => r.data),
    refetchInterval: 60000,
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
    </div>
  )

  const k = data?.kpis || {}
  const consultasMes = data?.consultas_por_mes || []
  const pacientesMes = data?.pacientes_por_mes || []
  const topMotivos = data?.top_motivos || []
  const topDiagnosticos = data?.top_diagnosticos || []
  const generoDist = data?.genero_distribucion || []
  const ultimasConsultas = data?.ultimas_consultas || []
  const ultimosPacientes = data?.ultimos_pacientes || []

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <KpiCard icon={Users} label="Total Pacientes" value={k.total_pacientes || 0} color="text-blue-600" bg="bg-blue-100 dark:bg-blue-900/30" />
        <KpiCard icon={Stethoscope} label="Total Consultas" value={k.total_consultas || 0} color="text-emerald-600" bg="bg-emerald-100 dark:bg-emerald-900/30" />
        <KpiCard icon={Microscope} label="Colposcopías" value={k.total_colposcopias || 0} color="text-purple-600" bg="bg-purple-100 dark:bg-purple-900/30" />
        <KpiCard icon={CalendarDays} label="Consultas este mes" value={k.consultas_mes || 0} color="text-amber-600" bg="bg-amber-100 dark:bg-amber-900/30" />
        <KpiCard icon={UserPlus} label="Pacientes nuevos (mes)" value={k.pacientes_mes || 0} color="text-pink-600" bg="bg-pink-100 dark:bg-pink-900/30" />
        <KpiCard icon={TrendingUp} label="Prom. consultas/pac." value={k.avg_consultas_por_paciente || 0} color="text-cyan-600" bg="bg-cyan-100 dark:bg-cyan-900/30" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
          {consultasMes.length > 0
            ? <BarChart data={consultasMes} label="Consultas por mes (últimos 6 meses)" color="bg-emerald-500" />
            : <p className="text-xs text-slate-400 text-center py-10">Sin datos de consultas recientes</p>
          }
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
          {pacientesMes.length > 0
            ? <BarChart data={pacientesMes} label="Pacientes nuevos por mes (últimos 6 meses)" color="bg-blue-500" />
            : <p className="text-xs text-slate-400 text-center py-10">Sin datos de pacientes recientes</p>
          }
        </div>
      </div>

      {/* Middle row: 3 stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Top motivos */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-3">
            <div className="p-1 rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-600"><Activity className="w-3.5 h-3.5" /></div>
            Motivos más frecuentes
          </h3>
          <div className="space-y-2.5">
            {topMotivos.map((m, i) => {
              const maxTotal = topMotivos[0]?.total || 1
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate flex-1 mr-2">{m.motivo}</span>
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{m.total}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full transition-all duration-500" style={{ width: `${(m.total / maxTotal) * 100}%` }} />
                  </div>
                </div>
              )
            })}
            {topMotivos.length === 0 && <p className="text-[11px] text-slate-400 text-center py-4">Sin datos</p>}
          </div>
        </div>

        {/* Top diagnósticos */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-3">
            <div className="p-1 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"><ClipboardList className="w-3.5 h-3.5" /></div>
            Diagnósticos más frecuentes
          </h3>
          <div className="space-y-2.5">
            {topDiagnosticos.map((d, i) => {
              const maxTotal = topDiagnosticos[0]?.total || 1
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 truncate flex-1 mr-2">{d.diagnostico}</span>
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{d.total}</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400 rounded-full transition-all duration-500" style={{ width: `${(d.total / maxTotal) * 100}%` }} />
                  </div>
                </div>
              )
            })}
            {topDiagnosticos.length === 0 && <p className="text-[11px] text-slate-400 text-center py-4">Sin datos</p>}
          </div>
        </div>

        {/* Distribución por género */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-700">
          <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-3">
            <div className="p-1 rounded-md bg-pink-100 dark:bg-pink-900/30 text-pink-600"><Heart className="w-3.5 h-3.5" /></div>
            Distribución por Género
          </h3>
          <div className="space-y-3">
            {generoDist.map((g, i) => {
              const totalPac = generoDist.reduce((s, x) => s + x.total, 0) || 1
              const pct = Math.round((g.total / totalPac) * 100)
              const colors = { Femenino: 'bg-pink-400', Masculino: 'bg-sky-400', 'Sin especificar': 'bg-slate-400' }
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[11px] text-slate-600 dark:text-slate-300">{g.genero}</span>
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200">{g.total} ({pct}%)</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className={clsx('h-full rounded-full transition-all duration-500', colors[g.genero] || 'bg-slate-400')} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            {generoDist.length === 0 && <p className="text-[11px] text-slate-400 text-center py-4">Sin datos</p>}
          </div>
        </div>
      </div>

      {/* Bottom row: últimas consultas + últimos pacientes side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Últimas consultas */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <div className="p-1 rounded-md bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600"><Clock className="w-3.5 h-3.5" /></div>
              Últimas Consultas
            </h3>
            <button onClick={() => navigate('/consultas')} className="text-[11px] text-primary hover:underline flex items-center gap-0.5">
              Ver todas <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 text-[10px] text-slate-400 uppercase">
                  <th className="text-left px-4 py-2 font-semibold">Paciente</th>
                  <th className="text-left px-4 py-2 font-semibold">Motivo</th>
                  <th className="text-left px-4 py-2 font-semibold">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {ultimasConsultas.map((c) => (
                  <tr key={c.id}
                    onClick={() => navigate(`/consultas/${c.id}`)}
                    className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/40 cursor-pointer transition-colors">
                    <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">{c.paciente_nombre}</td>
                    <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 max-w-[180px] truncate">{c.motivo || '-'}</td>
                    <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">{fmtDate(c.fecha)}</td>
                  </tr>
                ))}
                {ultimasConsultas.length === 0 && (
                  <tr><td colSpan={3} className="text-center py-6 text-slate-400">Sin consultas</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Últimos pacientes */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <div className="p-1 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-600"><Baby className="w-3.5 h-3.5" /></div>
              Últimos Pacientes
            </h3>
            <button onClick={() => navigate('/pacientes')} className="text-[11px] text-primary hover:underline flex items-center gap-0.5">
              Ver todos <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 text-[10px] text-slate-400 uppercase">
                <th className="text-left px-4 py-2 font-semibold">Nombre</th>
                <th className="text-left px-4 py-2 font-semibold">Sexo</th>
                <th className="text-left px-4 py-2 font-semibold">Fecha Nac.</th>
                <th className="text-left px-4 py-2 font-semibold">Consultas</th>
                <th className="text-left px-4 py-2 font-semibold">Registrado</th>
              </tr>
            </thead>
            <tbody>
              {ultimosPacientes.map((p) => (
                <tr key={p.id}
                  onClick={() => navigate(`/pacientes/${p.id}`)}
                  className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-700/40 cursor-pointer transition-colors">
                  <td className="px-4 py-2.5 font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">{p.nombre}</td>
                  <td className="px-4 py-2.5">
                    <span className={clsx('px-1.5 py-0.5 rounded-full text-[10px] font-medium',
                      p.genero === 'F' ? 'bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400'
                        : p.genero === 'M' ? 'bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400'
                        : 'bg-slate-100 text-slate-500'
                    )}>
                      {p.genero === 'F' ? 'Fem' : p.genero === 'M' ? 'Masc' : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">{fmtDate(p.fecha_nacimiento)}</td>
                  <td className="px-4 py-2.5">
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                      {p.num_consultas}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">{fmtDate(p.created_at)}</td>
                </tr>
              ))}
              {ultimosPacientes.length === 0 && (
                <tr><td colSpan={5} className="text-center py-6 text-slate-400">Sin pacientes</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  )
}
