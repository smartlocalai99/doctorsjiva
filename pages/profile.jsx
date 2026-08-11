/* eslint-disable @next/next/no-img-element -- profile photos can be browser blob previews or user-managed URLs */
import {
  BadgeCheck,
  BriefcaseMedical,
  Building2,
  Camera,
  CheckCircle2,
  GraduationCap,
  Loader2,
  LogOut,
  MapPin,
  Phone,
  Save,
  Stethoscope,
  UserRound,
} from 'lucide-react';
import Head from 'next/head';
import { useEffect, useRef, useState } from 'react';

import { Field } from '@/components/Ui';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';

const completionFields = ['display_name', 'specialty', 'qualifications', 'hospital_name', 'experience_years', 'city', 'bio', 'avatar_url'];

export default function ProfilePage() {
  const { profile, loading } = useWorkspace();
  return (
    <>
      <Head><title>Profile · DRJIVA Doctors</title></Head>
      <div className="page-container doctor-profile-page">
        <header className="profile-page-heading">
          <p>Professional identity</p>
          <h1>Doctor profile</h1>
          <span>Keep the information patients see beside your health content accurate and complete.</span>
        </header>
        {loading || !profile ? <div className="panel h-96 animate-pulse bg-slate-100" /> : <ProfileForm profile={profile} />}
      </div>
    </>
  );
}

