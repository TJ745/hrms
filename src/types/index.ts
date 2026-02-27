import type { SystemRole, EmploymentStatus, EmploymentType } from "@prisma/client";

// ── Session User ─────────────────────────────────────────────
export type SessionUser = {
  id:             string;
  name:           string;
  email:          string;
  image?:         string | null;
  organizationId: string | null;
  branchId:       string | null;
  systemRole:     SystemRole;
  isActive:       boolean;
};

// ── API Response ─────────────────────────────────────────────
export type ApiResponse<T = unknown> =
  | { success: true;  data: T;      message?: string }
  | { success: false; error: string; code?: string };

// ── Pagination ───────────────────────────────────────────────
export type PaginatedResponse<T> = {
  data:       T[];
  total:      number;
  page:       number;
  perPage:    number;
  totalPages: number;
};

export type PaginationParams = {
  page?:    number;
  perPage?: number;
  search?:  string;
  sortBy?:  string;
  sortDir?: "asc" | "desc";
};

// ── Employee ─────────────────────────────────────────────────
export type EmployeeWithRelations = {
  id:             string;
  employeeCode:   string;
  firstName:      string;
  lastName:       string;
  avatar?:        string | null;
  status:         EmploymentStatus;
  employmentType: EmploymentType;
  hireDate:       Date;
  branch:         { id: string; name: string };
  department?:    { id: string; name: string } | null;
  position?:      { id: string; title: string } | null;
  user:           { email: string };
};

// ── Sidebar Nav ──────────────────────────────────────────────
export type NavItem = {
  title:    string;
  href:     string;
  icon:     string;
  badge?:   number;
  children?: NavItem[];
};

// ── Notification ─────────────────────────────────────────────
export type NotificationPayload = {
  id:        string;
  type:      string;
  title:     string;
  body:      string;
  link?:     string;
  createdAt: string;
};

// ── Dashboard Stats ──────────────────────────────────────────
export type DashboardStats = {
  totalEmployees:    number;
  activeEmployees:   number;
  onLeaveToday:      number;
  presentToday:      number;
  absentToday:       number;
  pendingLeaves:     number;
  openPositions:     number;
  upcomingBirthdays: number;
};
