import { useState } from "react";
import { getAnalytics } from "../services/api";
import { useFetch } from "../hooks/useFetch";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorState from "../components/ErrorState";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";

const FAKE_DATA = {
  daily_calls: [
    { date: "Mon", calls: 12 }, { date: "Tue", calls: 18 }, { date: "Wed", calls: 9 },
    { date: "Thu", calls: 22 }, { date: "Fri", calls: 15 }, { date: "Sat", calls: 7 }, { date: "Sun", calls: 4 },
  ],
  appointments_booked: [
    { date: "Mon", appointments: 3 }, { date: "Tue", appointments: 6 }, { date: "Wed", appointments: 2 },
    { date: "Thu", appointments: 8 }, { date: "Fri", appointments: 5 }, { date: "Sat", appointments: 2 }, { date: "Sun", appointments: 1 },
  ],
  total_calls: 87,
  total_appointments: 27,
  missed_calls: 11,
  avg_duration: 134,
};

const TOOLTIP_STYLE = {
  backgroundColor: "#18181b",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "12px",
  color: "#e4e4e7",
  fontSize: "12px",
};

export default function Analytics() {
  const [days, setDays] = useState(7);
  const { data, loading, error } = useFetch(() => getAnalytics(days), [days]);

  const analytics = data || FAKE_DATA;
  const dailyCalls = analytics.daily_calls || FAKE_DATA.daily_calls;
  const apptData = analytics.appointments_booked || FAKE_DATA.appointments_booked;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Analytics</h1>
          <p className="text-sm text-zinc-500 mt-1">Performance overview for your AI receptionist.</p>
        </div>
        <div className="flex gap-2">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-2 rounded-xl text-sm transition-all ${
                days === d ? "bg-brand text-zinc-900 font-semibold" : "glass text-zinc-400 hover:text-zinc-100"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? <LoadingSpinner /> : error ? <ErrorState message={error} /> : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Calls", value: analytics.total_calls ?? FAKE_DATA.total_calls },
              { label: "Appointments", value: analytics.total_appointments ?? FAKE_DATA.total_appointments },
              { label: "Missed Calls", value: analytics.missed_calls ?? FAKE_DATA.missed_calls },
              { label: "Avg Duration", value: `${Math.round((analytics.avg_duration ?? FAKE_DATA.avg_duration) / 60)}m` },
            ].map(({ label, value }) => (
              <div key={label} className="glass rounded-2xl p-5">
                <div className="text-xs text-zinc-500 uppercase tracking-widest mb-2">{label}</div>
                <div className="text-3xl font-semibold text-zinc-100">{value}</div>
              </div>
            ))}
          </div>

          <div className="glass rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4">Daily Calls</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyCalls}>
                <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
                <Bar dataKey="calls" fill="#6ee7b7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="glass rounded-2xl p-5">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4">Appointments Booked</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={apptData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="appointments" stroke="#6ee7b7" strokeWidth={2} dot={{ fill: "#6ee7b7", r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
