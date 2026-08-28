import { AlertCircle, CheckCircle, Clock, Eye, FileDown, MoreHorizontal, Share2, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { selectColumn } from "./selectColumn";
import { SortableHeader } from "./SortableHeader";
import { formatCurrency } from "@/utils/currency";

function capitalizeFirst(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const statusColors = {
  Pending: "bg-amber-50 text-amber-700 border-amber-200",
  Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const statusIcons = {
  Pending: Clock,
  Completed: CheckCircle,
};

export function buildOrderColumns({
  packerNames,
  onPackerNameChange,
  onStatusUpdate,
  onView,
  onShare,
  onDownloadPdf,
  onDelete,
  currency = 'none',
}) {
  return [
    selectColumn,
    {
      id: "customer",
      accessorFn: (row) => row.userId?.name || "Customer",
      header: ({ column }) => <SortableHeader column={column}>Customer</SortableHeader>,
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.userId?.name ? capitalizeFirst(row.original.userId.name) : "Customer"}
        </span>
      ),
    },
    {
      id: "contact",
      header: "Contact Info",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="max-w-48">
          <p className="text-sm">{row.original.phone}</p>
          <p className="truncate text-xs text-muted-foreground">{row.original.address}</p>
        </div>
      ),
    },
    {
      id: "products",
      header: "Products",
      enableSorting: false,
      cell: ({ row }) => <span className="text-sm">{row.original.products?.length || 0} items</span>,
    },
    {
      accessorKey: "amount",
      header: ({ column }) => <SortableHeader column={column}>Amount</SortableHeader>,
      cell: ({ row }) => <span className="font-medium">{formatCurrency(row.original.amount, currency)}</span>,
    },
    {
      id: "status",
      header: "Status",
      enableSorting: false,
      cell: ({ row }) => {
        const order = row.original;
        const StatusIcon = statusIcons[order.status] || AlertCircle;

        if (order.status === "Pending") {
          return (
            <div className="flex flex-col gap-1.5">
              <Badge className={`${statusColors.Pending} w-fit border`}>
                <StatusIcon className="mr-1 h-3 w-3" />
                Pending
              </Badge>
              <Input
                placeholder="Packer name"
                value={packerNames[order._id] || ""}
                onChange={(e) => onPackerNameChange(order._id, e.target.value)}
                className="h-7 w-36 text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-7 w-36 text-xs"
                onClick={() => onStatusUpdate(order._id, "Completed")}
              >
                Mark Completed
              </Button>
            </div>
          );
        }

        return (
          <div className="flex flex-col gap-1">
            <Badge className={`${statusColors.Completed} w-fit border`}>
              <StatusIcon className="mr-1 h-3 w-3" />
              Completed
            </Badge>
            {order.packerName && (
              <p className="text-xs text-muted-foreground">Packed by {order.packerName}</p>
            )}
            <Select value="Completed" onValueChange={(val) => onStatusUpdate(order._id, val)}>
              <SelectTrigger className="h-7 w-36 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => <SortableHeader column={column}>Date</SortableHeader>,
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {new Date(row.original.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => {
        const order = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onView(order)}>
                <Eye className="mr-2 h-4 w-4" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onShare(order)}>
                <Share2 className="mr-2 h-4 w-4" /> Share
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDownloadPdf(order)}>
                <FileDown className="mr-2 h-4 w-4" /> Download PDF
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(order._id)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
