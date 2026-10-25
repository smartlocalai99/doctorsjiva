import { BellRing, Smartphone, X } from 'lucide-react';
import { useState } from 'react';

import { InstallSteps } from '@/components/AppShell';
import { useShell } from '@/contexts/ShellContext';
import { readStored, writeStored } from '@/lib/device-store';
import { isIos } from '@/lib/push-client';

// One tip at the top of Today, until it is done or closed: first "Add to
// Home Screen" (iPhone needs it for notifications), then "Turn on
// notifications".
export function AppTip() {
  const { install, push } = useShell();
  // Only rendered in the browser (inside the signed-in app frame).
  const [closed, setClosed] = useState(() => readStored('drjiva.tips') || {});

  const close = (id) => {
    const next = { ...closed, [id]: Date.now() };
    setClosed(next);
    writeStored('drjiva.tips', next);
  };

  const needsInstall = !install.installed && (install.canPrompt || push.state === 'install' || isIos());
  if (needsInstall && !closed.install) {
    return (
      <Tip icon={<Smartphone size={20} strokeWidth={2.2} />} title="Add DrJiva to your Home Screen" tone="blue" onClose={() => close('install')}>
        <p>It opens full screen like an app, stays signed in, and can send you notifications.</p>
        {install.canPrompt ? (
          <button className="ios-button is-filled is-small" type="button" onClick={() => void install.install()}>Add to Home Screen</button>
        ) : <InstallSteps />}
      </Tip>
    );
  }
  if (push.state === 'off' && !closed.push) {
    return (
      <Tip icon={<BellRing size={20} strokeWidth={2.2} />} title="Turn on notifications" tone="red" onClose={() => close('push')}>
        <p>Hear when the nurse sees your patients or adds a new one, and get the day’s list at 8 AM.</p>
        <button className="ios-button is-filled is-small" disabled={push.busy} type="button" onClick={() => void push.enable()}>
          {push.busy ? 'Turning on…' : 'Turn on'}
        </button>
        {push.error ? <p className="ios-tip-error" role="alert">{push.error}</p> : null}
      </Tip>
    );
  }
  return null;
}

function Tip({ children, icon, onClose, title, tone }) {
  return (
    <aside className="ios-tip" aria-label={title}>
      <span className={`ios-icon is-large is-${tone}`} aria-hidden="true">{icon}</span>
      <div className="ios-tip-body">
        <h2>{title}</h2>
        {children}
      </div>
      <button className="ios-tip-close" type="button" onClick={onClose} aria-label="Close tip">
        <X aria-hidden="true" size={16} strokeWidth={2.6} />
      </button>
    </aside>
  );
}
