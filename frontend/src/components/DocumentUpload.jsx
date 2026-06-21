import { useState, useRef } from 'react'
import { docAPI } from '../services/api'
import { Upload, FileText, Trash2, ChevronDown, Wand2, CheckSquare, Square } from 'lucide-react'
import toast from 'react-hot-toast'

const CATEGORIES = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'mortgage_statement', label: 'Mortgage Statement' },
  { value: 'tax_return', label: 'Tax Return' },
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

export default function DocumentUpload({ propertyId, docs, onUploaded }) {
  const [category, setCategory] = useState('auto')
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [selected, setSelected] = useState(new Set())
  const [deleting, setDeleting] = useState(false)
  const inputRef = useRef()

  const upload = async (file) => {
    const fd = new FormData()
    fd.append('property_id', propertyId)
    fd.append('category', category)
    fd.append('file', file)
    setUploading(true)
    try {
      const { data } = await docAPI.upload(fd)
      toast.success(`Uploaded: ${data.original_filename}`)
      onUploaded()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleFiles = (files) => {
    if (files.length) upload(files[0])
  }

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === docs.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(docs.map((d) => d.id)))
    }
  }

  const handleBatchDelete = async () => {
    if (selected.size === 0) return
    if (!confirm(`Delete ${selected.size} document(s)?`)) return
    setDeleting(true)
    try {
      const { data } = await docAPI.deleteBatch([...selected])
      toast.success(`Deleted ${data.count} document(s)`)
      setSelected(new Set())
      onUploaded()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  const handleDelete = async (docId) => {
    if (!confirm('Delete this document?')) return
    await docAPI.delete(docId)
    toast.success('Deleted')
    onUploaded()
  }

  const handleApply = async (docId) => {
    try {
      const { data } = await docAPI.apply(docId)
      if (Object.keys(data.applied).length) {
        toast.success(data.message)
        onUploaded()
      } else {
        toast(data.message, { icon: 'ℹ️' })
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Apply failed')
    }
  }

  const catLabel = (val) => CATEGORIES.find((c) => c.value === val)?.label || val

  return (
    <div className="space-y-4">
      {/* Upload zone */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Upload Documents</h3>
        <div className="flex flex-wrap gap-4 mb-4">
          <div>
            <label className="label">Document Type</label>
            <select className="input w-52" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div
          onClick={() => inputRef.current?.click()}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
          }`}
        >
          <Upload className="w-8 h-8 text-gray-300 mx-auto mb-3" />
          {uploading ? (
            <p className="text-sm text-blue-600 font-medium">Uploading…</p>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-700">Drop file here or click to browse</p>
              <p className="text-xs text-gray-400 mt-1">PDF, XLSX, XLS, CSV · Max 20 MB</p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.xlsx,.xls,.csv"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      </div>

      {/* Document list */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Documents ({docs.length})</h3>
          {selected.size > 0 && (
            <button onClick={handleBatchDelete} disabled={deleting}
              className="btn-danger flex items-center gap-1.5 text-xs px-3 py-1.5">
              <Trash2 className="w-3 h-3" />
              {deleting ? 'Deleting…' : `Delete ${selected.size}`}
            </button>
          )}
        </div>
        {docs.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">No documents uploaded yet</p>
        ) : (
          <div className="space-y-2">
            {docs.length > 1 && (
              <button onClick={toggleAll} className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 mb-1">
                {selected.size === docs.length ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                {selected.size === docs.length ? 'Deselect all' : 'Select all'}
              </button>
            )}
            {docs.map((doc) => (
              <DocRow key={doc.id} doc={doc} catLabel={catLabel}
                selected={selected.has(doc.id)}
                onToggle={() => toggleSelect(doc.id)}
                onDelete={() => handleDelete(doc.id)}
                onApply={() => handleApply(doc.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function DocRow({ doc, catLabel, selected, onToggle, onDelete, onApply }) {
  const [expanded, setExpanded] = useState(false)
  const data = doc.extracted_data || {}
  const hasData = Object.keys(data).length > 0
  const applicable = hasData && !data.parse_error && !data.raw_text_preview

  return (
    <div className={`border rounded-lg overflow-hidden ${selected ? 'border-blue-300 bg-blue-50' : 'border-gray-100'}`}>
      <div className="flex items-center gap-2 p-3 hover:bg-gray-50">
        <button onClick={onToggle} className="shrink-0 text-gray-400 hover:text-blue-600">
          {selected ? <CheckSquare className="w-4 h-4 text-blue-600" /> : <Square className="w-4 h-4" />}
        </button>
        <FileText className="w-4 h-4 text-blue-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{doc.original_filename}</p>
          <p className="text-xs text-gray-400">{catLabel(doc.doc_category)} · {fmtSize(doc.file_size)}</p>
        </div>
        {hasData && (
          <button onClick={() => setExpanded(!expanded)}
            className="text-xs text-blue-600 flex items-center gap-1 shrink-0">
            Extracted <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        )}
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

      {expanded && hasData && (
        <div className="bg-gray-50 border-t border-gray-100 px-3 py-2">
          <p className="text-xs font-medium text-gray-500 mb-1">Extracted Data</p>
          {doc.period_type && doc.period_type !== 'other' && (
            <p className="text-[10px] text-gray-400 mb-1.5">
              {doc.period_type} · {doc.period_start} → {doc.period_end || 'N/A'}
            </p>
          )}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            {Object.entries(doc.extracted_data).filter(([k]) => !['period_type', 'period_start', 'period_end', 'raw_text_preview'].includes(k)).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="text-gray-400 capitalize">{k.replace(/_/g, ' ')}</span>
                <span className="font-medium text-gray-700">{typeof v === 'number' ? v.toLocaleString() : String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
