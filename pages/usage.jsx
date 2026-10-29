import { LockKeyhole, LogOut, RefreshCw, Search } from 'lucide-react';
import Head from 'next/head';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// The owner's page: how many people really use the patient app, the nurse
// desk and the doctor desk, right now and over time (numbers from
// usage_dashboard() in Supabase). Its own mobile + PIN login.

const APPS = [
  { id: 'patient', name: 'Patient app', who: 'patients' },
  { id: 'nurse', name: 'Nurse desk', who: 'nurses' },
  { id: 'doctor', name: 'Doctor desk', who: 'doctors' },
];
const APP_NAME = Object.fromEntries(APPS.map((app) => [app.id, app.name]));
const PERIODS = [
  { days: 1, label: 'Today' },
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
];
const REFRESH_MS = 30 * 1000;

const number = (value) => new Intl.NumberFormat('en-IN').format(Math.round(Number(value) || 0));

function screenTime(minutes) {
  const total = Math.round(Number(minutes) || 0);
  if (!total) return Number(minutes) > 0 ? 'under 1 min' : '0 min';
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

function timeOfDay(date) {
  return new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }).format(date);
}

function dayKey(date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(date);
}

// "just now", "12 min ago", "today 9:40 am", "yesterday 6:15 pm", "24 Oct".
function lastSeenText(value, now = new Date()) {
  if (!value) return 'never';
  const date = new Date(value);
  const minutes = Math.round((now - date) / 60000);
  if (minutes < 2) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const today = dayKey(now);
  const yesterday = dayKey(new Date(now.getTime() - 86400000));
  if (dayKey(date) === today) return `today ${timeOfDay(date)}`;
  if (dayKey(date) === yesterday) return `yesterday ${timeOfDay(date)}`;
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }).format(date);
}

function shortDay(day) {
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${day}T00:00:00Z`));
}

function weekdayDay(day) {
  return new Intl.DateTimeFormat('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${day}T00:00:00Z`));
}

function hourText(hour) {
  if (hour === 0) return '12 am';
  if (hour === 12) return '12 pm';
  return hour < 12 ? `${hour} am` : `${hour - 12} pm`;
}

export default function UsagePage() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const busy = useRef(false);

  const load = useCallback(async (period, { quiet = false } = {}) => {
    if (busy.current) return;
    busy.current = true;
    if (!quiet) setRefreshing(true);
    try {
      const response = await fetch(`/api/usage/data?days=${period}`, { cache: 'no-store' });
      const result = await response.json().catch(() => ({}));
      if (response.status === 401) {
        setStatus('signed_out');
        return;
      }
      if (!response.ok) throw new Error(result.error || 'Could not load the numbers.');
      setData(result);
      setError('');
      setStatus('ready');
    } catch (loadError) {
      if (!quiet) setError(loadError.message || 'Could not load the numbers. Check the internet and try again.');
      setStatus((current) => (current === 'loading' ? 'error' : current));
    } finally {
      busy.current = false;
      if (!quiet) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(days), 0);
    return () => window.clearTimeout(timer);
  }, [days, load]);

  useEffect(() => {
    if (status !== 'ready') return undefined;
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load(days, { quiet: true });
    }, REFRESH_MS);
    const onReturn = () => {
      if (document.visibilityState === 'visible') void load(days, { quiet: true });
    };
    document.addEventListener('visibilitychange', onReturn);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onReturn);
    };
  }, [days, load, status]);

  const signOut = async () => {
    await fetch('/api/usage/logout', { method: 'POST' }).catch(() => undefined);
    setData(null);
    setStatus('signed_out');
  };

  return (
    <div className="usage-shell">
      <Head>
        <title>DrJiva usage</title>
        <meta name="robots" content="noindex" />
      </Head>
      {status === 'signed_out' ? <UsageLogin onDone={() => { setStatus('loading'); void load(days); }} /> : null}
      {status === 'loading' ? <main className="usage-center"><span className="ios-spinner" aria-label="Loading" role="status" /></main> : null}
      {status === 'error' ? (
        <main className="usage-center">
          <p className="usage-error">{error}</p>
          <button className="ios-button is-filled" type="button" onClick={() => { setStatus('loading'); void load(days); }}>Try again</button>
        </main>
      ) : null}
      {status === 'ready' && data ? (
        <Dashboard
          data={data}
          days={days}
          error={error}
          refreshing={refreshing}
          onDays={setDays}
          onRefresh={() => load(days)}
          onSignOut={signOut}
        />
      ) : null}
    </div>
  );
}

