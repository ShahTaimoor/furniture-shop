import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Pencil, Plus, Trash } from 'lucide-react';

const CategoryNode = ({ node, depth = 0, onAddChild, onEdit, onDelete }) => {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const imageUrl = node.picture?.secure_url || node.image || null;

  return (
    <li>
      <div className="flex items-start gap-2 py-2">
        <button
          type="button"
          className="mt-1 text-slate-500 hover:text-slate-700"
          onClick={() => setExpanded((prev) => !prev)}
          disabled={!hasChildren}
          aria-label={expanded ? 'Collapse children' : 'Expand children'}
        >
          {hasChildren ? (
            expanded ? (
              <ChevronDown size={16} />
            ) : (
              <ChevronRight size={16} />
            )
          ) : (
            <span className="inline-block w-4" />
          )}
        </button>

        <div className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              {imageUrl && (
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                  <img
                    src={imageUrl}
                    alt={node.picture?.alt || node.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-slate-900">{node.name}</p>
                <p className="text-xs font-mono uppercase tracking-wide text-slate-400">{node.slug}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Level {depth}
              </Badge>
              <Badge variant="outline" className="text-xs text-slate-500">
                {new Date(node.updatedAt).toLocaleDateString()}
              </Badge>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAddChild(node)}
              className="h-8 px-3 text-xs"
            >
              <Plus size={14} />
              Child
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(node)}
              className="h-8 px-3 text-xs"
            >
              <Pencil size={14} />
              Edit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(node)}
              className="h-8 px-3 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash size={14} />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {hasChildren && expanded && (
        <ul className="ml-6 border-l border-slate-200 pl-4">
          {node.children.map((child) => (
            <CategoryNode
              key={child._id}
              node={child}
              depth={depth + 1}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

export default CategoryNode;

