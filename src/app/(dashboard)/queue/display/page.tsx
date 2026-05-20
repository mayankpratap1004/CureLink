"use client";

import { useEffect, useState } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useRealtimeQueue } from "@/hooks/use-realtime-queue";
import { Stethoscope, Clock, Users, Wifi } from "lucide-react";

export default function QueueDisplayPage() {
  const { user } = useCurrentUser();
  const [time, setTime] = useState(new Date());

  const { currentToken, waiting, stats, loading } = useRealtimeQueue(
    user?.tenant_id ?? "",
  );

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const nextTokens = waiting.slice(0, 5);

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-400 rounded-xl flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-slate-900" />
          </div>
          <div>
            <p className="font-bold text-lg text-white">CureLink</p>
            <p className="text-xs text-slate-400">Queue Display</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-xs font-medium">Live</span>
          </div>

          <div className="text-right">
            <p
              className="text-2xl font-bold font-mono"
              suppressHydrationWarning
            >
              {time.toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </p>
            <p className="text-xs text-slate-400" suppressHydrationWarning>
              {time.toLocaleDateString("en-IN", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0">
        {/* Now serving — big display */}
        <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-16 border-b lg:border-b-0 lg:border-r border-slate-800">
          <p className="text-slate-400 text-sm font-semibold uppercase tracking-widest mb-6">
            Now Serving
          </p>

          {loading ? (
            <div className="text-slate-600 text-lg">Loading...</div>
          ) : currentToken ? (
            <div className="text-center">
              <div className="w-48 h-48 lg:w-64 lg:h-64 rounded-3xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-cyan-900/50">
                <span className="text-7xl lg:text-9xl font-black">
                  {currentToken.token_number}
                </span>
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2">
                {currentToken.patient_name}
              </h2>
              <p className="text-slate-400 text-lg">
                {currentToken.doctor_name}
              </p>
              {currentToken.priority >= 999 && (
                <span className="inline-block mt-3 bg-red-500/20 text-red-400 border border-red-500/30 px-4 py-1.5 rounded-full text-sm font-bold">
                  ⚡ EMERGENCY
                </span>
              )}
            </div>
          ) : (
            <div className="text-center">
              <div className="w-48 h-48 rounded-3xl bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-6">
                <span className="text-slate-600 text-8xl font-black">—</span>
              </div>
              <p className="text-slate-400 text-xl">
                No patient in consultation
              </p>
            </div>
          )}
        </div>

        {/* Next tokens */}
        <div className="w-full lg:w-80 xl:w-96 p-6 lg:p-8 flex flex-col">
          <div className="flex items-center justify-between mb-5">
            <p className="text-slate-400 text-sm font-semibold uppercase tracking-widest">
              Up Next
            </p>
            <div className="flex items-center gap-1.5 text-slate-400 text-xs">
              <Users className="w-3.5 h-3.5" />
              {stats.waiting} waiting
            </div>
          </div>

          {nextTokens.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-slate-600 text-sm">No patients waiting</p>
            </div>
          ) : (
            <div className="space-y-3">
              {nextTokens.map((entry, index) => (
                <div
                  key={entry.id}
                  className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                    index === 0
                      ? "bg-cyan-500/10 border-cyan-500/30"
                      : "bg-slate-800/50 border-slate-700/50"
                  }`}
                >
                  <div
                    className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      index === 0 ? "bg-cyan-500/20" : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`text-2xl font-black ${
                        index === 0 ? "text-cyan-400" : "text-slate-300"
                      }`}
                    >
                      {entry.token_number}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-bold truncate ${
                        index === 0 ? "text-white" : "text-slate-300"
                      }`}
                    >
                      {entry.patient_name}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {entry.slot_start
                        ? `Slot: ${entry.slot_start.slice(0, 5)}`
                        : "Walk-in"}
                    </p>
                  </div>
                  {index === 0 && (
                    <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-lg font-semibold flex-shrink-0">
                      Next
                    </span>
                  )}
                  {entry.priority >= 999 && (
                    <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-lg font-bold flex-shrink-0">
                      ⚡
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Stats footer */}
          <div className="mt-auto pt-6 border-t border-slate-800 grid grid-cols-3 gap-3">
            {[
              { label: "Total", value: stats.total, color: "text-slate-300" },
              {
                label: "Waiting",
                value: stats.waiting,
                color: "text-amber-400",
              },
              {
                label: "Done",
                value: stats.completed,
                color: "text-emerald-400",
              },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 py-3 border-t border-slate-800 flex items-center justify-between">
        <p className="text-xs text-slate-600">Powered by CureLink</p>
        <div className="flex items-center gap-1.5 text-slate-600 text-xs">
          <Wifi className="w-3 h-3" /> Auto-updating
        </div>
      </div>
    </div>
  );
}
