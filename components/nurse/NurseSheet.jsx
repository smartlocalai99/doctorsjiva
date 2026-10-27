import { useEffect, useRef } from 'react';

// iOS sheet: slides up on phones (centred dialog on bigger screens), a
// grabber, the title in the middle and Cancel on the left.
export function NurseSheet({ children, onClose, title }) {
  const panelRef = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    panelRef.current?.querySelector('input:not([type="date"]), select, textarea, button:not([data-close])')?.focus({ preventScroll: true });
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="nurse-sheet-backdrop" onClick={onClose}>
      <section
        aria-label={title}
        aria-modal="true"
        className="nurse-sheet"
        onClick={(event) => event.stopPropagation()}
        ref={panelRef}
        role="dialog"
      >
        <span className="ios-grabber" aria-hidden="true" />
        <div className="nurse-sheet-head">
          <button className="ios-text-button" data-close type="button" onClick={onClose}>Cancel</button>
          <h2>{title}</h2>
          <span />
        </div>
        {children}
      </section>
    </div>
  );
}
