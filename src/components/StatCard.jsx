export default function StatCard({ title, value, icon: Icon, trend, color = "brand" }) {
  return (
    <div className="glass rounded-2xl p-5 flex flex-col gap-3 glow">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-widest">{title}</span>
        {Icon && (
          <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center">
            <Icon className="w-4 h-4 text-brand" />
          </div>
        )}
      </div>
      <div className="text-3xl font-semibold tracking-tight text-zinc-100">{value ?? "—"}</div>
      {trend && (
        <div className="text-xs text-zinc-500">{trend}</div>
      )}
    </div>
  );
}
