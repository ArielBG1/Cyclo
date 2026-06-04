// Botón reutilizable. Variantes: primary | secondary | ghost
export default function Button({ variant = 'primary', className = '', children, ...props }) {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary:   'bg-brand-500 hover:bg-brand-400 text-white shadow-sm',
    secondary: 'border-2 border-brand-500 text-brand-600 hover:bg-brand-100',
    ghost:     'text-brand-600 hover:bg-brand-100 hover:text-brand-700',
  }

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}
