import { Baby, ChevronRight, HeartPulse, IdCard, Info, Phone, Repeat, Stethoscope } from 'lucide-react';
import { useState } from 'react';

import { NurseSheet } from '@/components/nurse/NurseSheet';
import { initials } from '@/lib/nurse-directory';
import { childAge, cycleDay, DEPARTMENT_LABEL, formatDate, formatMobile, ordinal, pregnancyMonth, pregnancyWeek } from '@/lib/nurse-schedule';

// Like a contact card: who she is, what she is under and when she is next
// due, then call, WhatsApp or her hospital ID.
export function PatientHeader({ onEditId, patient, tags = [] }) {
  const mobile = String(patient.mobile || '').replace(/^\+91/, '');
  return (
    <section className="ios-contact" aria-label="Contact">
      <p className="ios-contact-ids">
        <span>+91 {formatMobile(mobile)}</span>
        {patient.hospitalPatientId ? <span>ID {patient.hospitalPatientId}</span> : null}
      </p>
      {tags.length ? (
        <p className="nurse-tags">
          {tags.map((tag) => <span className={`nurse-tag is-${tag.tone}`} key={tag.text}>{tag.text}</span>)}
        </p>
      ) : null}
      <div className="ios-contact-actions">
        <a href={`tel:+91${mobile}`}><Phone aria-hidden="true" size={20} strokeWidth={2.2} /><span>Call</span></a>
        <a href={`https://wa.me/91${mobile}`} rel="noreferrer" target="_blank"><WhatsAppIcon /><span>WhatsApp</span></a>
        <button type="button" onClick={onEditId}>
          <IdCard aria-hidden="true" size={20} strokeWidth={2.2} />
          <span>{patient.hospitalPatientId ? 'Hospital ID' : 'Add ID'}</span>
        </button>
      </div>
    </section>
  );
}

function WhatsAppIcon() {
  return (
    <svg aria-hidden="true" fill="currentColor" height="20" viewBox="0 0 24 24" width="20">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
    </svg>
  );
}

export function PatientAvatar({ name }) {
  return <span className="ios-contact-avatar" aria-hidden="true">{initials(name)}</span>;
}

// "Doctor seen today": a cell that opens the doctor list.
export function DoctorRow({ doctor, lastFollowup, onEdit }) {
  return (
    <section className="ios-section" aria-label="Doctor seen today">
      <ul className="ios-group">
        <li className="ios-cell">
          <button className="ios-cell-link is-setting has-value" type="button" onClick={onEdit}>
            <span className={`ios-icon ${doctor.name ? 'is-blue' : 'is-orange'}`} aria-hidden="true"><Stethoscope size={17} strokeWidth={2.4} /></span>
            <span className="ios-cell-body"><span className="ios-cell-title">Doctor seen today</span></span>
            <span className={`nurse-cell-value ${doctor.name ? '' : 'is-warning'}`}>{doctor.name || 'Choose'}</span>
            <ChevronRight aria-hidden="true" className="ios-chevron" size={18} strokeWidth={2.4} />
          </button>
        </li>
      </ul>
      {lastFollowup ? (
        <p className="ios-section-foot">Last visit saved {formatDate(lastFollowup.visitDate)} by {lastFollowup.nurseName}.</p>
      ) : null}
    </section>
  );
}

export function DoctorSheet({ doctor, doctors, onClose, onSave }) {
  const [key, setKey] = useState(doctor.key);
  const [otherName, setOtherName] = useState(doctor.key === 'other' ? doctor.name : '');

  const save = () => {
    if (key === 'other') onSave({ careDoctorId: null, department: 'general', key: 'other', name: otherName.trim() });
    else if (!key) onSave({ careDoctorId: null, department: 'general', key: '', name: '' });
    else {
      const picked = doctors.find((item) => item.id === key);
      onSave({ careDoctorId: picked.id, department: picked.department, key: picked.id, name: picked.name });
    }
  };

  return (
    <NurseSheet title="Doctor seen today" onClose={onClose}>
      <div className="nurse-form">
        <div className="nurse-option-list" role="radiogroup" aria-label="Doctor">
          {doctors.map((item) => (
            <button aria-checked={key === item.id} className="nurse-option" key={item.id} role="radio" type="button" onClick={() => setKey(item.id)}>
              <strong>{item.name}</strong>
              <span>{DEPARTMENT_LABEL[item.department]}</span>
            </button>
          ))}
          <button aria-checked={key === 'other'} className="nurse-option" role="radio" type="button" onClick={() => setKey('other')}>
            <strong>Other doctor</strong>
            <span>Type the name from the case sheet</span>
          </button>
        </div>
        {key === 'other' ? (
          <label className="nurse-field">
            <span>Doctor&apos;s name</span>
            <div className="nurse-input-wrap">
              <input autoFocus maxLength={80} value={otherName} onChange={(event) => setOtherName(event.target.value)} />
            </div>
          </label>
        ) : null}
        <button className="ios-button is-filled is-large" disabled={key === 'other' && !otherName.trim()} type="button" onClick={save}>
          Use this doctor
        </button>
      </div>
    </NurseSheet>
  );
}

