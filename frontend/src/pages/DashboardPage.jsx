import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { propAPI } from '../services/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, ReferenceLine
} from 'recharts'
import { Building2, DollarSign, TrendingUp, CreditCard, ArrowUpRight, Percent, BarChart2, Shield, Landmark } from 'lucide-react'
import toast from 'react-hot-toast'

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0)
const fmtPct = (n) => `${(n || 0).toFixed(1)}%`
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

// ── Design System ─────────────────────────────────────────────────────────────
const ACCENT   = '#2d4fa1'
const T_BORDER = '0.5px solid #e5e7eb'
const T_RADIUS = 12
const T_PAD    = '1rem 1.25rem'
const RAMPS = {
  blue:  ['#bfdbfe','#93c5fd','#60a5fa','#3b82f6','#2563eb','#1d4ed8','#1e40af'],
  green: ['#bbf7d0','#86efac','#4ade80','#22c55e','#16a34a','#15803d','#166534'],
  amber: ['#fde68a','#fcd34d','#fbbf24','#f59e0b','#d97706','#b45309','#92400e'],
  red:   ['#fecaca','#fca5a5','#f87171','#ef4444','#dc2626','#b91c1c','#991b1b'],
}

const TABS = [
  { id: 'portfolio', label: 'Portfolio Value & Equity', icon: TrendingUp },
  { id: 'cashflow',  label: 'Cash Flow Metrics',        icon: DollarSign },
  { id: 'financing', label: 'Financing & Debt Metrics', icon: Landmark },
  { id: 'risk',      label: 'Risk Metrics',             icon: Shield },
]