function UsageLogin({ onDone }) {
  const [mobile, setMobile] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pinRef = useRef(null);
  const formRef = useRef(null);

  useEffect(() => {
    if (mobile.length === 10) pinRef.current?.focus();
  }, [mobile]);

  useEffect(() => {
    // Not again after a wrong PIN: the PIN is cleared first.
    if (mobile.length === 10 && pin.length === 4 && !loading && !error) formRef.current?.requestSubmit();
  }, [error, loading, mobile, pin]);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/usage/login', {
        body: JSON.stringify({ mobile, pin }),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Could not log in.');
      onDone();
    } catch (loginError) {
      setError(loginError.message);
      setPin('');
      setLoading(false);
      pinRef.current?.focus();
    }
  };

  return (
    <main className="usage-center" id="main-content">
      <form ref={formRef} className="usage-login" onSubmit={submit} aria-labelledby="usage-login-title">
        <Image alt="" height={56} priority src="/icons/drjiva-mark.png" width={56} />
        <h1 id="usage-login-title">DrJiva usage</h1>
        <p>Who is using the patient app, the nurse desk and the doctor desk.</p>
        <label className="usage-field">
          <span>Mobile number</span>
          <input
            autoComplete="tel-national"
            autoFocus
            inputMode="numeric"
            name="mobile"
            placeholder="10-digit mobile"
            value={mobile}
            onChange={(event) => {
              setError('');
              const digits = event.target.value.replace(/\D/g, '');
              setMobile(digits.length > 10 ? digits.slice(-10) : digits);
            }}
          />
        </label>
        <label className="usage-field">
          <span>4-digit PIN</span>
          <input
            ref={pinRef}
            autoComplete="current-password"
            inputMode="numeric"
            maxLength={4}
            name="pin"
            type="password"
            value={pin}
            onChange={(event) => {
              setError('');
              setPin(event.target.value.replace(/\D/g, '').slice(0, 4));
            }}
          />
        </label>
        {error ? <p className="usage-error" role="alert">{error}</p> : null}
        <button className="ios-button is-filled is-large" disabled={loading || mobile.length !== 10 || pin.length !== 4} type="submit">
          {loading ? 'Logging in…' : 'Log in'}
        </button>
        <p className="usage-login-note"><LockKeyhole aria-hidden="true" size={14} /> Only for the DrJiva owner.</p>
      </form>
    </main>
  );
}

