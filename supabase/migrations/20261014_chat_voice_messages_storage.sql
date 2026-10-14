insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chat-voice-messages',
  'chat-voice-messages',
  false,
  20971520,
  array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authenticated users can read voice messages" on storage.objects;
create policy "Authenticated users can read voice messages"
on storage.objects for select to authenticated
using (
  bucket_id = 'chat-voice-messages'
  and (
    (
      split_part(name, '/', 1) = 'private'
      and auth.uid()::text in (split_part(name, '/', 2), split_part(name, '/', 3))
      and exists (
        select 1
        from public.sys_t110 as message
        where message.remetente_id::text = split_part(name, '/', 2)
          and message.destinatario_id::text = split_part(name, '/', 3)
      )
    )
    or (
      split_part(name, '/', 1) = 'group'
      and auth.role() = 'authenticated'
    )
  )
);

drop policy if exists "Users can upload their own voice messages" on storage.objects;
create policy "Users can upload their own voice messages"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'chat-voice-messages'
  and split_part(name, '/', 2) = auth.uid()::text
  and split_part(name, '/', 1) in ('private', 'group')
);

drop policy if exists "Users can delete their own voice messages" on storage.objects;
create policy "Users can delete their own voice messages"
on storage.objects for delete to authenticated
using (
  bucket_id = 'chat-voice-messages'
  and split_part(name, '/', 2) = auth.uid()::text
);
