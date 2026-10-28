import { Baby, ChevronRight, HeartPulse, Repeat, Search, Smartphone, Stethoscope, UserPlus, X } from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';

import { InstallSteps } from '@/components/AppShell';
import { EmptyRow, PageHeader } from '@/components/doctor/DeskParts';
import { DeskDoctorPicker } from '@/components/nurse/DeskDoctorPicker';
import { NurseFrame, NurseLoading, NurseNavActions, useNurseInstall } from '@/components/nurse/NurseFrame';
import { NurseLogin } from '@/components/nurse/NurseLogin';
import { PatientRow, PatientRowSkeleton } from '@/components/nurse/PatientRow';
import { useRemovePatient } from '@/components/nurse/RemovePatient';
import { NewChildSheet, NewCycleSheet, NewPregnancySheet } from '@/components/nurse/PlanSheets';
import { NurseVisitRow, sortToday, useNurseToday } from '@/components/nurse/TodayList';
import { nurseRequest, useNurse, useNurseSchedule, withSchedule } from '@/contexts/NurseContext';
import { byNextVisit } from '@/lib/doctor-desk';
import { readStored, writeStored } from '@/lib/device-store';
import { isPatientOf, patientsOfDoctor, planDoctor, searchPatients } from '@/lib/nurse-directory';
import { formatDate, formatMobile } from '@/lib/nurse-schedule';
import { isIos } from '@/lib/push-client';

const COMING_UP_COUNT = 6;
const DOCTOR_TONE = { general: 'gray', gynecology: 'pink', pediatrics: 'teal' };
const DOCTOR_ICON = { general: Stethoscope, gynecology: HeartPulse, pediatrics: Baby };

export default function NurseHomePage() {
  const router = useRouter();
  const { deskDoctor, profile, status } = useNurse();
  const [picking, setPicking] = useState(false);
  if (status === 'loading') return <NurseLoading />;
  if (status === 'signed_out') return <NurseLogin />;
  if (status === 'error') return <NurseOffline />;
  // Right after login (or "Change", here or from settings on another
  // page): which doctor is she with today?
  const asked = picking || router.query.pick === '1';
  if ((profile?.doctors || []).length > 1 && (!deskDoctor || asked)) {
    return (
      <DeskDoctorPicker
        onPicked={() => {
          setPicking(false);
          if (router.query.pick) void router.replace('/nurse', undefined, { shallow: true });
        }}
      />
    );
  }
  return <NurseToday onChangeDoctor={() => setPicking(true)} />;
}

function NurseOffline() {
  const { refresh } = useNurse();
  return (
    <main className="ios-launch">
      <div className="ios-notice">
        <h2>Can’t reach DrJiva</h2>
        <p>Check the internet connection, then try again.</p>
        <button className="ios-button is-filled" type="button" onClick={() => void refresh()}>Try again</button>
      </div>
    </main>
  );
}

// A full mobile number (10 digits, optionally with 91 / +91).
function mobileDigits(query) {
  if (!/^[+\d\s()-]+$/.test(query)) return '';
  const digits = query.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  return '';
}