function Dashboard({ data, days, error, refreshing, onDays, onRefresh, onSignOut }) {
  const periodWord = days === 1 ? 'today' : `in the last ${days} days`;
  const totalPeople = APPS.reduce((sum, app) => sum + (data.apps?.[app.id]?.people || 0), 0);
  return (
    <main className="usage-page" id="main-content">
      <header className="usage-head">
        <div>
          <h1>DrJiva usage</h1>
          <p>Updated {timeOfDay(new Date(data.generatedAt))} · refreshes every 30 seconds</p>
        </div>
        <div className="usage-head-actions">
          <button className="usage-icon" disabled={refreshing} type="button" onClick={onRefresh} aria-label="Refresh">
            <RefreshCw aria-hidden="true" className={refreshing ? 'is-spinning' : ''} size={18} />
          </button>
          <button className="usage-icon" type="button" onClick={onSignOut} aria-label="Log out">
            <LogOut aria-hidden="true" size={18} />
          </button>
        </div>
      </header>

      {error ? <p className="usage-error" role="alert">{error}</p> : null}

      <LiveNow live={data.live} />

      <div className="usage-periods" role="group" aria-label="Period">
        {PERIODS.map((period) => (
          <button aria-pressed={days === period.days} key={period.days} type="button" onClick={() => onDays(period.days)}>{period.label}</button>
        ))}
      </div>

      <section className="usage-section" aria-labelledby="apps-title">
        <h2 id="apps-title">{number(totalPeople)} {totalPeople === 1 ? 'person' : 'people'} used DrJiva {periodWord}</h2>
        <div className="usage-apps">
          {APPS.map((app) => <AppSummary app={app} data={data.apps?.[app.id]} days={days} key={app.id} trackingSince={data.trackingSince?.[app.id]} />)}
        </div>
      </section>

      <section className="usage-section" aria-labelledby="daily-title">
        <h2 id="daily-title">People each day</h2>
        <p className="usage-note">Last 30 days. Each column is the number of different people who opened that app that day.</p>
        <div className="usage-card usage-multiples">
          {APPS.map((app) => (
            <DailyColumns app={app} daily={data.daily || []} key={app.id} today={data.today} />
          ))}
        </div>
        <DailyTable daily={data.daily || []} />
      </section>

      <section className="usage-section" aria-labelledby="screens-title">
        <h2 id="screens-title">What they open</h2>
        <p className="usage-note">Screen time per screen {periodWord}.</p>
        <div className="usage-apps">
          {APPS.map((app) => <ScreenBars app={app} key={app.id} screens={data.apps?.[app.id]?.screens || []} />)}
        </div>
      </section>

      <section className="usage-section" aria-labelledby="hours-title">
        <h2 id="hours-title">When the apps are opened</h2>
        <p className="usage-note">App opens by hour of the day (India time), all three apps, {periodWord}.</p>
        <HourColumns hours={data.opensByHour || []} />
      </section>

      <PatientReach days={days} phones={data.phones || {}} />
      <Nurses nurses={data.nurses || []} periodWord={periodWord} />
      <Doctors doctors={data.doctors || []} periodWord={periodWord} />
      <People people={data.people || []} periodWord={periodWord} />
    </main>
  );
}

function AppDot({ app }) {
  return <i aria-hidden="true" className={`usage-dot is-${app}`} />;
}

// The one loud thing on the page: who is in an app at this moment.
function LiveNow({ live }) {
  const people = live || [];
  return (
    <section className="usage-live" aria-labelledby="live-title">
      <div className="usage-live-head">
        <span className={`usage-live-pulse ${people.length ? 'is-on' : ''}`} aria-hidden="true" />
        <h2 id="live-title">
          <strong>{people.length}</strong> {people.length === 1 ? 'person is' : 'people are'} using DrJiva right now
        </h2>
      </div>
      {people.length ? (
        <ul className="usage-live-list">
          {people.map((person, index) => (
            <li key={`${person.app}-${person.name}-${index}`}>
              <AppDot app={person.app} />
              <span className="usage-live-who">
                <strong>{person.name}</strong>
                <small>{[APP_NAME[person.app], person.detail].filter(Boolean).join(' · ')}</small>
              </span>
              <span className="usage-live-where">
                <strong>{person.screen || 'Opening'}</strong>
                <small>{screenTime(person.minutes)} this time</small>
              </span>
            </li>
          ))}
        </ul>
      ) : <p className="usage-live-empty">Nobody has the app open in the last 2 minutes.</p>}
    </section>
  );
}

