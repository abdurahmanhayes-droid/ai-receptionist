import { Phone, Calendar, TrendingUp, Clock } from "lucide-react";
import { getAppointments, getCalls } from "../services/api";
import { useFetch } from "../hooks/useFetch";
import StatCard from "../components/StatCard";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorState from "../components/ErrorState";
import { formatDate, formatTime, formatDuration } from "../utils/formatters";

const FAKE_CALLS = [
  { id: 1, caller_number: "+1 (555) 012-3456", duration: 142, status: "completed", created_at: new Date().toISOString() },
  { id: 2, caller_number: "+1 (555) 987-6543", duration: 87, status: "completed", created_at: new Date().toISOString() },
  { id: 3, caller_number: "+1 (555) 456-7890", duration: 0, status: "missed", created_at: new Date().toISOString() },
];

const FAKE_APPTS = [
  { id: 1, customer_name: "James Rivera", service: "Oil Change", appointment_time: new Date().toISOString() },
  { id: 2, customer_name: "Sarah Kim", service: "Brake Inspection", appointment_time: new Date().toISOString() },
];

export default function Dashboard() {
  const { data: callsData, loading: callsLoading, error: callsError } = useFetch(getCalls, []);
  const { data: apptData, loading: apptLoading, error: apptError } = useFetch(getAppointments, []);

  const calls = callsData?.calls || callsData || FAKE_CALLS;
  const appointments = apptData?.appointments || apptData || FAKE_APPTS;

  const totalCalls = calls.length;
  const missedCalls = calls.filter(c => c.status === "missed").length;
  const avgDuration = calls.length
    ? Math.round(calls.reduce((a, c) => a + (c.duration || 0), 0) / calls.length)
    : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-100">Dashboard</h1>
        <p className="text-sm text-zinc-500 mt-1">Welcome back. Here's what's happening.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Calls" value={totalCalls} icon={Phone} trend="Today" />
        <StatCard title="Appointments" value={appointments.length} icon={Calendar} trend="Upcoming" />
        <StatCard title="Missed Calls" value={missedCalls} icon={TrendingUp} trend="Today" />
        <StatCard title="Avg Duration" value={formatDuration(avgDuration)} icon={Clock} trend="Per call" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">Recent Calls</h2>
          {callsLoading ? <LoadingSpinner /> : callsError ? <ErrorState message={callsError} /> : (
            <div className="flex flex-col gap-2">
              {calls.slice(0, 5).map((call) => (
                <div key={call.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <div className="text-sm text-zinc-200">{call.caller_number || "Unknown"}</div>
                    <div className="text-xs text-zinc-500">{formatTime(call.created_at)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-400">{formatDuration(call.duration)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      call.status === "completed" ? "bg-brand/10 text-brand" : "bg-red-500/10 text-red-400"
                    }`}>
                      {call.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-zinc-300 mb-4">Upcoming Appointments</h2>
          {apptLoading ? <LoadingSpinner /> : apptError ? <ErrorState message={apptError} /> : (
            <div className="flex flex-col gap-2">
              {appointments.slice(0, 5).map((appt) => (
                <div key={appt.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <div className="text-sm text-zinc-200">{appt.customer_name || "Customer"}</div>
                    <div className="text-xs text-zinc-500">{appt.service || "Service"}</div>
                  </div>
                  <div className="text-xs text-zinc-400">{formatDate(appt.appointment_time)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
