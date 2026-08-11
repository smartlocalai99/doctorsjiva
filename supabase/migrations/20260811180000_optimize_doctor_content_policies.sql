-- Cache auth.uid() once per statement in doctor content RLS policies.

alter policy "Doctors can update their own profile"
on public.doctor_profiles
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

alter policy "Doctors can insert their own profile"
on public.doctor_profiles
with check ((select auth.uid()) = id);

alter policy "Public can view published posts"
on public.health_posts
using (status = 'published' or (select auth.uid()) = doctor_id);

alter policy "Doctors can create their own posts"
on public.health_posts
with check ((select auth.uid()) = doctor_id);

alter policy "Doctors can update their own posts"
on public.health_posts
using ((select auth.uid()) = doctor_id)
with check ((select auth.uid()) = doctor_id);

alter policy "Doctors can delete their own posts"
on public.health_posts
using ((select auth.uid()) = doctor_id);

alter policy "Doctors can upload feed media"
on storage.objects
with check (bucket_id = 'health-feed' and (storage.foldername(name))[1] = (select auth.uid())::text);

alter policy "Doctors can update feed media"
on storage.objects
using (bucket_id = 'health-feed' and owner_id = (select auth.uid())::text)
with check (bucket_id = 'health-feed' and owner_id = (select auth.uid())::text);

alter policy "Doctors can delete feed media"
on storage.objects
using (bucket_id = 'health-feed' and owner_id = (select auth.uid())::text);

alter policy "Doctors can upload avatars"
on storage.objects
with check (bucket_id = 'doctor-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

alter policy "Doctors can update avatars"
on storage.objects
using (bucket_id = 'doctor-avatars' and owner_id = (select auth.uid())::text)
with check (bucket_id = 'doctor-avatars' and owner_id = (select auth.uid())::text);

alter policy "Doctors can delete avatars"
on storage.objects
using (bucket_id = 'doctor-avatars' and owner_id = (select auth.uid())::text);
