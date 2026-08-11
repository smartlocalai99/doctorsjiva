-- Add Dr. Mounika (Dhruva Hospital, Gynecology) as a phone-keyed doctor
-- account, matching the pattern in 20260811170000_add_phone_keyed_test_doctor.sql.
-- Login code is a temporary 4-digit PIN; the doctor sets her own profile
-- photo through the doctor app after logging in.

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
  '+919515174738',
  'Dr. Mounika',
  'dr-mounika',
  'Gynecology',
  'Dhruva Hospital',
  7,
  '',
  '',
  '',
  0,
  'verified',
  true
)
on conflict (phone_number) do update set
  display_name = excluded.display_name,
  slug = excluded.slug,
  specialty = excluded.specialty,
  hospital_name = excluded.hospital_name,
  experience_years = excluded.experience_years,
  verification_status = excluded.verification_status,
  is_active = excluded.is_active,
  updated_at = now();

insert into private.doctor_access (phone_number, login_code_hash)
values ('+919515174738', extensions.crypt('1234', extensions.gen_salt('bf', 10)))
on conflict (phone_number) do update set
  login_code_hash = excluded.login_code_hash,
  failed_attempts = 0,
  locked_until = null,
  updated_at = now();