function ProfileForm({ profile }) {
  const inputRef = useRef(null);
  const { signOut } = useAuth();
  const { saveProfile } = useWorkspace();
  const [form, setForm] = useState(() => normalizeProfile(profile));
  const [preview, setPreview] = useState(profile.avatar_url || '');
  const [previewFailed, setPreviewFailed] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    return () => {
      if (preview.startsWith('blob:')) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  useEffect(() => {
    if (!dirty) return undefined;
    const warnBeforeLeaving = (event) => event.preventDefault();
    window.addEventListener('beforeunload', warnBeforeLeaving);
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving);
  }, [dirty]);

  const update = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);
    setMessage('');
  };

  const chooseAvatar = async (file) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPG, PNG or WebP profile image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Choose a profile image below 5 MB.');
      return;
    }

    const previousPreview = preview;
    setPreviewFailed(false);
    setPreview(URL.createObjectURL(file));
    setMessage('');
    setError('');
    setAvatarSaving(true);
    try {
      const saved = await saveProfile({ ...form, avatar_file: file });
      setForm(normalizeProfile(saved));
      setPreview(saved.avatar_url || '');
      setMessage('Profile photo updated.');
    } catch (saveError) {
      setPreview(previousPreview);
      setError(saveError.message);
    } finally {
      setAvatarSaving(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const saved = await saveProfile(form);
      setForm(normalizeProfile(saved));
      setPreviewFailed(false);
      setPreview(saved.avatar_url || '');
      setDirty(false);
      setMessage('Profile changes saved.');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const completion = calculateCompletion({ ...form, avatar_url: preview });

  return (
    <form className="doctor-profile-form" onSubmit={submit}>
      <section className="doctor-profile-identity" aria-label="Public doctor identity">
        <button className="doctor-profile-photo-button" type="button" disabled={avatarSaving} onClick={() => inputRef.current?.click()} aria-label="Change profile photo">
          <span className="doctor-profile-photo">
            {preview && !previewFailed ? <img src={preview} alt="" width="96" height="96" onError={() => setPreviewFailed(true)} /> : <UserRound aria-hidden="true" size={42} />}
            {avatarSaving ? <span className="doctor-profile-photo-loading"><Loader2 aria-hidden="true" className="spin" size={22} /></span> : null}
          </span>
          <span className="doctor-profile-camera"><Camera aria-hidden="true" size={15} /></span>
        </button>
        <input ref={inputRef} hidden disabled={avatarSaving} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseAvatar(event.target.files?.[0])} />
        <div className="doctor-profile-title">
          <div><h2>{form.display_name || 'Doctor'}</h2><BadgeCheck aria-label="Verified doctor" fill="currentColor" size={19} /></div>
          <p>{form.specialty || 'Add your specialty'}</p>
          <span>{form.hospital_name || 'Add hospital'}{form.city ? ` · ${form.city}` : ''}</span>
        </div>
        <div className="doctor-profile-public-note"><CheckCircle2 aria-hidden="true" size={17} /><span>Changes update your public health-feed profile.</span></div>
      </section>

      <div className="doctor-profile-layout">
        <div className="profile-form-stack">
          <section className="profile-section-card">
            <SectionTitle icon={Stethoscope} title="Professional details" description="How patients identify you in the health feed." />
            <div className="profile-field-grid">
              <Field label="Display name" autoComplete="name" value={form.display_name} onChange={(event) => update('display_name', event.target.value)} placeholder="Dr. Ritish Reddy" />
              <Field label="Specialty" value={form.specialty} onChange={(event) => update('specialty', event.target.value)} placeholder="Gastroenterology" />
              <Field className="sm:col-span-2" label="Qualifications" value={form.qualifications} onChange={(event) => update('qualifications', event.target.value)} placeholder="MBBS, MD, DM – Gastroenterology" />
            </div>
          </section>

          <section className="profile-section-card">
            <SectionTitle icon={Building2} title="Practice details" description="Your hospital, location and clinical experience." />
            <div className="profile-field-grid">
              <Field label="Hospital or clinic" value={form.hospital_name} onChange={(event) => update('hospital_name', event.target.value)} placeholder="Asian Hospitals" />
              <Field label="City" autoComplete="address-level2" value={form.city} onChange={(event) => update('city', event.target.value)} placeholder="Hyderabad" />
              <Field label="Experience (years)" type="number" min="0" max="80" inputMode="numeric" value={form.experience_years} onChange={(event) => update('experience_years', Number(event.target.value))} />
            </div>
          </section>

          <section className="profile-section-card">
            <SectionTitle icon={GraduationCap} title="About your care" description="A short introduction patients can understand." />
            <Field label="Professional bio" textarea maxLength={400} value={form.bio} onChange={(event) => update('bio', event.target.value)} placeholder="Tell patients about your experience, care focus and approach…" hint={`${form.bio.length}/400 characters`} />
          </section>

          {message ? <p className="success-banner" role="status">{message}</p> : null}
          {error ? <p className="error-banner" role="alert">{error}</p> : null}

          <div className="profile-save-bar">
            <div><strong>{dirty ? 'You have unsaved changes' : 'Your profile is up to date'}</strong><span>{dirty ? 'Save to update the doctor app and patient feed.' : 'Edit any field when your professional details change.'}</span></div>
            <button className="primary-button" type="submit" disabled={saving || !dirty}><Save aria-hidden="true" size={18} /> {saving ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}</button>
          </div>
        </div>

        <aside className="profile-side-stack">
          <section className="profile-strength-card">
            <div><span>Profile strength</span><strong>{completion}%</strong></div>
            <div className="profile-progress-track" aria-label={`${completion}% profile complete`} role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={completion}><i style={{ width: `${completion}%` }} /></div>
            <p>{completion === 100 ? 'Your profile gives patients a complete professional overview.' : 'Add the missing details to make your public profile more useful.'}</p>
            <ul>
              <CompletionItem complete={Boolean(preview)} icon={Camera} label="Profile photo" />
              <CompletionItem complete={Boolean(form.qualifications)} icon={GraduationCap} label="Qualifications" />
              <CompletionItem complete={Boolean(form.hospital_name && form.city)} icon={MapPin} label="Practice location" />
              <CompletionItem complete={Boolean(form.bio)} icon={BriefcaseMedical} label="Professional bio" />
            </ul>
          </section>

          <section className="profile-account-card">
            <p>Doctor account</p>
            <div><Phone aria-hidden="true" size={18} /><span><small>Registered mobile</small><strong>{formatPhone(form.phone_number)}</strong></span></div>
            <p className="profile-account-hint">This number is the account key and cannot be edited here.</p>
            <button className="quiet-button" type="button" onClick={signOut}><LogOut aria-hidden="true" size={17} /> Sign out</button>
          </section>
        </aside>
      </div>
    </form>
  );
}

function SectionTitle({ icon: Icon, title, description }) {
  return <div className="profile-section-title"><span><Icon aria-hidden="true" size={19} /></span><div><h2>{title}</h2><p>{description}</p></div></div>;
}

function CompletionItem({ complete, icon: Icon, label }) {
  return <li className={complete ? 'complete' : ''}><span>{complete ? <CheckCircle2 aria-hidden="true" size={17} /> : <Icon aria-hidden="true" size={17} />}</span>{label}</li>;
}

function normalizeProfile(profile) {
  return {
    ...profile,
    display_name: profile.display_name || '',
    specialty: profile.specialty || '',
    hospital_name: profile.hospital_name || '',
    experience_years: profile.experience_years || 0,
    qualifications: profile.qualifications || '',
    city: profile.city || '',
    bio: profile.bio || '',
  };
}

function calculateCompletion(profile) {
  const complete = completionFields.filter((field) => Boolean(profile[field])).length;
  return Math.round((complete / completionFields.length) * 100);
}

function formatPhone(phone = '') {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  return phone || 'Not available';
}
