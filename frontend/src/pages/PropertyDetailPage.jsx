import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { propAPI, docAPI } from '../services/api'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area
} from 'recharts'
import {
  ChevronLeft, ChevronDown, Pencil, Trash2, Plus, Upload,
  FileText, RefreshCw, Calculator, Building2, Home, X, Download, Info
} from 'lucide-react'
import toast from 'react-hot-toast'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { utils, writeFile } from 'xlsx'
import DocumentUpload from '../components/DocumentUpload'
import LoanCard from '../components/LoanCard'
import LoanModal from '../components/LoanModal'
import AmortizationModal from '../components/AmortizationModal'

const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0)
const fmtPct = (n) => `${(n || 0).toFixed(2)}%`

export default function PropertyDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [prop, setProp] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showLoanModal, setShowLoanModal] = useState(false)
  const [editLoan, setEditLoan] = useState(null)
  const [showAmortization, setShowAmortization] = useState(null)
  const [refreshingValue, setRefreshingValue] = useState(false)
  const [activeTab, setActiveTab] = useState('summary')

  const loadData = async () => {
    try {
      const [propRes, metricsRes, docsRes] = await Promise.all([
        propAPI.get(id),
        propAPI.metrics(id),
        docAPI.list(id),
      ])
      setProp(propRes.data)
      setMetrics(metricsRes.data)
      setDocs(docsRes.data)
    } catch {
      toast.error('Failed to load property')
      navigate('/properties')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [id])

  const handleDelete = async () => {
    if (!confirm('Delete this property? This cannot be undone.')) return
    await propAPI.delete(id)
    toast.success('Property deleted')
    navigate('/properties')
  }

  const handleRefreshValue = async () => {
    setRefreshingValue(true)
    const { data } = await propAPI.refreshValue(id)
    if (data.value) {
      toast.success(`Market value updated: ${fmt(data.value)} (${data.source})`)
      loadData()
    } else {
      toast(data.message || 'No value returned. Configure ZILLOW_API_KEY.', { icon: 'ℹ️' })
    }
    setRefreshingValue(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  )

  const TABS = ['summary', 'performance', 'details', 'loans', 'rental', 'taxes', 'documents', 'scenarios']

  return (
    <div className="max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <button onClick={() => navigate('/properties')} className="flex items-center gap-1 text-gray-500 hover:text-gray-900 text-sm mb-2">
            <ChevronLeft className="w-4 h-4" /> Properties
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{prop.address}</h1>
          <p className="text-gray-500 text-sm">
            {prop.city}, {prop.state} {prop.zip_code} · {prop.property_type} ·{' '}
            <span className={prop.usage_type === 'Primary' ? 'badge-yellow' : 'badge-green'}>
              {prop.usage_type === 'Primary' ? 'Primary Home' : 'Rental'}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link to={`/properties/${id}/edit`} className="btn-secondary flex items-center gap-1.5 text-sm">
            <Pencil className="w-3.5 h-3.5" /> Edit
          </Link>
          <button onClick={handleDelete} className="btn-danger flex items-center gap-1.5 text-sm">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Monthly Cash Flow" value={fmt(metrics?.monthly_cash_flow)} color={metrics?.monthly_cash_flow >= 0 ? 'text-green-600' : 'text-red-600'} />
        <KPI label="Annual Cash Flow" value={fmt(metrics?.annual_cash_flow)} color={metrics?.annual_cash_flow >= 0 ? 'text-green-600' : 'text-red-600'} />
        <KPI label="Market Value" value={fmt(prop.market_value)} action={
          <button onClick={handleRefreshValue} disabled={refreshingValue} className="text-blue-500 hover:text-blue-700">
            <RefreshCw className={`w-3 h-3 ${refreshingValue ? 'animate-spin' : ''}`} />
          </button>
        } />
        <KPI label="Equity" value={fmt(metrics?.equity)} />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`pb-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                activeTab === t
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-900'
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
      </div>


      {/* Details */}
      {activeTab === 'details' && (
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-900">Property Metrics</h3>
          <MetricRow label="NOI (Annual)" value={fmt(metrics?.annual_noi)} />
          <MetricRow label="Cap Rate" value={fmtPct(metrics?.cap_rate)} />
          <MetricRow label="Gross Yield" value={fmtPct(metrics?.gross_yield)} />
          <MetricRow label="Annual Depreciation" value={fmt(metrics?.annual_depreciation)} />
          <MetricRow label="Total Loan Balance" value={fmt(metrics?.total_loan_balance)} />
          <MetricRow label="Loan-to-Value" value={
            prop.market_value ? fmtPct(metrics?.total_loan_balance / prop.market_value * 100) : 'N/A'
          } />
          <MetricRow label="Purchase Price" value={fmt(prop.purchase_price)} />
          <MetricRow label="Down Payment" value={fmt(
            prop.loans?.[0]?.down_payment ||
            (prop.purchase_price && prop.loans?.[0]?.original_amount
              ? prop.purchase_price - prop.loans[0].original_amount
              : null)
          )} />
          <MetricRow label="Market Value Source" value={prop.market_value_source} />
        </div>
      )}

      {/* Loans */}
      {activeTab === 'loans' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Loans ({prop.loans?.length || 0})</h3>
            <button onClick={() => { setEditLoan(null); setShowLoanModal(true) }}
              className="btn-primary flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> Add Loan
            </button>
          </div>
          {prop.loans?.map((loan) => (
            <LoanCard
              key={loan.id}
              loan={loan}
              onEdit={() => { setEditLoan(loan); setShowLoanModal(true) }}
              onAmortize={() => setShowAmortization(loan)}
              onDeleted={loadData}
              propId={id}
            />
          ))}
          {prop.loans?.length === 0 && (
            <div className="text-center py-12 card">
              <Calculator className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400">No loans added yet</p>
            </div>
          )}
        </div>
      )}

      {/* Rental */}
      {activeTab === 'rental' && (
        <RentalTab propId={id} />
      )}

      {/* Taxes */}
      {activeTab === 'taxes' && (
        <TaxesTab propId={id} property={prop} />
      )}

      {/* Performance */}
      {activeTab === 'performance' && (
        <PerformanceTab propId={id} />
      )}

      {/* Documents */}
      {activeTab === 'documents' && (
        <DocumentUpload propertyId={id} docs={docs} onUploaded={loadData} />
      )}

      {/* Scenarios */}
      {activeTab === 'scenarios' && (
        <ScenariosTab prop={prop} propId={id} />
      )}

      {/* Summary */}
      {activeTab === 'summary' && (
        <SummaryTab propId={id} prop={prop} metrics={metrics} />
      )}

      {/* Modals */}
      {showLoanModal && (
        <LoanModal
          propId={id}
          loan={editLoan}
          onClose={() => setShowLoanModal(false)}
          onSaved={loadData}
        />
      )}
      {showAmortization && (
        <AmortizationModal
          propId={id}
          loan={showAmortization}
          onClose={() => setShowAmortization(null)}
        />
      )}
    </div>
  )
}

function KPI({ label, value, color, action }) {
  return (
    <div className="stat-card">
      <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">{label} {action}</p>
      <p className={`text-xl font-bold ${color || 'text-gray-900'}`}>{value}</p>
    </div>
  )
}

function PLRow({ label, value, neg, bold, color }) {
  return (
    <div className="flex justify-between text-sm">
      <span className={bold ? 'font-semibold text-gray-900' : 'text-gray-500'}>{label}</span>
      <span className={`${bold ? 'font-semibold' : ''} ${color || (neg ? 'text-red-500' : 'text-gray-900')}`}>{value}</span>
    </div>
  )
}

function MetricRow({ label, value }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  )
}

// ── Performance tab ────────────────────────────────────────────────────────────
function PerformanceTab({ propId }) {
  const [perf, setPerf] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    propAPI.performance(propId)
      .then((r) => setPerf(r.data))
      .catch(() => toast.error('Failed to load performance'))
      .finally(() => setLoading(false))
  }, [propId])

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <div className="animate-spin w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  )
  if (!perf) return null

  const latest = perf.yearly[perf.yearly.length - 1]
  const SOURCE_LABEL = {
    actual: 'from statements',
    annualized: 'annualized from 1 statement',
    estimated: 'estimated from loan',
    '1098': 'from Form 1098',
  }

  return (
    <div className="space-y-6">
      {/* Headline numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Cash Flow / yr" value={fmt(latest?.cash_flow)}
          color={latest?.cash_flow >= 0 ? 'text-green-600' : 'text-red-600'} />
        <KPI label="Principal Paydown / yr" value={fmt(latest?.principal_paid)} color="text-blue-600" />
        <KPI label="Depreciation / yr" value={fmt(perf.annual_depreciation)} color="text-purple-600" />
        <KPI label="Return on Equity"
          value={perf.return_on_equity != null ? `${perf.return_on_equity}%` : 'N/A'}
          color={perf.return_on_equity >= 5 ? 'text-green-600' : 'text-amber-600'} />
      </div>

      {/* Signals */}
      {perf.signals.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-3">Keep or Sell — Signals</h3>
          <ul className="space-y-2">
            {perf.signals.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                  s.level === 'good' ? 'bg-green-500' : s.level === 'bad' ? 'bg-red-500' : 'bg-amber-400'
                }`} />
                {s.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Yearly table */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Yearly Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500">
                <th className="pb-2 pr-2 font-medium">Year</th>
                <th className="pb-2 px-2 font-medium text-right">Rent</th>
                <th className="pb-2 px-2 font-medium text-right">Expenses</th>
                <th className="pb-2 px-2 font-medium text-right">Taxes</th>
                <th className="pb-2 px-2 font-medium text-right">Principal</th>
                <th className="pb-2 px-2 font-medium text-right">Interest</th>
                <th className="pb-2 px-2 font-medium text-right">Cash Flow</th>
                <th className="pb-2 px-2 font-medium text-right">Depreciation</th>
                <th className="pb-2 px-2 font-medium text-right">Taxable Income</th>
                <th className="pb-2 px-2 font-medium text-right">Escrow</th>
                <th className="pb-2 pl-2 font-medium text-right">Total Return</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {perf.yearly.map((y) => (
                <tr key={y.year} className="hover:bg-gray-50">
                  <td className="py-2 pr-2 font-medium text-gray-900">
                    {y.year}
                    <span className="block text-[10px] text-gray-400 font-normal">
                      {y.statements > 0 ? `${y.statements} stmt · ` : ''}{SOURCE_LABEL[y.source]}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right">
                    {fmt(y.rental_income)}
                    {y.rent_source === 'leases' && (
                      <span className="block text-[10px] text-gray-400 font-normal">
                        {y.occupied_months}/{12} mo · {fmtPct(y.occupancy)}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-right text-red-500">{fmt(y.operating_expenses)}</td>
                  <td className="py-2 px-2 text-right text-orange-500">{fmt(y.taxes_paid)}</td>
                  <td className="py-2 px-2 text-right text-blue-600">{fmt(y.principal_paid)}</td>
                  <td className="py-2 px-2 text-right text-red-500">{fmt(y.interest_paid)}</td>
                  <td className={`py-2 px-2 text-right font-medium ${y.cash_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {fmt(y.cash_flow)}
                  </td>
                  <td className="py-2 px-2 text-right text-purple-600">{fmt(y.depreciation)}</td>
                  <td className={`py-2 px-2 text-right ${y.taxable_income < 0 ? 'text-purple-600' : 'text-gray-900'}`}>
                    {fmt(y.taxable_income)}
                  </td>
                  <td className="py-2 px-2 text-right text-gray-500">{fmt(y.escrow_paid)}</td>
                  <td className={`py-2 pl-2 text-right font-semibold ${y.total_return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {fmt(y.total_return)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 font-semibold text-gray-900 bg-gray-50">
                <td className="pt-2 pr-2 text-sm">Total</td>
                <td className="pt-2 px-2 text-right">{fmt(perf.totals.rental_income)}</td>
                <td className="pt-2 px-2 text-right text-red-500">{fmt(perf.totals.operating_expenses)}</td>
                <td className="pt-2 px-2 text-right text-orange-500">{fmt(perf.totals.taxes_paid)}</td>
                <td className="pt-2 px-2 text-right text-blue-600">{fmt(perf.totals.principal_paid)}</td>
                <td className="pt-2 px-2 text-right text-red-500">{fmt(perf.totals.interest_paid)}</td>
                <td className={`pt-2 px-2 text-right ${perf.totals.cash_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {fmt(perf.totals.cash_flow)}
                </td>
                <td className="pt-2 px-2 text-right text-purple-600">{fmt(perf.totals.depreciation)}</td>
                <td className={`pt-2 px-2 text-right ${perf.totals.taxable_income < 0 ? 'text-purple-600' : 'text-gray-900'}`}>
                  {fmt(perf.totals.taxable_income)}
                </td>
                <td className="pt-2 px-2 text-right text-gray-500">{fmt(perf.totals.escrow_paid)}</td>
                <td className={`pt-2 pl-2 text-right font-bold ${perf.totals.total_return >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {fmt(perf.totals.total_return)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Upload mortgage statements from different months to turn estimates into actuals —
          two or more statements per year let the app measure the real principal paydown.
        </p>
      </div>

      {/* Statement Details per document */}
      {perf.snapshots.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Statement Details</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="pb-2 pr-2 font-medium">Date</th>
                  <th className="pb-2 px-2 font-medium text-right">Balance</th>
                  <th className="pb-2 px-2 font-medium text-right">Payment</th>
                  <th className="pb-2 px-2 font-medium text-right">Principal</th>
                  <th className="pb-2 px-2 font-medium text-right">Interest</th>
                  <th className="pb-2 px-2 font-medium text-right">Escrow</th>
                  <th className="pb-2 pl-2 font-medium text-right">Taxes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(() => {
                  const years = [...new Set(perf.snapshots.map(s => s.year))].sort()
                  const rows = []
                  let grandBalance = 0, grandPayment = 0, grandPrincipal = 0, grandInterest = 0, grandEscrow = 0, grandTaxes = 0
                  years.forEach((year, yi) => {
                    const yrSnaps = perf.snapshots.filter(s => s.year === year)
                    let subBalance = 0, subPayment = 0, subPrincipal = 0, subInterest = 0, subEscrow = 0, subTaxes = 0
                    if (yi > 0) rows.push(<tr key={`gap-${year}`} className="h-2" />)
                    yrSnaps.forEach((s) => {
                      subBalance += s.balance || 0; subPayment += s.payment || 0
                      subPrincipal += s.principal || 0; subInterest += s.interest || 0
                      subEscrow += s.escrow || 0; subTaxes += s.taxes_paid || 0
                      rows.push(
                        <tr key={s.date} className="hover:bg-gray-50">
                          <td className="py-1.5 pr-2 text-gray-900">{s.date}</td>
                          <td className="py-1.5 px-2 text-right">{fmt(s.balance)}</td>
                          <td className="py-1.5 px-2 text-right">{fmt(s.payment)}</td>
                          <td className="py-1.5 px-2 text-right text-blue-600">{fmt(s.principal)}</td>
                          <td className="py-1.5 px-2 text-right text-red-500">{fmt(s.interest)}</td>
                          <td className="py-1.5 px-2 text-right text-gray-500">{fmt(s.escrow)}</td>
                          <td className="py-1.5 pl-2 text-right text-orange-500">{fmt(s.taxes_paid)}</td>
                        </tr>
                      )
                    })
                    // Year subtotal
                    rows.push(
                      <tr key={`sub-${year}`} className="bg-gray-50 font-semibold text-gray-900">
                        <td className="py-1.5 pr-2 text-xs text-gray-500">{year} subtotal</td>
                        <td className="py-1.5 px-2 text-right">{fmt(subBalance)}</td>
                        <td className="py-1.5 px-2 text-right">{fmt(subPayment)}</td>
                        <td className="py-1.5 px-2 text-right text-blue-600">{fmt(subPrincipal)}</td>
                        <td className="py-1.5 px-2 text-right text-red-500">{fmt(subInterest)}</td>
                        <td className="py-1.5 px-2 text-right text-gray-500">{fmt(subEscrow)}</td>
                        <td className="py-1.5 pl-2 text-right text-orange-500">{fmt(subTaxes)}</td>
                      </tr>
                    )
                    grandBalance += subBalance; grandPayment += subPayment
                    grandPrincipal += subPrincipal; grandInterest += subInterest
                    grandEscrow += subEscrow; grandTaxes += subTaxes
                  })
                  // Grand total
                  rows.push(
                    <tr key="grand-total" className="border-t-2 border-gray-300 bg-gray-100 font-bold text-gray-900">
                      <td className="pt-2 pr-2">Grand Total</td>
                      <td className="pt-2 px-2 text-right">{fmt(grandBalance)}</td>
                      <td className="pt-2 px-2 text-right">{fmt(grandPayment)}</td>
                      <td className="pt-2 px-2 text-right text-blue-600">{fmt(grandPrincipal)}</td>
                      <td className="pt-2 px-2 text-right text-red-500">{fmt(grandInterest)}</td>
                      <td className="pt-2 px-2 text-right text-gray-500">{fmt(grandEscrow)}</td>
                      <td className="pt-2 pl-2 text-right text-orange-500">{fmt(grandTaxes)}</td>
                    </tr>
                  )
                  return rows
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Loan balance over time */}
      {perf.snapshots.length >= 2 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Loan Balance Over Time</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={perf.snapshots} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                domain={['auto', 'auto']} />
              <Tooltip formatter={(v) => fmt(v)} />
              <Line type="monotone" dataKey="balance" name="Balance" stroke="#3b82f6" strokeWidth={2} dot isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* All Extracted Data — every document's extracted fields */}
      {perf.all_documents && perf.all_documents.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">All Extracted Data ({perf.all_documents.length})</h3>
          {perf.all_documents.map((doc) => {
            const entries = Object.entries(doc.extracted).filter(
              ([k]) => !['raw_text_preview', 'period_type', 'statement_year'].includes(k)
            )
            if (entries.length === 0) return null
            return (
              <details key={doc.id} className="border border-gray-100 rounded-lg mb-2 overflow-hidden">
                <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 text-sm">
                  <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-medium">
                    {doc.category}
                  </span>
                  <span className="text-gray-900 font-medium truncate">{doc.original_filename}</span>
                  {doc.period_type && doc.period_type !== 'other' && (
                    <span className="text-[10px] text-gray-400 ml-auto">
                      {doc.period_type} · {doc.period_start || ''}{doc.period_start && doc.period_end ? ' → ' : ''}{doc.period_end || ''}
                    </span>
                  )}
                </summary>
                <div className="bg-gray-50 border-t border-gray-100 px-3 py-2 grid grid-cols-2 gap-x-6 gap-y-1">
                  {entries.map(([k, v]) => (
                    <div key={k} className="flex justify-between text-xs py-0.5">
                      <span className="text-gray-400 capitalize">{k.replace(/_/g, ' ')}</span>
                      <span className="font-medium text-gray-700 ml-2">
                        {v === null || v === undefined ? '—' :
                         typeof v === 'number' ? `$${v.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}` :
                         String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Scenarios tab ──────────────────────────────────────────────────────────────
function ScenariosTab({ prop, propId }) {
  const [extra, setExtra] = useState(0)
  const [selectedLoan, setSelectedLoan] = useState(prop.loans?.[0]?.id || '')
  const [analysis, setAnalysis] = useState(null)
  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(false)

  const run = async () => {
    if (!selectedLoan) return
    setLoading(true)
    try {
      const { data } = await propAPI.amortization(propId, selectedLoan, extra)
      setAnalysis(data.analysis)
      // sample every 12 months for chart
      const sampled = data.schedule.filter((_, i) => i % 12 === 0)
      setSchedule(sampled)
    } catch { toast.error('Failed to compute') }
    finally { setLoading(false) }
  }

  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0)

  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Extra Payment Payoff Simulator</h3>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="label">Loan</label>
            <select className="input w-52" value={selectedLoan} onChange={(e) => setSelectedLoan(e.target.value)}>
              {prop.loans?.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.lender_name || `Loan #${l.id}`} ({l.loan_type})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Extra Monthly Payment ($)</label>
            <input type="number" className="input w-36" value={extra}
              onChange={(e) => setExtra(parseFloat(e.target.value) || 0)} min="0" step="50" />
          </div>
          <button onClick={run} disabled={loading} className="btn-primary">
            {loading ? 'Calculating…' : 'Calculate'}
          </button>
        </div>

        {analysis && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <AnalysisCard label="Standard Payoff" value={`${(analysis.base_months / 12).toFixed(1)} yrs`} sub={`${analysis.base_months} months`} />
            <AnalysisCard label="With Extra $" value={`${(analysis.extra_months / 12).toFixed(1)} yrs`} sub={`${analysis.extra_months} months`} color="text-green-600" />
            <AnalysisCard label="Time Saved" value={`${analysis.years_saved} yrs`} sub={`${analysis.months_saved} months`} color="text-blue-600" />
            <AnalysisCard label="Interest Saved" value={fmt(analysis.interest_saved)} sub={`${fmt(analysis.base_total_interest)} → ${fmt(analysis.extra_total_interest)}`} color="text-purple-600" />
          </div>
        )}
      </div>

      {schedule.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Amortization Chart (Annual)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={schedule}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tickFormatter={(m) => `Yr ${Math.round(m/12)}`} tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => fmt(v)} labelFormatter={(m) => `Month ${m}`} />
              <Area type="monotone" dataKey="balance" name="Balance" stroke="#3b82f6" fill="#eff6ff" />
              <Area type="monotone" dataKey="total_interest_paid" name="Interest Paid" stroke="#ef4444" fill="#fef2f2" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

// ── Taxes tab (tax-return Schedule E / Schedule A) ──────────────────────────────
function TaxesTab({ propId, property }) {
  const [entries, setEntries] = useState(null)
  const [comparison, setComparison] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showCompare, setShowCompare] = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([propAPI.taxEntries(propId), propAPI.taxComparison()])
      .then(([e, c]) => { setEntries(e.data); setComparison(c.data) })
      .catch(() => toast.error('Failed to load tax return data'))
      .finally(() => setLoading(false))
  }, [propId])

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <div className="animate-spin w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  )

  const hasEntries = entries && entries.length > 0
  const isPrimary = (property?.usage_type || '').toLowerCase() === 'primary'

  // Sort ascending by year so cumulative runs forward
  const sorted = hasEntries
    ? [...entries].sort((a, b) => a.tax_year - b.tax_year)
    : []

  // Build cumulative net income column
  let cumulative = 0
  const rows = sorted.map(e => {
    cumulative += (e.net_income || 0)
    return { ...e, cumulative_net: cumulative }
  })

  const exportCSV = () => {
    const headers = ['Year', 'Rents Received', 'Mortgage Interest', 'Property Taxes',
      'Depreciation', 'Total Expenses', 'Net Income', 'Cumulative Net Income']
    const lines = [
      headers.join(','),
      ...rows.map(r => [
        r.tax_year,
        r.rents_received ?? '',
        r.mortgage_interest ?? '',
        r.property_taxes ?? '',
        r.depreciation ?? '',
        r.total_expenses ?? '',
        r.net_income ?? '',
        r.cumulative_net,
      ].join(','))
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `tax_return_${property?.address?.replace(/\s+/g, '_') || propId}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* This property's tax-return figures by year */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">Tax Return Figures</h3>
            <p className="text-xs text-gray-400">
              {isPrimary ? 'Schedule A — primary residence' : 'Schedule E — rental real estate'}
            </p>
          </div>
          <div className="flex gap-2">
            {hasEntries && (
              <button onClick={exportCSV} className="btn-secondary text-sm flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            )}
            <button onClick={() => setShowCompare((s) => !s)} className="btn-secondary text-sm">
              {showCompare ? 'Hide comparison' : 'Compare all properties'}
            </button>
          </div>
        </div>

        {!hasEntries ? (
          <div className="text-center py-10">
            <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No tax-return data for this property yet.</p>
            <p className="text-gray-400 text-xs mt-1">
              Upload a 1040 tax return (with Schedule E) on the Uploads page — figures are matched by address.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500">Year</th>
                  {!isPrimary && <th className="text-right py-2 px-3 text-xs font-semibold text-green-600">Rents</th>}
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Mortgage Int.</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Prop. Taxes</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Depreciation</th>
                  {!isPrimary && <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Total Exp.</th>}
                  {!isPrimary && <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500">Net Income</th>}
                  {!isPrimary && <th className="text-right py-2 px-3 text-xs font-semibold text-blue-600">Cumulative Net</th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((e, i) => (
                  <tr key={e.id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-2 px-3 font-medium text-gray-900">
                      {e.tax_year}
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 capitalize">{e.property_kind}</span>
                    </td>
                    {!isPrimary && (
                      <td className="py-2 px-3 text-right text-green-600 font-medium">{fmt(e.rents_received)}</td>
                    )}
                    <td className="py-2 px-3 text-right text-gray-700">{fmt(e.mortgage_interest)}</td>
                    <td className="py-2 px-3 text-right text-gray-700">{fmt(e.property_taxes)}</td>
                    <td className="py-2 px-3 text-right text-gray-700">{fmt(e.depreciation)}</td>
                    {!isPrimary && (
                      <td className="py-2 px-3 text-right text-gray-700">{fmt(e.total_expenses)}</td>
                    )}
                    {!isPrimary && (
                      <td className={`py-2 px-3 text-right font-medium ${e.net_income >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {e.net_income >= 0 ? '+' : ''}{fmt(e.net_income)}
                      </td>
                    )}
                    {!isPrimary && (
                      <td className={`py-2 px-3 text-right font-semibold ${e.cumulative_net >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                        {e.cumulative_net >= 0 ? '+' : ''}{fmt(e.cumulative_net)}
                      </td>
                    )}
                  </tr>
                ))}
                {/* Totals row */}
                {rows.length > 1 && !isPrimary && (
                  <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                    <td className="py-2 px-3 text-gray-700">Total ({rows[0].tax_year}–{rows[rows.length-1].tax_year})</td>
                    <td className="py-2 px-3 text-right text-green-600">{fmt(rows.reduce((s,r) => s+(r.rents_received||0), 0))}</td>
                    <td className="py-2 px-3 text-right text-gray-700">{fmt(rows.reduce((s,r) => s+(r.mortgage_interest||0), 0))}</td>
                    <td className="py-2 px-3 text-right text-gray-700">{fmt(rows.reduce((s,r) => s+(r.property_taxes||0), 0))}</td>
                    <td className="py-2 px-3 text-right text-gray-700">{fmt(rows.reduce((s,r) => s+(r.depreciation||0), 0))}</td>
                    <td className="py-2 px-3 text-right text-gray-700">{fmt(rows.reduce((s,r) => s+(r.total_expenses||0), 0))}</td>
                    <td className={`py-2 px-3 text-right ${cumulative >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {cumulative >= 0 ? '+' : ''}{fmt(cumulative)}
                    </td>
                    <td className={`py-2 px-3 text-right ${cumulative >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                      {cumulative >= 0 ? '+' : ''}{fmt(cumulative)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cross-property comparison */}
      {showCompare && comparison && (
        <TaxComparison comparison={comparison} currentPropId={Number(propId)} />
      )}
    </div>
  )
}

function TaxComparison({ comparison, currentPropId }) {
  if (!comparison.years || comparison.years.length === 0) {
    return <div className="card text-sm text-gray-400">No tax-return data to compare yet.</div>
  }
  const COLS = [
    ['rents_received', 'Rents'],
    ['mortgage_interest', 'Mortgage Int.'],
    ['property_taxes', 'Taxes'],
    ['depreciation', 'Depreciation'],
    ['total_expenses', 'Total Exp.'],
    ['net_income', 'Net'],
  ]
  return (
    <div className="space-y-6">
      {comparison.years.map((yr) => (
        <div key={yr.tax_year} className="card">
          <h3 className="font-semibold text-gray-900 mb-3">{yr.tax_year} — All Properties</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="pb-2 pr-2 font-medium">Property</th>
                  {COLS.map(([k, label]) => (
                    <th key={k} className="pb-2 px-2 font-medium text-right">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {yr.entries.map((e) => (
                  <tr key={e.id} className={`hover:bg-gray-50 ${e.property_id === currentPropId ? 'bg-blue-50/50' : ''}`}>
                    <td className="py-2 pr-2">
                      <span className="font-medium text-gray-900">{e.address || '—'}</span>
                      {e.property_kind === 'primary' && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600">primary</span>
                      )}
                      {!e.property_id && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">unlinked</span>
                      )}
                    </td>
                    {COLS.map(([k]) => (
                      <td key={k} className={`py-2 px-2 text-right ${k === 'net_income' ? (e[k] >= 0 ? 'text-green-600' : 'text-red-500') : ''}`}>
                        {e[k] ? fmt(e[k]) : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-200 font-semibold">
                  <td className="py-2 pr-2 text-gray-900">Total</td>
                  {COLS.map(([k]) => (
                    <td key={k} className="py-2 px-2 text-right">{fmt(yr.totals[k])}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Rental tab ──────────────────────────────────────────────────────────────────
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const monthLabel = (m, y) => (m && y ? `${MONTHS[m - 1]} ${y}` : '')

function RentalTab({ propId }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editPeriod, setEditPeriod] = useState(null)

  const load = () => {
    setLoading(true)
    propAPI.rentals(propId)
      .then((r) => setData(r.data))
      .catch(() => toast.error('Failed to load rental history'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [propId])

  const handleDelete = async (rid) => {
    if (!confirm('Delete this rental period?')) return
    await propAPI.deleteRental(propId, rid)
    toast.success('Rental period deleted')
    load()
  }

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <div className="animate-spin w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  )
  if (!data) return null

  const { periods, yearly, total_collected } = data

  return (
    <div className="space-y-6">
      {/* Per-year occupancy rollup */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Rental by Year</h3>
          <span className="text-sm text-gray-400">
            Total collected: <span className="font-semibold text-green-600">{fmt(total_collected)}</span>
          </span>
        </div>
        {yearly.length === 0 ? (
          <p className="text-sm text-gray-400 py-6 text-center">
            No rental periods yet. Add a lease below to track occupancy and actual income per year.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="pb-2 pr-2 font-medium">Year</th>
                  <th className="pb-2 px-2 font-medium text-right">Months Occupied</th>
                  <th className="pb-2 px-2 font-medium text-right">Occupancy</th>
                  <th className="pb-2 px-2 font-medium">&nbsp;</th>
                  <th className="pb-2 pl-2 font-medium text-right">Rent Collected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {yearly.map((y) => (
                  <tr key={y.year} className="hover:bg-gray-50">
                    <td className="py-2 pr-2 font-medium text-gray-900">{y.year}</td>
                    <td className="py-2 px-2 text-right">{y.occupied_months} / {y.months_elapsed}</td>
                    <td className="py-2 px-2 text-right font-medium">{fmtPct(y.occupancy)}</td>
                    <td className="py-2 px-2 w-40">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${y.occupancy >= 95 ? 'bg-green-500' : y.occupancy >= 70 ? 'bg-amber-400' : 'bg-red-400'}`}
                          style={{ width: `${Math.min(y.occupancy, 100)}%` }} />
                      </div>
                    </td>
                    <td className="py-2 pl-2 text-right font-medium text-green-600">{fmt(y.income)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-gray-400 mt-3">
          Occupancy and income here drive the rent figures shown in Performance and Summary for each year.
          Years with no lease recorded fall back to the property's standard monthly rent.
        </p>
      </div>

      {/* Lease periods list */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Lease Periods ({periods.length})</h3>
          <button onClick={() => { setEditPeriod(null); setShowForm(true) }}
            className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Add Period
          </button>
        </div>
        {periods.length === 0 ? (
          <div className="text-center py-10">
            <Home className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">No lease periods recorded</p>
          </div>
        ) : (
          <div className="space-y-2">
            {periods.map((p) => (
              <div key={p.id} className="flex items-center justify-between border border-gray-100 rounded-lg px-4 py-3 hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <Home className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      {p.tenant_name || 'Tenant'}
                      <span className="ml-2 text-gray-400 font-normal">
                        {monthLabel(p.start_month, p.start_year)} → {p.end_year ? monthLabel(p.end_month, p.end_year) : 'present'}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {fmt(p.monthly_rent)}/mo{p.notes ? ` · ${p.notes}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditPeriod(p); setShowForm(true) }}
                    className="p-1.5 text-gray-400 hover:text-blue-600"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(p.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <RentalForm
          propId={propId}
          period={editPeriod}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load() }}
        />
      )}
    </div>
  )
}

function RentalForm({ propId, period, onClose, onSaved }) {
  const now = new Date()
  const [form, setForm] = useState({
    tenant_name: period?.tenant_name || '',
    start_month: period?.start_month || 1,
    start_year: period?.start_year || now.getFullYear(),
    end_month: period?.end_month || '',
    end_year: period?.end_year || '',
    monthly_rent: period?.monthly_rent ?? '',
    notes: period?.notes || '',
    ongoing: period ? !period.end_year : false,
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    const payload = {
      tenant_name: form.tenant_name || null,
      start_month: Number(form.start_month),
      start_year: Number(form.start_year),
      end_month: form.ongoing || !form.end_month ? null : Number(form.end_month),
      end_year: form.ongoing || !form.end_year ? null : Number(form.end_year),
      monthly_rent: Number(form.monthly_rent) || 0,
      notes: form.notes || null,
    }
    if (!form.ongoing && payload.end_year && payload.end_month &&
        (payload.end_year < payload.start_year ||
         (payload.end_year === payload.start_year && payload.end_month < payload.start_month))) {
      toast.error('End date is before start date')
      return
    }
    setSaving(true)
    try {
      if (period) await propAPI.updateRental(propId, period.id, payload)
      else await propAPI.addRental(propId, payload)
      toast.success(period ? 'Rental period updated' : 'Rental period added')
      onSaved()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-900">{period ? 'Edit' : 'Add'} Rental Period</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="label">Tenant / Label (optional)</label>
            <input className="input" value={form.tenant_name}
              onChange={(e) => set('tenant_name', e.target.value)} placeholder="e.g. John Smith" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">From</label>
              <div className="flex gap-2">
                <select className="input" value={form.start_month} onChange={(e) => set('start_month', e.target.value)}>
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <input type="number" className="input w-24" value={form.start_year}
                  onChange={(e) => set('start_year', e.target.value)} min="1980" max="2100" required />
              </div>
            </div>
            <div>
              <label className="label flex items-center justify-between">
                <span>To</span>
                <label className="flex items-center gap-1 text-xs font-normal text-gray-500">
                  <input type="checkbox" checked={form.ongoing}
                    onChange={(e) => set('ongoing', e.target.checked)} /> Ongoing
                </label>
              </label>
              <div className="flex gap-2">
                <select className="input" value={form.end_month} disabled={form.ongoing}
                  onChange={(e) => set('end_month', e.target.value)}>
                  <option value="">—</option>
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </select>
                <input type="number" className="input w-24" value={form.end_year} disabled={form.ongoing}
                  onChange={(e) => set('end_year', e.target.value)} min="1980" max="2100"
                  placeholder="Year" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Monthly Rent ($)</label>
              <input type="number" className="input" value={form.monthly_rent}
                onChange={(e) => set('monthly_rent', e.target.value)} min="0" step="50" required />
            </div>
            <div>
              <label className="label">Notes (optional)</label>
              <input className="input" value={form.notes}
                onChange={(e) => set('notes', e.target.value)} placeholder="e.g. renewed lease" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : period ? 'Save' : 'Add Period'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Summary / Lifetime tab ─────────────────────────────────────────────────────
function SummaryTab({ propId, prop, metrics }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [plExpanded, setPlExpanded] = useState(false)

  useEffect(() => {
    propAPI.lifetime(propId)
      .then((r) => setData(r.data))
      .catch(() => toast.error('Failed to load lifetime summary'))
      .finally(() => setLoading(false))
  }, [propId])

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <div className="animate-spin w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  )
  if (!data) return null

  const { lifetime, yearly } = data

  const COLS = [
    { key: 'rental_income',        label: 'Rent',          section: 'income' },
    { key: 'operating_expenses',   label: 'Expenses',      section: 'deductions' },
    { key: 'interest_paid',        label: 'Interest',      section: 'deductions' },
    { key: 'taxes_paid',           label: 'Taxes',         section: 'deductions' },
    { key: 'principal_paid',       label: 'Principal',     section: 'results' },
    { key: 'cash_flow',            label: 'Cash Flow',     section: 'results' },
    { key: 'taxable_income',       label: 'Taxable Income',section: 'results' },
    { key: 'depreciation',         label: 'Depreciation',  section: 'deductions' },
  ]
  const TOTALS_KEY = {
    rental_income: 'total_rental_income',
    operating_expenses: 'total_operating_expenses',
    interest_paid: 'total_interest_paid',
    taxes_paid: 'total_taxes_paid',
    depreciation: 'total_depreciation',
    principal_paid: 'total_principal_paid',
    cash_flow: 'total_cash_flow',
    taxable_income: 'total_taxable_income',
  }
  const SECTION_STYLE = {
    income:     { header: 'bg-gray-50 text-gray-700', cell: '' },
    deductions: { header: 'bg-gray-50 text-gray-700', cell: '' },
    results:    { header: 'bg-gray-50 text-gray-700', cell: '' },
  }
  const cellColor = (key, value) => {
    if (key === 'rental_income') return 'text-green-700'
    if (key === 'operating_expenses' || key === 'interest_paid' || key === 'taxes_paid') return 'text-red-500'
    if (key === 'depreciation') return 'text-purple-600'
    if (key === 'principal_paid') return 'text-blue-600'
    if (key === 'cash_flow') return value >= 0 ? 'text-green-600' : 'text-red-600'
    if (key === 'taxable_income') return value < 0 ? 'text-purple-600' : 'text-gray-900'
    return 'text-gray-900'
  }

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(13)
    doc.text('Property Performance Summary', 14, 14)
    autoTable(doc, {
      head: [['Year', ...COLS.map(c => c.label)]],
      body: yearly.map(y => [y.is_partial ? `${y.year}*` : y.year, ...COLS.map(c => fmt(y[c.key]))]),
      foot: [['Total', ...COLS.map(c => fmt(lifetime[TOTALS_KEY[c.key]]))]],
      startY: 22,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [59, 130, 246], textColor: 255 },
      footStyles: { fillColor: [243, 244, 246], textColor: [17, 24, 39], fontStyle: 'bold' },
      columnStyles: { 0: { fontStyle: 'bold' } },
    })
    doc.save('property-summary.pdf')
  }

  const exportXLS = () => {
    const header = ['Year', ...COLS.map(c => c.label)]
    const rows = yearly.map(y => [y.is_partial ? `${y.year}*` : y.year, ...COLS.map(c => y[c.key])])
    const totals = ['Total', ...COLS.map(c => lifetime[TOTALS_KEY[c.key]])]
    const ws = utils.aoa_to_sheet([header, ...rows, totals])
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, 'Summary')
    writeFile(wb, 'property-summary.xlsx')
  }

  return (
    <div className="space-y-6">
      {/* Monthly snapshot */}
      <div className="card">
        <button
          onClick={() => setPlExpanded(e => !e)}
          className="w-full flex items-center justify-between text-left"
        >
          <h3 className="font-semibold text-gray-900">P&amp;L Summary (Monthly)</h3>
          <div className="flex items-center gap-3 text-sm">
            <span className={`font-medium ${metrics?.monthly_cash_flow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {fmt(metrics?.monthly_cash_flow)} / mo
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${plExpanded ? 'rotate-180' : ''}`} />
          </div>
        </button>
        {plExpanded && (
          <div className="mt-3 space-y-3">
            <PLRow label="Gross Rent" value={fmt(prop.monthly_rent)} />
            <PLRow label="Vacancy Adjustment" value={`-${fmt(prop.monthly_rent * (1 - prop.occupancy_rate / 100))}`} neg />
            <PLRow label="Effective Rent" value={fmt(metrics?.effective_rent)} bold />
            <div className="border-t pt-3 space-y-2">
              <PLRow label="Mortgage (P&I)" value={`-${fmt(metrics?.monthly_pi)}`} neg />
              <PLRow label="Escrow (Taxes & Insurance)" value={`-${fmt(metrics?.monthly_escrow)}`} neg />
              <PLRow label="Taxes & Ins (outside escrow)" value={`-${fmt(metrics?.non_escrowed_tax_ins)}`} neg />
              <PLRow label="HOA" value={`-${fmt(prop.hoa_fee)}`} neg />
              <PLRow label="Repairs & Maint." value={`-${fmt(prop.maintenance)}`} neg />
              <PLRow label="Property Mgmt" value={`-${fmt(prop.property_management_fee)}`} neg />
              <PLRow label="Utilities" value={`-${fmt(prop.utilities)}`} neg />
              <PLRow label="Vacancy Allowance" value={`-${fmt(prop.vacancy_allowance)}`} neg />
              <PLRow label="CapEx Reserve" value={`-${fmt(prop.capex_reserve)}`} neg />
              <PLRow label="Other" value={`-${fmt(prop.other_expenses)}`} neg />
            </div>
            <div className="border-t pt-3">
              <PLRow label="Net Cash Flow" value={fmt(metrics?.monthly_cash_flow)}
                bold color={metrics?.monthly_cash_flow >= 0 ? 'text-green-600' : 'text-red-600'} />
            </div>
            <div className="border-t pt-3">
              <PLRow label="Depreciation/mo" value={fmt(metrics?.monthly_depreciation)} color="text-purple-600" />
            </div>
          </div>
        )}
      </div>

      {/* Lifetime */}
      <div className="card">
        <div className="flex items-baseline justify-between mb-1">
          <h3 className="font-semibold text-gray-900">Lifetime Summary</h3>
          <span className="text-sm text-gray-400">
            {yearly.length > 0 ? (
              <>
                {lifetime.years_owned > 0 && lifetime.years_owned < 200
                  ? `Owned ${lifetime.years_owned} year${lifetime.years_owned !== 1 ? 's' : ''}${lifetime.purchase_year ? ` (since ${lifetime.purchase_year})` : ''} · `
                  : ''}
                {yearly.length} year{yearly.length !== 1 ? 's' : ''} with data
              </>
            ) : (
              'No data yet'
            )}
          </span>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Total Rental Income" value={fmt(lifetime.total_rental_income)} color="text-green-600" />
        <KPI label="Total Expenses" value={fmt(lifetime.total_operating_expenses + lifetime.total_interest_paid)} color="text-red-500" />
        <KPI label="Net Cash Flow" value={fmt(lifetime.total_cash_flow)}
          color={lifetime.total_cash_flow >= 0 ? 'text-green-600' : 'text-red-600'} />
        <KPI label="Total Return" value={fmt(lifetime.total_return)}
          color={lifetime.total_return >= 0 ? 'text-green-600' : 'text-red-600'} />
      </div>

      {/* Detailed breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Income & Expenses */}
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-900 border-b pb-2">Income &amp; Expenses</h3>
          <LifetimeRow label="Rental Income" value={fmt(lifetime.total_rental_income)} color="text-green-600" />
          <LifetimeRow label="Operating Expenses" value={fmt(lifetime.total_operating_expenses)} color="text-red-500" />
          <LifetimeRow label="Interest Paid" value={fmt(lifetime.total_interest_paid)} color="text-red-500" />
          <LifetimeRow label="Escrow Paid" value={fmt(lifetime.total_escrow_paid)} color="text-gray-500" />
          <div className="border-t pt-3">
            <LifetimeRow label="Total Outflows" value={fmt(lifetime.total_operating_expenses + lifetime.total_interest_paid + lifetime.total_escrow_paid)} bold color="text-red-600" />
          </div>
        </div>

        {/* Equity & Returns */}
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-900 border-b pb-2">Equity &amp; Returns</h3>
          <LifetimeRow label="Principal Paid" value={fmt(lifetime.total_principal_paid)} color="text-blue-600" />
          <LifetimeRow label="Depreciation Claimed" value={fmt(lifetime.total_depreciation)} color="text-purple-600" />
          <LifetimeRow label="Total Return (CF + Principal)" value={fmt(lifetime.total_return)} bold color={lifetime.total_return >= 0 ? 'text-green-600' : 'text-red-600'} />
          <div className="border-t pt-3 space-y-3">
            <LifetimeRow label="Remaining Loan Balance" value={fmt(lifetime.current_loan_balance)} />
            <LifetimeRow label="Current Market Value" value={fmt(lifetime.market_value)} color="text-green-600" />
            <LifetimeRow label="Equity" value={fmt(lifetime.equity)} bold color="text-blue-600" />
          </div>
        </div>

        {/* Averages & Ratios */}
        <div className="card space-y-3">
          <h3 className="font-semibold text-gray-900 border-b pb-2">Averages &amp; Ratios</h3>
          <LifetimeRow label="Annual Depreciation" value={fmt(lifetime.annual_depreciation)} color="text-purple-600" />
          <LifetimeRow label="Avg Interest / yr" value={yearly.length > 0 ? fmt(lifetime.total_interest_paid / yearly.length) : '$0'} color="text-red-500" />
          <LifetimeRow label="Avg Principal / yr" value={yearly.length > 0 ? fmt(lifetime.total_principal_paid / yearly.length) : '$0'} color="text-blue-600" />
          <LifetimeRow label="Monthly Rent" value={fmt(lifetime.monthly_rent)} />
          <div className="border-t pt-3">
            <LifetimeRow label="Taxable Income (total)" value={fmt(lifetime.total_taxable_income)}
              color={lifetime.total_taxable_income < 0 ? 'text-purple-600' : 'text-gray-900'} />
          </div>
        </div>
      </div>

      {/* All-years table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">All Years</h3>
          <div className="flex gap-2">
            <button onClick={exportXLS} className="btn-secondary flex items-center gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5" /> XLS
            </button>
            <button onClick={exportPDF} className="btn-secondary flex items-center gap-1.5 text-xs">
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              {/* Column header row */}
              <tr className="border-b border-gray-200 text-gray-600">
                <th className="py-1.5 pr-2 text-left font-medium text-xs">Year</th>
                {COLS.map((c) => (
                  <th key={c.key}
                    className={`py-1.5 px-2 text-right font-medium text-xs ${SECTION_STYLE[c.section].cell}`}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {yearly.map((y) => (
                <tr key={y.year} className="hover:brightness-95">
                  <td className="py-1.5 pr-2 font-medium text-gray-900 text-xs">
                    <div className="flex items-center gap-1">
                      {y.year}
                      {y.is_partial && (
                        <span
                          className="group relative cursor-default"
                          title={`Annualized projection — based on ${y.months_elapsed} month${y.months_elapsed !== 1 ? 's' : ''} of data. Values extrapolated to full year at current pace.`}
                        >
                          <Info className="w-3 h-3 text-amber-400 shrink-0" />
                          <span className="pointer-events-none absolute left-4 top-0 z-20 w-52 rounded-lg bg-gray-900 px-2.5 py-2 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg leading-tight">
                            Partial year — annualized from {y.months_elapsed}mo of data at current pace
                          </span>
                        </span>
                      )}
                    </div>
                    <span className="block text-[10px] font-normal mt-0.5">
                      {y.is_partial
                        ? <span className="text-amber-500">{y.months_elapsed}mo → 12mo est.</span>
                        : <span className="text-gray-400">{y.statements > 0 ? `${y.statements} stmt` : y.source}</span>
                      }
                    </span>
                  </td>
                  {COLS.map((c) => (
                    <td key={c.key}
                      className={`py-1.5 px-2 text-right text-xs ${SECTION_STYLE[c.section].cell} ${cellColor(c.key, y[c.key])}`}>
                      {fmt(y[c.key])}
                      {c.key === 'rental_income' && y.rent_source === 'tax_return' && (
                        <span className="block text-[10px] text-blue-400 font-normal">tax return</span>
                      )}
                      {c.key === 'rental_income' && y.rent_source === 'leases' && (
                        <span className="block text-[10px] text-gray-400 font-normal">{fmtPct(y.occupancy)} occ</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 font-semibold text-gray-900 text-xs">
                <td className="pt-2 pr-2">Total</td>
                {COLS.map((c) => (
                  <td key={c.key}
                    className={`pt-2 px-2 text-right font-bold ${SECTION_STYLE[c.section].cell} ${cellColor(c.key, lifetime[TOTALS_KEY[c.key]])}`}>
                    {fmt(lifetime[TOTALS_KEY[c.key]])}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
        {yearly.some(y => y.is_partial) && (
          <div className="flex items-start gap-2 mt-3 px-1">
            <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-gray-500">
              <span className="text-amber-600 font-medium">Partial year</span> — current year values are annualized projections
              (actual data × 12 ÷ months elapsed). Rent is extrapolated at current pace; interest and principal are averaged from uploaded statements.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function LifetimeRow({ label, value, bold, color }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={`${bold ? 'font-semibold' : ''} ${color || 'text-gray-900'}`}>{value}</span>
    </div>
  )
}

function AnalysisCard({ label, value, sub, color }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-bold mt-0.5 ${color || 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  )
}
