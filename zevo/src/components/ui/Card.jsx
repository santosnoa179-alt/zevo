// Card réutilisable — surface sombre avec bordure subtile
export function Card({ children, className = '', ...props }) {
  return (
    <div
      className={`bg-[#1E1E1E] border border-white/[0.08] rounded-xl ${className}`}
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