// The nurse's day: the doctor she is with, find a patient, start someone
// new, who is coming today, who didn't come, and her recent patients.
function NurseToday({ onChangeDoctor }) {
  const router = useRouter();
  const { deskDoctor, directory, ensureDirectory, loadDirectory, profile, rememberPatient } = useNurse();
  const { removeSheet, requestRemove } = useRemovePatient();
  const today = useNurseToday(deskDoctor?.id);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [hint, setHint] = useState('');
  const [notFound, setNotFound] = useState(null);
  const [addName, setAddName] = useState('');
  const [addMobile, setAddMobile] = useState('');
  const [addHospitalId, setAddHospitalId] = useState('');
  const [adding, setAdding] = useState(false);
  const [startSheet, setStartSheet] = useState(null);

  useEffect(() => {
    ensureDirectory();
  }, [ensureDirectory]);

  const hospitalName = profile?.hospital?.name;
  const doctors = profile?.doctors || [];
  const patients = directory.patients;
  // The desk doctor's patients first in suggestions; lists show only hers.
  const mine = useMemo(() => patientsOfDoctor(patients, deskDoctor?.id), [deskDoctor, patients]);
  const schedule = useNurseSchedule();
  // Her patients due after today, soonest first (today's are listed above).
  const comingUp = useMemo(() => {
    if (schedule.status !== 'ready') return [];
    return mine
      .map((patient) => withSchedule(patient, schedule))
      .filter((patient) => patient.next?.date && patient.next.date > schedule.today)
      .sort(byNextVisit);
  }, [mine, schedule]);
  const suggestions = useMemo(() => {
    const ranked = searchPatients(patients, query, 0);
    const own = ranked.filter((patient) => !deskDoctor || isPatientOf(patient, deskDoctor.id));
    const rest = ranked.filter((patient) => deskDoctor && !isPatientOf(patient, deskDoctor.id));
    return [...own, ...rest].slice(0, 6);
  }, [deskDoctor, patients, query]);
  const department = deskDoctor?.department || 'general';
  const typing = query.trim().length >= 2;
  const listLoading = directory.status === 'idle' && !patients.length;
  const people = useMemo(() => new Map((today.data?.patients || []).map((patient) => [patient.id, patient])), [today.data]);
  const coming = useMemo(() => sortToday(today.data?.appointments || []), [today.data]);
  const waiting = coming.filter((entry) => entry.status === 'expected').length;
  const seen = coming.filter((entry) => entry.status === 'seen').length;
  const DoctorIcon = DOCTOR_ICON[department] || Stethoscope;

  const openPatient = (patient) => void router.push(`/nurse/patient/${patient.id}`);

  const changeQuery = (value) => {
    setQuery(value);
    setActiveIndex(-1);
    setNotFound(null);
    setHint('');
    setError('');
  };

  const search = async (event) => {
    event.preventDefault();
    const q = query.trim();
    if (!q) return;
    if (activeIndex >= 0 && suggestions[activeIndex]) return openPatient(suggestions[activeIndex]);
    if (suggestions.length === 1) return openPatient(suggestions[0]);
    const mobile = mobileDigits(q);
    if (suggestions.length > 1 && !mobile) {
      setHint('More than one patient matches. Tap the right one in the list.');
      return;
    }
    // Not in the list: exact lookup by full mobile number or hospital ID.
    setSearching(true);
    setError('');
    setNotFound(null);
    try {
      const result = await nurseRequest('/api/nurse/find', { body: { query: mobile || q }, method: 'POST' });
      if (result.found) {
        await router.push(`/nurse/patient/${result.patientId}`);
        return;
      }
      setNotFound({ mobile, query: q });
      setAddMobile(mobile);
      setAddHospitalId(mobile ? '' : q);
      setAddName('');
    } catch (searchError) {
      setError(searchError.message);
    } finally {
      setSearching(false);
    }
  };

  const onKeyDown = (event) => {
    if (!typing || !suggestions.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === 'Escape') {
      changeQuery('');
    }
  };

  const addPatient = async (event) => {
    event.preventDefault();
    setAdding(true);
    setError('');
    try {
      const view = await nurseRequest('/api/nurse/patient', {
        body: { hospitalPatientId: addHospitalId, mobile: addMobile, name: addName },
        method: 'POST',
      });
      rememberPatient({ ...view.patient, lastSeen: profile?.today });
      await router.push(`/nurse/patient/${view.patient.id}`);
    } catch (addError) {
      setError(addError.message);
      setAdding(false);
    }
  };

  const started = (kind) => (patient) => {
    rememberPatient({ ...patient, doctorId: planDoctor(doctors, kind, deskDoctor)?.id, lastSeen: profile?.today });
    void router.push(`/nurse/patient/${patient.id}?started=${kind}`);
  };

  return (
    <NurseFrame onChangeDoctor={onChangeDoctor}>
      <Head><title>Today · DrJiva Nurse</title></Head>
      <PageHeader
        kicker={profile?.today ? formatDate(profile.today, { weekday: 'long', day: 'numeric', month: 'long' }) : ' '}
        title="Today"
        trailing={<NurseNavActions />}
      />

      <InstallTip />

      {deskDoctor ? (
        <section className="ios-section" aria-label="Doctor today">
          <ul className="ios-group">
            <li className="ios-cell">
              <button className="ios-cell-link" disabled={doctors.length < 2} type="button" onClick={onChangeDoctor}>
                <span className={`ios-icon is-large is-${DOCTOR_TONE[department] || 'gray'}`} aria-hidden="true"><DoctorIcon size={22} strokeWidth={2.2} /></span>
                <span className="ios-cell-body">
                  <span className="ios-cell-line">Working with</span>
                  <strong className="ios-cell-title">{deskDoctor.name}</strong>
                </span>
                {doctors.length > 1 ? <span className="nurse-cell-value is-tint">Change <ChevronRight aria-hidden="true" size={17} strokeWidth={2.4} /></span> : <span />}
              </button>
            </li>
          </ul>
        </section>
      ) : null}

      <form className="nurse-find" onSubmit={search} role="search">
        <label className="ios-search">
          <Search aria-hidden="true" size={17} strokeWidth={2.4} />
          <span className="sr-only">Name, mobile number or hospital ID</span>
          <input
            aria-activedescendant={activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined}
            aria-autocomplete="list"
            aria-controls="nurse-suggestions"
            aria-expanded={typing && suggestions.length > 0}
            autoComplete="off"
            enterKeyHint="search"
            id="nurse-find"
            maxLength={40}
            placeholder="Find patient: name, mobile or ID"
            role="combobox"
            spellCheck={false}
            value={query}
            onChange={(event) => changeQuery(event.target.value)}
            onKeyDown={onKeyDown}
          />
          {query ? (
            <button type="button" onClick={() => changeQuery('')} aria-label="Clear search"><X aria-hidden="true" size={12} strokeWidth={3} /></button>
          ) : null}
        </label>

        {typing ? (
          <div className="ios-section">
            {suggestions.length ? (
              <ul aria-label="Matching patients" className="ios-group" id="nurse-suggestions" role="listbox">
                {suggestions.map((patient, index) => (
                  <li className="ios-cell" key={patient.id} role="presentation">
                    <PatientRow
                      id={`suggestion-${index}`}
                      option
                      patient={schedule.status === 'ready' ? withSchedule(patient, schedule) : patient}
                      selected={index === activeIndex}
                      showDate={false}
                      today={schedule.status === 'ready' ? schedule.today : null}
                    />
                  </li>
                ))}
              </ul>
            ) : listLoading ? null : (
              <p className="ios-section-foot">No match in your patient list.</p>
            )}
            {hint ? <p className="ios-section-foot" role="status">{hint}</p> : null}
            {/* Not in her list, or a full mobile number: look it up at the whole hospital. */}
            {!suggestions.length || mobileDigits(query.trim()) ? (
              <button className="ios-button is-tinted" disabled={searching} type="submit">
                <Search aria-hidden="true" size={18} strokeWidth={2.4} />
                {searching ? 'Looking up…' : mobileDigits(query.trim()) ? `Look up ${formatMobile(mobileDigits(query.trim()))}` : `Look up “${query.trim()}”`}
              </button>
            ) : null}
          </div>
        ) : null}
        {error ? <p className="ios-error" role="alert">{error}</p> : null}
      </form>

      {notFound ? (
        <section className="ios-section" aria-labelledby="add-heading">
          <div className="ios-section-head">
            <h2 id="add-heading">Add patient</h2>
          </div>
          <p className="ios-section-foot">
            {notFound.mobile
              ? `No patient with ${formatMobile(notFound.mobile)} at ${hospitalName}. Add them now; they see their visits when they open DrJiva with this number.`
              : `No patient matches “${notFound.query}” at ${hospitalName}. Add them now with their mobile number.`}
          </p>
          <form className="nurse-form" onSubmit={addPatient}>
            <label className="nurse-field">
              <span>Mobile number</span>
              <div className="nurse-input-wrap">
                <span className="nurse-input-prefix">+91</span>
                <input
                  autoComplete="off"
                  inputMode="numeric"
                  maxLength={10}
                  required
                  value={addMobile}
                  onChange={(event) => setAddMobile(event.target.value.replace(/\D/g, '').slice(0, 10))}
                />
              </div>
            </label>
            <label className="nurse-field">
              <span>Patient name</span>
              <div className="nurse-input-wrap">
                <input autoComplete="off" maxLength={80} required value={addName} onChange={(event) => setAddName(event.target.value)} />
              </div>
            </label>
            <label className="nurse-field">
              <span>Hospital ID <em>optional</em></span>
              <div className="nurse-input-wrap">
                <input autoComplete="off" maxLength={40} placeholder="UHID / MRN" value={addHospitalId} onChange={(event) => setAddHospitalId(event.target.value)} />
              </div>
            </label>
            <button
              className="ios-button is-filled is-large"
              type="submit"
              disabled={adding || addMobile.length !== 10 || addName.trim().length < 2}
            >
              <UserPlus aria-hidden="true" size={20} /> {adding ? 'Adding…' : 'Add patient'}
            </button>
          </form>
        </section>
      ) : null}

      {!typing && !notFound ? (
        <>
          <nav className="nurse-new" aria-label="Start for a new patient">
            {department === 'gynecology' || department === 'general' ? (
              <NewTile icon={HeartPulse} label="New pregnancy" onClick={() => setStartSheet('pregnancy')} tone="pink" />
            ) : null}
            {department === 'gynecology' ? (
              <NewTile icon={Repeat} label="New IUI cycle" onClick={() => setStartSheet('cycle')} tone="purple" />
            ) : null}
            {department === 'pediatrics' ? (
              <NewTile icon={Baby} label="New child" onClick={() => setStartSheet('child')} tone="teal" />
            ) : null}
          </nav>

          {deskDoctor ? (
            <section className="ios-section" aria-labelledby="coming-heading" id="coming-section">
              <div className="ios-section-head">
                <h2 id="coming-heading">Coming today</h2>
                {today.data ? <span className="ios-section-count">{coming.length}</span> : null}
              </div>
              {today.data ? (
                <>
                  <ul className="ios-group">
                    {coming.length
                      ? coming.map((entry) => <NurseVisitRow appointment={entry} key={entry.key} patient={people.get(entry.patientId)} today={today.data.today} />)
                      : <EmptyRow>No one is booked with {deskDoctor.name} today.</EmptyRow>}
                  </ul>
                  {coming.length ? <p className="ios-section-foot">{seen} seen, {waiting} still to come. Tap a patient to save her visit.</p> : null}
                </>
              ) : today.error ? (
                <p className="ios-section-foot is-error">{today.error}</p>
              ) : (
                <div className="ios-skeleton" role="status" aria-label="Loading today’s patients"><span><i /><b /></span><span><i /><b /></span></div>
              )}
            </section>
          ) : null}

          {today.data?.missed?.length ? (
            <section className="ios-section is-missed" aria-labelledby="missed-heading">
              <div className="ios-section-head">
                <h2 id="missed-heading">Didn’t come</h2>
                <span className="ios-section-count">{today.data.missed.length}</span>
              </div>
              <ul className="ios-group">
                {today.data.missed.map((entry) => (
                  <NurseVisitRow appointment={entry} key={entry.key} patient={people.get(entry.patientId)} showDate today={today.data.today} />
                ))}
              </ul>
              <p className="ios-section-foot">Missed a visit in the last 30 days and has not come back. Call to book a new date.</p>
            </section>
          ) : null}

          <section className="ios-section" aria-labelledby="upcoming-heading">
            <div className="ios-section-head">
              <h2 id="upcoming-heading">Coming up</h2>
              {schedule.status === 'ready' ? <span className="ios-section-count">{comingUp.length}</span> : null}
              <Link className="ios-section-link" href="/nurse/patients">All patients</Link>
            </div>
            {listLoading || schedule.status === 'idle' ? (
              <div className="ios-group">
                <PatientRowSkeleton />
                <PatientRowSkeleton />
                <PatientRowSkeleton />
              </div>
            ) : directory.status === 'error' && !patients.length ? (
              <div className="ios-notice">
                <p>The patient list could not load. Search still works.</p>
                <button className="ios-button is-tinted" type="button" onClick={() => void loadDirectory({ fresh: true })}>Try again</button>
              </div>
            ) : comingUp.length ? (
              <>
                <ul className="ios-group nurse-list">
                  {comingUp.slice(0, COMING_UP_COUNT).map((patient) => (
                    <li className="ios-cell" key={patient.id}><PatientRow onRemove={requestRemove} patient={patient} today={schedule.today} /></li>
                  ))}
                </ul>
                <p className="ios-section-foot">
                  {comingUp.length > COMING_UP_COUNT ? `${comingUp.length - COMING_UP_COUNT} more in All patients. ` : ''}Next visits after today, soonest first.
                </p>
              </>
            ) : (
              <p className="ios-section-foot">
                {schedule.status === 'error'
                  ? 'Next visits could not load. Open this page again to retry.'
                  : deskDoctor ? `No visits booked with ${deskDoctor.name} after today.` : 'No visits booked after today.'}
              </p>
            )}
          </section>
        </>
      ) : null}

      {startSheet === 'pregnancy' ? (
        <NewPregnancySheet doctors={doctors} onClose={() => setStartSheet(null)} onStarted={started('pregnancy')} today={profile?.today} />
      ) : null}
      {startSheet === 'cycle' ? (
        <NewCycleSheet doctor={planDoctor(doctors, 'cycle', deskDoctor)} onClose={() => setStartSheet(null)} onStarted={started('cycle')} today={profile?.today} />
      ) : null}
      {startSheet === 'child' ? (
        <NewChildSheet doctor={planDoctor(doctors, 'child', deskDoctor)} onClose={() => setStartSheet(null)} onStarted={started('child')} today={profile?.today} />
      ) : null}
      {removeSheet}
    </NurseFrame>
  );
}

