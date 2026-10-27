import { useState } from 'react';

import { NurseSheet } from '@/components/nurse/NurseSheet';
import { nurseRequest, useNurse } from '@/contexts/NurseContext';
import { formatMobile } from '@/lib/nurse-schedule';

// "Remove" after a swipe: asks first, then takes the patient off this
// hospital's list. Use: const { requestRemove, removeSheet } = useRemovePatient();
export function useRemovePatient() {
  const { forgetPatient, profile } = useNurse();
  const [target, setTarget] = useState(null);
  const removeSheet = target ? (
    <RemovePatientSheet
      hospitalName={profile?.hospital?.name || 'your hospital'}
      onClose={() => setTarget(null)}
      onRemoved={(patientId) => {
        forgetPatient(patientId);
        setTarget(null);
      }}
      patient={target}
    />
  ) : null;
  return { removeSheet, requestRemove: setTarget };
}

function RemovePatientSheet({ hospitalName, onClose, onRemoved, patient }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const remove = async () => {
    setBusy(true);
    setError('');
    try {
      await nurseRequest('/api/nurse/remove', { body: { patientId: patient.id }, method: 'POST' });
      onRemoved(patient.id);
    } catch (removeError) {
      setError(removeError.message);
      setBusy(false);
    }
  };

  return (
    <NurseSheet onClose={busy ? () => undefined : onClose} title="Remove patient?">
      <div className="nurse-form">
        <p className="nurse-remove-who">
          <strong>{patient.name || 'Name not saved'}</strong>
          <span>+91 {formatMobile(patient.mobile)}</span>
        </p>
        <ul className="nurse-remove-points">
          <li>Leaves the {hospitalName} patient list.</li>
          <li>Their pregnancy, IUI or vaccine plan at {hospitalName} stops, and the next visit date is cleared in their DrJiva app.</li>
          <li>Medicines and other hospitals are not touched. Adding this mobile number again brings them back.</li>
        </ul>
        {error ? <p className="ios-error" role="alert">{error}</p> : null}
        <div className="nurse-remove-actions">
          <button className="ios-button is-large" disabled={busy} type="button" onClick={onClose}>Cancel</button>
          <button className="ios-button is-destructive is-large" disabled={busy} type="button" onClick={() => void remove()}>
            {busy ? 'Removing…' : 'Remove'}
          </button>
        </div>
      </div>
    </NurseSheet>
  );
}
