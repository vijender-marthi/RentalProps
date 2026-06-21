import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { propAPI, docAPI } from '../services/api'
import {
  Upload, FileText, Trash2, ChevronDown, Wand2, Building2, RefreshCw
} from 'lucide-react'
import toast from 'react-hot-toast'

const CATEGORIES = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'mortgage_statement', label: 'Mortgage Statement' },
  { value: 'closing_statement', label: 'Closing Statement (ALTA/HUD-1)' },
  { value: 'tax_return', label: 'Tax Return (Schedule E)' },
  { value: '1098', label: '1098 - Mortgage Interest' },
  { value: '1099', label: '1099 Year-End' },
  { value: 'loan_disclosure', label: 'Loan Disclosure' },
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'property_tax', label: 'Property Tax Statement' },
  { value: 'other', label: 'Other' },
]

const fmtSize = (bytes) => {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const catLabel = (val) =>
  CATEGORIES.find((c) => c.value === val)?.label || val

export default function UploadsPage() {
  const [properties, setProperties] = useState([])
  const [propertyId, setPropertyId] = useState('')
  const [category, setCategory] = useState('auto')
  const isTaxReturn = category === 'tax_return'
  const [docs, setDocs] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [reprocessing, setReprocessing] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef()

  const loadDocs = () => docAPI.listAll().then((r) => setDocs(r.data))
  const loadProperties = () => propAPI.list().then((r) => setProperties(r.data))

  useEffect(() => {
    Promise.all([loadProperties(), loadDocs()])
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false))
  }, [])

  const upload = async (files) => {
    setUploading(true)
    let propertyChanged = false
    for (const file of files) {
      const fd = new FormData()
      if (propertyId) fd.append('property_id', propertyId)
      fd.append('category', category)
      fd.append('file', file)
      try {
        const { data } = await docAPI.upload(fd)
        toast.success(`Uploaded: ${data.original_filename} (${catLabel(data.category)})`)
        if (data.tax_entries_imported > 0) {
          toast.success(`Tax return imported — ${data.tax_entries_imported} propert${data.tax_entries_imported === 1 ? 'y' : 'ies'} updated`, { duration: 6000 })
        } else if (data.property_created) {
          const n = Object.keys(data.auto_applied || {}).length
          toast.success(
            n > 0
              ? `New property added: ${data.property_address} — loan details filled (${n} fields)`
              : `New property added: ${data.property_address}`,
            { duration: 6000 }
          )
          propertyChanged = true
        } else if (!propertyId && data.property_address) {
          toast(`Matched property: ${data.property_address}`, { icon: '🏠' })
        }
      } catch (err) {
        toast.error(err.response?.data?.detail || `Upload failed: ${file.name}`)
      }
    }
    setUploading(false)
    loadDocs()
    if (propertyChanged) loadProperties()
  }

  const handleDelete = async (docId) => {
    if (!confirm('Delete this document?')) return
    await docAPI.delete(docId)
    toast.success('Deleted')
    loadDocs()
  }

  const handleApply = async (docId) => {
    try {
      const { data } = await docAPI.apply(docId)
      if (Object.keys(data.applied).length) {
        toast.success(data.message)
      } else {
        toast(data.message, { icon: 'ℹ️' })
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Apply failed')
    }
  }

  const handleReparse = async (docId) => {
    try {
      await docAPI.reparse(docId)
      toast.success('Re-extracted with the latest parser')
      loadDocs()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Re-parse failed')
    }
  }

  const handleReprocessAll = async () => {
    if (!confirm('Re-extract and re-apply all uploaded files with the latest parser?')) return
    setReprocessing(true)
    try {
      const { data } = await docAPI.reprocessAll()
      toast.success(`Reprocessed ${data.reprocessed} of ${data.total} files`)
      if (data.errors?.length) {
        toast.error(`${data.errors.length} file(s) could not be reprocessed`)
      }
      await Promise.all([loadDocs(), loadProperties()])
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Reprocess failed')
    } finally {
      setReprocessing(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Files</h1>
        <p className="text-gray-500 text-sm mt-1">
          Mortgage statements, tax returns (Schedule E), 1098/1099 year-end statements, loan disclosures
        </p>
      </div>

      {properties.length === 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
          <Building2 className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">No properties yet — just drop a mortgage statement below.</p>
            <p className="text-blue-600 mt-0.5">
              The property is created from the address on the statement and the loan details
              (balance, rate, payment, ARM/Fixed) are filled in automatically.
            </p>
          </div>
        </div>
      )}

      <div className="card">
          <div className="flex flex-wrap gap-4 mb-4">
            <div>
              <label className="label">Property</label>
              <select
                className="input w-64 disabled:opacity-60 disabled:cursor-not-allowed"
                value={isTaxReturn ? '' : propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
                disabled={isTaxReturn}
              >
                {isTaxReturn
                  ? <option value="">Common — shared across all properties</option>
                  : <>
                      <option value="">✨ Auto-detect from document</option>
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>{p.address}</option>
                      ))}
                    </>
                }
              </select>
              {isTaxReturn
                ? <p className="text-xs text-blue-500 mt-1">Tax returns are linked to all properties via Schedule E addresses</p>
                : !propertyId && <p className="text-xs text-gray-400 mt-1">Matches the property address in the document, or creates a new property</p>
              }
            </div>
            <div>
              <label className="label">Document Type</label>
              <select className="input w-56" value={category} onChange={(e) => setCategory(e.target.value)}>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div
            onClick={() => inputRef.current?.click()}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); upload([...e.dataTransfer.files]) }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
              dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
            }`}
          >
            <Upload className="w-9 h-9 text-gray-300 mx-auto mb-3" />
            {uploading ? (
              <p className="text-sm text-blue-600 font-medium">Uploading…</p>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-700">Drop files here or click to browse</p>
                <p className="text-xs text-gray-400 mt-1">PDF, XLSX, XLS, CSV · Max 20 MB · Multiple files supported</p>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              accept=".pdf,.xlsx,.xls,.csv"
              onChange={(e) => { upload([...e.target.files]); e.target.value = '' }}
            />
          </div>
        </div>

      {/* All documents */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">All Documents ({docs.length})</h3>
          {docs.length > 0 && (
            <button
              onClick={handleReprocessAll}
              disabled={reprocessing}
              title="Re-extract and re-apply every file with the latest parser"
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${reprocessing ? 'animate-spin' : ''}`} />
              {reprocessing ? 'Reprocessing…' : 'Reprocess All'}
            </button>
          )}
        </div>
        {docs.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No documents uploaded yet</p>
        ) : (
          <div className="space-y-2">
            {docs.map((doc) => (
              <DocRow
                key={doc.id}
                doc={doc}
                onDelete={() => handleDelete(doc.id)}
                onApply={() => handleApply(doc.id)}
                onReparse={() => handleReparse(doc.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function DocRow({ doc, onDelete, onApply, onReparse }) {
  const [expanded, setExpanded] = useState(false)
  const [markdown, setMarkdown] = useState(null)
  const [showMarkdown, setShowMarkdown] = useState(false)
  const data = doc.extracted_data || {}
  const hasData = Object.keys(data).length > 0 && !data.parse_error
  const applicable = hasData && !data.raw_text_preview

  const toggleMarkdown = async () => {
    if (showMarkdown) { setShowMarkdown(false); return }
    if (markdown === null) {
      try {
        const { data: md } = await docAPI.markdown(doc.id)
        setMarkdown(md)
      } catch {
        toast.error('Markdown not available')
        return
      }
    }
    setShowMarkdown(true)
    setExpanded(false)
  }

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 p-3 hover:bg-gray-50">
        <FileText className="w-4 h-4 text-blue-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{doc.original_filename}</p>
          <p className="text-xs text-gray-400 flex items-center gap-1 flex-wrap">
            {doc.property_id
              ? <Link to={`/properties/${doc.property_id}`} className="hover:text-blue-600">{doc.property_address}</Link>
              : <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-medium text-[10px]">Common</span>
            }
            <span>· {catLabel(doc.doc_category)} · {fmtSize(doc.file_size)}</span>
          </p>
        </div>
        {hasData && (
          <button onClick={() => { setExpanded(!expanded); setShowMarkdown(false) }}
            className="text-xs text-blue-600 flex items-center gap-1 shrink-0">
            Extracted <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        )}
        {doc.has_markdown && (
          <button onClick={toggleMarkdown}
            className="text-xs text-purple-600 hover:text-purple-800 shrink-0">
            {showMarkdown ? 'Hide MD' : 'Markdown'}
          </button>
        )}
        <button onClick={onReparse} title="Re-extract with the latest parser"
          className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1 shrink-0">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        {applicable && (
          <button onClick={onApply} title="Apply extracted data to property/loan"
            className="text-xs text-green-600 hover:text-green-800 flex items-center gap-1 shrink-0">
            <Wand2 className="w-3.5 h-3.5" /> Apply
          </button>
        )}
        <button onClick={onDelete} className="text-red-400 hover:text-red-600 shrink-0">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {showMarkdown && markdown !== null && (
        <div className="bg-gray-900 border-t border-gray-100 px-4 py-3 overflow-auto max-h-80">
          <pre className="text-xs text-gray-100 whitespace-pre-wrap font-mono">{markdown}</pre>
        </div>
      )}

      {expanded && hasData && (
        <div className="bg-gray-50 border-t border-gray-100 px-3 py-2">
          <p className="text-xs font-medium text-gray-500 mb-1">Extracted Data</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            {Object.entries(data).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="text-gray-400 capitalize">{k.replace(/_/g, ' ')}</span>
                <span className="font-medium text-gray-700 truncate ml-2">
                  {typeof v === 'number' ? v.toLocaleString() : String(v)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
