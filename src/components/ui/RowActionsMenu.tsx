'use client'

import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { MoreVertical, Eye, Pencil, Trash2, type LucideIcon } from 'lucide-react'
import { clsx } from 'clsx'

export interface RowExtraAction {
  label: string
  icon: LucideIcon
  onClick: () => void
  disabled?: boolean
  /** 'danger' per azioni distruttive (es. disattiva), default neutro */
  variant?: 'default' | 'danger'
}

interface RowActionsMenuProps {
  onDetails?: () => void
  onEdit?: () => void
  onDelete?: () => void
  deleteDisabled?: boolean
  deleteDisabledReason?: string
  /** Azioni aggiuntive inserite tra Modifica ed Elimina (es. Ricalcola saldo, Disattiva) */
  extraActions?: RowExtraAction[]
}

/** Menu kebab (⋮) con le azioni di riga: Dettagli, Modifica, [extra], Elimina */
export default function RowActionsMenu({ onDetails, onEdit, onDelete, deleteDisabled, deleteDisabledReason, extraActions }: RowActionsMenuProps) {
  return (
    <Menu as="div" className="relative inline-block text-left">
      <MenuButton
        onClick={(e) => e.stopPropagation()}
        className="p-1.5 rounded-lg text-ink-muted hover:text-ink-secondary hover:bg-inset transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label="Azioni transazione"
      >
        <MoreVertical className="w-4 h-4" />
      </MenuButton>
      <MenuItems
        anchor="bottom end"
        className="z-50 w-52 rounded-lg bg-elevated border border-edge shadow-elevated p-1 focus:outline-none"
      >
        {onDetails && (
          <MenuItem>
            {({ focus }) => (
              <button
                onClick={(e) => { e.stopPropagation(); onDetails() }}
                className={clsx(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md text-ink-secondary transition-colors',
                  focus && 'bg-inset text-ink'
                )}
              >
                <Eye className="w-4 h-4" />
                Dettagli
              </button>
            )}
          </MenuItem>
        )}
        {onEdit && (
          <MenuItem>
            {({ focus }) => (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit() }}
                className={clsx(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md text-ink-secondary transition-colors',
                  focus && 'bg-inset text-ink'
                )}
              >
                <Pencil className="w-4 h-4" />
                Modifica
              </button>
            )}
          </MenuItem>
        )}
        {extraActions?.map((action, index) => (
          <MenuItem key={index} disabled={action.disabled}>
            {({ focus }) => (
              <button
                onClick={(e) => { e.stopPropagation(); action.onClick() }}
                disabled={action.disabled}
                className={clsx(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                  action.variant === 'danger' ? 'text-danger' : 'text-ink-secondary',
                  focus && !action.disabled && (action.variant === 'danger' ? 'bg-danger-subtle' : 'bg-inset text-ink')
                )}
              >
                <action.icon className="w-4 h-4" />
                {action.label}
              </button>
            )}
          </MenuItem>
        ))}
        {onDelete && (
          <MenuItem disabled={deleteDisabled}>
            {({ focus }) => (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete() }}
                disabled={deleteDisabled}
                title={deleteDisabled ? deleteDisabledReason : undefined}
                className={clsx(
                  'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md text-danger transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                  focus && !deleteDisabled && 'bg-danger-subtle'
                )}
              >
                <Trash2 className="w-4 h-4" />
                Elimina
              </button>
            )}
          </MenuItem>
        )}
      </MenuItems>
    </Menu>
  )
}
