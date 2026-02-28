"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";
import { Search, LogOut, User, Settings, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/modules/notifications/notification-bell";
import { getInitials } from "@/lib/utils";
import type { SystemRole, NotificationType } from "@prisma/client";

const ROLE_LABELS: Record<SystemRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ORG_ADMIN:   "Admin",
  HR_MANAGER:  "HR Manager",
  EMPLOYEE:    "Employee",
};

type Notification = {
  id:        string;
  type:      NotificationType;
  title:     string;
  body:      string;
  link:      string | null;
  isRead:    boolean;
  createdAt: Date;
};

type Props = {
  user: {
    id:    string;
    name:  string;
    email: string;
    image: string | null;
    role:  SystemRole;
  };
  orgSlug:       string;
  notifications: Notification[];
  unreadCount:   number;
};

export function TopbarClient({ user, orgSlug, notifications, unreadCount }: Props) {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <header className="h-14 border-b border-slate-200 bg-white px-6 flex items-center gap-4 shrink-0">
      {/* Search */}
      <div className="flex-1 max-w-sm relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <Input
          placeholder="Search employees, payroll..."
          className="h-9 pl-9 bg-slate-50 border-slate-200 text-sm focus-visible:ring-blue-500 focus-visible:bg-white"
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Notification bell */}
        <NotificationBell
          notifications={notifications}
          unreadCount={unreadCount}
          userId={user.id}
          orgSlug={orgSlug}
        />

        {/* Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
              <Avatar className="h-7 w-7">
                <AvatarImage src={user.image ?? undefined} />
                <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-semibold">
                  {getInitials(user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium text-slate-800 leading-none mb-0.5">{user.name}</p>
                <p className="text-xs text-slate-400 leading-none">{ROLE_LABELS[user.role]}</p>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>
              <p className="font-medium text-slate-800">{user.name}</p>
              <p className="text-xs text-slate-400 font-normal mt-0.5 truncate">{user.email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push(`/${orgSlug}/profile`)}>
              <User className="w-4 h-4 mr-2 text-slate-400" /> My Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/${orgSlug}/notifications`)}>
              <Settings className="w-4 h-4 mr-2 text-slate-400" /> Notification Preferences
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/${orgSlug}/settings`)}>
              <Settings className="w-4 h-4 mr-2 text-slate-400" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-700 focus:bg-red-50">
              <LogOut className="w-4 h-4 mr-2" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
