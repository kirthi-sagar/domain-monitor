"use client";

import { useTransition } from "react";
import { changeRoleAction } from "@/app/(app)/team/actions";

export function RoleSelect({ userId, defaultRole }: { userId: string; defaultRole: string }) {
  const [pending, start] = useTransition();
  return (
    <select
      defaultValue={defaultRole}
      disabled={pending}
      onChange={(e) => start(() => changeRoleAction(userId, e.target.value))}
      className="h-8 rounded-md border border-input bg-card px-2 text-xs"
    >
      <option value="admin">Admin</option>
      <option value="member">Member</option>
      <option value="viewer">Viewer</option>
    </select>
  );
}
