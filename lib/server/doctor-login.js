import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'node:crypto';

import { TEST_DOCTOR, TEST_LOGIN_CODE, TEST_PHONE } from '@/lib/test-doctor';

function normalizePhone(value = '') {
  const digits = value.replace(/\D/g, '').slice(-10);
  return digits.length === 10 ? `+91${digits}` : '';
}

function equalText(left, right) {
  const first = Buffer.from(left);
  const second = Buffer.from(right);
  return first.length === second.length && timingSafeEqual(first, second);
}

export async function verifyDoctorLogin(phoneValue, codeValue) {
  const phone = normalizePhone(phoneValue);
  const code = String(codeValue || '').trim();
  if (!phone || !/^\d{4}$/.test(code)) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    return equalText(phone, TEST_PHONE) && equalText(code, TEST_LOGIN_CODE) ? TEST_DOCTOR : null;
  }

  const serverClient = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await serverClient
    .rpc('verify_doctor_login', { input_phone: phone, input_code: code })
    .maybeSingle();
  if (error) throw error;
  return data;
}
