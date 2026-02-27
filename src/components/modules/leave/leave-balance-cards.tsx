type Balance = {
  id:         string;
  allocated:  any;
  used:       any;
  pending:    any;
  carried:    any;
  leaveType:  { name: string; color: string | null; category: string };
};

export function LeaveBalanceCards({ balances }: { balances: Balance[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
      {balances.map((balance) => {
        const allocated = Number(balance.allocated) + Number(balance.carried);
        const used      = Number(balance.used);
        const pending   = Number(balance.pending);
        const available = allocated - used - pending;
        const pct       = allocated > 0 ? Math.round((used / allocated) * 100) : 0;

        return (
          <div
            key={balance.id}
            className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: balance.leaveType.color ?? "#94a3b8" }}
              />
              <p className="text-xs font-medium text-slate-700 truncate">{balance.leaveType.name}</p>
            </div>

            <div className="text-2xl font-bold text-slate-900 mb-0.5">{available}</div>
            <div className="text-xs text-slate-400 mb-3">of {allocated} days left</div>

            {/* Progress bar */}
            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(pct, 100)}%`,
                  backgroundColor: balance.leaveType.color ?? "#94a3b8",
                }}
              />
            </div>

            {pending > 0 && (
              <p className="text-[10px] text-yellow-600 mt-1.5">{pending} day{pending !== 1 ? "s" : ""} pending</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
