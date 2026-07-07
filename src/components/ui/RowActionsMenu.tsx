'use client'

import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'
import { MoreVertical, Eye, Pencil, Trash2 } from 'lucide-react'
import { clsx } from 'clsx'

interface RowActionsMenuProps {
  onDetails: () => void
  onEdit: () => void
  onDelete: () => void
}

/** Menu kebab (⋮) con le azioni di riga: Dettagli, Modifica, Elimina */
export default function RowActionsMenu({ onDetails, onEdit, onDelete }: RowActionsMenuProps) {
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
        className="z-50 w-44 rounded-lg bg-elevated border border-edge shadow-elevated p-1 focus:outline-none"
      >
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
        <MenuItem>
          {({ focus }) => (
            <button
              onClick={(e) => { e.stopPropagation(); onDelete() }}
              className={clsx(
                'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md text-danger transition-colors',
                focus && 'bg-danger-subtle'
              )}
            >
              <Trash2 className="w-4 h-4" />
              Elimina
            </button>
          )}
        </MenuItem>
      </MenuItems>
    </Menu>
  )
}
