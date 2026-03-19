import { useNavigate } from 'react-router-dom'
import { Button } from '../../components/ui/Button'

// Page 404
export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-[#FF6B2B] text-7xl font-bold mb-4">404</p>
        <h2 className="text-[#F5F5F3] text-2xl font-semibold mb-2">Page introuvable</h2>
        <p className="text-white/40 text-sm mb-8">Cette page n'existe pas ou a été déplacée.</p>
        <Button onClick={() => navigate(-1)}>← Retour</Button>
      </div>
    </div>
  )
}
