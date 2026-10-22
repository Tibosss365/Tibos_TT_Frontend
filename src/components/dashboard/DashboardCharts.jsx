import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { Card, CardHeader } from '../ui/Card'

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card px-3 py-2 text-xs border border-glass shadow-glass">
      <div className="t-muted mb-1">{label || payload[0]?.name}</div>
      <div className="t-main font-bold">{payload[0]?.value} tickets</div>
    </div>
  )
}

export default function DashboardCharts({ categoryData, statusData, companyData }) {
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title="Tickets by Category" subtitle="Distribution across categories" />
          {categoryData.length === 0 ? <div className="py-10 text-center text-sm t-muted">No data for selected filters</div> : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={categoryData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: 'var(--c-chart-text)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--c-chart-text)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--c-chart-grid)' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>{categoryData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card>
          <CardHeader title="Status Distribution" subtitle="Current ticket statuses" />
          {statusData.length === 0 ? <div className="py-10 text-center text-sm t-muted">No data for selected filters</div> : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="count">{statusData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}</Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: 'var(--c-chart-text)' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
      <Card>
        <CardHeader title="Tickets by Company" subtitle="Top companies by ticket volume — shown as Company (@domain)" />
        {companyData.length === 0 ? <div className="py-10 text-center text-sm t-muted">No data for selected filters</div> : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={companyData} margin={{ top: 10, right: 10, left: -12, bottom: 70 }}>
              <XAxis dataKey="name" tick={{ fill: 'var(--c-chart-text)', fontSize: 10 }} axisLine={false} tickLine={false} interval={0} angle={-35} textAnchor="end" height={80} tickFormatter={value => value.length > 18 ? `${value.slice(0, 17)}…` : value} />
              <YAxis tick={{ fill: 'var(--c-chart-text)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--c-chart-grid)' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>{companyData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}</Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </>
  )
}
