import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';

// Bottom sheet on phones, centred dialog on bigger screens.
export function NurseSheet({ children, onClose, title }) {
  const panelRef = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    panelRef.current?.querySelector('input, select, textarea, button:not([data-close])')?.focus();
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
        <div className="nurse-sheet-head">
          <h2>{title}</h2>
          <button className="nurse-icon-button" data-close type="button" onClick={onClose} aria-label="Close">
            <X aria-hidden="true" size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
