import { NavLink, Outlet } from 'react-router-dom'
import { Settings, MapPin, BarChart3 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function AdminLayout() {
  const { t } = useTranslation()

  const tabClase = ({ isActive }) => [
    'flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200',
    isActive
      ? 'bg-brand-500 text-white shadow-md'
      : 'text-soft hover:bg-surface-alt hover:text-main',
  ].join(' ')

  return (
    <div className="bg-app min-h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-4rem)]">
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6 animate-fade-in">
          <Settings size={26} className="text-brand-600" />
          <h1 className="font-display text-2xl md:text-3xl font-bold text-main">
            {t('admin.titulo')}
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 pb-4 border-b border-theme">
          <NavLink to="/admin/puntos" className={tabClase}>
            <MapPin size={16} />
            {t('admin.puntos')}
          </NavLink>
          <NavLink to="/admin/dashboard" className={tabClase}>
            <BarChart3 size={16} />
            {t('admin.dashboard')}
          </NavLink>
        </div>

        <Outlet />
      </div>
    </div>
  )
}
