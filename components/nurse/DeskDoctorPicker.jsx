import { Baby, HeartPulse, Stethoscope } from 'lucide-react';
import Head from 'next/head';

import { NurseFrame } from '@/components/nurse/NurseFrame';
import { useNurse } from '@/contexts/NurseContext';
import { initials } from '@/lib/nurse-directory';

// What each kind of doctor's desk covers, in the nurse's words.
const COVERS = {
  general: 'Follow-up visits and tests',
  gynecology: 'Pregnancy · OI-TI / IUI · follow-ups',
  pediatrics: 'Child vaccines · follow-ups',
};
const ICONS = { general: Stethoscope, gynecology: HeartPulse, pediatrics: Baby };

// Right after login: which doctor is she working with today?
export function DeskDoctorPicker({ onPicked }) {
  const { chooseDeskDoctor, deskDoctor, profile } = useNurse();
  const doctors = profile?.doctors || [];

  return (
    <NurseFrame>
      <Head><title>Choose doctor · DRJIVA Nurse</title></Head>
      <section className="nurse-section" aria-labelledby="desk-heading">
        <h1 className="nurse-title" id="desk-heading">Which doctor are you with today?</h1>
        <p className="nurse-lead">Your patient list and buttons follow this doctor. You can change it any time.</p>
        <div className="nurse-desk-list" role="radiogroup" aria-label="Doctor">
          {doctors.map((doctor) => {
            const Icon = ICONS[doctor.department] || Stethoscope;
            return (
              <button
                aria-checked={deskDoctor?.id === doctor.id}
                className="nurse-desk-card"
                key={doctor.id}
                role="radio"
                type="button"
                onClick={() => {
                  chooseDeskDoctor(doctor.id);
                  onPicked?.();
                }}
              >
                <span aria-hidden="true" className="nurse-desk-avatar">{initials(doctor.name.replace(/^dr\.?\s*/i, ''))}</span>
                <span className="nurse-desk-copy">
                  <strong>{doctor.name}</strong>
                  <span><Icon aria-hidden="true" size={15} /> {COVERS[doctor.department] || COVERS.general}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </NurseFrame>
  );
}
