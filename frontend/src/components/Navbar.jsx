import { useState, useRef, useEffect, useCallback } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Target,
  CalendarClock,
  Kanban,
  Sparkles,
  Plus,
  Briefcase,
  ChevronDown,
  Search,
  X,
  Bell,
  BellDot,
  BarChart3
} from 'lucide-react'
import { searchAll } from '../api'

const navItems = [
  { to: '/',          label: 'Dashboard',   icon: LayoutDashboard },
  { to: '/customers', label: 'Customers',   icon: Users },
  { to: '/leads',     label: 'Leads',       icon: Target },
  { to: '/followups', label: 'Follow-Ups',  icon: CalendarClock },
  { to: '/pipeline',  label: 'Pipeline',    icon: Kanban },
  { to: '/reports',   label: 'Reports',     icon: BarChart3 },
]

const ENTITY_PATHS = { customer: '/customers', lead: '/leads', followup: '/followups', deal: '/pipeline' }

export default function Navbar() {
  const [quickOpen, setQuickOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [searching, setSearching] = useState(false)
  const menuRef = useRef(null)
  const searchRef = useRef(null)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setQuickOpen(false)
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false); setQuery(''); setResults(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Keyboard shortcut: Ctrl+K / Cmd+K opens search
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
        setTimeout(() => inputRef.current?.focus(), 50)
      }
      if (e.key === 'Escape') { setSearchOpen(false); setQuery(''); setResults(null) }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.length < 2) { setResults(null); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await searchAll(query)
        setResults(res.data)
      } catch { setResults({ customers: [], leads: [], deals: [] }) }
      finally { setSearching(false) }
    }, 280)
    return () => clearTimeout(timer)
  }, [query])

  const openSearch = () => {
    setSearchOpen(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const goTo = (path) => {
    navigate(path)
    setSearchOpen(false); setQuery(''); setResults(null)
  }

  const totalResults = results
    ? (results.customers?.length || 0) + (results.leads?.length || 0) + (results.deals?.length || 0)
    : 0

  return (
    <header className="bg-slate-900/95 backdrop-blur-md border-b border-slate-800/90 text-white shadow-xl sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo & Nav */}
          <div className="flex items-center gap-6">
            <NavLink to="/" className="flex items-center gap-3 group shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 border border-indigo-400/30 group-hover:scale-105 transition-transform duration-200">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-black tracking-tight leading-none text-white">
                  Nexus<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-300">CRM</span>
                </span>
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">
                  Enterprise Suite
                </span>
              </div>
            </NavLink>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-150 flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                    }`
                  }
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          {/* Right: Search + Tools */}
          <div className="flex items-center gap-2">

            {/* Global Search */}
            <div className="relative" ref={searchRef}>
              <button
                onClick={openSearch}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-slate-200 text-xs font-medium rounded-xl border border-slate-700/60 transition-all duration-150 cursor-pointer"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search...</span>
                <kbd className="ml-1 px-1.5 py-0.5 bg-slate-700/70 rounded text-[10px] font-mono text-slate-500">⌘K</kbd>
              </button>

              {searchOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
                  <div className="flex items-center gap-2 px-3.5 py-3 border-b border-slate-100">
                    <Search className="w-4 h-4 text-slate-400 shrink-0" />
                    <input
                      ref={inputRef}
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                      placeholder="Search customers, leads, deals..."
                      className="flex-1 text-sm text-slate-800 placeholder-slate-400 outline-none bg-transparent"
                    />
                    {searching && <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin shrink-0" />}
                    {query && <button onClick={() => { setQuery(''); setResults(null) }} className="text-slate-400 hover:text-slate-600 cursor-pointer shrink-0"><X className="w-3.5 h-3.5" /></button>}
                  </div>

                  {!query && (
                    <div className="px-4 py-3 text-xs text-slate-400 text-center">Type to search across all records...</div>
                  )}

                  {results && totalResults === 0 && !searching && (
                    <div className="px-4 py-4 text-xs text-slate-400 text-center">No results for "{query}"</div>
                  )}

                  {results && totalResults > 0 && (
                    <div className="py-1.5 max-h-80 overflow-y-auto">
                      {results.customers?.length > 0 && (
                        <div>
                          <div className="px-3.5 pt-2 pb-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Customers</div>
                          {results.customers.map(c => (
                            <button key={c.id} onClick={() => goTo('/customers')} className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-50 transition-colors text-left cursor-pointer">
                              <div className="w-7 h-7 rounded-lg bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-700 shrink-0">
                                {c.name?.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <div className="text-xs font-semibold text-slate-800">{c.name}</div>
                                <div className="text-[10px] text-slate-500">{c.company || c.email}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {results.leads?.length > 0 && (
                        <div>
                          <div className="px-3.5 pt-2 pb-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Leads</div>
                          {results.leads.map(l => (
                            <button key={l.id} onClick={() => goTo('/leads')} className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-50 transition-colors text-left cursor-pointer">
                              <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                                <Target className="w-3.5 h-3.5 text-amber-600" />
                              </div>
                              <div>
                                <div className="text-xs font-semibold text-slate-800">{l.title}</div>
                                <div className="text-[10px] text-slate-500 capitalize">{l.status} · ${Number(l.value || 0).toLocaleString()}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      {results.deals?.length > 0 && (
                        <div>
                          <div className="px-3.5 pt-2 pb-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Deals</div>
                          {results.deals.map(d => (
                            <button key={d.id} onClick={() => goTo('/pipeline')} className="w-full flex items-center gap-2.5 px-3.5 py-2 hover:bg-slate-50 transition-colors text-left cursor-pointer">
                              <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                                <Briefcase className="w-3.5 h-3.5 text-emerald-600" />
                              </div>
                              <div>
                                <div className="text-xs font-semibold text-slate-800">{d.title}</div>
                                <div className="text-[10px] text-slate-500 capitalize">{d.stage} · ${Number(d.value || 0).toLocaleString()}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Quick Create */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setQuickOpen(!quickOpen)}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-150 ${quickOpen ? 'rotate-180' : ''}`} />
              </button>

              {quickOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 text-slate-800 z-50 animate-scaleIn">
                  <div className="px-3 py-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Quick Workflows</div>
                  <Link to="/pipeline" onClick={() => setQuickOpen(false)} className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors text-slate-700 hover:text-indigo-600">
                    <Briefcase className="w-4 h-4 text-indigo-500" /><span>New Pipeline Deal</span>
                  </Link>
                  <Link to="/leads" onClick={() => setQuickOpen(false)} className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors text-slate-700 hover:text-indigo-600">
                    <Target className="w-4 h-4 text-amber-500" /><span>New Prospect Lead</span>
                  </Link>
                  <Link to="/followups" onClick={() => setQuickOpen(false)} className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors text-slate-700 hover:text-indigo-600">
                    <CalendarClock className="w-4 h-4 text-purple-500" /><span>Schedule Follow-Up</span>
                  </Link>
                  <Link to="/customers" onClick={() => setQuickOpen(false)} className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors text-slate-700 hover:text-indigo-600">
                    <Users className="w-4 h-4 text-emerald-500" /><span>Register Customer</span>
                  </Link>
                </div>
              )}
            </div>

            {/* Live Status */}
            <div className="hidden sm:flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700/60 text-xs font-medium text-slate-300 shadow-inner">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span className="text-[11px] font-semibold tracking-wide text-slate-200">Live</span>
            </div>

            {/* User Pill */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-sm ring-2 ring-slate-800">
                SK
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-bold text-slate-200 leading-tight">Shyam K.</div>
                <div className="text-[10px] text-indigo-400 font-medium">Sales Director</div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden flex items-center gap-1 overflow-x-auto py-2.5 border-t border-slate-800/80 scrollbar-none">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                  isActive ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800'
                }`
              }
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </NavLink>
          ))}
          <button onClick={openSearch} className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 text-slate-300 hover:bg-slate-800 transition-colors whitespace-nowrap">
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>
        </div>
      </div>
    </header>
  )
}
