'use client'

import { useCallback, useMemo, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@dappermountain/ui/components/button'
import { Checkbox } from '@dappermountain/ui/components/checkbox'
import { Input } from '@dappermountain/ui/components/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@dappermountain/ui/components/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@dappermountain/ui/components/select'
import { Filter, Plus, X } from '@dappermountain/ui/icons'
import { cn } from '@dappermountain/ui/lib/utils'

import {
  clauseToOperatorKey,
  getOperatorOption,
  getOperatorsForField,
  getValueOptions,
} from '@/lib/filters/field-operators'
import {
  findSelectOption,
  translateFieldLabel,
  translateFilterKey,
  translateOptionLabel,
} from '@/lib/filters/i18n'
import type { FilterClause, FilterFieldDefinition, FilterLogic } from '@/lib/filters/types'
import { activeBudgetIdFromClauses, budgetIdFromRows } from '@/lib/filters/budget-scope'
import { filtersSearchParam, newFilterId, parseFiltersParam } from '@/lib/filters/parse'
import {
  expandRelationshipPickerValues,
  findRelationshipOptionForValue,
  formatRelationshipOptionLabel,
  relationshipClauseValue,
  rowValueForRelationshipClause,
  type RelationshipFilterOption,
} from '@/lib/filters/relationship-options'
import { useAppTranslation } from '@/utils/i18n.client'

export type RelationshipFieldConfig = {
  /** When this budget field has a value, scope to `byBudget[budgetId]`. */
  scopeBudgetField?: string
  byBudget?: Record<string, RelationshipFilterOption[]>
  grouped?: RelationshipFilterOption[]
}

export type PayloadFilterBarProps = {
  fields: FilterFieldDefinition[]
  relationshipOptions?: Record<string, RelationshipFilterOption[]>
  relationshipFieldConfig?: Record<string, RelationshipFieldConfig>
}

type FilterRowModel = {
  id: string
  logic: FilterLogic
  fieldId: string
  operatorKey: string
  values: string[]
}

const EMPTY_ROW: Omit<FilterRowModel, 'id'> = {
  logic: 'and',
  fieldId: '',
  operatorKey: '',
  values: [],
}

function clauseToRow(
  clause: FilterClause,
  relationshipOptions: Record<string, RelationshipFilterOption[]> = {},
): FilterRowModel {
  const relOpts = relationshipOptions[clause.field]
  const values = relOpts?.length
    ? rowValueForRelationshipClause(clause, relOpts)
    : Array.isArray(clause.value)
      ? clause.value
      : typeof clause.value === 'string'
        ? [clause.value]
        : []

  return {
    id: clause.id,
    logic: clause.logic ?? 'and',
    fieldId: clause.field,
    operatorKey: clauseToOperatorKey(clause),
    values,
  }
}

function rowToClause(
  row: FilterRowModel,
  fields: FilterFieldDefinition[],
  relationshipOptions: Record<string, RelationshipFilterOption[]> = {},
): FilterClause | null {
  const field = fields.find((f) => f.id === row.fieldId)
  if (!field || !row.operatorKey) return null

  const operatorOption = getOperatorOption(field, row.operatorKey)
  if (!operatorOption) return null

  const base: FilterClause = {
    id: row.id,
    logic: row.logic,
    field: row.fieldId,
    operator: operatorOption.operator,
  }

  if (!operatorOption.needsValue) {
    return { ...base, value: operatorOption.existsValue }
  }

  const relOpts = relationshipOptions[row.fieldId]

  if (operatorOption.valueKind === 'multi') {
    if (!row.values.length) return null
    const expanded = relOpts?.length
      ? expandRelationshipPickerValues(row.fieldId, row.values, relationshipOptions)
      : row.values
    return { ...base, value: expanded }
  }

  const scalar = row.values[0]?.trim()
  if (!scalar) return null

  if (relOpts?.length) {
    const selected = relOpts.find((o) => o.id === scalar)
    if (selected) {
      const resolved = relationshipClauseValue(operatorOption.operator, selected)
      return { ...base, operator: resolved.operator, value: resolved.value }
    }
  }

  return { ...base, value: scalar }
}

function applyRowPatch(
  prev: FilterRowModel[],
  id: string,
  patch: Partial<FilterRowModel>,
  fieldDefs: FilterFieldDefinition[],
): FilterRowModel[] {
  return prev.map((row) => {
    if (row.id !== id) return row

    const updated = { ...row, ...patch }

    if (patch.fieldId !== undefined && patch.fieldId !== row.fieldId) {
      const field = fieldDefs.find((f) => f.id === patch.fieldId)
      const firstOp = field ? getOperatorsForField(field)[0] : undefined
      return {
        ...updated,
        operatorKey: firstOp?.id ?? '',
        values: [],
      }
    }

    if (patch.operatorKey !== undefined && patch.operatorKey !== row.operatorKey) {
      return { ...updated, values: [] }
    }

    return updated
  })
}

function mergeRelationshipRegistry(
  relationshipOptions: Record<string, RelationshipFilterOption[]>,
  relationshipFieldConfig: Record<string, RelationshipFieldConfig>,
): Record<string, RelationshipFilterOption[]> {
  const registry: Record<string, RelationshipFilterOption[]> = {}

  const fieldIds = new Set([
    ...Object.keys(relationshipOptions),
    ...Object.keys(relationshipFieldConfig),
  ])

  for (const fieldId of fieldIds) {
    const byId = new Map<string, RelationshipFilterOption>()
    const config = relationshipFieldConfig[fieldId]

    for (const option of relationshipOptions[fieldId] ?? []) {
      byId.set(option.id, option)
    }
    for (const list of Object.values(config?.byBudget ?? {})) {
      for (const option of list) {
        byId.set(option.id, option)
      }
    }
    for (const option of config?.grouped ?? []) {
      byId.set(option.id, option)
    }

    registry[fieldId] = [...byId.values()]
  }

  return registry
}

function resolveOptionsForField(
  fieldId: string,
  draftRows: FilterRowModel[],
  urlClauses: FilterClause[],
  relationshipOptions: Record<string, RelationshipFilterOption[]>,
  relationshipFieldConfig: Record<string, RelationshipFieldConfig>,
): { options: RelationshipFilterOption[]; scoped: boolean } {
  const config = relationshipFieldConfig[fieldId]
  if (!config) {
    return { options: relationshipOptions[fieldId] ?? [], scoped: false }
  }

  const budgetId =
    activeBudgetIdFromClauses(urlClauses) ??
    (config.scopeBudgetField ? budgetIdFromRows(draftRows, config.scopeBudgetField) : undefined)

  if (budgetId && config.byBudget?.[budgetId]) {
    return { options: config.byBudget[budgetId], scoped: true }
  }

  if (config.grouped?.length) {
    return { options: config.grouped, scoped: false }
  }

  return { options: relationshipOptions[fieldId] ?? [], scoped: false }
}

export function PayloadFilterBar(props: PayloadFilterBarProps) {
  const { fields, relationshipOptions = {}, relationshipFieldConfig = {} } = props
  const { t } = useAppTranslation()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)

  const urlClauses = useMemo(
    () => parseFiltersParam(searchParams.get('filters') ?? undefined),
    [searchParams],
  )

  const [draftRows, setDraftRows] = useState<FilterRowModel[]>([])

  const relationshipRegistry = useMemo(
    () => mergeRelationshipRegistry(relationshipOptions, relationshipFieldConfig),
    [relationshipFieldConfig, relationshipOptions],
  )

  const appliedBudgetId = useMemo(() => activeBudgetIdFromClauses(urlClauses), [urlClauses])

  const applyClauses = useCallback(
    (clauses: FilterClause[]) => {
      const params = new URLSearchParams(searchParams.toString())
      const filterParams = filtersSearchParam(clauses)

      params.delete('filters')
      for (const [key, value] of Object.entries(filterParams)) {
        params.set(key, value)
      }

      startTransition(() => {
        router.push(params.toString() ? `${pathname}?${params.toString()}` : pathname)
      })
    },
    [pathname, router, searchParams],
  )

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setDraftRows(
        urlClauses.length ? urlClauses.map((c) => clauseToRow(c, relationshipRegistry)) : [],
      )
    }
    setOpen(nextOpen)
  }

  const updateRow = (id: string, patch: Partial<FilterRowModel>) => {
    setDraftRows((prev) => applyRowPatch(prev, id, patch, fields))
  }

  const addRow = () => {
    setDraftRows((prev) => [...prev, { id: newFilterId(), ...EMPTY_ROW }])
  }

  const removeDraftRow = (id: string) => {
    setDraftRows((prev) => prev.filter((r) => r.id !== id))
  }

  const clearDraft = () => {
    setDraftRows([])
  }

  const commitDraft = () => {
    const clauses = draftRows
      .map((row) => rowToClause(row, fields, relationshipRegistry))
      .filter((clause): clause is FilterClause => clause !== null)

    applyClauses(clauses)
    setOpen(false)
  }

  const removeAppliedClause = (id: string) => {
    applyClauses(urlClauses.filter((clause) => clause.id !== id))
  }

  const activeCount = urlClauses.length

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Popover onOpenChange={handleOpenChange} open={open}>
          <PopoverTrigger asChild>
            <Button disabled={isPending} size="sm" type="button" variant="outline">
              <Filter className="size-4" />
              {translateFilterKey(t, 'custom:frontend:filters:title')}
              {activeCount > 0 ? (
                <span className="ml-1 rounded-full bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
                  {activeCount}
                </span>
              ) : null}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[min(100vw-2rem,40rem)] p-0">
            <div className="border-b px-4 py-3">
              <p className="text-sm font-medium">
                {translateFilterKey(t, 'custom:frontend:filters:title')}
              </p>
              <p className="text-xs text-muted-foreground">
                {translateFilterKey(t, 'custom:frontend:filters:hint')}
              </p>
            </div>

            <div className="space-y-3 p-4">
              {draftRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {translateFilterKey(t, 'custom:frontend:filters:noFilters')}
                </p>
              ) : (
                draftRows.map((row, index) => {
                  const fieldOptions = row.fieldId
                    ? resolveOptionsForField(
                        row.fieldId,
                        draftRows,
                        urlClauses,
                        relationshipOptions,
                        relationshipFieldConfig,
                      )
                    : { options: [], scoped: false }

                  return (
                  <FilterRow
                    fields={fields}
                    fieldRelationshipOptions={fieldOptions.options}
                    index={index}
                    key={row.id}
                    onChange={(patch) => updateRow(row.id, patch)}
                    onRemove={() => removeDraftRow(row.id)}
                    row={row}
                    showScopeHint={
                      Boolean(relationshipFieldConfig[row.fieldId]) && !fieldOptions.scoped
                    }
                    t={t}
                  />
                  )
                })
              )}

              <Button className="w-full" onClick={addRow} size="sm" type="button" variant="outline">
                <Plus className="size-4" />
                {translateFilterKey(t, 'custom:frontend:filters:addFilter')}
              </Button>
            </div>

            <div className="flex items-center justify-between gap-2 border-t px-4 py-3">
              <Button
                disabled={draftRows.length === 0}
                onClick={clearDraft}
                size="sm"
                type="button"
                variant="ghost"
              >
                {translateFilterKey(t, 'custom:frontend:filters:clearAll')}
              </Button>
              <div className="flex gap-2">
                <Button onClick={() => setOpen(false)} size="sm" type="button" variant="outline">
                  {translateFilterKey(t, 'custom:frontend:filters:cancel')}
                </Button>
                <Button disabled={isPending} onClick={commitDraft} size="sm" type="button">
                  {translateFilterKey(t, 'custom:frontend:filters:apply')}
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {isPending ? (
          <span className="text-xs text-muted-foreground">
            {translateFilterKey(t, 'custom:frontend:filters:applying')}
          </span>
        ) : null}
      </div>

      {activeCount > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {urlClauses.map((clause, index) => (
            <div className="flex items-center gap-2" key={clause.id}>
              {index > 0 ? (
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  {clause.logic === 'or'
                    ? translateFilterKey(t, 'custom:frontend:filters:or')
                    : translateFilterKey(t, 'custom:frontend:filters:and')}
                </span>
              ) : null}
              <ActiveFilterChip
                appliedBudgetId={appliedBudgetId}
                clause={clause}
                fields={fields}
                onRemove={() => removeAppliedClause(clause.id)}
                relationshipRegistry={relationshipRegistry}
                t={t}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

type FilterRowProps = {
  row: FilterRowModel
  index: number
  fields: FilterFieldDefinition[]
  fieldRelationshipOptions: RelationshipFilterOption[]
  showScopeHint: boolean
  onChange: (patch: Partial<FilterRowModel>) => void
  onRemove: () => void
  t: ReturnType<typeof useAppTranslation>['t']
}

function FilterRow(props: FilterRowProps) {
  const {
    row,
    index,
    fields,
    fieldRelationshipOptions,
    showScopeHint,
    onChange,
    onRemove,
    t,
  } = props
  const field = fields.find((f) => f.id === row.fieldId)
  const operatorOption = getOperatorOption(field, row.operatorKey)
  const operators = field ? getOperatorsForField(field) : []
  const valueOptions = field && operatorOption ? getValueOptions(field, operatorOption) : []

  const valuePlaceholder =
    operatorOption?.valueKind === 'between'
      ? 'YYYY-MM-DD..YYYY-MM-DD'
      : operatorOption?.valueKind === 'date'
        ? 'YYYY-MM-DD'
        : operatorOption?.valueKind === 'multi'
          ? translateFilterKey(t, 'custom:frontend:filters:multiValuePlaceholder')
          : translateFilterKey(t, 'custom:frontend:filters:valuePlaceholder')

  return (
    <div className="space-y-2">
      {index > 0 ? (
        <Select
          onValueChange={(logic) => onChange({ logic: logic as FilterLogic })}
          value={row.logic}
        >
          <SelectTrigger className="h-7 w-20 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="and">{translateFilterKey(t, 'custom:frontend:filters:and')}</SelectItem>
            <SelectItem value="or">{translateFilterKey(t, 'custom:frontend:filters:or')}</SelectItem>
          </SelectContent>
        </Select>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Select onValueChange={(fieldId) => onChange({ fieldId })} value={row.fieldId || undefined}>
          <SelectTrigger className="h-8 min-w-[7rem] flex-1">
            <SelectValue placeholder={translateFilterKey(t, 'custom:frontend:filters:selectField')} />
          </SelectTrigger>
          <SelectContent>
            {fields.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {translateFieldLabel(t, f)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          disabled={!field}
          onValueChange={(operatorKey) => onChange({ operatorKey })}
          value={row.operatorKey || undefined}
        >
          <SelectTrigger className="h-8 min-w-[6rem] flex-1">
            <SelectValue placeholder={translateFilterKey(t, 'custom:frontend:filters:selectOperator')} />
          </SelectTrigger>
          <SelectContent>
            {operators.map((op) => (
              <SelectItem key={op.id} value={op.id}>
                {translateFilterKey(t, op.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {operatorOption?.needsValue ? (
          operatorOption.valueKind === 'multi' ? (
            <GroupedSearchPicker
              multi
              onChange={(values) => onChange({ values })}
              options={
                field?.type === 'relationship'
                  ? fieldRelationshipOptions
                  : valueOptions.map((o) => ({
                      id: o.value,
                      label: translateOptionLabel(t, o),
                    }))
              }
              placeholder={valuePlaceholder}
              t={t}
              values={row.values}
            />
          ) : operatorOption.valueKind === 'select' || operatorOption.valueKind === 'relative' ? (
            <Select
              onValueChange={(value) => onChange({ values: [value] })}
              value={row.values[0] || undefined}
            >
              <SelectTrigger className="h-8 min-w-[7rem] flex-[1.5]">
                <SelectValue placeholder={translateFilterKey(t, 'custom:frontend:filters:selectValue')} />
              </SelectTrigger>
              <SelectContent>
                {valueOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {translateOptionLabel(t, option)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : operatorOption.valueKind === 'relationship' ? (
            <GroupedSearchPicker
              onChange={(values) => onChange({ values })}
              options={fieldRelationshipOptions}
              placeholder={valuePlaceholder}
              t={t}
              values={row.values}
            />
          ) : (
            <Input
              className="h-8 min-w-[7rem] flex-[1.5]"
              onChange={(e) => onChange({ values: [e.target.value] })}
              placeholder={valuePlaceholder}
              value={row.values[0] ?? ''}
            />
          )
        ) : (
          <div className="h-8 min-w-[7rem] flex-[1.5]" />
        )}

        <Button
          aria-label={translateFilterKey(t, 'custom:frontend:filters:remove')}
          className="size-8 shrink-0"
          onClick={onRemove}
          size="icon"
          type="button"
          variant="ghost"
        >
          <X className="size-4" />
        </Button>
      </div>

      {showScopeHint ? (
        <p className="text-xs text-muted-foreground">
          {translateFilterKey(t, 'custom:frontend:filters:categoryScopeHint')}
        </p>
      ) : null}
    </div>
  )
}

type GroupedSearchPickerProps = {
  options: RelationshipFilterOption[]
  values: string[]
  placeholder: string
  multi?: boolean
  onChange: (values: string[]) => void
  t: ReturnType<typeof useAppTranslation>['t']
}

function GroupedSearchPicker(props: GroupedSearchPickerProps) {
  const { options, values, placeholder, multi = false, onChange, t } = props
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(q) || option.group?.toLowerCase().includes(q),
    )
  }, [options, query])

  const groups = useMemo(() => {
    const hasGroups = options.some((option) => option.group)
    if (!hasGroups) return [['', filtered] as const]

    const map = new Map<string, RelationshipFilterOption[]>()
    for (const option of filtered) {
      const key = option.group ?? ''
      const list = map.get(key) ?? []
      list.push(option)
      map.set(key, list)
    }

    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
  }, [filtered, options])

  const selectedLabel = useMemo(() => {
    if (!values.length) return placeholder
    if (values.length === 1) {
      const option = options.find((o) => o.id === values[0])
      return option ? formatRelationshipOptionLabel(option) : values[0]
    }
    return translateFilterKey(t, 'custom:frontend:filters:selectedCount').replace(
      '{count}',
      String(values.length),
    )
  }, [options, placeholder, t, values])

  const toggle = (id: string) => {
    if (multi) {
      const next = values.includes(id) ? values.filter((v) => v !== id) : [...values, id]
      onChange(next)
      return
    }
    onChange([id])
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
          className="h-8 min-w-[8rem] flex-[1.5] justify-between font-normal"
          type="button"
          variant="outline"
        >
          <span className="truncate text-left">{selectedLabel}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <div className="border-b p-2">
          <Input
            className="h-8"
            onChange={(e) => setQuery(e.target.value)}
            placeholder={translateFilterKey(t, 'custom:frontend:filters:searchPlaceholder')}
            value={query}
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              {translateFilterKey(t, 'custom:frontend:filters:noMatches')}
            </p>
          ) : (
            groups.map(([group, groupOptions]) => (
              <div key={group || 'default'}>
                {group ? (
                  <p className="sticky top-0 z-10 bg-popover px-2 py-1.5 text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                    {group}
                  </p>
                ) : null}
                {groupOptions.map((option) => (
                  multi ? (
                    <label
                      className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                      key={option.id}
                    >
                      <Checkbox
                        checked={values.includes(option.id)}
                        onCheckedChange={() => toggle(option.id)}
                      />
                      <span className="truncate">{option.label}</span>
                    </label>
                  ) : (
                    <button
                      className={cn(
                        'flex w-full rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent',
                        values[0] === option.id && 'bg-accent',
                      )}
                      key={option.id}
                      onClick={() => toggle(option.id)}
                      type="button"
                    >
                      {option.label}
                    </button>
                  )
                ))}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

type ActiveFilterChipProps = {
  clause: FilterClause
  fields: FilterFieldDefinition[]
  relationshipRegistry: Record<string, RelationshipFilterOption[]>
  appliedBudgetId?: string
  onRemove: () => void
  t: ReturnType<typeof useAppTranslation>['t']
}

function ActiveFilterChip(props: ActiveFilterChipProps) {
  const { clause, fields, relationshipRegistry, appliedBudgetId, onRemove, t } = props
  const field = fields.find((f) => f.id === clause.field)
  if (!field) return null

  const operatorOption = getOperatorOption(field, clauseToOperatorKey(clause))

  const valueLabel = formatClauseValue(
    clause,
    field,
    relationshipRegistry,
    t,
    appliedBudgetId,
  )

  const operatorLabel = operatorOption
    ? translateFilterKey(t, operatorOption.labelKey)
    : clause.operator

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-md border bg-muted/50 px-2 py-1 text-xs',
      )}
    >
      <span className="text-muted-foreground">{translateFieldLabel(t, field)}</span>
      <span>{operatorLabel}</span>
      {valueLabel ? <span className="font-medium">{valueLabel}</span> : null}
      <button
        aria-label={translateFilterKey(t, 'custom:frontend:filters:remove')}
        className="rounded-sm p-0.5 hover:bg-muted"
        onClick={onRemove}
        type="button"
      >
        <X className="size-3" />
      </button>
    </div>
  )
}

function formatClauseValue(
  clause: FilterClause,
  field: FilterFieldDefinition,
  relationshipRegistry: Record<string, RelationshipFilterOption[]>,
  t: ReturnType<typeof useAppTranslation>['t'],
  appliedBudgetId?: string,
): string {
  const relOptions = relationshipRegistry[clause.field] ?? []

  const labelForOption = (option: RelationshipFilterOption) =>
    option.group && !appliedBudgetId ? formatRelationshipOptionLabel(option) : option.label

  if (clause.operator === 'exists') return ''

  if (Array.isArray(clause.value)) {
    const option = findRelationshipOptionForValue(relOptions, clause.value)
    if (option) return labelForOption(option)

    return clause.value
      .map((v) => {
        if (field.type === 'relationship') {
          const match = relOptions.find((o) => o.id === v)
          return match ? labelForOption(match) : v
        }
        const option = findSelectOption(field, v)
        return option ? translateOptionLabel(t, option) : v
      })
      .join(', ')
  }

  if (field.type === 'relationship' && typeof clause.value === 'string') {
    const option = findRelationshipOptionForValue(relOptions, clause.value)
    if (option) return labelForOption(option)

    const match = relOptions.find((o) => o.id === clause.value)
    return match ? labelForOption(match) : clause.value
  }

  if (field.type === 'select' && typeof clause.value === 'string') {
    const option = findSelectOption(field, clause.value)
    return option ? translateOptionLabel(t, option) : clause.value
  }

  if (clause.operator === 'relative' && typeof clause.value === 'string') {
    const preset = field.relativePresets?.find((p) => p.value === clause.value)
    return preset ? translateOptionLabel(t, preset) : clause.value
  }

  return String(clause.value ?? '')
}
