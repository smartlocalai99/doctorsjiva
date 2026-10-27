import { Baby, Check, HeartPulse, Stethoscope } from 'lucide-react';
import Head from 'next/head';

import { PageHeader } from '@/components/doctor/DeskParts';
import { NurseFrame, NurseNavActions } from '@/components/nurse/NurseFrame';
import { useNurse } from '@/contexts/NurseContext';

// What each kind of doctor's desk covers, in the nurse's words.
const COVERS = {
  general: 'Follow-up visits and tests',
  gynecology: 'Pregnancy, OI-TI / IUI, follow-ups',
  pediatrics: 'Child vaccines, follow-ups',
};
const ICONS = { general: Stethoscope, gynecology: HeartPulse, pediatrics: Baby };
const TONES = { general: 'gray', gynecology: 'pink', pediatrics: 'teal' };

// Right after login: which doctor is she working with today?
export function DeskDoctorPicker({ onPicked }) {
  const { chooseDeskDoctor, deskDoctor, profile } = useNurse();
  const doctors = profile?.doctors || [];

  return (
    <NurseFrame>
      <Head><title>Choose doctor · DrJiva Nurse</title></Head>
      <PageHeader
        lead={<p>Your patient list and buttons follow this doctor. You can change it any time.</p>}
        title="Doctor today"
        trailing={<NurseNavActions />}
      />
      <section className="ios-section" aria-label="Doctor">
        <ul className="ios-group nurse-choice-list" role="radiogroup" aria-label="Doctor">
          {doctors.map((doctor) => {
            const Icon = ICONS[doctor.department] || Stethoscope;
            const chosen = deskDoctor?.id === doctor.id;
            return (
              <li className="ios-cell" key={doctor.id}>
                <button
                  aria-checked={chosen}
                  className="ios-cell-link"
                  role="radio"
                  type="button"
                  onClick={() => {
                    chooseDeskDoctor(doctor.id);
                    onPicked?.();
                  }}
                >
                  <span className={`ios-icon is-large is-${TONES[doctor.department] || 'gray'}`} aria-hidden="true">
                    <Icon size={22} strokeWidth={2.2} />
                  </span>
                  <span className="ios-cell-body">
                    <strong className="ios-cell-title">{doctor.name}</strong>
                    <span className="ios-cell-sub"><span>{COVERS[doctor.department] || COVERS.general}</span></span>
                  </span>
                  {chosen ? <Check aria-hidden="true" className="nurse-check-mark" size={22} strokeWidth={2.6} /> : <span />}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </NurseFrame>
  );
}
