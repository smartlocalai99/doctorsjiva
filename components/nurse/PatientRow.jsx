import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

import { initials } from '@/lib/nurse-directory';
import { formatDate, formatMobile } from '@/lib/nurse-schedule';

// One patient in the recent list, "View all" and search suggestions.
export function PatientRow({ id, option = false, patient, selected = false, showDate = true }) {
  return (
    <Link
      aria-selected={option ? selected : undefined}
      className="nurse-patient-row"
      href={`/nurse/patient/${patient.id}`}
      id={id}
      role={option ? 'option' : undefined}
    >
      <span aria-hidden="true" className="nurse-avatar">{initials(patient.name)}</span>
      <span className="nurse-patient-row-main">
        <strong>{patient.name || 'Name not saved'}</strong>
        <span>
          +91 {formatMobile(patient.mobile)}
          {patient.hospitalId ? ` · ID ${patient.hospitalId}` : ''}
        </span>
      </span>
      {showDate && patient.lastSeen ? (
        <span className="nurse-patient-row-date">{formatDate(patient.lastSeen, { day: 'numeric', month: 'short' })}</span>
      ) : null}
      <ChevronRight aria-hidden="true" className="nurse-patient-row-chevron" size={18} />
    </Link>
  );
}

export function PatientRowSkeleton() {
  return (
    <div aria-hidden="true" className="nurse-patient-row nurse-patient-row-skeleton">
      <span className="nurse-avatar" />
      <span className="nurse-patient-row-main"><i /><i /></span>
    </div>
  );
}
