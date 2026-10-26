import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom'
import Navbar from './components/Navbar'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Leads from './pages/Leads'
import Followups from './pages/Followups'
import Pipeline from './pages/Pipeline'
import Reports from './pages/Reports'
import { Sparkles, Shield, Cpu, ExternalLink } from 'lucide-react'

function App() {
  return (
    <Router basename={import.meta.env.BASE_URL}>
      <div className="min-h-screen bg-slate-50/70 flex flex-col font-sans text-slate-800 relative selection:bg-indigo-500 selection:text-white">
        {/* Subtle Ambient Background Gradient Lighting */}
        <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-gradient-to-b from-indigo-100/60 via-purple-50/30 to-transparent blur-3xl rounded-full" />
        </div>

        <Navbar />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/leads" element={<Leads />} />
            <Route path="/followups" element={<Followups />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* Executive Enterprise Footer */}
        <footer className="border-t border-slate-200/80 bg-white/70 backdrop-blur-sm py-6 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold text-[10px]">
                N
              </div>
              <span className="font-bold text-slate-700">NexusCRM Enterprise Platform</span>
              <span className="text-slate-300">|</span>
              <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Operational
              </span>
            </div>

            <div className="flex items-center gap-6 text-slate-500">
              <span className="flex items-center gap-1 font-mono text-[11px]">
                <Cpu className="w-3.5 h-3.5 text-slate-400" />
                Engine: SQLite + Express
              </span>
              <span className="text-slate-400">© 2026 Nexus Systems Inc.</span>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  )
}

export default App