function AppSummary({ app, data, days, trackingSince }) {
  const people = data?.people || 0;
  const perDay = data?.personDays ? data.minutes / data.personDays : 0;
  return (
    <article className="usage-card usage-app" aria-labelledby={`app-${app.id}`}>
      <h3 id={`app-${app.id}`}><AppDot app={app.id} /> {app.name}</h3>
      <p className="usage-app-people"><strong>{number(people)}</strong> {people === 1 ? 'person' : 'people'}</p>
      <dl className="usage-rows">
        <div><dt>Logged in</dt><dd>{number(data?.signedIn)}</dd></div>
        <div><dt>New {days === 1 ? 'today' : `in ${days} days`}</dt><dd>{number(data?.newPeople)}</dd></div>
        <div><dt>App opens</dt><dd>{number(data?.opens)}</dd></div>
        <div><dt>Screen time, all {app.who}</dt><dd>{screenTime(data?.minutes)}</dd></div>
        <div><dt>Per person, on a day they use it</dt><dd>{screenTime(perDay)}</dd></div>
      </dl>
      {trackingSince ? null : (
        <p className="usage-app-note">
          {app.id === 'patient'
            ? 'Counting starts when phones get the app update with screen time.'
            : 'Counting starts the next time someone opens it.'}
        </p>
      )}
    </article>
  );
}

// Columns from one baseline, own scale per app (patients outnumber
// doctors), the highest day labelled. Hover or tap a column for the day.
function DailyColumns({ app, daily, today }) {
  const values = daily.map((day) => Number(day[app.id]) || 0);
  const peak = Math.max(1, ...values);
  const todayValue = values[values.length - 1] || 0;
  return (
    <figure className="usage-multiple">
      <figcaption>
        <span><AppDot app={app.id} /> {app.name}</span>
        <small>{todayValue} today · most {Math.max(...values, 0)}</small>
      </figcaption>
      <div className="usage-columns" role="img" aria-label={`${app.name}: people per day for 30 days, most ${Math.max(...values, 0)}, today ${todayValue}`}>
        <span className="usage-columns-peak" aria-hidden="true" />
        {daily.map((day, index) => (
          <span
            className={`usage-column is-${app.id} ${day.day === today ? 'is-today' : ''}`}
            data-tip={`${weekdayDay(day.day)}: ${values[index]} ${values[index] === 1 ? 'person' : 'people'}`}
            key={day.day}
            style={{ '--h': `${(values[index] / peak) * 100}%` }}
            tabIndex={0}
          />
        ))}
      </div>
      <div className="usage-columns-axis" aria-hidden="true">
        <span>{daily[0] ? shortDay(daily[0].day) : ''}</span>
        <span>Today</span>
      </div>
    </figure>
  );
}

