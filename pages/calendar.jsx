import { ChevronLeft, ChevronRight } from 'lucide-react';
import Head from 'next/head';
import { useMemo, useState } from 'react';

import { DeskError, DeskLoading, DeskSection, EmptyRow, NotLinked, RefreshButton, VisitRow } from '@/components/doctor/DeskParts';
import { useDoctorDesk } from '@/contexts/DoctorDeskContext';
import { addDays, addMonths, formatDate } from '@/lib/nurse-schedule';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ORDER = { missed: 0, expected: 1, late: 2, upcoming: 3, seen: 4 };

// Monday-first grid of one month: 5 or 6 rows of dates.
function monthGrid(month) {
  const [y, m] = month.split('-').map(Number);
  const first = `${month}-01`;
  const weekday = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7;
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

  return (
    <>
      <Head><title>Calendar · DRJIVA Doctors</title></Head>
      <div className="desk-page">
        <header className="desk-page-head">
          <h1 className="desk-page-title">Calendar</h1>
          <RefreshButton />
        </header>

        {error && !desk ? <DeskError /> : null}
        {!desk && !error ? <DeskLoading /> : null}
        {desk && !desk.doctor.linked ? <NotLinked doctor={desk.doctor} /> : null}

        {desk?.doctor.linked ? (
          <>
            <section className="desk-calendar" aria-label="Month">
              <div className="desk-calendar-head">
                <h2>{formatDate(`${shownMonth}-01`, { month: 'long', year: 'numeric' })}</h2>
                {day !== today || shownMonth !== today.slice(0, 7) ? (
                  <button className="desk-chip" type="button" onClick={goToday}>Today</button>
                ) : null}
                <button className="desk-icon-button" type="button" onClick={() => moveMonth(-1)} aria-label="Previous month">
                  <ChevronLeft aria-hidden="true" size={20} />
                </button>
                <button className="desk-icon-button" type="button" onClick={() => moveMonth(1)} aria-label="Next month">
                  <ChevronRight aria-hidden="true" size={20} />
                </button>
              </div>
              <div className="desk-calendar-grid">
                {WEEKDAYS.map((name) => <span className="desk-calendar-weekday" key={name} aria-hidden="true">{name.slice(0, 1)}</span>)}
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
                      className={`desk-calendar-day ${outside ? 'is-outside' : ''} ${date === today ? 'is-today' : ''} ${date < today ? 'is-past' : ''}`}
                      key={date}
                      type="button"
                      onClick={() => {
                        setSelected(date);
                        if (outside) setMonth(date.slice(0, 7));
                      }}
                    >
                      <span className="desk-calendar-number">{Number(date.slice(8))}</span>
                      {list.length ? (
                        <span className="desk-calendar-load" aria-hidden="true">
                          <small>{list.length}</small>
                          <span className="desk-calendar-bar">
                            {came ? <b className="is-came" style={{ flexGrow: came }} /> : null}
                            {open ? <b className="is-open" style={{ flexGrow: open }} /> : null}
                            {missed ? <b className="is-missed" style={{ flexGrow: missed }} /> : null}
                          </span>
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
              <p className="desk-calendar-legend">
                <span><b className="is-came" /> Came</span>
                <span><b className="is-open" /> Booked</span>
                <span><b className="is-missed" /> Didn’t come</span>
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
