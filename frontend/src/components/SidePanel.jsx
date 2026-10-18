import { useEffect } from 'react'
import { X } from 'lucide-react'

/**
 * SidePanel — fixed right-side drawer.
 * Props:
 *   open       {boolean}
 *   onClose    {function}
 *   title      {string}
 *   subtitle   {string}  optional
 *   children   {ReactNode}
 */
export default function SidePanel({ open, onClose, title, subtitle, children }) {
  // Close on Escape key
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape' && open) onClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-slate-900/50 transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`fixed top-0 right-0 z-50 h-full w-full sm:w-96 bg-white shadow-2xl border-l border-slate-200 flex flex-col transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60 shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            aria-label="Close panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>
      </div>
    </>
  )
}
