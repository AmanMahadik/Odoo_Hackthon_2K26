-- 1. Create a new storage bucket for documents
insert into storage.buckets (id, name, public) 
values ('documents', 'documents', true);

-- 2. Allow public access to read files
create policy "Public Access" 
on storage.objects for select 
using ( bucket_id = 'documents' );

-- 3. Allow authenticated users to upload files
create policy "Auth Upload" 
on storage.objects for insert 
with check ( bucket_id = 'documents' and auth.role() = 'authenticated' );

-- 4. Allow authenticated users to update/delete their own uploads (optional based on your exact security model)
create policy "Auth Update/Delete" 
on storage.objects for all 
using ( bucket_id = 'documents' and auth.role() = 'authenticated' );
