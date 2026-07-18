import { createSupabaseBrowserClient } from '@/lib/supabase/client'

/**
 * Allegati (T6.1) — bucket privato `attachments` su Supabase Storage.
 *
 * Convenzione path: <user_id>/<module>/<entity>/<uuid>.<ext>
 * L'isolamento per utente è garantito dalle policy RLS sul bucket
 * (migration 20260718_attachments_storage): la prima cartella del path
 * DEVE essere lo user id, altrimenti l'operazione viene rifiutata.
 *
 * Il bucket è privato: per mostrare un file si usa un URL firmato a scadenza.
 */

export const ATTACHMENTS_BUCKET = 'attachments'
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024 // allineato a file_size_limit del bucket

export const ALLOWED_ATTACHMENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
] as const

export type AttachmentModule = 'house' | 'grocery' | 'health' | 'finance' | 'tasks' | 'learning'

export interface UploadedAttachment {
  /** Path completo nel bucket, da salvare nella colonna dell'entità */
  path: string
  /** Nome file originale, da mostrare in UI */
  fileName: string
  contentType: string
  size: number
}

/** Validazione client-side (il bucket la impone comunque lato server) */
export function validateAttachment(file: File): string | null {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return `Il file supera il limite di ${Math.round(MAX_ATTACHMENT_BYTES / 1024 / 1024)} MB`
  }
  if (!(ALLOWED_ATTACHMENT_TYPES as readonly string[]).includes(file.type)) {
    return 'Formato non supportato: sono ammessi PDF e immagini (JPEG, PNG, WebP, HEIC)'
  }
  return null
}

/**
 * Carica un allegato per un'entità di un modulo.
 * @param entity es. 'bills', 'receipts', 'reports'
 */
export async function uploadAttachment(
  userId: string,
  module: AttachmentModule,
  entity: string,
  file: File
): Promise<UploadedAttachment> {
  const validationError = validateAttachment(file)
  if (validationError) throw new Error(validationError)

  const supabase = createSupabaseBrowserClient()
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin'
  const path = `${userId}/${module}/${entity}/${crypto.randomUUID()}.${ext}`

  const { error } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })

  if (error) throw error

  return { path, fileName: file.name, contentType: file.type, size: file.size }
}

/** URL firmato per preview/download (default: valido 1 ora) */
export async function getAttachmentUrl(path: string, expiresInSeconds = 3600): Promise<string> {
  const supabase = createSupabaseBrowserClient()
  const { data, error } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .createSignedUrl(path, expiresInSeconds)

  if (error) throw error
  return data.signedUrl
}

export async function deleteAttachment(path: string): Promise<void> {
  const supabase = createSupabaseBrowserClient()
  const { error } = await supabase.storage.from(ATTACHMENTS_BUCKET).remove([path])
  if (error) throw error
}
