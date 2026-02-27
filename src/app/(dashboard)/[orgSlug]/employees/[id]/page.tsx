import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getEmployee } from "@/actions/employee.actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getInitials, formatDate, formatCurrency } from "@/lib/utils";
import {
  ArrowLeft, Edit, Mail, Phone, MapPin, Calendar,
  Building2, Briefcase, CreditCard, FileText, Shield,
} from "lucide-react";
import type { EmploymentStatus } from "@prisma/client";

const STATUS_STYLES: Record<EmploymentStatus, string> = {
  ACTIVE:     "bg-green-50 text-green-700 border-green-200",
  INACTIVE:   "bg-slate-50 text-slate-600 border-slate-200",
  ON_LEAVE:   "bg-yellow-50 text-yellow-700 border-yellow-200",
  PROBATION:  "bg-blue-50 text-blue-700 border-blue-200",
  SUSPENDED:  "bg-orange-50 text-orange-700 border-orange-200",
  TERMINATED: "bg-red-50 text-red-700 border-red-200",
  RESIGNED:   "bg-purple-50 text-purple-700 border-purple-200",
};

export default async function EmployeeProfilePage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>;
}) {
  const { orgSlug, id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { organizationId: true },
  });
  if (!user?.organizationId) redirect("/select-org");

  const employee = await getEmployee(id, user.organizationId);
  if (!employee) notFound();

  const latestSalary = employee.salaryHistory[0];

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <Link href={`/${orgSlug}/employees`}>
          <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-700 -ml-2">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Employees
          </Button>
        </Link>
        <Link href={`/${orgSlug}/employees/${id}/edit`}>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
            <Edit className="w-4 h-4 mr-1.5" /> Edit Profile
          </Button>
        </Link>
      </div>

      {/* Profile header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start gap-5">
          <Avatar className="h-20 w-20 shrink-0">
            <AvatarImage src={employee.avatar ?? undefined} />
            <AvatarFallback className="bg-blue-100 text-blue-700 text-2xl font-bold">
              {getInitials(`${employee.firstName} ${employee.lastName}`)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {employee.firstName} {employee.middleName} {employee.lastName}
                </h2>
                <p className="text-slate-500 text-sm mt-0.5">
                  {employee.position?.title ?? "No position"} · {employee.employeeCode}
                </p>
              </div>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${STATUS_STYLES[employee.status]}`}>
                {employee.status.charAt(0) + employee.status.slice(1).toLowerCase().replace("_", " ")}
              </span>
            </div>

            <div className="flex flex-wrap gap-4 mt-4 text-sm text-slate-500">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" /> {employee.user.email}
              </span>
              {employee.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> {employee.phone}
                </span>
              )}
              {(employee.city || employee.country) && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  {[employee.city, employee.country].filter(Boolean).join(", ")}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Joined {formatDate(employee.hireDate)}
              </span>
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" /> {employee.branch.name}
              </span>
              {employee.department && (
                <span className="flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" /> {employee.department.name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Personal Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 text-sm mb-4 flex items-center gap-2">
            <Shield className="w-4 h-4 text-slate-400" /> Personal Info
          </h3>
          <div className="space-y-3 text-sm">
            <InfoRow label="Date of Birth"    value={employee.dateOfBirth ? formatDate(employee.dateOfBirth) : null} />
            <InfoRow label="Gender"           value={employee.gender} />
            <InfoRow label="Blood Group"      value={employee.bloodGroup} />
            <InfoRow label="Marital Status"   value={employee.maritalStatus} />
            <InfoRow label="Nationality"      value={employee.nationality} />
            <InfoRow label="National ID"      value={employee.nationalId} />
            <InfoRow label="Passport"         value={employee.passportNumber} />
            {employee.passportExpiry && (
              <InfoRow label="Passport Expiry" value={formatDate(employee.passportExpiry)} />
            )}
            {employee.visaType && (
              <InfoRow label="Visa Type"      value={employee.visaType} />
            )}
          </div>
        </div>

        {/* Employment Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 text-sm mb-4 flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-slate-400" /> Employment
          </h3>
          <div className="space-y-3 text-sm">
            <InfoRow label="Employee Code"     value={employee.employeeCode} />
            <InfoRow label="Employment Type"   value={employee.employmentType.replace("_", " ")} />
            <InfoRow label="Hire Date"         value={formatDate(employee.hireDate)} />
            {employee.probationEndDate && (
              <InfoRow label="Probation Ends"  value={formatDate(employee.probationEndDate)} />
            )}
            <InfoRow label="Notice Period"     value={employee.noticePeriod ? `${employee.noticePeriod} days` : null} />
            {employee.manager && (
              <InfoRow
                label="Direct Manager"
                value={`${employee.manager.firstName} ${employee.manager.lastName}`}
              />
            )}
            <InfoRow label="Work Schedule"     value={employee.workSchedule?.name ?? null} />
          </div>
        </div>

        {/* Salary + Bank */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 text-sm mb-4 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-slate-400" /> Compensation
          </h3>
          {latestSalary ? (
            <div className="space-y-3 text-sm">
              <InfoRow
                label="Current Salary"
                value={formatCurrency(Number(latestSalary.basicSalary), latestSalary.currency)}
              />
              <InfoRow label="Currency"       value={latestSalary.currency} />
              <InfoRow label="Effective From" value={formatDate(latestSalary.effectiveDate)} />
            </div>
          ) : (
            <p className="text-slate-400 text-sm">No salary record yet</p>
          )}

          {employee.bankDetails.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100 space-y-3 text-sm">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Bank Details</p>
              {employee.bankDetails.filter(b => b.isPrimary).map((bank) => (
                <div key={bank.id}>
                  <InfoRow label="Bank"       value={bank.bankName} />
                  <InfoRow label="Account"    value={`****${bank.accountNumber.slice(-4)}`} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Emergency contacts */}
      {employee.emergencyContacts.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 text-sm mb-4">Emergency Contacts</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {employee.emergencyContacts.map((contact) => (
              <div key={contact.id} className="border border-slate-100 rounded-lg p-3 text-sm">
                <p className="font-medium text-slate-800">{contact.name}</p>
                <p className="text-slate-500 text-xs">{contact.relationship}</p>
                <p className="text-slate-600 mt-1">{contact.phone}</p>
                {contact.email && <p className="text-slate-400 text-xs">{contact.email}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents */}
      {employee.documents.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-semibold text-slate-800 text-sm mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" /> Documents
          </h3>
          <div className="divide-y divide-slate-100">
            {employee.documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{doc.title}</p>
                  <p className="text-xs text-slate-400 capitalize">{doc.type.replace("_", " ").toLowerCase()}</p>
                </div>
                <div className="flex items-center gap-3">
                  {doc.expiryDate && (
                    <span className="text-xs text-slate-400">Expires {formatDate(doc.expiryDate)}</span>
                  )}
                  <a
                    href={doc.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-slate-400 shrink-0">{label}</span>
      <span className="text-slate-700 font-medium text-right">
        {value ?? <span className="text-slate-300 font-normal">—</span>}
      </span>
    </div>
  );
}
