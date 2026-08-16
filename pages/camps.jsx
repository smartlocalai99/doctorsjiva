import { CalendarPlus, Heart, Send, ShieldCheck, Smile, Stethoscope, Trash2 } from 'lucide-react';
import Head from 'next/head';
import { useEffect, useState } from 'react';

import { Field, PageHeading } from '@/components/Ui';
import { deleteCamp, loadCamps, saveCamp } from '@/lib/repository';

const initialForm = {
  title: '',
  eventType: 'medical',
  eventDate: '',
  startTime: '',
  endTime: '',
  location: '',
  description: '',
};

const TYPE_OPTIONS = [
  { key: 'medical', label: 'Medical', icon: Stethoscope },
  { key: 'dental', label: 'Dental', icon: Smile },
  { key: 'other', label: 'Other', icon: Heart },
];

export default function CampsPage() {
  const [form, setForm] = useState(initialForm);
  const [camps, setCamps] = useState([]);
  const [hospitalName, setHospitalName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const refresh = () => {
    setLoading(true);
    loadCamps()
      .then((result) => {
        setCamps(result.camps || []);
        setHospitalName(result.hospitalName || '');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(refresh, []);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await saveCamp(form);
      setForm(initialForm);
      setMessage('Camp published to the patient app.');
      refresh();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    setDeletingId(id);
    try {
      await deleteCamp(id);
      setCamps((current) => current.filter((camp) => camp.id !== id));
    } catch (deleteError) {
      setError(deleteError.message);
    } finally {
      setDeletingId('');
    }
  };

  return (
    <>
      <Head><title>Camps · DRJIVA Doctors</title></Head>
      <div className="page-container">
        <PageHeading
          eyebrow="Patient App"
          title="Free Medical &amp; Dental Camps"
          description={hospitalName ? `Publish a camp and it appears immediately in the Kadapa Medical Feed for ${hospitalName}.` : 'Publish a camp and it appears immediately in patients’ Kadapa Medical Feed.'}
        />

        <div className="composer-grid">
          <section className="composer-form-column">
            <form className="panel grid gap-5 p-5 sm:p-6" onSubmit={submit}>
              <div className="segmented-control" aria-label="Camp type">
                {TYPE_OPTIONS.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    className={form.eventType === key ? 'selected' : ''}
                    type="button"
                    onClick={() => update('eventType', key)}
                  >
                    <Icon aria-hidden="true" size={18} /> {label}
                  </button>
                ))}
              </div>

              <Field
                label="Camp title"
                placeholder="Example: Free General Health Camp"
                maxLength={120}
                value={form.title}
                onChange={(event) => update('title', event.target.value)}
                required
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="Date"
                  type="date"
                  value={form.eventDate}
                  onChange={(event) => update('eventDate', event.target.value)}
                  required
                />
                <Field
                  label="Location"
                  placeholder={hospitalName || 'Hospital address'}
                  value={form.location}
                  onChange={(event) => update('location', event.target.value)}
                />
                <Field
                  label="Start time"
                  type="time"
                  value={form.startTime}
                  onChange={(event) => update('startTime', event.target.value)}
                />
                <Field
                  label="End time"
                  type="time"
                  value={form.endTime}
                  onChange={(event) => update('endTime', event.target.value)}
                />
              </div>

              <Field
                label="Description"
                textarea
                placeholder="What patients should know before attending…"
                maxLength={400}
                value={form.description}
                onChange={(event) => update('description', event.target.value)}
                hint={`${form.description.length}/400 characters`}
              />

              {error ? <p className="error-banner" role="alert">{error}</p> : null}
              {message ? <p className="success-banner" role="status">{message}</p> : null}

              <button className="primary-button w-full" type="submit" disabled={saving}>
                <Send aria-hidden="true" size={18} /> {saving ? 'Publishing…' : 'Publish camp'}
              </button>
            </form>

            <div className="panel p-5">
              <p className="eyebrow">Before publishing</p>
              <ul className="mt-4 grid gap-4 text-sm leading-6 text-muted">
                <li className="flex gap-3"><ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0 text-success" size={19} /><span>Confirm the date, time and location are final — patients will book against this.</span></li>
                <li className="flex gap-3"><ShieldCheck aria-hidden="true" className="mt-0.5 shrink-0 text-success" size={19} /><span>Camps publish immediately and show up in every patient's app right away.</span></li>
              </ul>
            </div>
          </section>

          <section className="social-preview-column">
            <p className="eyebrow" style={{ marginBottom: 12 }}>Published camps</p>
            {loading ? (
              <p className="text-sm text-muted">Loading…</p>
            ) : camps.length === 0 ? (
              <div className="panel p-5">
                <p className="text-sm text-muted">No camps published yet — use the form to add your first one.</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {camps.map((camp) => (
                  <article className="panel p-4" key={camp.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-ink">{camp.title}</p>
                        <p className="text-sm text-muted">
                          <CalendarPlus aria-hidden="true" size={13} style={{ display: 'inline', marginRight: 4 }} />
                          {camp.event_date}{camp.start_time ? ` · ${camp.start_time.slice(0, 5)}` : ''}
                        </p>
                      </div>
                      <button
                        aria-label="Remove camp"
                        className="quiet-button"
                        disabled={deletingId === camp.id}
                        type="button"
                        onClick={() => remove(camp.id)}
                      >
                        <Trash2 aria-hidden="true" size={16} />
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
