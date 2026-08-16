/**
 * Layout-only slot: filters/search on the left, actions on the right.
 * Each admin page supplies its own controls — this component owns no logic.
 */
export function DataTableToolbar({ left, right }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-1 flex-wrap items-center gap-2">{left}</div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}
