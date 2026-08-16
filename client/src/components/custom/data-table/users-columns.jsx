import { AlertCircle, Crown, LogOut, Shield, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SortableHeader } from "./SortableHeader";

const ROLE_META = {
  0: { label: "User", color: "bg-blue-100 text-blue-800", icon: User },
  1: { label: "Admin", color: "bg-green-100 text-green-800", icon: Shield },
  2: { label: "Super Admin", color: "bg-purple-100 text-purple-800", icon: Crown },
};

function getRoleMeta(role) {
  return ROLE_META[role] || ROLE_META[0];
}

export function buildUserColumns({ currentUser, updatingRoles, killingSessions, onRoleChange, onKillSessions }) {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
      cell: ({ row }) => <span className="font-medium capitalize">{row.original.name}</span>,
    },
    {
      id: "contact",
      header: "Contact Info",
      enableSorting: false,
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div className="max-w-64 space-y-0.5 text-sm text-muted-foreground">
            {u.address && <p className="truncate" title={u.address}>{u.address}</p>}
            {u.city && <p>{u.city}</p>}
            {u.phone && <p>{u.phone}</p>}
          </div>
        );
      },
    },
    {
      accessorKey: "role",
      header: "Role",
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue || filterValue === "all") return true;
        return row.getValue(columnId).toString() === filterValue;
      },
      cell: ({ row }) => {
        const { label, color, icon: Icon } = getRoleMeta(row.original.role);
        return (
          <Badge className={`${color} flex w-fit items-center gap-1`}>
            <Icon className="h-4 w-4" />
            {label}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => {
        const u = row.original;
        const isUpdating = updatingRoles[u._id];
        const isCurrentUser = currentUser?._id === u._id;

        if (currentUser?.role !== 2) {
          return (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              Only Super Admin can change roles
            </span>
          );
        }

        if (isCurrentUser) {
          return (
            <span className="flex items-center gap-1 text-sm text-amber-600">
              <AlertCircle className="h-4 w-4" />
              Cannot change own role
            </span>
          );
        }

        return (
          <div className="flex flex-wrap items-center gap-2">
            <Select value={u.role.toString()} onValueChange={(value) => onRoleChange(u._id, value)} disabled={isUpdating}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">User</SelectItem>
                <SelectItem value="1">Admin</SelectItem>
                <SelectItem value="2">Super Admin</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onKillSessions(u._id, u.name)}
              disabled={killingSessions[u._id]}
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
              title="Kill all sessions (log out from all devices)"
            >
              <LogOut className="mr-1 h-4 w-4" />
              {killingSessions[u._id] ? "Killing..." : "Kill Sessions"}
            </Button>
          </div>
        );
      },
    },
  ];
}
