import { ChevronLeft, ChevronRight } from 'lucide-react';
import Head from 'next/head';
import { useMemo, useRef, useState } from 'react';

import { DeskError, DeskLoading, DeskSection, EmptyRow, NavActions, NotLinked, PageHeader, VisitRow } from '@/components/doctor/DeskParts';
import { useDoctorDesk } from '@/contexts/DoctorDeskContext';
import { addDays, addMonths, formatDate } from '@/lib/nurse-schedule';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const ORDER = { missed: 0, expected: 1, late: 2, upcoming: 3, seen: 4 };

// Sunday-first grid of one month, like the iPhone Calendar: 5 or 6 weeks.
function monthGrid(month) {
  const [y, m] = month.split('-').map(Number);
  const first = `${month}-01`;
  const weekday = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const start = addDays(first, -weekday);
  const cells = Math.ceil((weekday + days) / 7) * 7;
  return Array.from({ length: cells }, (_, index) => addDays(start, index));
}

export default function CalendarPage() {
  const { desk, error, patients } = useDoctorDesk();
  const today = desk?.today;
  const [month, setMonth] = useState(null);
  const [selected, setSelected] = useState(null);
  const swipe = useRef(null);
  const shownMonth = month || today?.slice(0, 7);
  const day = selected || today;

  const byDate = useMemo(() => {
    const map = new Map();
    for (const entry of desk?.appointments || []) map.set(entry.date, [...(map.get(entry.date) || []), entry]);
    return map;
  }, [desk]);

  const dayList = useMemo(
    () => [...(byDate.get(day) || [])].sort((a, b) => ORDER[a.status] - ORDER[b.status]),
    [byDate, day],
  );

  const moveMonth = (step) => setMonth(addMonths(`${shownMonth}-01`, step).slice(0, 7));
  const goToday = () => {
    setMonth(null);
    setSelected(null);
  };
  const awayFromToday = Boolean(today) && (day !== today || shownMonth !== today.slice(0, 7));

  // Swipe the month sideways to move a month, as in Calendar.
  const onTouchStart = (event) => {
    swipe.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  };
  const onTouchEnd = (event) => {
    if (!swipe.current) return;
    const dx = event.changedTouches[0].clientX - swipe.current.x;
    const dy = event.changedTouches[0].clientY - swipe.current.y;
    swipe.current = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) moveMonth(dx < 0 ? 1 : -1);
  };

  return (
    <>
      <Head><title>Calendar · DrJiva Doctors</title></Head>
      <div className="desk-page">
        <PageHeader
          title="Calendar"
          trailing={(
            <>
              {awayFromToday ? <button className="ios-text-button" type="button" onClick={goToday}>Today</button> : null}
              <NavActions />
            </>
          )}
        />

        {error && !desk ? <DeskError /> : null}
        {!desk && !error ? <DeskLoading /> : null}
        {desk && !desk.doctor.linked ? <NotLinked doctor={desk.doctor} /> : null}

        {desk?.doctor.linked ? (
          <>
            <section className="ios-calendar" aria-label="Month">
              <div className="ios-calendar-head">
                <h2 aria-live="polite">
                  <span>{formatDate(`${shownMonth}-01`, { month: 'long' })}</span>{' '}
                  {formatDate(`${shownMonth}-01`, { year: 'numeric' })}
                </h2>
                <button className="ios-nav-icon is-tint" type="button" onClick={() => moveMonth(-1)} aria-label="Previous month">
                  <ChevronLeft aria-hidden="true" size={24} strokeWidth={2.4} />
                </button>
                <button className="ios-nav-icon is-tint" type="button" onClick={() => moveMonth(1)} aria-label="Next month">
                  <ChevronRight aria-hidden="true" size={24} strokeWidth={2.4} />
                </button>
              </div>
              <div className="ios-calendar-grid" onTouchEnd={onTouchEnd} onTouchStart={onTouchStart}>
                {WEEKDAYS.map((name) => <span className="ios-calendar-weekday" key={name} aria-hidden="true">{name.slice(0, 1)}</span>)}
                {monthGrid(shownMonth).map((date) => {
                  const list = byDate.get(date) || [];
                  const missed = list.filter((entry) => entry.status === 'missed').length;
                  const open = list.filter((entry) => entry.status === 'expected' || entry.status === 'upcoming').length;
                  const came = list.length - missed - open;
                  const outside = date.slice(0, 7) !== shownMonth;
                  return (
                    <button
                      aria-label={`${formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}: ${list.length} ${list.length === 1 ? 'patient' : 'patients'}${missed ? `, ${missed} didn’t come` : ''}`}
                      aria-pressed={date === day}
                      className={`ios-calendar-day ${outside ? 'is-outside' : ''} ${date === today ? 'is-today' : ''} ${date < today ? 'is-past' : ''}`}
                      key={date}
                      type="button"
                      onClick={() => {
                        setSelected(date);
                        if (outside) setMonth(date.slice(0, 7));
                      }}
                    >
                      <span className="ios-calendar-number">{Number(date.slice(8))}</span>
                      <span className="ios-calendar-dots" aria-hidden="true">
                        {came ? <i className="is-came" /> : null}
                        {open ? <i className="is-open" /> : null}
                        {missed ? <i className="is-missed" /> : null}
                      </span>
                      {list.length ? <small className="ios-calendar-count" aria-hidden="true">{list.length}</small> : null}
                    </button>
                  );
                })}
              </div>
              <p className="ios-calendar-legend">
                <span><i className="is-came" /> Came</span>
                <span><i className="is-open" /> Booked</span>
                <span><i className="is-missed" /> Didn’t come</span>
              </p>
            </section>

            <DeskSection
              count={dayList.length}
              id="day"
              title={day === today ? 'Today' : formatDate(day, { weekday: 'long', day: 'numeric', month: 'long' })}
            >
              {dayList.length
                ? dayList.map((entry) => <VisitRow appointment={entry} key={entry.key} patient={patients.get(entry.patientId)} today={today} />)
                : <EmptyRow>No one is booked on this day.</EmptyRow>}
            </DeskSection>
          </>
        ) : null}
      </div>
    </>
  );
}
