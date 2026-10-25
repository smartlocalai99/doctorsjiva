-- Dr. Mounika now logs in with 8008635588. Her PIN (the bcrypt hash),
-- posts and followers move with her; the old number stops working.
-- One statement, so the doctor_access foreign key (no ON UPDATE CASCADE)
-- is checked after both rows have moved.
with moved_access as (
  update private.doctor_access
  set phone_number = '+918008635588', failed_attempts = 0, locked_until = null, updated_at = now()
  where phone_number = '+919515174738'
  returning phone_number
)
update public.doctors
set phone_number = '+918008635588', updated_at = now()
where phone_number = '+919515174738';
