-- T6.1 — Storage allegati (Supabase Storage)
--
-- Un bucket privato `attachments` per tutti i moduli, con isolamento
-- per-utente via RLS sul path: la prima cartella del percorso è lo user id.
-- Convenzione path: <user_id>/<module>/<entity>/<uuid>.<ext>
--   es. 8f…/house/bills/6c….pdf
--
-- Limiti: 10 MB per file; solo PDF e immagini (prima necessità: PDF bollette
-- House, poi scontrini Grocery e referti Health).
-- Accesso in lettura: URL firmati generati dal client (bucket privato).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'attachments',
    'attachments',
    false,
    10 * 1024 * 1024,
    array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- RLS: ogni utente vede e gestisce solo i file sotto la propria cartella
drop policy if exists "attachments_select_own" on storage.objects;
create policy "attachments_select_own" on storage.objects
    for select to authenticated
    using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "attachments_insert_own" on storage.objects;
create policy "attachments_insert_own" on storage.objects
    for insert to authenticated
    with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "attachments_update_own" on storage.objects;
create policy "attachments_update_own" on storage.objects
    for update to authenticated
    using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text)
    with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "attachments_delete_own" on storage.objects;
create policy "attachments_delete_own" on storage.objects
    for delete to authenticated
    using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);