// Where she is now in each schedule, and what can be changed.
export function PlanSummary({ everyVisit, onAction, patientName, plan, today }) {
  const isPregnancy = plan.type === 'pregnancy';
  const week = isPregnancy ? pregnancyWeek(plan, today) : 0;
  const line = everyVisit?.[plan.type]?.en;
  const otherMother = isPregnancy && plan.personName && plan.personName.trim().toLowerCase() !== String(patientName || '').trim().toLowerCase();

  return (
    <article className={`ios-card nurse-plan is-${plan.type}`}>
      <div className="ios-card-head">
        <span className={`ios-icon ${isPregnancy ? 'is-pink' : 'is-teal'}`} aria-hidden="true">
          {isPregnancy ? <HeartPulse size={17} strokeWidth={2.4} /> : <Baby size={17} strokeWidth={2.4} />}
        </span>
        <h2>{isPregnancy ? (otherMother ? `Pregnancy, ${plan.personName}` : 'Pregnancy') : `Baby ${plan.personName}`}</h2>
      </div>
      {isPregnancy ? (
        <>
          <p className="ios-big-number"><b>{Math.max(0, week)}</b> weeks</p>
          <p className="ios-card-lead">{ordinal(pregnancyMonth(Math.max(0, week)))} month. Delivery due {formatDate(plan.eddDate)}</p>
          <div className="nurse-progress" aria-hidden="true"><i style={{ width: `${Math.min(100, Math.max(0, (week / 40) * 100))}%` }} /></div>
        </>
      ) : (
        <p className="ios-card-lead is-strong">
          {childAge(plan.birthDate, today)}, born {formatDate(plan.birthDate)}{plan.gender ? `, ${plan.gender === 'female' ? 'girl' : 'boy'}` : ''}
        </p>
      )}
      {line ? <p className="nurse-every-visit"><Info aria-hidden="true" size={16} strokeWidth={2.4} /> {line}</p> : null}
      <div className="nurse-plan-actions">
        {isPregnancy ? (
          <>
            <button className="ios-button is-tinted is-small" type="button" onClick={() => onAction('correct', plan)}>Change delivery date</button>
            <button className="ios-button is-small" type="button" onClick={() => onAction('close', plan)}>Delivered / ended</button>
          </>
        ) : (
          <button className="ios-button is-small" type="button" onClick={() => onAction('close', plan)}>Stop vaccines</button>
        )}
      </div>
    </article>
  );
}

// OI-TI / IUI: where she is in the cycle, the next step, and actions.
export function CycleSummary({ cycle, onAction, today }) {
  const day = cycleDay(cycle.anchorDate, today);
  const length = cycle.lengthDays || 31;
  const next = cycle.steps.find((step) => !step.status && step.date >= today);
  return (
    <article className="ios-card nurse-plan is-cycle">
      <div className="ios-card-head">
        <span className="ios-icon is-purple" aria-hidden="true"><Repeat size={17} strokeWidth={2.4} /></span>
        <h2>{cycle.titleEn} cycle</h2>
      </div>
      {day >= 1 ? (
        <p className="ios-big-number"><span>Day</span> <b>{Math.min(day, length + 30)}</b></p>
      ) : (
        <p className="ios-big-number"><span>Starts</span> <b>{formatDate(cycle.anchorDate, { day: 'numeric', month: 'short' })}</b></p>
      )}
      <p className="ios-card-lead">
        Day 1 was {formatDate(cycle.anchorDate)}. Wife {cycle.personName}{cycle.partnerName ? `, husband ${cycle.partnerName}` : ''}.
      </p>
      <div className="nurse-progress" aria-hidden="true"><i style={{ width: `${Math.min(100, Math.max(0, (day / length) * 100))}%` }} /></div>
      {next ? (
        <p className="nurse-every-visit">
          <Info aria-hidden="true" size={16} strokeWidth={2.4} /> Next: {next.labelEn}, {formatDate(next.date, { day: 'numeric', month: 'short', weekday: 'short' })}
        </p>
      ) : null}
      <div className="nurse-plan-actions">
        <button className="ios-button is-tinted is-small" type="button" onClick={() => onAction('cycleDayOne', cycle)}>Change Day 1</button>
        <button className="ios-button is-small" type="button" onClick={() => onAction('cycleClose', cycle)}>Finish cycle</button>
      </div>
    </article>
  );
}
