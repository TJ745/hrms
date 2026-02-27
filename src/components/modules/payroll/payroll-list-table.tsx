"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { processPayroll } from "@/actions/payroll.actions";
import { Button } from "@/components/ui/button";
import { Eye, Play, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-slate-50 text-slate-600 border-slate-200",
  PENDING: "bg-yellow-50 text-yellow-700 border-yellow-200",
  APPROVED: "bg-blue-50 text-blue-700 border-blue-200",
  PAID: "bg-green-50 text-green-700 border-green-200",
  CANCELLED: "bg-red-50 text-red-600 border-red-200",
};

type Payroll = {
  id: string;
  month: number;
  year: number;
  status: string;
  currency: string;
  processedAt: Date | null;
  branch: { name: string } | null;
  _count: { payrollItems: number };
  payrollItems: { netSalary: any; grossSalary: any }[];
};

export function PayrollListTable({
  payrolls,
  orgSlug,
  organizationId,
}: {
  payrolls: Payroll[];
  orgSlug: string;
  organizationId: string;
}) {
  const router = useRouter();
  const [acting, setActing] = useState<string | null>(null);

  async function handleProcess(id: string) {
    if (!confirm("Mark this payroll as PAID? This will notify all employees."))
      return;
    setActing(id);
    const result = await processPayroll(id, organizationId);
    setActing(null);
    if (result.success) router.refresh();
    else alert(result.error);
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Period
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Branch
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Employees
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Gross
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Net Paid
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Status
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Processed
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {payrolls.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="text-center py-16 text-slate-400 text-sm"
                >
                  No payroll runs yet. Click &quot;Process Payroll&quot; to get
                  started.
                </td>
              </tr>
            ) : (
              payrolls.map((p) => {
                const gross = p.payrollItems.reduce(
                  (s, i) => s + Number(i.grossSalary),
                  0,
                );
                const net = p.payrollItems.reduce(
                  (s, i) => s + Number(i.netSalary),
                  0,
                );
                return (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {MONTHS[p.month - 1]} {p.year}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {p.branch?.name ?? "All Branches"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {p._count.payrollItems}
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-medium tabular-nums">
                      {formatCurrency(gross, p.currency)}
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-semibold tabular-nums">
                      {formatCurrency(net, p.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
                          STATUS_STYLES[p.status],
                        )}
                      >
                        {p.status.charAt(0) + p.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-sm">
                      {p.processedAt ? (
                        new Date(p.processedAt).toLocaleDateString()
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Link href={`/${orgSlug}/payroll/run/${p.id}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 hover:text-slate-700"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        {p.status === "DRAFT" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                            disabled={acting === p.id}
                            onClick={() => handleProcess(p.id)}
                          >
                            {acting === p.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Play className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
