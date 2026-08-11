/* eslint-disable @next/next/no-img-element -- profile photos can be browser blob previews or user-managed URLs */
import { Camera, LogOut, Save, UserRound } from 'lucide-react';
import Head from 'next/head';
import { useRef, useState } from 'react';

import { Field, PageHeading } from '@/components/Ui';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';

export default function ProfilePage() {
  const { profile, loading } = useWorkspace();
  return (
    <>
      <Head><title>Profile · DRJIVA Doctors</title></Head>
      <div className="page-container">
        <PageHeading eyebrow="Professional identity" title="Doctor profile" description="This information appears beside your health content in the patient feed." />
        {loading || !profile ? <div className="panel h-96 animate-pulse bg-slate-100" /> : <ProfileForm key={profile.updated_at || profile.id} profile={profile} />}
      </div>
    </>
  );
}

function ProfileForm({ profile }) {
  const inputRef = useRef(null);
  const { signOut } = useAuth();
  const { saveProfile } = useWorkspace();
  const [form, setForm] = useState({
    ...profile,
    display_name: profile.display_name || '',
    username: profile.username || '',
    specialty: profile.specialty || '',
    qualifications: profile.qualifications || '',
    registration_number: profile.registration_number || '',
    bio: profile.bio || '',
  });
  const [preview, setPreview] = useState(profile.avatar_url || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const chooseAvatar = (file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('Choose a profile image below 5 MB.');
      return;
    }
    if (preview.startsWith('blob:')) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
    setForm((current) => ({ ...current, avatar_file: file }));
    setMessage('');
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const saved = await saveProfile(form);
      setForm(saved);
      setPreview(saved.avatar_url || '');
      setMessage('Profile updated successfully.');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="profile-grid" onSubmit={submit}>
      <aside className="profile-aside">
        <div className="profile-photo-wrap">
          {preview ? <img className="size-full object-cover" src={preview} alt="Profile preview" /> : <UserRound size={52} />}
          <button type="button" onClick={() => inputRef.current?.click()} aria-label="Change profile photo"><Camera size={18} /></button>
        </div>
        <input ref={inputRef} className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseAvatar(event.target.files?.[0])} />
        <h2>{form.display_name || 'Doctor'}</h2>
        <p>{form.specialty || 'Add your specialty'}</p>
        <button className="quiet-button mt-5 lg:hidden" type="button" onClick={signOut}><LogOut size={17} /> Sign out</button>
      </aside>

      <section className="panel grid gap-5 p-5 sm:p-7">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Display name" value={form.display_name} onChange={(event) => update('display_name', event.target.value)} placeholder="Dr. Priya Mehta" />
          <Field label="Username" value={form.username} onChange={(event) => update('username', event.target.value)} placeholder="drpriyamehta" hint="Letters, numbers, underscore and dot only." />
          <Field label="Specialty" value={form.specialty} onChange={(event) => update('specialty', event.target.value)} placeholder="Nutritionist" />
          <Field label="Qualifications" value={form.qualifications} onChange={(event) => update('qualifications', event.target.value)} placeholder="MBBS, MD" />
        </div>
        <Field label="Medical registration number" value={form.registration_number} onChange={(event) => update('registration_number', event.target.value)} placeholder="Optional for now" />
        <Field label="Professional bio" textarea maxLength={400} value={form.bio} onChange={(event) => update('bio', event.target.value)} placeholder="Tell patients about your experience and approach…" hint={`${form.bio.length}/400 characters`} />
        {message ? <p className="success-banner" role="status">{message}</p> : null}
        {error ? <p className="error-banner" role="alert">{error}</p> : null}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button className="secondary-button hidden lg:inline-flex" type="button" onClick={signOut}><LogOut size={17} /> Sign out</button>
          <button className="primary-button" type="submit" disabled={saving}><Save size={18} /> {saving ? 'Saving…' : 'Save profile'}</button>
        </div>
      </section>
    </form>
  );
}
