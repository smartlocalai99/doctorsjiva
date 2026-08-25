import { CalendarPlus, Clock3, House, MapPin, Plus, Send, Smile, Stethoscope, Trash2, X } from 'lucide-react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

import { EmptyState, Field, PageHeading } from '@/components/Ui';
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
];

const TYPE_DETAILS = {
  medical: { label: 'Medical camp', icon: Stethoscope },
  dental: { label: 'Dental camp', icon: Smile },
};

export default function CampsPage() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const [camps, setCamps] = useState([]);
  const [hospitalName, setHospitalName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const isCreateRoute = router.query.create === '1';
  const isFormVisible = isFormOpen || isCreateRoute;

  const refresh = () => {
    setLoading(true);
    setError('');
    loadCamps()
      .then((result) => {
        setCamps(result.camps || []);
        setHospitalName(result.hospitalName || '');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let ignore = false;
    loadCamps()
      .then((result) => {
        if (ignore) return;
        setCamps(result.camps || []);
        setHospitalName(result.hospitalName || '');
      })
      .catch((loadError) => {
        if (!ignore) setError(loadError.message);
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => { ignore = true; };
  }, []);

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
      setIsFormOpen(false);
      if (isCreateRoute) void router.replace('/camps', undefined, { shallow: true });
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
          action={(
            <button
              aria-controls="publish-camp-form"
              aria-expanded={isFormVisible}
              className={isFormVisible ? 'secondary-button' : 'primary-button'}
              type="button"
              onClick={() => {
                if (isCreateRoute) void router.replace('/camps', undefined, { shallow: true });
                setIsFormOpen(!isFormVisible);
                setError('');
                setMessage('');
              }}
            >
              {isFormVisible ? <X aria-hidden="true" size={18} /> : <Plus aria-hidden="true" size={18} />}
              {isFormVisible ? 'Close form' : 'Publish a camp'}
            </button>
          )}
        />

        {error ? <p className="error-banner" role="alert">{error}</p> : null}
        {message ? <p className="success-banner" role="status">{message}</p> : null}

        <div className={isFormVisible ? 'composer-grid' : ''}>
          {isFormVisible ? (
            <section className="composer-form-column" id="publish-camp-form">
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

                <div className="grid grid-cols-2 gap-4">
                  <Field
                    className="min-w-0"
                    label="Start time"
                    type="time"
                    value={form.startTime}
                    onChange={(event) => update('startTime', event.target.value)}
                  />
                  <Field
                    className="min-w-0"
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

                <button className="primary-button w-full" type="submit" disabled={saving}>
                  <Send aria-hidden="true" size={18} /> {saving ? 'Publishing…' : 'Publish camp'}
                </button>
              </form>
            </section>
          ) : null}

          <section className="social-preview-column">
            <div>
              <p className="eyebrow">Published camps</p>
              <h2 className="mt-1 text-xl font-extrabold tracking-tight">Your camps</h2>
            </div>
            {loading ? (
              <div className="grid gap-3" aria-label="Loading camps">
                {[1, 2].map((item) => <div className="h-28 animate-pulse rounded-xl bg-slate-100" key={item} />)}
              </div>
            ) : camps.length === 0 ? (
              <EmptyState
                icon={House}
                title="No camps published"
                description="Your published medical and dental camps will appear here."
                action={!isFormVisible ? <button className="primary-button" type="button" onClick={() => setIsFormOpen(true)}><Plus aria-hidden="true" size={18} /> Publish your first camp</button> : null}
              />
            ) : (
              <div className={isFormVisible ? 'grid gap-3' : 'grid gap-3 sm:grid-cols-2'}>
                {camps.map((camp) => (
                  <article className="panel grid gap-4 p-4" key={camp.id}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
                          <CampTypeIcon type={camp.event_type} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-brand">{TYPE_DETAILS[camp.event_type]?.label || 'Camp'}</p>
                          <h3 className="mt-0.5 break-words font-extrabold text-ink">{camp.title}</h3>
                        </div>
                      </div>
                      <button
                        aria-label={`Remove ${camp.title}`}
                        className="quiet-button shrink-0"
                        disabled={deletingId === camp.id}
                        type="button"
                        onClick={() => remove(camp.id)}
                      >
                        <Trash2 aria-hidden="true" size={16} />
                      </button>
                    </div>
                    <div className="grid gap-2 text-sm text-muted">
                      <p className="flex items-center gap-2">
                        <CalendarPlus aria-hidden="true" className="shrink-0" size={15} />
                        {formatCampDate(camp.event_date)}
                      </p>
                      {camp.start_time || camp.end_time ? (
                        <p className="flex items-center gap-2">
                          <Clock3 aria-hidden="true" className="shrink-0" size={15} />
                          {formatCampTime(camp.start_time, camp.end_time)}
                        </p>
                      ) : null}
                      {camp.location ? <p className="flex items-start gap-2"><MapPin aria-hidden="true" className="mt-0.5 shrink-0" size={15} /><span>{camp.location}</span></p> : null}
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

function CampTypeIcon({ type }) {
  const Icon = TYPE_DETAILS[type]?.icon || CalendarPlus;
  return <Icon aria-hidden="true" size={19} />;
}

function formatCampDate(value) {
  if (!value) return 'Date not set';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`));
}

function formatCampTime(startTime, endTime) {
  const start = startTime?.slice(0, 5);
  const end = endTime?.slice(0, 5);
  if (start && end) return `${start} – ${end}`;
  return start || end;
}
