import { Edit, MoreHorizontal, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import LazyImage from "@/components/ui/LazyImage";
import { selectColumn } from "./selectColumn";
import { SortableHeader } from "./SortableHeader";

export function buildProductColumns({ onEdit, onDelete, onToggleStock, onPreviewImage }) {
  return [
    selectColumn,
    {
      accessorKey: "image",
      header: "Image",
      enableSorting: false,
      cell: ({ row }) => {
        const product = row.original;
        const src = product.image || product.picture?.secure_url;
        return (
          <button
            type="button"
            onClick={() => onPreviewImage?.(src)}
            className="block h-12 w-12 overflow-hidden rounded-md border bg-muted"
          >
            <LazyImage src={src} alt={product.title} className="h-full w-full object-cover" fallback="/logo.svg" />
          </button>
        );
      },
    },
    {
      accessorKey: "title",
      header: ({ column }) => <SortableHeader column={column}>Title</SortableHeader>,
      cell: ({ row }) => (
        <div className="max-w-64">
          <p className="truncate font-medium">{row.original.title}</p>
          <p className="truncate text-xs text-muted-foreground">SKU: {row.original.sku || "N/A"}</p>
        </div>
      ),
    },
    {
      id: "price",
      accessorFn: (row) => row.salePrice ?? row.price ?? 0,
      header: ({ column }) => <SortableHeader column={column}>Price</SortableHeader>,
      cell: ({ row }) => {
        const product = row.original;
        const price = product.salePrice ?? product.price ?? 0;
        return (
          <div className="flex flex-col gap-1">
            <span className="font-semibold">PKR {Number(price).toLocaleString()}</span>
            {Number(product.discount) > 0 && (
              <Badge variant="secondary" className="w-fit text-xs">
                -{Number(product.discount).toFixed(1)}%
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "stock",
      header: ({ column }) => <SortableHeader column={column}>Stock</SortableHeader>,
      cell: ({ row }) => {
        const stock = row.original.stock;
        return (
          <Badge variant={stock > 0 ? "default" : "destructive"}>
            {stock > 0 ? `In Stock (${stock})` : "Out of Stock"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => {
        const product = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(product)}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleStock?.(product)}>
                {product.stock > 0 ? "Mark out of stock" : "Mark in stock"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => onDelete?.(product._id)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
