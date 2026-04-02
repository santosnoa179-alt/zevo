// Card réutilisable — surface avec bordure subtile (theme-aware)
export function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`bg-[var(--bg-card)] border border-[var(--border-base)] rounded-xl ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

// Variante avec padding
export function CardBody({ children, className = '' }) {
  return <div className={`p-4 ${className}`}>{children}</div>
}
