-- Move the temporary doctor login to the production testing phone number.

insert into public.doctors (
  phone_number,
  display_name,
  slug,
  specialty,
  hospital_name,
  experience_years,
  qualifications,
  city,
  bio,
  follower_count,
  verification_status,
  is_active
)
values (
  '+919866531011',
  'Dr. Ritish Reddy',
  'dr-ritish-reddy-phone-migration',
  'Gastroenterology',
  'Asian Hospitals',
  8,
  'MBBS, MD, DM – Gastroenterology',
  'Hyderabad',
  'Gastroenterologist focused on digestive health, liver care and practical guidance patients can understand.',
  0,
  'verified',
  true
)
on conflict (phone_number) do update set
  display_name = excluded.display_name,
  specialty = excluded.specialty,
  hospital_name = excluded.hospital_name,
  experience_years = excluded.experience_years,
  qualifications = excluded.qualifications,
  city = excluded.city,
  bio = excluded.bio,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into private.doctor_access (phone_number, login_code_hash)
values ('+919866531011', extensions.crypt('1234', extensions.gen_salt('bf', 10)))
on conflict (phone_number) do update set
  login_code_hash = excluded.login_code_hash,
  failed_attempts = 0,
  locked_until = null,
  updated_at = now();

update public.health_posts
set doctor_phone = '+919866531011'
where doctor_phone = '+919876543210';

delete from public.doctors
where phone_number = '+919876543210';

update public.doctors
set slug = 'dr-ritish-reddy', updated_at = now()
where phone_number = '+919866531011';
