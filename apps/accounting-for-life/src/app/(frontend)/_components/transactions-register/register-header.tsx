'use client'

import type { CSSProperties } from 'react'
import {
  closestCenter,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowDown, ArrowUp, ArrowUpDown, GripVertical } from '@dappermountain/ui/icons'
import { cn } from '@dappermountain/ui/lib/utils'

import {
  REGISTER_COLUMN_CLASS,
  REGISTER_COLUMN_DEFS,
  type RegisterColumnId,
  type RegisterSortState,
} from '@/app/(frontend)/_components/transactions-register/register-config'
import { Checkbox } from '@dappermountain/ui/components/checkbox'
import { TableHead, TableRow } from '@dappermountain/ui/components/table'
import { useAppTranslation } from '@/utils/i18n.client'

export type RegisterHeaderRowProps = {
  bulkMode: boolean
  columnOrder: RegisterColumnId[]
  onSort: (column: RegisterColumnId) => void
  onToggleAll?: (checked: boolean) => void
  selectedCount?: number
  sort: RegisterSortState
  totalCount?: number
}

export function useRegisterColumnDrag(
  columnOrder: RegisterColumnId[],
  onColumnOrderChange: (order: RegisterColumnId[]) => void,
) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = columnOrder.indexOf(active.id as RegisterColumnId)
    const newIndex = columnOrder.indexOf(over.id as RegisterColumnId)
    if (oldIndex < 0 || newIndex < 0) return

    onColumnOrderChange(arrayMove(columnOrder, oldIndex, newIndex))
  }

  return { collisionDetection: closestCenter, onDragEnd, sensors }
}

function SortableHeaderCell(props: {
  columnId: RegisterColumnId
  sort: RegisterSortState
  onSort: (column: RegisterColumnId) => void
}) {
  const { columnId, sort, onSort } = props
  const { t } = useAppTranslation()
  const def = REGISTER_COLUMN_DEFS[columnId]
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: columnId,
  })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  }

  const isActive = sort.column === columnId

  return (
    <TableHead
      className={cn(REGISTER_COLUMN_CLASS[columnId], 'whitespace-nowrap')}
      ref={setNodeRef}
      style={style}
    >
      <div
        className={cn(
          'group/header flex min-w-0 items-center gap-1',
          def.align === 'right' && 'justify-end',
        )}
      >
        <button
          aria-label={t('custom:frontend:transactions:dragColumn')}
          className="shrink-0 cursor-grab touch-none rounded p-0.5 text-muted-foreground opacity-50 hover:text-foreground hover:opacity-100 active:cursor-grabbing"
          type="button"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5" />
        </button>
        <button
          className="inline-flex min-w-0 items-center gap-1 truncate rounded px-0.5 py-0.5 text-xs font-medium hover:bg-muted/60"
          onClick={() => onSort(columnId)}
          type="button"
        >
          <span className="truncate">{t(def.labelKey as 'custom:frontend:filters:fields:payee')}</span>
          {isActive ? (
            sort.direction === 'asc' ? (
              <ArrowUp className="size-3.5 shrink-0" />
            ) : (
              <ArrowDown className="size-3.5 shrink-0" />
            )
          ) : (
            <ArrowUpDown className="size-3.5 shrink-0 opacity-40" />
          )}
        </button>
      </div>
    </TableHead>
  )
}

export function TransactionsRegisterHeaderRow(props: RegisterHeaderRowProps) {
  const {
    bulkMode,
    columnOrder,
    onSort,
    onToggleAll,
    selectedCount = 0,
    sort,
    totalCount = 0,
  } = props

  return (
    <TableRow className="hover:bg-transparent">
      {bulkMode ? (
        <TableHead className="w-10">
          <Checkbox
            checked={selectedCount > 0 && selectedCount === totalCount}
            onCheckedChange={(checked) => onToggleAll?.(checked === true)}
          />
        </TableHead>
      ) : null}

      <TableHead className="w-6 px-1" />

      {columnOrder.map((columnId) => (
        <SortableHeaderCell columnId={columnId} key={columnId} onSort={onSort} sort={sort} />
      ))}

      <TableHead className="w-10" />
    </TableRow>
  )
}
