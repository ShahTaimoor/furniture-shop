import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Pencil, Plus, Trash } from 'lucide-react';
import OneLoader from '@/components/ui/OneLoader';

const CategoryNode = ({ node, depth = 0, onAddChild, onEdit, onDelete, deletingId = null }) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const imageUrl = node.picture?.secure_url || node.image || null;
  const isDeleting = deletingId === node._id;

  return (
    <>
      <tr className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50">
        <td className="px-3 py-2 align-middle">
          <div className="flex items-center gap-2" style={{ paddingLeft: depth * 20 }}>
            <button
              type="button"
              className="shrink-0 text-slate-500 hover:text-slate-700 disabled:opacity-0"
              onClick={() => setExpanded((prev) => !prev)}
              disabled={!hasChildren}
              aria-label={expanded ? 'Collapse children' : 'Expand children'}
            >
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={node.picture?.alt || node.name}
                className="h-7 w-7 shrink-0 rounded border border-slate-200 object-cover"
                loading="lazy"
              />
            ) : (
              <div className="h-7 w-7 shrink-0 rounded border border-slate-200 bg-slate-50" />
            )}
            <span className="truncate font-medium text-slate-900">{node.name}</span>
          </div>
        </td>
        <td className="px-3 py-2 align-middle font-mono text-xs uppercase tracking-wide text-slate-400">
          {node.slug}
        </td>
        <td className="px-3 py-2 align-middle">
          <Badge variant="outline" className="text-xs">
            Level {depth}
          </Badge>
        </td>
        <td className="px-3 py-2 align-middle text-xs text-slate-500">
          {new Date(node.updatedAt).toLocaleDateString()}
        </td>
        <td className="px-3 py-2 align-middle">
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAddChild(node)}
              className="h-7 px-2 text-xs"
            >
              <Plus size={12} />
              Child
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(node)}
              className="h-7 px-2 text-xs"
            >
              <Pencil size={12} />
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(node)}
              disabled={isDeleting}
              className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {isDeleting ? <OneLoader size="tiny" inline /> : <Trash size={12} />}
              {isDeleting ? 'Deleting…' : 'Delete'}
            </Button>
          </div>
        </td>
      </tr>

      {hasChildren && expanded && node.children.map((child) => (
        <CategoryNode
          key={child._id}
          node={child}
          depth={depth + 1}
          onAddChild={onAddChild}
          onEdit={onEdit}
          onDelete={onDelete}
          deletingId={deletingId}
        />
      ))}
    </>
  );
};

export default CategoryNode;
