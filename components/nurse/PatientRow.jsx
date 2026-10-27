import { ChevronRight, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRef, useState } from 'react';

import { initials } from '@/lib/nurse-directory';
import { formatDate, formatMobile } from '@/lib/nurse-schedule';

const REVEAL = 96;

function RowContent({ patient, showDate }) {
  return (
    <>
      <span aria-hidden="true" className="nurse-avatar">{initials(patient.name)}</span>
      <span className="ios-cell-body">
        <strong className="ios-cell-title">{patient.name || 'Name not saved'}</strong>
        <span className="ios-cell-sub">
          <span>+91 {formatMobile(patient.mobile)}</span>
          {patient.hospitalId ? <span className="is-id">{patient.hospitalId}</span> : null}
        </span>
      </span>
      <span className="nurse-row-end">
        {showDate && patient.lastSeen ? <span>{formatDate(patient.lastSeen, { day: 'numeric', month: 'short' })}</span> : null}
        <ChevronRight aria-hidden="true" className="ios-chevron" size={18} strokeWidth={2.4} />
      </span>
    </>
  );
}

// One patient in the recent list, "View all" and search suggestions. With
// `onRemove`, swiping the row left shows a red "Remove" button.
export function PatientRow({ id, onRemove, option = false, patient, selected = false, showDate = true }) {
  const [open, setOpen] = useState(false);
  const [dragX, setDragX] = useState(null);
  const gesture = useRef(null);
  const swiped = useRef(false);

  if (!onRemove || option) {
    return (
      <Link
        aria-selected={option ? selected : undefined}
        className="ios-cell-link nurse-row"
        href={`/nurse/patient/${patient.id}`}
        id={id}
        role={option ? 'option' : undefined}
      >
        <RowContent patient={patient} showDate={showDate} />
      </Link>
    );
  }

  const offset = dragX ?? (open ? -REVEAL : 0);

  const onPointerDown = (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    gesture.current = { base: open ? -REVEAL : 0, dragging: false, x: event.clientX, y: event.clientY };
    swiped.current = false;
  };
  const onPointerMove = (event) => {
    const start = gesture.current;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (!start.dragging) {
      if (Math.abs(dy) > 10 && Math.abs(dy) > Math.abs(dx)) {
        gesture.current = null; // scrolling the list
        return;
      }
      if (Math.abs(dx) < 8) return;
      start.dragging = true;
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    setDragX(Math.min(0, Math.max(-REVEAL - 24, start.base + dx)));
  };
  const onPointerEnd = () => {
    const start = gesture.current;
    gesture.current = null;
    if (!start?.dragging) return;
    swiped.current = true;
    setOpen((dragX ?? start.base) < -REVEAL / 2);
    setDragX(null);
  };

  return (
    <div className={`nurse-swipe ${open ? 'nurse-swipe-open' : ''}`}>
      {offset < 0 ? (
      <button
        aria-hidden={!open}
        className="nurse-swipe-remove"
        tabIndex={open ? 0 : -1}
        type="button"
        onClick={() => {
          setOpen(false);
          onRemove(patient);
        }}
      >
        <Trash2 aria-hidden="true" size={20} strokeWidth={2.2} />
        <span>Remove</span>
      </button>
      ) : null}
      <Link
        className="ios-cell-link nurse-row nurse-swipe-row"
        draggable={false}
        href={`/nurse/patient/${patient.id}`}
        id={id}
        onClick={(event) => {
          // The click right after a swipe is ignored; a tap on an open row
          // closes it. Neither opens the patient.
          if (swiped.current) {
            event.preventDefault();
            swiped.current = false;
          } else if (open) {
            event.preventDefault();
            setOpen(false);
          }
        }}
        onDragStart={(event) => event.preventDefault()}
        onPointerCancel={onPointerEnd}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        style={{ transform: `translateX(${offset}px)`, transition: dragX === null ? 'transform 180ms ease' : 'none' }}
      >
        <RowContent patient={patient} showDate={showDate} />
      </Link>
    </div>
  );
}

export function PatientRowSkeleton() {
  return (
    <div aria-hidden="true" className="ios-cell-link nurse-row nurse-row-skeleton">
      <span className="nurse-avatar" />
      <span className="ios-cell-body"><i /><i /></span>
    </div>
  );
}