export default function DashboardPage() {
  const navigate = useNavigate()
  const [data, setData]               = useState(null)
  const [loading, setLoading]         = useState(true)
  const [activeTab, setActiveTab]     = useState('portfolio')
  const [includePrimary, setIncludePrimary] = useState(true)

  useEffect(() => {
    propAPI.dashboard()
      .then((r) => setData(r.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  )

  if (!data || data.total_properties === 0) return (
    <div className="text-center py-20">
      <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <h2 className="text-xl font-semibold text-gray-700 mb-2">No properties yet</h2>
      <p className="text-gray-400 mb-6">Upload a mortgage statement — the property and loan are created automatically</p>
      <div className="flex justify-center gap-3">
        <Link to="/uploads" className="btn-primary">Upload Mortgage Statement</Link>
        <Link to="/properties/new" className="btn-secondary">Add Manually</Link>
      </div>
    </div>
  )

  const truncate = (s, n = 16) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s || '')
  const fmtAxis  = (v) => `${v < 0 ? '-' : ''}$${Math.abs(v / 1000).toFixed(0)}k`
  const isPrimary = p => (p.usage_type || 'Rental') === 'Primary'

  // ── Filter ────────────────────────────────────────────────────────────────
  const filteredProps = includePrimary ? data.properties : data.properties.filter(p => !isPrimary(p))
  const primaryCount  = data.properties.filter(isPrimary).length

  // ── Aggregates ────────────────────────────────────────────────────────────
  const d_mv  = filteredProps.reduce((s, p) => s + (p.market_value || 0), 0)
  const d_lb  = filteredProps.reduce((s, p) => s + (p.total_loan_balance || 0), 0)
  const d_eq  = filteredProps.reduce((s, p) => s + (p.equity || 0), 0)
  const d_pp  = filteredProps.reduce((s, p) => s + (p.purchase_price || 0), 0)
  const d_mr  = filteredProps.reduce((s, p) => s + (p.effective_rent || 0), 0)
  const d_mm  = filteredProps.reduce((s, p) => s + (p.monthly_mortgage || 0), 0)
  const d_cf  = filteredProps.reduce((s, p) => s + (p.monthly_cash_flow || 0), 0)
  const d_noi = filteredProps.reduce((s, p) => s + (p.annual_noi || 0), 0)
  const d_ol  = filteredProps.filter(p => (p.original_loan_amount || 0) > 0).reduce((s, p) => s + p.original_loan_amount, 0)
  const d_prp = filteredProps.filter(p => (p.principal_paid || 0) > 0).reduce((s, p) => s + p.principal_paid, 0)
  const d_ip  = filteredProps.reduce((s, p) => s + (p.interest_paid || 0), 0)
  const d_ads = d_mm * 12
  const d_loans = filteredProps.flatMap(p => p.loans)
  const d_lbs   = d_loans.reduce((s, l) => s + (l.current_balance || 0), 0)
  const d_wr    = d_lbs > 0
    ? (d_loans.reduce((s, l) => s + (l.current_balance || 0) * (l.interest_rate || 0), 0) / d_lbs).toFixed(2)
    : '0.00'

  const d = {
    properties:              filteredProps,
    total_properties:        filteredProps.length,
    total_market_value:      d_mv,
    total_loan_balance:      d_lb,
    total_equity:            d_eq,
    portfolio_ltv:           d_mv > 0 ? d_lb / d_mv * 100 : 0,
    portfolio_equity_pct:    d_mv > 0 ? d_eq / d_mv * 100 : 0,
    total_purchase_price:    d_pp,
    total_appreciation_gain: d_mv - d_pp,
    total_monthly_rent:      d_mr,
    total_monthly_mortgage:  d_mm,
    total_monthly_cash_flow: d_cf,
    total_annual_noi:        d_noi,
    annual_debt_service:     d_ads,
    total_original_loan:     d_ol,
    total_principal_paid:    d_prp,
    total_interest_paid:     d_ip,
    original_ltv:            d_pp > 0 ? d_ol / d_pp * 100 : 0,
    portfolio_dscr:          d_ads > 0 ? d_noi / d_ads : null,
    weighted_avg_rate:       d_wr,
  }

  // ── Chart data ────────────────────────────────────────────────────────────
  const cashFlowData = d.properties.map((p) => ({
    name: truncate(p.address.split(',')[0]),
    rent: Math.round(p.effective_rent),
    mortgage: Math.round(p.monthly_mortgage),
    cashFlow: Math.round(p.monthly_cash_flow),
  }))
  const equityData = d.properties.filter(p => p.equity > 0).map((p, i) => ({
    name: truncate(p.address.split(',')[0]),
    value: Math.round(p.equity),
    fill: COLORS[i % COLORS.length],
  }))
  const debtData = d.properties.filter(p => p.total_loan_balance > 0).map((p, i) => ({
    name: truncate(p.address.split(',')[0]),
    value: Math.round(p.total_loan_balance),
    fill: COLORS[i % COLORS.length],
  }))
  const hasEquity = equityData.length > 0
  const pieData   = hasEquity ? equityData : debtData

  // ── Risk ──────────────────────────────────────────────────────────────────
  const totalLoanBalance  = d_lbs
  const armBalance        = d_loans.filter(l => (l.loan_type || '').toUpperCase() === 'ARM').reduce((s, l) => s + (l.current_balance || 0), 0)
  const armExposure       = totalLoanBalance > 0 ? armBalance / totalLoanBalance * 100 : 0
  const highRateBalance   = d_loans.filter(l => (l.interest_rate || 0) > 6).reduce((s, l) => s + (l.current_balance || 0), 0)
  const highRateExposure  = totalLoanBalance > 0 ? highRateBalance / totalLoanBalance * 100 : 0
  const maxEquity         = Math.max(0, ...d.properties.map(p => p.equity || 0))
  const topConcentrated   = d.properties.find(p => p.equity === maxEquity)
  const concentrationRisk = d.total_equity > 0 ? maxEquity / d.total_equity * 100 : 0
  const scheduledRent     = d.properties.filter(p => !isPrimary(p)).reduce((s, p) => s + (p.monthly_rent || 0), 0)
  const vacancyRate       = scheduledRent > 0 ? (scheduledRent - d.total_monthly_rent) / scheduledRent * 100 : 0
  const occupancyRate     = 100 - vacancyRate
  const debtWeightedRate  = totalLoanBalance > 0
    ? d_loans.reduce((s, l) => s + (l.current_balance || 0) * (l.interest_rate || 0), 0) / totalLoanBalance
    : 0

  // ── Sparkline arrays (ascending so last bar = highest = focal point) ───────
  const asc = (arr) => [...arr].sort((a, b) => a - b)
  const mvSpark       = asc(d.properties.map(p => p.market_value || 0))
  const eqSpark       = asc(d.properties.map(p => p.equity || 0))
  const rentSpark     = asc(d.properties.map(p => p.effective_rent || 0))
  const cfSpark       = asc(d.properties.map(p => p.monthly_cash_flow || 0))
  const mortgageSpark = asc(d.properties.map(p => p.monthly_mortgage || 0))
  const debtSpark     = asc(d.properties.map(p => p.total_loan_balance || 0))
  const noiSpark      = asc(d.properties.map(p => (p.annual_noi || 0) / 12))
  const ppSpark       = asc(d.properties.map(p => p.principal_paid || 0))
  const ipSpark       = asc(d.properties.map(p => p.interest_paid || 0))
  const olSpark       = asc(d.properties.filter(p => p.original_loan_amount > 0).map(p => p.original_loan_amount))
  const rateSpark     = asc(d_loans.map(l => l.interest_rate || 0))

  // ── Derived ratios ────────────────────────────────────────────────────────
  const appreciationPct = d_pp > 0 ? (d_mv - d_pp) / d_pp * 100 : null
  const cfMarginPct     = d_mr > 0 ? d_cf / d_mr * 100 : 0

  // Ranked by equity for tile
  const rankedByEquity = [...d.properties]
    .sort((a, b) => (b.equity || 0) - (a.equity || 0))
    .slice(0, 5)
    .map(p => ({ id: p.id, name: truncate(p.address.split(',')[0], 15), value: fmt(p.equity || 0) }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Portfolio Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Showing {d.total_properties} of {data.properties.length} {data.properties.length === 1 ? 'property' : 'properties'}
            {!includePrimary && primaryCount > 0 && <span className="ml-1 text-amber-600">— {primaryCount} primary home excluded</span>}
          </p>
        </div>
        {primaryCount > 0 && (
          <button
            onClick={() => setIncludePrimary(v => !v)}
            className={`flex items-center gap-2.5 px-4 py-2 rounded-lg border text-sm font-medium transition-colors shrink-0 ${
              includePrimary ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                             : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'}`}
          >
            <span className={`w-8 h-4 rounded-full relative transition-colors ${includePrimary ? 'bg-blue-500' : 'bg-gray-300'}`}>
              <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${includePrimary ? 'left-4' : 'left-0.5'}`} />
            </span>
            {includePrimary ? 'Primary Home: Included' : 'Primary Home: Excluded'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </nav>
      </div>

      {/* ══ PORTFOLIO VALUE & EQUITY ══════════════════════════════════════════ */}
      {activeTab === 'portfolio' && (
        <div className="space-y-6">
          <TileGrid>
            {/* Row 1 */}
            <Tile label="Total Portfolio Value" value={fmt(d.total_market_value)} sub="Sum of all market values">
              <SparkBar data={mvSpark} color={RAMPS.blue[3]} />
            </Tile>
            <Tile label="Total Equity" value={fmt(d.total_equity)} sub="Market value − loan balance">
              <SparkBar data={eqSpark} color={RAMPS.green[3]} />
            </Tile>
            <Tile label="Appreciation Gain" value={fmt(d.total_appreciation_gain)}
              sub={`${fmt(d.total_market_value)} − ${fmt(d.total_purchase_price)} cost`}>
              <div style={{ marginTop:8 }}><TrendBadge pct={appreciationPct} /></div>
            </Tile>

            {/* Row 2 */}
            <Tile label="Properties" value={d.total_properties} sub="Ranked by equity">
              <RankedList items={rankedByEquity} />
            </Tile>
            <Tile label="Portfolio Equity" value={fmtPct(d.portfolio_equity_pct)} sub="Equity ÷ Portfolio value">
              <div style={{ display:'flex', justifyContent:'center', marginTop:8 }}>
                <DonutRing pct={d.portfolio_equity_pct} />
              </div>
            </Tile>
            <Tile label="Loan-to-Value Ratio" value={fmtPct(d.portfolio_ltv)}
              sub={d.portfolio_ltv > 80 ? 'High — refinancing may be needed' : d.portfolio_ltv > 60 ? 'Moderate — within typical range' : 'Healthy — strong equity position'}>
              <LTVBar ltv={d.portfolio_ltv} loan={d.total_loan_balance} equity={d.total_equity} mv={d.total_market_value} />
            </Tile>
          </TileGrid>

          {/* Equity distribution + property table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-1 text-sm">{hasEquity ? 'Equity Distribution' : 'Loan Balance Distribution'}</h3>
              {!hasEquity && <p className="text-xs text-gray-400 mb-2">Set market values to see equity</p>}
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={68}
                    labelLine={false} label={({ percent }) => `${(percent*100).toFixed(0)}%`} isAnimationActive={false}>
                    {pieData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip formatter={v => fmt(v)} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize:11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="lg:col-span-2 card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 text-sm">Properties</h3>
                <Link to="/properties" className="text-gray-500 text-xs hover:text-gray-800 flex items-center gap-1">
                  View all <ArrowUpRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-gray-400" style={{ fontSize:11 }}>
                      <th className="pb-2 font-medium">Property</th>
                      <th className="pb-2 font-medium text-right">Market Value</th>
                      <th className="pb-2 font-medium text-right">Loan Balance</th>
                      <th className="pb-2 font-medium text-right">Equity</th>
                      <th className="pb-2 font-medium text-right">LTV</th>
                      <th className="pb-2 font-medium text-right">Gain</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {d.properties.map(p => {
                      const ltv  = p.market_value ? p.total_loan_balance / p.market_value * 100 : 0
                      const gain = (p.market_value || 0) - (p.purchase_price || 0)
                      return (
                        <tr key={p.id} className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => navigate(`/properties/${p.id}`)}>
                          <td className="py-2">
                            <p className="font-medium text-gray-800">{p.address.split(',')[0]}</p>
                            <p className="text-xs text-gray-400">{p.city}, {p.state}</p>
                          </td>
                          <td className="py-2 text-right text-gray-700">{fmt(p.market_value)}</td>
                          <td className="py-2 text-right text-gray-400">{fmt(p.total_loan_balance)}</td>
                          <td className={`py-2 text-right font-medium ${p.equity >= 0 ? 'text-gray-700' : 'text-red-500'}`}>{fmt(p.equity)}</td>
                          <td className="py-2 text-right text-gray-400">{fmtPct(ltv)}</td>
                          <td className={`py-2 text-right font-medium ${gain >= 0 ? 'text-gray-600' : 'text-red-500'}`}>{gain ? fmt(gain) : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200 font-semibold text-gray-800 text-xs">
                      <td className="pt-2">Total</td>
                      <td className="pt-2 text-right">{fmt(d.total_market_value)}</td>
                      <td className="pt-2 text-right text-gray-400">{fmt(d.total_loan_balance)}</td>
                      <td className="pt-2 text-right">{fmt(d.total_equity)}</td>
                      <td className="pt-2 text-right text-gray-400">{fmtPct(d.portfolio_ltv)}</td>
                      <td className="pt-2 text-right">{fmt(d.total_appreciation_gain)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ CASH FLOW METRICS ════════════════════════════════════════════════ */}
      {activeTab === 'cashflow' && (
        <div className="space-y-6">
          <TileGrid>
            {/* Row 1 */}
            <Tile accent label="Monthly Cash Flow" value={fmt(d.total_monthly_cash_flow)} sub="Gross Rent − Operating Expenses − Mortgage">
              <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:8 }}>
                <TrendBadge pct={cfMarginPct} />
                <span style={{ fontSize:11, color:'rgba(255,255,255,0.55)' }}>of gross rent</span>
              </div>
              <SparkBar data={cfSpark} onAccent />
            </Tile>
            <Tile label="Gross Monthly Rent" value={fmt(d.total_monthly_rent)} sub="Effective rent × occupancy across all rentals">
              <SparkBar data={rentSpark} color={RAMPS.green[4]} />
            </Tile>
            <Tile label="Net Operating Income" value={fmt(d.total_annual_noi / 12)}
              sub={`Gross Rent − Operating Expenses (${fmt(d.total_annual_noi)}/yr)`}>
              <SparkBar data={noiSpark} color={RAMPS.green[3]} />
            </Tile>

            {/* Row 2 */}
            <Tile label="Mortgage P&I" value={fmt(d.total_monthly_mortgage)} sub="Principal & interest only — excl. taxes/insurance">
              <SparkBar data={mortgageSpark} color={RAMPS.blue[3]} />
            </Tile>
            <Tile label="Cash Flow Margin" value={d.total_monthly_rent > 0 ? fmtPct(cfMarginPct) : '—'}
              sub="Monthly Cash Flow ÷ Gross Rent">
              <FillBar value={Math.max(0, cfMarginPct)} max={30}
                color={cfMarginPct >= 10 ? RAMPS.green[4] : cfMarginPct >= 0 ? RAMPS.amber[4] : RAMPS.red[4]} />
              <p style={subNote}>Target: above 10%</p>
            </Tile>
            <Tile label="Annual NOI" value={fmt(d.total_annual_noi)} sub="NOI/yr across all rental properties">
              <SparkBar data={asc(d.properties.map(p => p.annual_noi || 0))} color={RAMPS.green[2]} />
            </Tile>
          </TileGrid>

          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Monthly Cash Flow by Property</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={cashFlowData} barGap={4} margin={{ top:4, right:8, left:8, bottom:4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize:11 }} interval={0} />
                <YAxis tick={{ fontSize:11 }} tickFormatter={fmtAxis} />
                <Tooltip formatter={v => fmt(v)} />
                <Legend wrapperStyle={{ fontSize:12 }} />
                <ReferenceLine y={0} stroke="#9ca3af" />
                <Bar dataKey="rent" name="Rent" fill="#10b981" radius={[3,3,0,0]} isAnimationActive={false} />
                <Bar dataKey="mortgage" name="Mortgage + Escrow" fill="#3b82f6" radius={[3,3,0,0]} isAnimationActive={false} />
                <Bar dataKey="cashFlow" name="Net Cash Flow" isAnimationActive={false}>
                  {cashFlowData.map((row, i) => <Cell key={i} fill={row.cashFlow >= 0 ? '#f59e0b' : '#ef4444'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Cash Flow by Property</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500">
                    <th className="pb-2 font-medium">Property</th>
                    <th className="pb-2 font-medium text-right">Gross Rent/mo</th>
                    <th className="pb-2 font-medium text-right">NOI/mo</th>
                    <th className="pb-2 font-medium text-right">P&amp;I/mo</th>
                    <th className="pb-2 font-medium text-right">Cash Flow/mo</th>
                    <th className="pb-2 font-medium text-right">CF Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {d.properties.map(p => {
                    const margin = p.effective_rent > 0 ? p.monthly_cash_flow / p.effective_rent * 100 : null
                    const noi    = (p.annual_noi || 0) / 12
                    return (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="py-2">
                          <Link to={`/properties/${p.id}`} className="font-medium text-gray-900 hover:text-blue-600">{p.address.split(',')[0]}</Link>
                          <p className="text-xs text-gray-400">{p.city}, {p.state}</p>
                        </td>
                        <td className="py-2 text-right">{fmt(p.effective_rent)}</td>
                        <td className={`py-2 text-right ${noi >= 0 ? 'text-teal-600' : 'text-red-500'}`}>{fmt(noi)}</td>
                        <td className="py-2 text-right">{fmt(p.monthly_mortgage)}</td>
                        <td className={`py-2 text-right font-medium ${p.monthly_cash_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(p.monthly_cash_flow)}</td>
                        <td className={`py-2 text-right text-xs font-medium ${margin == null ? 'text-gray-300' : margin >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {margin != null ? fmtPct(margin) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 font-semibold text-gray-900">
                    <td className="pt-2">Total / Avg</td>
                    <td className="pt-2 text-right">{fmt(d.total_monthly_rent)}</td>
                    <td className="pt-2 text-right text-teal-600">{fmt(d.total_annual_noi / 12)}</td>
                    <td className="pt-2 text-right">{fmt(d.total_monthly_mortgage)}</td>
                    <td className={`pt-2 text-right ${d.total_monthly_cash_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(d.total_monthly_cash_flow)}</td>
                    <td className={`pt-2 text-right text-sm ${d.total_monthly_cash_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {d.total_monthly_rent > 0 ? fmtPct(d.total_monthly_cash_flow / d.total_monthly_rent * 100) : '—'}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══ FINANCING & DEBT METRICS ══════════════════════════════════════════ */}
      {activeTab === 'financing' && (
        <div className="space-y-6">

          {/* ── Row 1: DSCR + Rate Spectrum + LTV Then→Now ── */}
          <TileGrid>
            {/* DSCR — accent with zone strip */}
            <Tile accent label="Portfolio DSCR" value={d.portfolio_dscr != null ? d.portfolio_dscr.toFixed(2) : 'N/A'}
              sub="Net Operating Income ÷ Annual Debt Service">
              {d.portfolio_dscr != null && (() => {
                const cap = 2.0
                const pos = Math.min(d.portfolio_dscr, cap) / cap * 100
                return (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ position: 'relative', height: 14, borderRadius: 6, overflow: 'hidden', display: 'flex' }}>
                      <div style={{ width: '50%', background: 'rgba(220,38,38,0.5)' }} />
                      <div style={{ width: '12.5%', background: 'rgba(217,119,6,0.5)' }} />
                      <div style={{ flex: 1, background: 'rgba(22,163,74,0.5)' }} />
                    </div>
                    <div style={{ position: 'relative', height: 10 }}>
                      <div style={{ position:'absolute', top:0, left:`${pos}%`, transform:'translateX(-50%)', width:2, height:10, background:'white', borderRadius:1 }} />
                    </div>
                    <div style={{ display:'flex', fontSize:9, color:'rgba(255,255,255,0.4)', marginTop:1 }}>
                      <span style={{ width:'50%' }}>Danger &lt;1.0</span>
                      <span style={{ flex:1, textAlign:'right' }}>Strong &gt;1.25</span>
                    </div>
                    <p style={{ fontSize:11, color:'rgba(255,255,255,0.5)', marginTop:8 }}>
                      {fmt(Math.round(d.total_annual_noi))}/yr ÷ {fmt(d.annual_debt_service)}/yr
                    </p>
                  </div>
                )
              })()}
            </Tile>

            {/* Weighted Avg Rate — gradient spectrum */}
            <Tile label="Weighted Avg Rate" value={`${d.weighted_avg_rate}%`} sub="Σ(balance × rate) ÷ Σ(balance)">
              {(() => {
                const rate = parseFloat(d.weighted_avg_rate) || 0
                const pos  = Math.min(rate, 9) / 9 * 100
                const col  = rate > 6.5 ? '#dc2626' : rate > 5 ? '#d97706' : '#16a34a'
                return (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ position:'relative', height:12, borderRadius:6, overflow:'hidden', display:'flex' }}>
                      <div style={{ width:'55.5%', background:'linear-gradient(90deg,#bbf7d0,#86efac)' }} />
                      <div style={{ width:'16.7%', background:'linear-gradient(90deg,#fde68a,#fbbf24)' }} />
                      <div style={{ flex:1, background:'linear-gradient(90deg,#fca5a5,#ef4444)' }} />
                    </div>
                    <div style={{ position:'relative', height:0 }}>
                      <div style={{ position:'absolute', top:-12, left:`${pos}%`, transform:'translateX(-50%)', width:3, height:12, background:'#1e293b', borderRadius:1 }} />
                    </div>
                    <div style={{ display:'flex', fontSize:9, color:'#9ca3af', marginTop:5 }}>
                      <span style={{ width:'55.5%' }}>Low ≤5%</span>
                      <span style={{ flex:1, textAlign:'right' }}>High ≥6.5%</span>
                    </div>
                    <p style={{ fontSize:11, fontWeight:600, color:col, marginTop:8 }}>
                      {rate > 6.5 ? '⚠ Refinance candidates exist' : rate > 5 ? 'Moderate — within typical range' : 'Competitive rate'}
                    </p>
                  </div>
                )
              })()}
            </Tile>

            {/* LTV Purchase → Today comparison */}
            <Tile label="LTV: Purchase vs Today" value={fmtPct(d.portfolio_ltv)} sub="Current portfolio loan-to-value">
              {(() => {
                const origC  = d.original_ltv > 80 ? '#dc2626' : d.original_ltv > 60 ? '#d97706' : '#3b82f6'
                const currC  = d.portfolio_ltv > 80 ? '#dc2626' : d.portfolio_ltv > 60 ? '#d97706' : '#16a34a'
                const delta  = (d.portfolio_ltv - d.original_ltv).toFixed(1)
                return (
                  <div style={{ marginTop:12 }}>
                    <div style={{ display:'flex', gap:10, alignItems:'flex-end' }}>
                      <div style={{ flex:1 }}>
                        <p style={{ fontSize:9, color:'#9ca3af', marginBottom:3 }}>At Purchase</p>
                        <div style={{ height:8, borderRadius:3, background:'#f3f4f6' }}>
                          <div style={{ width:`${Math.min(d.original_ltv,100)}%`, height:'100%', borderRadius:3, background:origC }} />
                        </div>
                        <p style={{ fontSize:12, fontWeight:600, color:origC, marginTop:3 }}>{fmtPct(d.original_ltv)}</p>
                      </div>
                      <span style={{ fontSize:14, color:'#d1d5db', paddingBottom:16 }}>→</span>
                      <div style={{ flex:1 }}>
                        <p style={{ fontSize:9, color:'#9ca3af', marginBottom:3 }}>Today</p>
                        <div style={{ height:8, borderRadius:3, background:'#f3f4f6' }}>
                          <div style={{ width:`${Math.min(d.portfolio_ltv,100)}%`, height:'100%', borderRadius:3, background:currC }} />
                        </div>
                        <p style={{ fontSize:12, fontWeight:600, color:currC, marginTop:3 }}>{fmtPct(d.portfolio_ltv)}</p>
                      </div>
                    </div>
                    <p style={{ fontSize:10, color: parseFloat(delta) < 0 ? '#16a34a' : '#dc2626', marginTop:5 }}>
                      {parseFloat(delta) < 0 ? `↓ ${Math.abs(delta)}pp improvement` : `↑ ${delta}pp increase`}
                    </p>
                  </div>
                )
              })()}
            </Tile>
          </TileGrid>

          {/* ── Loan Paydown Progress — compact grid ── */}
          <div className="card">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:12 }}>
              <h3 style={{ fontWeight:600, color:'#111827', fontSize:14 }}>Loan Paydown Progress</h3>
              <div style={{ display:'flex', gap:12, fontSize:10, color:'#6b7280' }}>
                <span style={{ display:'flex', alignItems:'center', gap:3 }}>
                  <span style={{ width:8, height:8, borderRadius:1, background:'#16a34a', display:'inline-block' }} /> Paid
                </span>
                <span style={{ display:'flex', alignItems:'center', gap:3 }}>
                  <span style={{ width:8, height:8, borderRadius:1, background:'#3b82f6', opacity:0.55, display:'inline-block' }} /> Remaining
                </span>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:12 }}>
              {d.properties.filter(p => (p.original_loan_amount || 0) > 0).map(p => {
                const orig    = p.original_loan_amount || 0
                const bal     = p.total_loan_balance   || 0
                const paid    = Math.max(0, orig - bal)
                const paidPct = orig > 0 ? paid / orig * 100 : 0
                const balPct  = orig > 0 ? bal  / orig * 100 : 0
                return (
                  <div key={p.id} style={{ padding:'8px 10px', borderRadius:8, border:'1px solid #f3f4f6', background:'#fafafa' }}>
                    <Link to={`/properties/${p.id}`}
                      style={{ fontSize:11, fontWeight:600, color:'#374151', textDecoration:'none', display:'block', marginBottom:6 }}
                      className="hover:text-blue-600">{truncate(p.address.split(',')[0], 18)}</Link>
                    <div style={{ height:10, borderRadius:4, background:'#e5e7eb', overflow:'hidden', display:'flex' }}>
                      <div style={{ width:`${paidPct}%`, background:'#16a34a', opacity:0.85 }} />
                      <div style={{ width:`${balPct}%`, background:'#3b82f6', opacity:0.55 }} />
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:4, fontSize:9 }}>
                      <span style={{ color:'#16a34a', fontWeight:600 }}>{fmtPct(paidPct)} paid</span>
                      <span style={{ color:'#6b7280' }}>{fmt(bal)} left</span>
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ borderTop:'1px solid #f3f4f6', marginTop:12, paddingTop:8, display:'flex', justifyContent:'space-between', fontSize:11 }}>
              <span style={{ color:'#6b7280' }}>Total original: {fmt(d.total_original_loan)}</span>
              <span style={{ color:'#16a34a', fontWeight:600 }}>
                {fmt(d.total_principal_paid)} paid · {d.total_original_loan > 0 ? fmtPct(d.total_principal_paid / d.total_original_loan * 100) : '—'}
              </span>
            </div>
          </div>

          {/* ── Row 2: Interest / Principal / Debt Service Donut ── */}
          <TileGrid>
            <Tile label="Interest Paid Till Date" value={fmt(d.total_interest_paid)} sub="From tax returns / 1098s">
              <SparkBar data={ipSpark} color={RAMPS.red[3]} />
              <p style={subNote}>Cost of borrowing to date</p>
            </Tile>
            <Tile label="Principal Paid Till Date" value={fmt(d.total_principal_paid)} sub="Original loan − current balance">
              <SparkBar data={ppSpark} color={RAMPS.green[4]} />
              <p style={subNote}>Equity built through repayment</p>
            </Tile>
            {/* Annual Debt Service — donut as % of NOI */}
            <div style={{ borderRadius:T_RADIUS, padding:T_PAD, background:'white', border:T_BORDER }}>
              <p style={{ fontSize:12, color:'#6b7280', marginBottom:5, fontWeight:500 }}>Annual Debt Service</p>
              <p style={{ fontSize:28, fontWeight:500, color:'#111827', lineHeight:1.1, marginBottom:4 }}>{fmt(d.annual_debt_service)}</p>
              <p style={{ fontSize:12, color:'#9ca3af' }}>Monthly P&amp;I × 12</p>
              {d_noi > 0 && (() => {
                const pct = Math.min(d_ads / d_noi * 100, 100)
                const col = pct > 90 ? '#dc2626' : pct > 75 ? '#d97706' : '#16a34a'
                const r   = 22, circ = 2 * Math.PI * r, off = circ * (1 - pct / 100)
                return (
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:10 }}>
                    <svg width="60" height="60" viewBox="0 0 56 56">
                      <circle cx="28" cy="28" r={r} fill="none" strokeWidth="5" stroke="#f3f4f6" />
                      <circle cx="28" cy="28" r={r} fill="none" strokeWidth="5" stroke={col}
                        strokeDasharray={circ} strokeDashoffset={off}
                        strokeLinecap="round" transform="rotate(-90 28 28)" />
                      <text x="28" y="31" textAnchor="middle" fontSize="10" fontWeight="600" fill={col}>{Math.round(pct)}%</text>
                    </svg>
                    <div>
                      <p style={{ fontSize:10, color:'#9ca3af' }}>of annual NOI</p>
                      <p style={{ fontSize:11, fontWeight:600, color:col }}>
                        {pct > 90 ? 'Debt-heavy — watch cash flow' : pct > 75 ? 'Moderate load' : 'Healthy ratio'}
                      </p>
                      <p style={{ fontSize:10, color:'#9ca3af' }}>{fmt(Math.round(d_noi))}/yr NOI</p>
                    </div>
                  </div>
                )
              })()}
            </div>
          </TileGrid>

          {/* ── Balance Distribution + DSCR Status ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-1 text-sm">Loan Balance Distribution</h3>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={debtData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65}
                    labelLine={false} label={({ percent }) => `${(percent*100).toFixed(0)}%`} isAnimationActive={false}>
                    {debtData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Pie>
                  <Tooltip formatter={v => fmt(v)} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize:10 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-3 text-sm">DSCR Status</h3>
              {[
                { lo:0,    hi:1.0,      col:'#dc2626', bg:'#fff5f5', border:'#fecaca', icon:'✗', label:'Danger',   sub:"Income doesn't cover debt service" },
                { lo:1.0,  hi:1.25,     col:'#d97706', bg:'#fffbeb', border:'#fde68a', icon:'!', label:'Marginal', sub:'Barely covering — monitor closely' },
                { lo:1.25, hi:Infinity, col:'#16a34a', bg:'#f0fdf4', border:'#bbf7d0', icon:'✓', label:'Strong',   sub:'Meets lender threshold' },
              ].map((z, i) => {
                const active = d.portfolio_dscr != null && d.portfolio_dscr >= z.lo && (z.hi === Infinity || d.portfolio_dscr < z.hi)
                return (
                  <div key={i} style={{
                    display:'flex', alignItems:'center', gap:10, padding:'8px 12px', marginBottom:8,
                    borderRadius:8, background: active ? z.bg : '#f9fafb',
                    border:`1px solid ${active ? z.border : '#f3f4f6'}`, opacity: active ? 1 : 0.5,
                  }}>
                    <span style={{ fontSize:15, color:z.col, width:18, textAlign:'center', fontWeight:700 }}>{z.icon}</span>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:12, fontWeight: active ? 700 : 500, color: active ? z.col : '#6b7280' }}>
                        {z.label} — {z.lo}{z.hi === Infinity ? '+' : `–${z.hi}`}
                      </p>
                      <p style={{ fontSize:10, color: active ? '#374151' : '#9ca3af' }}>{z.sub}</p>
                    </div>
                    {active && <span style={{ fontSize:14, fontWeight:700, color:z.col }}>{d.portfolio_dscr.toFixed(2)}</span>}
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Debt detail table ── */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4">Debt Detail by Property</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500">
                    <th className="pb-2 font-medium">Property</th>
                    <th className="pb-2 font-medium text-right">Original Loan</th>
                    <th className="pb-2 font-medium text-right">Current Balance</th>
                    <th className="pb-2 font-medium text-right">Principal Paid</th>
                    <th className="pb-2 font-medium text-right">Rate</th>
                    <th className="pb-2 font-medium text-right">Purchase Price</th>
                    <th className="pb-2 font-medium text-right">Orig LTV</th>
                    <th className="pb-2 font-medium text-right">Curr LTV</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {d.properties.map(p => {
                    const currLtv = p.market_value ? p.total_loan_balance / p.market_value * 100 : 0
                    const origLtv = p.purchase_price ? p.original_loan_amount / p.purchase_price * 100 : 0
                    const rate    = p.loans.length > 0 ? p.loans[0].interest_rate : null
                    return (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="py-2">
                          <Link to={`/properties/${p.id}`} className="font-medium text-gray-900 hover:text-blue-600">{p.address.split(',')[0]}</Link>
                          <p className="text-xs text-gray-400">{p.city}, {p.state}</p>
                        </td>
                        <td className="py-2 text-right">{p.original_loan_amount > 0 ? fmt(p.original_loan_amount) : <span className="text-gray-300">—</span>}</td>
                        <td className="py-2 text-right">{fmt(p.total_loan_balance)}</td>
                        <td className={`py-2 text-right ${p.principal_paid > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                          {p.principal_paid > 0 ? fmt(p.principal_paid) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="py-2 text-right">{rate != null ? `${rate}%` : '—'}</td>
                        <td className="py-2 text-right">{fmt(p.purchase_price)}</td>
                        <td className="py-2 text-right">{origLtv > 0 ? fmtPct(origLtv) : <span className="text-gray-300">—</span>}</td>
                        <td className={`py-2 text-right font-medium ${currLtv > 80 ? 'text-red-500' : currLtv > 60 ? 'text-orange-500' : 'text-green-600'}`}>{fmtPct(currLtv)}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 font-semibold text-gray-900">
                    <td className="pt-2">Total</td>
                    <td className="pt-2 text-right">{fmt(d.total_original_loan)}</td>
                    <td className="pt-2 text-right">{fmt(d.total_loan_balance)}</td>
                    <td className="pt-2 text-right text-green-600">{fmt(d.total_principal_paid)}</td>
                    <td className="pt-2 text-right text-amber-700">{d.weighted_avg_rate}%</td>
                    <td className="pt-2 text-right">{fmt(d.total_purchase_price)}</td>
                    <td className="pt-2 text-right">{fmtPct(d.original_ltv)}</td>
                    <td className="pt-2 text-right">{fmtPct(d.portfolio_ltv)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══ RISK METRICS ══════════════════════════════════════════════════════ */}
      {activeTab === 'risk' && (
        <div className="space-y-6">

          {/* ── Row 1: Tinted risk tiles ── */}
          <TileGrid>
            <RiskTile label="Concentration Risk" value={fmtPct(concentrationRisk)}
              sub="Largest property equity ÷ portfolio equity"
              detail={topConcentrated ? `${truncate(topConcentrated.address.split(',')[0], 20)}: ${fmt(maxEquity)}` : ''}
              risk={concentrationRisk} lo={35} hi={50}
              marks={['< 35% — Diversified', '35–50% — Moderate', '> 50% — Concentrated']} />
            <RiskTile label="ARM Exposure" value={fmtPct(armExposure)}
              sub="ARM balance ÷ total loan balance"
              detail={`${fmt(armBalance)} of ${fmt(totalLoanBalance)}`}
              risk={armExposure} lo={25} hi={50}
              marks={['0% — No rate risk', '< 25% — Low exposure', '> 50% — High exposure']} />
            <RiskTile label="High Interest Debt" value={fmtPct(highRateExposure)}
              sub="Loan balance at rate > 6%"
              detail={`${fmt(highRateBalance)} of ${fmt(totalLoanBalance)}`}
              risk={highRateExposure} lo={10} hi={30}
              marks={['0% — All below 6%', '< 10% — Manageable', '> 30% — Refinance candidate']} />
          </TileGrid>

          {/* ── Row 2: Occupancy donut + Rate by property + LTV bar ── */}
          <TileGrid>
            {/* Occupancy — centered donut */}
            <Tile accent label="Portfolio Occupancy" value={scheduledRent > 0 ? fmtPct(occupancyRate) : '—'}
              sub="Effective Rent ÷ Scheduled Rent">
              {scheduledRent > 0 && (
                <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:10 }}>
                  <DonutRing pct={occupancyRate} onAccent />
                  <div>
                    <p style={{ fontSize:11, color:'rgba(255,255,255,0.7)' }}>{fmt(d.total_monthly_rent)}/mo effective</p>
                    <p style={{ fontSize:11, color:'rgba(255,255,255,0.45)' }}>{fmt(scheduledRent)}/mo scheduled</p>
                    <p style={{ fontSize:10, color:'rgba(255,255,255,0.4)', marginTop:3 }}>
                      {vacancyRate > 0 ? `${fmtPct(vacancyRate)} vacancy` : 'Fully occupied'}
                    </p>
                  </div>
                </div>
              )}
            </Tile>

            {/* Debt-Weighted Rate — per-property rate bars */}
            <div style={{ borderRadius:T_RADIUS, padding:T_PAD, background:'white', border:T_BORDER }}>
              <p style={{ fontSize:12, color:'#6b7280', marginBottom:5, fontWeight:500 }}>Debt-Weighted Interest Rate</p>
              <p style={{ fontSize:28, fontWeight:500, color:'#111827', lineHeight:1.1, marginBottom:4 }}>{debtWeightedRate.toFixed(2)}%</p>
              <p style={{ fontSize:12, color:'#9ca3af', marginBottom:10 }}>Σ(Balance × Rate) ÷ Σ(Balance)</p>
              {d.properties.filter(p => p.loans.length > 0 && (p.loans[0].interest_rate || 0) > 0).map((p, i) => {
                const rate = p.loans[0].interest_rate
                const name = truncate(p.address.split(',')[0], 14)
                const rCol = rate > 6.5 ? '#dc2626' : rate > 5 ? '#d97706' : '#16a34a'
                const barW = Math.min(rate / 9 * 100, 100)
                return (
                  <div key={i} style={{ marginBottom:6 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
                      <span style={{ fontSize:10, color:'#6b7280' }}>{name}</span>
                      <span style={{ fontSize:10, fontWeight:600, color:rCol }}>{rate}%</span>
                    </div>
                    <div style={{ height:6, borderRadius:3, background:'#f3f4f6' }}>
                      <div style={{ width:`${barW}%`, height:'100%', borderRadius:3, background:rCol, opacity:0.7 }} />
                    </div>
                  </div>
                )
              })}
              {/* Avg marker */}
              <div style={{ marginTop:8, padding:'4px 8px', background:'#fffbeb', borderRadius:6, display:'inline-flex', alignItems:'center', gap:6 }}>
                <span style={{ width:8, height:8, borderRadius:2, background:'#d97706', display:'inline-block' }} />
                <span style={{ fontSize:10, color:'#92400e', fontWeight:600 }}>Portfolio avg: {debtWeightedRate.toFixed(2)}%</span>
              </div>
            </div>

            {/* Portfolio LTV — stacked bar */}
            <Tile label="Portfolio LTV" value={fmtPct(d.portfolio_ltv)}
              sub={`${fmt(d.total_loan_balance)} ÷ ${fmt(d.total_market_value)}`}>
              <LTVBar ltv={d.portfolio_ltv} loan={d.total_loan_balance} equity={d.total_equity} mv={d.total_market_value} />
            </Tile>
          </TileGrid>

          {/* ── Risk Detail table with inline mini indicators ── */}
          <div className="card">
            <h3 className="font-semibold text-gray-900 mb-4 text-sm">Risk Detail by Property</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-gray-500">
                    <th className="pb-2 font-medium">Property</th>
                    <th className="pb-2 font-medium">Equity Concentration</th>
                    <th className="pb-2 font-medium text-center">Loan Type</th>
                    <th className="pb-2 font-medium text-center">Rate</th>
                    <th className="pb-2 font-medium text-right">Vacancy</th>
                    <th className="pb-2 font-medium">LTV</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {d.properties.map(p => {
                    const ltv        = p.market_value ? p.total_loan_balance / p.market_value * 100 : 0
                    const equityConc = d.total_equity > 0 ? p.equity / d.total_equity * 100 : 0
                    const pVacancy   = p.monthly_rent > 0 ? (p.monthly_rent - p.effective_rent) / p.monthly_rent * 100 : null
                    const pRate      = p.loans.length > 0 ? p.loans[0].interest_rate : null
                    const pType      = p.loans.length > 0 ? (p.loans[0].loan_type || 'Fixed') : '—'
                    const concCol    = equityConc > 50 ? '#dc2626' : equityConc > 35 ? '#d97706' : '#16a34a'
                    const rateCol    = pRate > 6.5 ? '#dc2626' : pRate > 5 ? '#d97706' : '#16a34a'
                    const ltvCol     = ltv > 80 ? '#dc2626' : ltv > 60 ? '#f59e0b' : '#16a34a'
                    const vacCol     = pVacancy == null ? '#9ca3af' : pVacancy > 10 ? '#dc2626' : pVacancy > 7 ? '#d97706' : '#16a34a'
                    return (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="py-2.5">
                          <Link to={`/properties/${p.id}`} className="font-medium text-gray-900 hover:text-blue-600">{p.address.split(',')[0]}</Link>
                          <p className="text-xs text-gray-400">{p.city}, {p.state}</p>
                        </td>
                        <td className="py-2.5 pr-4">
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <div style={{ flex:1, height:6, borderRadius:3, background:'#f3f4f6', minWidth:60 }}>
                              <div style={{ width:`${Math.min(equityConc,100)}%`, height:'100%', borderRadius:3, background:concCol }} />
                            </div>
                            <span style={{ fontSize:10, fontWeight:600, color:concCol, width:32, textAlign:'right' }}>{fmtPct(equityConc)}</span>
                          </div>
                        </td>
                        <td className="py-2.5 text-center">
                          <span style={{
                            padding:'2px 8px', borderRadius:999, fontSize:10, fontWeight:600,
                            background: pType.toUpperCase() === 'ARM' ? '#fff7ed' : '#f0fdf4',
                            color: pType.toUpperCase() === 'ARM' ? '#c2410c' : '#15803d',
                          }}>{pType}</span>
                        </td>
                        <td className="py-2.5 text-center">
                          {pRate != null ? (
                            <span style={{
                              padding:'2px 8px', borderRadius:999, fontSize:10, fontWeight:600,
                              background: pRate > 6.5 ? '#fef2f2' : pRate > 5 ? '#fffbeb' : '#f0fdf4',
                              color: rateCol,
                            }}>{pRate}%</span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="py-2.5 text-right">
                          <span style={{ fontSize:11, fontWeight:600, color:vacCol }}>
                            {pVacancy != null ? fmtPct(pVacancy) : '—'}
                          </span>
                        </td>
                        <td className="py-2.5 pr-2">
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <div style={{ flex:1, height:6, borderRadius:3, background:'#f3f4f6', minWidth:60 }}>
                              <div style={{ width:`${Math.min(ltv,100)}%`, height:'100%', borderRadius:3, background:ltvCol }} />
                            </div>
                            <span style={{ fontSize:10, fontWeight:600, color:ltvCol, width:36, textAlign:'right' }}>{fmtPct(ltv)}</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 font-semibold text-gray-900 text-xs">
                    <td className="pt-2">Portfolio</td>
                    <td className={`pt-2 ${concentrationRisk > 50 ? 'text-red-600' : 'text-green-600'}`}>{fmtPct(concentrationRisk)} max</td>
                    <td className={`pt-2 text-center ${armExposure > 0 ? 'text-orange-600' : 'text-green-600'}`}>{fmtPct(armExposure)} ARM</td>
                    <td className="pt-2 text-center text-amber-700">{debtWeightedRate.toFixed(2)}% wt.</td>
                    <td className={`pt-2 text-right ${vacancyRate > 7 ? 'text-amber-600' : 'text-green-600'}`}>{fmtPct(vacancyRate)}</td>
                    <td className={`pt-2 ${d.portfolio_ltv > 80 ? 'text-red-500' : d.portfolio_ltv > 60 ? 'text-orange-500' : 'text-green-600'}`}>{fmtPct(d.portfolio_ltv)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Shared style constant ─────────────────────────────────────────────────────
const subNote = { fontSize:10, color:'#9ca3af', marginTop:5 }

// ── Layout ────────────────────────────────────────────────────────────────────
function TileGrid({ children }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap:14 }}>
      {children}
    </div>
  )
}

// ── Core tile ─────────────────────────────────────────────────────────────────
function Tile({ label, value, sub, accent = false, children }) {
  const base = { borderRadius: T_RADIUS, padding: T_PAD }
  if (accent) return (
    <div style={{ ...base, background: ACCENT }}>
      <p style={{ fontSize:12, color:'rgba(255,255,255,0.65)', marginBottom:5, fontWeight:500 }}>{label}</p>
      <p style={{ fontSize:30, fontWeight:500, color:'white', lineHeight:1.1, marginBottom:4 }}>{value}</p>
      {sub && <p style={{ fontSize:12, color:'rgba(255,255,255,0.5)', lineHeight:1.4 }}>{sub}</p>}
      {children}
    </div>
  )
  return (
    <div style={{ ...base, background:'white', border: T_BORDER }}>
      <p style={{ fontSize:12, color:'#6b7280', marginBottom:5, fontWeight:500 }}>{label}</p>
      <p style={{ fontSize:28, fontWeight:500, color:'#111827', lineHeight:1.1, marginBottom:4 }}>{value}</p>
      {sub && <p style={{ fontSize:12, color:'#9ca3af', lineHeight:1.4 }}>{sub}</p>}
      {children}
    </div>
  )
}

// ── Risk tile (tinted background, fill bar + benchmarks) ──────────────────────
function RiskTile({ label, value, sub, detail, risk, lo, hi, marks }) {
  const danger = risk > hi
  const warn   = risk > lo && !danger
  const col    = danger ? '#dc2626' : warn ? '#d97706' : '#16a34a'
  const bg     = danger ? '#fff5f5' : warn ? '#fffbeb' : '#f0fdf4'
  const border = danger ? '#fecaca' : warn ? '#fde68a' : '#bbf7d0'
  const active = danger ? 2 : warn ? 1 : 0
  return (
    <div style={{ borderRadius: T_RADIUS, padding: T_PAD, background: bg, border:`0.5px solid ${border}` }}>
      <p style={{ fontSize:12, color:'#6b7280', marginBottom:5, fontWeight:500 }}>{label}</p>
      <p style={{ fontSize:28, fontWeight:500, color:col, lineHeight:1.1, marginBottom:4 }}>{value}</p>
      {sub    && <p style={{ fontSize:12, color:'#9ca3af', lineHeight:1.4 }}>{sub}</p>}
      {detail && <p style={{ fontSize:11, color:'#6b7280', marginTop:4, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{detail}</p>}
      <FillBar value={risk} max={100} color={col} />
      <div style={{ marginTop:8, display:'flex', flexDirection:'column', gap:3 }}>
        {marks.map((m, i) => (
          <p key={i} style={{ fontSize:10, color: i === active ? col : '#9ca3af', fontWeight: i === active ? 600 : 400, lineHeight:1.3 }}>{m}</p>
        ))}
      </div>
    </div>
  )
}

// ── Micro-visuals ─────────────────────────────────────────────────────────────

function SparkBar({ data, color = RAMPS.blue[3], onAccent = false }) {
  if (!data?.length) return null
  const bars = data.slice(-7)
  const max  = Math.max(...bars.map(Math.abs), 1)
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:32, marginTop:10 }}>
      {bars.map((v, i) => {
        const h      = Math.max(2, Math.abs(v) / max * 32)
        const isLast = i === bars.length - 1
        const alpha  = isLast ? 1 : 0.15 + (i / Math.max(bars.length - 1, 1)) * 0.5
        return (
          <div key={i} style={{
            flex:1, height:h, borderRadius:2,
            background: onAccent ? `rgba(255,255,255,${alpha})` : color,
            opacity:    onAccent ? undefined : alpha,
          }} />
        )
      })}
    </div>
  )
}

function DonutRing({ pct, onAccent = false }) {
  const r    = 22
  const circ = 2 * Math.PI * r
  const off  = circ * (1 - Math.min(100, Math.max(0, pct)) / 100)
  return (
    <svg width="60" height="60" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} fill="none" strokeWidth="5"
        stroke={onAccent ? 'rgba(255,255,255,0.2)' : '#e5e7eb'} />
      <circle cx="28" cy="28" r={r} fill="none" strokeWidth="5"
        stroke={onAccent ? 'white' : ACCENT}
        strokeDasharray={circ} strokeDashoffset={off}
        strokeLinecap="round" transform="rotate(-90 28 28)" />
      <text x="28" y="33" textAnchor="middle" fontSize="11" fontWeight="600"
        fill={onAccent ? 'white' : '#111827'}>
        {Math.round(pct)}%
      </text>
    </svg>
  )
}

function FillBar({ value, max = 100, color = RAMPS.blue[3] }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div style={{ marginTop:10, height:6, borderRadius:3, background:'#f3f4f6' }}>
      <div style={{ width:`${pct}%`, height:'100%', borderRadius:3, background:color, transition:'width 0.4s ease' }} />
    </div>
  )
}

function TrendBadge({ pct }) {
  if (pct == null || isNaN(pct)) return null
  const pos = pct >= 0
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:3,
      padding:'2px 8px', borderRadius:999,
      background: pos ? '#eaf3de' : '#fcebeb',
      color:      pos ? '#3b6d11' : '#a32d2d',
      fontSize:11, fontWeight:600,
    }}>
      {pos ? '↑' : '↓'} {Math.abs(pct).toFixed(1)}%
    </span>
  )
}

function RankedList({ items, linkBase = '/properties/' }) {
  return (
    <div style={{ marginTop:10 }}>
      {items.map((item, i) => {
        const row = (
          <div style={{
            display:'flex', justifyContent:'space-between', alignItems:'center',
            padding:'5px 0', borderTop: i > 0 ? '0.5px solid #f3f4f6' : 'none',
          }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, minWidth:0 }}>
              <span style={{ fontSize:10, color:'#9ca3af', width:12, textAlign:'right', flexShrink:0 }}>{i + 1}</span>
              <span style={{ fontSize:11, color: item.id ? '#2d4fa1' : '#374151', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                textDecoration: item.id ? 'underline' : 'none', textUnderlineOffset:2 }}>{item.name}</span>
            </div>
            <span style={{ fontSize:11, fontWeight:500, color:'#111827', flexShrink:0, marginLeft:8 }}>{item.value}</span>
          </div>
        )
        return item.id
          ? <Link key={i} to={`${linkBase}${item.id}`} style={{ display:'block', textDecoration:'none' }}>{row}</Link>
          : <div key={i}>{row}</div>
      })}
    </div>
  )
}

function LTVBar({ ltv, loan, equity, mv }) {
  const debtPct  = Math.min(ltv, 100)
  const eqPct    = Math.max(0, 100 - debtPct)
  const debtColor = ltv > 80 ? '#dc2626' : ltv > 60 ? '#d97706' : '#3b82f6'
  const eqColor   = '#16a34a'

  return (
    <div style={{ marginTop: 10 }}>
      {/* Stacked bar */}
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', height: 22, borderRadius: 6, overflow: 'hidden', background: '#f3f4f6' }}>
          <div style={{ width: `${debtPct}%`, background: debtColor, transition: 'width .4s' }} />
          <div style={{ flex: 1, background: eqColor, opacity: 0.75 }} />
        </div>
        {/* 80% threshold marker */}
        <div style={{ position: 'absolute', top: 0, left: '80%', width: 2, height: 22, background: '#fff', opacity: 0.8 }} />
        <div style={{ position: 'absolute', top: 24, left: '80%', transform: 'translateX(-50%)' }}>
          <span style={{ fontSize: 9, color: '#9ca3af', whiteSpace: 'nowrap' }}>│ 80%</span>
        </div>
      </div>
      {/* Labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 1 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: debtColor }} />
            <span style={{ fontSize: 10, color: '#6b7280' }}>Debt {fmtPct(debtPct)}</span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: '#111827' }}>{fmt(loan)}</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 1, justifyContent: 'flex-end' }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: eqColor }} />
            <span style={{ fontSize: 10, color: '#6b7280' }}>Equity {fmtPct(eqPct)}</span>
          </div>
          <span style={{ fontSize: 12, fontWeight: 600, color: eqColor }}>{fmt(equity)}</span>
        </div>
      </div>
    </div>
  )
}

function DSCRBadge({ dscr }) {
  const [bg, label] = dscr >= 1.25
    ? ['rgba(255,255,255,0.18)', 'Strong ✓']
    : dscr >= 1.0
    ? ['rgba(245,158,11,0.35)', 'Marginal ~']
    : ['rgba(239,68,68,0.35)', 'Below 1.0 !']
  return (
    <span style={{
      display:'inline-flex', alignItems:'center',
      padding:'2px 10px', borderRadius:999,
      background:bg, color:'rgba(255,255,255,0.92)',
      fontSize:11, fontWeight:600,
    }}>
      {label}
    </span>
  )
}
