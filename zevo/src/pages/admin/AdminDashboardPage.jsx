import { Card, CardBody } from '../../components/ui/Card'

// Dashboard Super Admin — Phase 9 (à développer)
export default function AdminDashboardPage() {
  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-[#F5F5F3] text-2xl font-bold">Super Admin</h1>
        <p className="text-white/40 text-sm mt-0.5">Vue globale de la plateforme Zevo</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {['MRR total', 'Coachs actifs', 'Clients total', 'Nouveaux ce mois'].map((label) => (
          <Card key={label}>
            <CardBody>
              <p className="text-white/40 text-xs">{label}</p>
              <p className="text-[#F5F5F3] text-2xl font-bold mt-1">—</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="text-center text-white/20 text-sm">
        Module à développer — Phase 9
      </div>
    </div>
  )
}