// A big tile for starting someone new, with her mobile number.
function NewTile({ icon: Icon, label, onClick, tone }) {
  return (
    <button className="nurse-new-tile" type="button" onClick={onClick}>
      <span className={`ios-icon is-round is-${tone}`} aria-hidden="true"><Icon size={18} strokeWidth={2.4} /></span>
      <strong>{label}</strong>
      <span>With her mobile number</span>
    </button>
  );
}

// Until it is closed: how to put the nurse desk on the Home Screen.
function InstallTip() {
  const install = useNurseInstall();
  // Only rendered in the browser (after the nurse sign-in check).
  const [closed, setClosed] = useState(() => Boolean(readStored('drjiva.nurse.tips')?.install));
  if (install.installed || closed || (!install.canPrompt && !isIos())) return null;
  const close = () => {
    setClosed(true);
    writeStored('drjiva.nurse.tips', { install: Date.now() });
  };
  return (
    <aside className="ios-tip" aria-label="Add to Home Screen">
      <span className="ios-icon is-large is-green" aria-hidden="true"><Smartphone size={20} strokeWidth={2.2} /></span>
      <div className="ios-tip-body">
        <h2>Add the nurse desk to your Home Screen</h2>
        <p>It opens full screen like an app and stays signed in.</p>
        {install.canPrompt ? (
          <button className="ios-button is-filled is-small" type="button" onClick={() => void install.install()}>Add to Home Screen</button>
        ) : <InstallSteps />}
      </div>
      <button className="ios-tip-close" type="button" onClick={close} aria-label="Close tip">
        <X aria-hidden="true" size={16} strokeWidth={2.6} />
      </button>
    </aside>
  );
}
