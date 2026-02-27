"use client";

import { useState, useEffect } from "react";
import { clockIn, clockOut, getTodayAttendance } from "@/actions/attendance.actions";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, Loader2, MapPin, MapPinOff, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  employeeId: string;
  orgSlug:    string;
};

type TodayRecord = {
  id:       string;
  checkIn:  Date | null;
  checkOut: Date | null;
  status:   string;
  workHours: number | null;
} | null;

export function AttendanceClockCard({ employeeId, orgSlug }: Props) {
  const [record,   setRecord]   = useState<TodayRecord>(null);
  const [loading,  setLoading]  = useState(true);
  const [acting,   setActing]   = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");
  const [time,     setTime]     = useState(new Date());
  const [geoStatus, setGeoStatus] = useState<"idle" | "granted" | "denied">("idle");

  // Live clock
  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Load today's record
  useEffect(() => {
    getTodayAttendance(employeeId).then((r) => {
      setRecord(r as TodayRecord);
      setLoading(false);
    });
  }, [employeeId]);

  // Check geolocation permission
  useEffect(() => {
    if ("permissions" in navigator) {
      navigator.permissions.query({ name: "geolocation" }).then((result) => {
        setGeoStatus(result.state === "granted" ? "granted" : result.state === "denied" ? "denied" : "idle");
      });
    }
  }, []);

  async function getLocation(): Promise<{ lat: number; lng: number; accuracy: number } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
        ()    => resolve(null),
        { timeout: 8000 }
      );
    });
  }

  async function handleClockIn() {
    setActing(true);
    setError("");
    setSuccess("");

    const location = await getLocation();
    const result   = await clockIn({
      employeeId,
      lat:      location?.lat,
      lng:      location?.lng,
      accuracy: location?.accuracy,
    });

    if (!result.success) {
      setError(result.error);
    } else {
      setRecord(result.data as TodayRecord);
      setSuccess("Clocked in successfully!");
    }
    setActing(false);
  }

  async function handleClockOut() {
    setActing(true);
    setError("");
    setSuccess("");

    const location = await getLocation();
    const result   = await clockOut({
      employeeId,
      lat: location?.lat,
      lng: location?.lng,
    });

    if (!result.success) {
      setError(result.error);
    } else {
      setRecord(result.data as TodayRecord);
      setSuccess("Clocked out successfully!");
    }
    setActing(false);
  }

  const isClockedIn  = !!record?.checkIn  && !record?.checkOut;
  const isClockedOut = !!record?.checkOut;
  const isNotStarted = !record?.checkIn;

  const statusColor = isClockedIn
    ? "bg-green-50 border-green-200"
    : isClockedOut
    ? "bg-slate-50 border-slate-200"
    : "bg-white border-slate-200";

  return (
    <div className={cn("rounded-xl border p-5 transition-colors", statusColor)}>
      {/* Live time */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-slate-500">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-medium">Today&apos;s Attendance</span>
        </div>
        {geoStatus === "granted" ? (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <MapPin className="w-3 h-3" /> GPS On
          </span>
        ) : geoStatus === "denied" ? (
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <MapPinOff className="w-3 h-3" /> No GPS
          </span>
        ) : null}
      </div>

      {/* Clock display */}
      <div className="text-center py-4">
        <div className="text-4xl font-bold text-slate-900 tabular-nums tracking-tight">
          {time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </div>
        <div className="text-sm text-slate-400 mt-1">
          {time.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </div>
      </div>

      {/* Status */}
      {loading ? (
        <div className="flex justify-center py-3">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="space-y-3">
          {/* Check-in / out times */}
          {record?.checkIn && (
            <div className="flex justify-between text-sm px-1">
              <span className="text-slate-500">Clock In</span>
              <span className="font-medium text-slate-800">
                {new Date(record.checkIn).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          )}
          {record?.checkOut && (
            <div className="flex justify-between text-sm px-1">
              <span className="text-slate-500">Clock Out</span>
              <span className="font-medium text-slate-800">
                {new Date(record.checkOut).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          )}
          {record?.workHours && (
            <div className="flex justify-between text-sm px-1">
              <span className="text-slate-500">Hours Worked</span>
              <span className="font-semibold text-slate-800">{Number(record.workHours).toFixed(1)}h</span>
            </div>
          )}

          {/* Status badge */}
          {record?.status && (
            <div className="flex justify-between text-sm px-1">
              <span className="text-slate-500">Status</span>
              <span className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full border",
                record.status === "PRESENT" ? "bg-green-50 text-green-700 border-green-200" :
                record.status === "LATE"    ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                "bg-slate-50 text-slate-600 border-slate-200"
              )}>
                {record.status.charAt(0) + record.status.slice(1).toLowerCase()}
              </span>
            </div>
          )}

          {/* Action button */}
          {!isClockedOut && (
            <Button
              onClick={isNotStarted ? handleClockIn : handleClockOut}
              disabled={acting}
              className={cn(
                "w-full h-10 font-medium mt-2",
                isNotStarted
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-slate-800 hover:bg-slate-900 text-white"
              )}
            >
              {acting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isNotStarted ? (
                <><LogIn className="w-4 h-4 mr-2" /> Clock In</>
              ) : (
                <><LogOut className="w-4 h-4 mr-2" /> Clock Out</>
              )}
            </Button>
          )}

          {isClockedOut && (
            <div className="text-center text-sm text-slate-500 py-2">
              ✓ Shift complete for today
            </div>
          )}

          {error   && <p className="text-xs text-red-600 text-center">{error}</p>}
          {success && <p className="text-xs text-green-600 text-center">{success}</p>}
        </div>
      )}
    </div>
  );
}