function DailyTable({ daily }) {
  return (
    <details className="usage-table-toggle">
      <summary>Show as a table</summary>
      <div className="usage-table-wrap">
        <table className="usage-table">
          <thead>
            <tr><th scope="col">Day</th><th scope="col">Patients</th><th scope="col">Nurses</th><th scope="col">Doctors</th><th scope="col">Screen time</th><th scope="col">New phones</th></tr>
          </thead>
          <tbody>
            {[...daily].reverse().map((day) => (
              <tr key={day.day}>
                <th scope="row">{weekdayDay(day.day)}</th>
                <td>{day.patient}</td><td>{day.nurse}</td><td>{day.doctor}</td><td>{screenTime(day.minutes)}</td><td>{day.newPhones}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function ScreenBars({ app, screens }) {
  const peak = Math.max(0.1, ...screens.map((screen) => Number(screen.minutes) || 0));
  return (
    <article className="usage-card usage-screens" aria-labelledby={`screens-${app.id}`}>
      <h3 id={`screens-${app.id}`}><AppDot app={app.id} /> {app.name}</h3>
      {screens.length ? (
        <ol>
          {screens.slice(0, 8).map((screen) => (
            <li key={screen.screen}>
              <div className="usage-bar-label">
                <span>{screen.screen}</span>
                <small>{screenTime(screen.minutes)}</small>
              </div>
              <span className="usage-bar-track" aria-hidden="true">
                <span className={`usage-bar is-${app.id}`} style={{ '--w': `${Math.max(2, (Number(screen.minutes) / peak) * 100)}%` }} />
              </span>
              <small className="usage-bar-meta">{number(screen.people)} {screen.people === 1 ? 'person' : 'people'} · opened {number(screen.views)} {screen.views === 1 ? 'time' : 'times'}</small>
            </li>
          ))}
        </ol>
      ) : <p className="usage-empty">No screen time yet.</p>}
    </article>
  );
}

function HourColumns({ hours }) {
  const peak = Math.max(1, ...hours.map((hour) => hour.opens));
  const busiest = hours.reduce((best, hour) => (hour.opens > (best?.opens || 0) ? hour : best), null);
  return (
    <figure className="usage-card usage-hours">
      <figcaption>{busiest ? `Busiest: ${hourText(busiest.hour)} to ${hourText((busiest.hour + 1) % 24)} (${busiest.opens} ${busiest.opens === 1 ? 'open' : 'opens'})` : 'No app opens yet.'}</figcaption>
      <div className="usage-columns is-hours" role="img" aria-label={busiest ? `Busiest hour ${hourText(busiest.hour)}` : 'No app opens yet'}>
        {hours.map((hour) => (
          <span
            className="usage-column is-all"
            data-tip={`${hourText(hour.hour)}–${hourText((hour.hour + 1) % 24)}: ${hour.opens} ${hour.opens === 1 ? 'open' : 'opens'}`}
            key={hour.hour}
            style={{ '--h': `${(hour.opens / peak) * 100}%` }}
            tabIndex={0}
          />
        ))}
      </div>
      <div className="usage-columns-axis is-hours" aria-hidden="true">
        <span>12 am</span><span>6 am</span><span>12 pm</span><span>6 pm</span><span>11 pm</span>
      </div>
    </figure>
  );
}

// From data the apps already kept since launch, before screen time.
function PatientReach({ days, phones }) {
  const since = phones.firstOpen ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date(phones.firstOpen)) : '';
  const within = days === 1 ? 'today' : `in ${days} days`;
  return (
    <section className="usage-section" aria-labelledby="reach-title">
      <h2 id="reach-title"><AppDot app="patient" /> Patient app since launch</h2>
      <p className="usage-note">From the app&apos;s own records{since ? ` since ${since}` : ''}, so these numbers go back before screen time was counted.</p>
      <div className="usage-apps">
        <dl className="usage-card usage-rows">
          <div><dt>Phones that opened the app</dt><dd>{number(phones.opened)}</dd></div>
          <div><dt>New phones {within}</dt><dd>{number(phones.openedInPeriod)}</dd></div>
          <div><dt>Phones logged in as a patient</dt><dd>{number(phones.loggedIn)}</dd></div>
          <div><dt>Patients who logged in</dt><dd>{number(phones.patientsLoggedIn)}</dd></div>
        </dl>
        <dl className="usage-card usage-rows">
          <div><dt>Phones active in the last day</dt><dd>{number(phones.active1)}</dd></div>
          <div><dt>Active in the last 7 days</dt><dd>{number(phones.active7)}</dd></div>
          <div><dt>Active in the last 30 days</dt><dd>{number(phones.active30)}</dd></div>
          <div><dt>Phones getting visit reminders</dt><dd>{number(phones.reminderPhones)}</dd></div>
        </dl>
        <dl className="usage-card usage-rows">
          <div><dt>Visit reminders sent {within}</dt><dd>{number(phones.remindersSent)}</dd></div>
          <div><dt>Reels watched {within}</dt><dd>{number(phones.reelViews)} <small>by {number(phones.reelViewers)}</small></dd></div>
          <div><dt>Questions to the care assistant</dt><dd>{number(phones.chatQuestions)}</dd></div>
          <div><dt>Shop orders {within}</dt><dd>{number(phones.orders)}</dd></div>
        </dl>
      </div>
    </section>
  );
}

// One person per row: name and the main number on top, details below.
function PersonRow({ app, lines, name, value, valueMuted = false }) {
  return (
    <li className="usage-row">
      <AppDot app={app} />
      <div className="usage-row-main">
        <div className="usage-row-top">
          <strong>{name}</strong>
          <b className={valueMuted ? 'is-zero' : ''}>{value}</b>
        </div>
        {lines.filter(Boolean).map((line) => <small key={line}>{line}</small>)}
      </div>
    </li>
  );
}

function Nurses({ nurses, periodWord }) {
  return (
    <section className="usage-section" aria-labelledby="nurses-title">
      <h2 id="nurses-title"><AppDot app="nurse" /> Nurses</h2>
      <p className="usage-note">Visits saved on the nurse desk {periodWord}.</p>
      <ul className="usage-card usage-list">
        {nurses.map((nurse) => (
          <PersonRow
            app="nurse"
            key={`${nurse.name}-${nurse.hospital}`}
            lines={[
              nurse.hospital,
              `${number(nurse.patientsAdded)} new ${nurse.patientsAdded === 1 ? 'patient' : 'patients'} · last opened ${lastSeenText(nurse.lastOpened || nurse.lastLogin)}`,
            ]}
            name={nurse.name}
            value={`${number(nurse.visitsSaved)} ${nurse.visitsSaved === 1 ? 'visit' : 'visits'}`}
            valueMuted={!nurse.visitsSaved}
          />
        ))}
      </ul>
    </section>
  );
}

function Doctors({ doctors, periodWord }) {
  return (
    <section className="usage-section" aria-labelledby="doctors-title">
      <h2 id="doctors-title"><AppDot app="doctor" /> Doctors</h2>
      <p className="usage-note">Screen time on the doctor desk {periodWord}.</p>
      <ul className="usage-card usage-list">
        {doctors.map((doctor) => (
          <PersonRow
            app="doctor"
            key={doctor.name}
            lines={[
              doctor.hospital,
              `Notifications ${doctor.notifications ? `on (${doctor.notifications} ${doctor.notifications === 1 ? 'phone' : 'phones'})` : 'off'} · last opened ${lastSeenText(doctor.lastOpened)}`,
            ]}
            name={doctor.name}
            value={screenTime(doctor.minutes)}
            valueMuted={!doctor.minutes}
          />
        ))}
      </ul>
    </section>
  );
}

function People({ people, periodWord }) {
  const [query, setQuery] = useState('');
  const [app, setApp] = useState('all');
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people.filter((person) => (app === 'all' || person.app === app)
      && (!q || `${person.name} ${person.detail || ''}`.toLowerCase().includes(q)));
  }, [app, people, query]);
  return (
    <section className="usage-section" aria-labelledby="people-title">
      <h2 id="people-title">Everyone who used DrJiva {periodWord}</h2>
      <div className="usage-people-tools">
        <label className="usage-search">
          <Search aria-hidden="true" size={17} />
          <input aria-label="Search by name or mobile" placeholder="Name or mobile" type="search" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <div className="usage-periods is-small" role="group" aria-label="App">
          {[{ id: 'all', who: 'everyone' }, ...APPS].map((entry) => (
            <button aria-pressed={app === entry.id} key={entry.id} type="button" onClick={() => setApp(entry.id)}>
              {entry.who.charAt(0).toUpperCase() + entry.who.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {shown.length ? (
        <ul className="usage-card usage-list">
          {shown.map((person) => (
            <PersonRow
              app={person.app}
              key={person.id}
              lines={[
                [APP_NAME[person.app], person.detail].filter(Boolean).join(' · '),
                `${person.days} ${person.days === 1 ? 'day' : 'days'} · ${person.opens} ${person.opens === 1 ? 'open' : 'opens'} · mostly ${person.topScreen} · last seen ${lastSeenText(person.lastSeen)}`,
              ]}
              name={person.name}
              value={screenTime(person.minutes)}
            />
          ))}
        </ul>
      ) : <p className="usage-card usage-empty">{people.length ? 'Nobody matches that search.' : 'Nobody yet. People show up here as soon as they open an app.'}</p>}
    </section>
  );
}
