'use client'

import { useMemo, useState } from 'react'
import { Button } from '@dappermountain/ui/components/button'
import { Input } from '@dappermountain/ui/components/input'
import { Popover, PopoverContent, PopoverTrigger } from '@dappermountain/ui/components/popover'
import { ChevronDown } from '@dappermountain/ui/icons'
import { cn } from '@dappermountain/ui/lib/utils'

import type { RelationshipFilterOption } from '@/lib/filters/relationship-options'
import { useAppTranslation } from '@/utils/i18n.client'

export type GroupedPickerProps = {
  options: RelationshipFilterOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder: string
  searchPlaceholder?: string
  disabled?: boolean
  emptyValue?: string
  emptyLabel?: string
  formatGroup?: (group: string) => string
  className?: string
}

function groupOptions(
  options: RelationshipFilterOption[],
  query: string,
): [string, RelationshipFilterOption[]][] {
  const q = query.trim().toLowerCase()
  const filtered = !q
    ? options
    : options.filter(
        (option) =>
          option.label.toLowerCase().includes(q) ||
          option.group?.toLowerCase().includes(q),
      )

  const hasGroups = filtered.some((option) => option.group)
  if (!hasGroups) return [['', filtered]]

  const map = new Map<string, RelationshipFilterOption[]>()
  const order: string[] = []

  for (const option of filtered) {
    const key = option.group ?? ''
    if (!map.has(key)) order.push(key)
    const list = map.get(key) ?? []
    list.push(option)
    map.set(key, list)
  }

  return order.map((key) => [key, map.get(key)!] as const)
}

export function GroupedPicker(props: GroupedPickerProps) {
  const {
    options,
    value,
    onValueChange,
    placeholder,
    searchPlaceholder,
    disabled,
    emptyValue,
    emptyLabel,
    formatGroup = (group) => group,
    className,
  } = props
  const { t } = useAppTranslation()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const groups = useMemo(() => groupOptions(options, query), [options, query])

  const selectedLabel = useMemo(() => {
    if (emptyValue && value === emptyValue) return emptyLabel ?? placeholder
    if (!value) return placeholder
    return options.find((option) => option.id === value)?.label ?? value
  }, [emptyLabel, emptyValue, options, placeholder, value])

  const selectValue = (next: string) => {
    onValueChange(next)
    setOpen(false)
    setQuery('')
  }

  return (
    <Popover
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery('')
      }}
      open={open}
    >
      <PopoverTrigger asChild>
        <Button
          className={cn('w-full justify-between font-normal', className)}
          disabled={disabled}
          type="button"
          variant="outline"
        >
          <span className={cn('truncate text-left', !value && 'text-muted-foreground')}>
            {selectedLabel}
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="z-[60] w-[var(--radix-popover-trigger-width)] min-w-56 p-0"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="border-b p-2">
          <Input
            className="h-8"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder ?? t('custom:frontend:filters:searchPlaceholder')}
            value={query}
          />
        </div>
        <div
          className="max-h-64 overflow-y-auto overscroll-contain p-1"
          onPointerDown={(event) => event.stopPropagation()}
          onTouchMove={(event) => event.stopPropagation()}
          onWheel={(event) => event.stopPropagation()}
        >
          {emptyValue ? (
            <button
              className={cn(
                'flex w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent',
                value === emptyValue && 'bg-accent',
              )}
              onClick={() => selectValue(emptyValue)}
              type="button"
            >
              {emptyLabel ?? '—'}
            </button>
          ) : null}

          {groups.every(([, groupOptions]) => groupOptions.length === 0) ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              {t('custom:frontend:filters:noMatches')}
            </p>
          ) : (
            groups.map(([group, groupOptions]) => (
              <div key={group || 'default'}>
                {group ? (
                  <p className="sticky top-0 z-10 bg-popover px-2 py-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    {formatGroup(group)}
                  </p>
                ) : null}
                {groupOptions.map((option) => (
                  <button
                    className={cn(
                      'flex w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent',
                      value === option.id && 'bg-accent',
                    )}
                    key={option.id}
                    onClick={() => selectValue(option.id)}
                    type="button"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
