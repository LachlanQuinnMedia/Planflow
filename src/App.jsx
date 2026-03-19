import { useState } from 'react'
import Dashboard from './Dashboard'
import Jobs from './Jobs'
import NewJob from './NewJob'
import JobDetail from './JobDetail'
const navItems = [
  { id: 'dashboard', label: 'Dashboard', section: 'main' },
  { id: 'jobs', label: 'Jobs', section: 'main', badge: '18' },
  { id: 'newjob', label: 'New Job', section: 'main' },
  { id: 'docs', label: 'Documents', section: 'tools' },
  { id: 'time', label: 'Time & Budget', section: 'tools' },
  { id: 'calendly', label: 'Bookings', section: 'tools', badge: '7' },
  { id: 'workload', label: 'Workloads', section: 'tools' },
  { id: 'templates', label: 'Templates', section: 'settings' },
  { id: 'planners', label: 'Planners', section: 'settings' },
]
const pageTitles = {
  dashboard: 'Dashboard',
  jobs: 'All Jobs',
  newjob: 'New Job',
  docs: 'Documents',
  time: 'Time & Budget',
  calendly: 'Bookings',
  workload: 'Team Workloads',
  templates: 'Templates',
  planners: 'Planners',
}
export default function App() {
  const [activePage, setActivePage] = useState('dashboard')
  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard onNavigate={setActivePage} />
      case 'jobs': return <Jobs onNavigate={setActivePage} />
      case 'newjob': return <NewJob onNavigate={setActivePage} />
      case 'jobdetail': return <JobDetail onNavigate={setActivePage} />
      default: return (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-400">This page is coming soon.</p>
        </div>
      )
    }
  }
  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <div className="w-52 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200">
          <div className="w-7 h-7 bg-emerald-600 rounded-md flex items-center justify-center text-white text-xs font-semibold">PF</div>
          <span className="text-sm font-semibold">PlanFlow</span>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {['main', 'tools', 'settings'].map(section => (
            <div key={section} className="px-2 mb-2">
              <div className="text-xs text-gray-400 uppercase tracking-wider px-2 py-1">{section}</div>
              {navItems.filter(i => i.section === section).map(item => (
                <button
                  key={item.id}
                  onClick={() => setActivePage(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm mb-0.5 transition-colors ${activePage === item.id ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'}`}
                >
                  {item.label}
                  {item.badge && (
                    <span className="bg-emerald-600 text-white text-xs px-1.5 py-0.5 rounded-full">{item.badge}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-gray-200">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-100 cursor-pointer">
            <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-medium text-emerald-700">SB</div>
            <div>
              <div className="text-xs font-medium">Sarah Barnes</div>
              <div className="text-xs text-gray-400">Principal Planner</div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="h-12 bg-white border-b border-gray-200 flex items-center px-5 gap-3">
          <div className="flex-1 text-sm font-medium">{pageTitles[activePage]}</div>
          <button onClick={() => setActivePage('calendly')} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-gray-50">Book</button>
          <button onClick={() => setActivePage('newjob')} className="px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">+ New Job</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {renderPage()}
        </div>
      </div>
    </div>
  )
}