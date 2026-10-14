import { ChevronDown, Pencil, Stethoscope } from 'lucide-react';
import { useState } from 'react';

import { NurseSheet } from '@/components/nurse/NurseSheet';
import { childAge, DEPARTMENT_LABEL, formatDate, formatMobile, pregnancyText, pregnancyWeek } from '@/lib/nurse-schedule';

// Patient name on the left, the doctor on the top right (tap to change).
export function PatientHeader({ doctor, onEditDoctor, onEditId, patient }) {
  return (
    <section className="nurse-patient-top" aria-labelledby="patient-name">
      <div className="nurse-patient-top-main">
        <h1 className="nurse-title" id="patient-name">{patient.name || 'Patient'}</h1>
        <p className="nurse-patient-meta">
          <span>+91 {formatMobile(patient.mobile)}</span>
          <button className="nurse-link-button" type="button" onClick={onEditId}>
            {patient.hospitalPatientId ? `ID ${patient.hospitalPatientId}` : 'Add hospital ID'} <Pencil aria-hidden="true" size={14} />
          </button>
        </p>
      </div>
      <button
        aria-label={doctor.name ? `Doctor: ${doctor.name}. Change doctor` : 'Choose doctor'}
        className={`nurse-doctor-chip${doctor.name ? '' : ' nurse-doctor-chip-empty'}`}
        type="button"
        onClick={onEditDoctor}
      >
        <Stethoscope aria-hidden="true" size={16} />
        <span>
          <strong>{doctor.name || 'Choose doctor'}</strong>
          {doctor.name && doctor.department !== 'general' ? <small>{DEPARTMENT_LABEL[doctor.department]}</small> : null}
        </span>
        <ChevronDown aria-hidden="true" size={16} />
      </button>
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
        <button className="primary-button nurse-big-button" disabled={key === 'other' && !otherName.trim()} type="button" onClick={save}>
          Use this doctor
        </button>
      </div>
    </NurseSheet>
  );
}

// One line per schedule: where she is now, and the two actions.
export function PlanSummary({ everyVisit, onAction, patientName, plan, today }) {
  const isPregnancy = plan.type === 'pregnancy';
  const week = isPregnancy ? pregnancyWeek(plan, today) : 0;
  const line = everyVisit?.[plan.type]?.en;

  return (
    <article className={`nurse-plan nurse-plan-${plan.type}`}>
      <div className="nurse-plan-head">
        <h2>
          {isPregnancy
            ? plan.personName && plan.personName.trim().toLowerCase() !== String(patientName || '').trim().toLowerCase()
              ? `Pregnancy · ${plan.personName}`
              : 'Pregnancy'
            : plan.personName}
        </h2>
        {isPregnancy ? (
          <>
            <p>{pregnancyText(week)}</p>
            <p>Expected delivery date: <strong>{formatDate(plan.eddDate)}</strong></p>
          </>
        ) : (
          <p>{childAge(plan.birthDate, today)} · Born {formatDate(plan.birthDate)}{plan.gender ? ` · ${plan.gender === 'female' ? 'Girl' : 'Boy'}` : ''}</p>
        )}
      </div>
      {isPregnancy ? (
        <div className="nurse-progress" aria-hidden="true"><i style={{ width: `${Math.min(100, Math.max(0, (week / 40) * 100))}%` }} /></div>
      ) : null}
      {line ? <p className="nurse-every-visit">{line}</p> : null}
      <footer className="nurse-plan-actions">
        {isPregnancy ? (
          <>
            <button className="secondary-button" type="button" onClick={() => onAction('correct', plan)}>Change delivery date</button>
            <button className="secondary-button" type="button" onClick={() => onAction('close', plan)}>Delivered / ended</button>
          </>
        ) : (
          <button className="secondary-button" type="button" onClick={() => onAction('close', plan)}>Stop vaccines</button>
        )}
      </footer>
    </article>
  );
}
