import { ChevronRight, Phone } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { CareMark, PrepareList, StatusTag, careText, dayDate, shortDate } from '@/components/doctor/DeskParts';
import { nurseRequest } from '@/contexts/NurseContext';
import { formatMobile } from '@/lib/nurse-schedule';

const ORDER = { expected: 0, late: 1, seen: 2, upcoming: 3, missed: 4 };

// Who is coming today with the desk doctor, and who didn't come. Read when
// the page opens, when she comes back to it, and every minute on screen.
export function useNurseToday(doctorId) {
  const [state, setState] = useState({ data: null, error: '', forDoctor: null });
  const busy = useRef(false);

  const load = useCallback(async () => {
    if (!doctorId || busy.current) return;
    busy.current = true;
    try {
      const data = await nurseRequest(`/api/nurse/today?doctorId=${encodeURIComponent(doctorId)}`);
      setState({ data, error: '', forDoctor: doctorId });
    } catch (error) {
      setState((current) => ({ ...current, error: error.message, forDoctor: doctorId }));
    } finally {
      busy.current = false;
    }
  }, [doctorId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load();
    };
    const poll = window.setInterval(onVisible, 60 * 1000);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(poll);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  // A different doctor's list never shows under this one.
  const data = state.forDoctor === doctorId ? state.data : null;
  return { data, error: state.forDoctor === doctorId ? state.error : '', reload: load };
}

export function sortToday(appointments) {
  return [...appointments].sort((a, b) => ORDER[a.status] - ORDER[b.status]);
}

// One patient expected today (or missed): how far along, what to do, call.
export function NurseVisitRow({ appointment, patient, showDate = false, today }) {
  if (!patient) return null;
  const now = appointment.status === 'missed' || appointment.status === 'late';
  return (
    <li className={`ios-cell is-${appointment.status}`}>
      <Link className="ios-cell-link" href={`/nurse/patient/${patient.id}`}>
        <CareMark appointment={now ? null : appointment} patient={patient} today={today} />
        <span className="ios-cell-body">
          <span className="ios-cell-top">
            <strong className="ios-cell-title">{patient.name}</strong>
            <StatusTag appointment={appointment} />
          </span>
          <span className="ios-cell-sub">
            {showDate ? <span>{dayDate(appointment.date)}</span> : null}
            <span>{careText(patient, now ? null : appointment)}</span>
            {patient.hospitalPatientId ? <span className="is-id">{patient.hospitalPatientId}</span> : null}
          </span>
          {appointment.status === 'seen' && appointment.seenBy ? (
            <span className="ios-cell-line">Saved by {appointment.seenBy.nurse}</span>
          ) : (
            <PrepareList items={appointment.prepare} />
          )}
        </span>
        <ChevronRight aria-hidden="true" className="ios-chevron" size={18} strokeWidth={2.4} />
      </Link>
      {appointment.status === 'missed' && patient.mobile ? (
        <div className="ios-cell-actions">
          <a className="ios-call" href={`tel:+91${patient.mobile}`}>
            <Phone aria-hidden="true" size={15} strokeWidth={2.4} /> Call {formatMobile(patient.mobile)}
          </a>
          <span>{appointment.rebookedFor ? `Booked again for ${shortDate(appointment.rebookedFor)}` : 'No new date booked'}</span>
        </div>
      ) : null}
    </li>
  );
}
