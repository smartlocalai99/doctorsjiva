import { createContext, use } from 'react';

// What the doctor app frame shares with its pages: the settings sheet,
// and this phone's notification and Home Screen state.
export const ShellContext = createContext(null);

export function useShell() {
  const value = use(ShellContext);
  if (!value) throw new Error('useShell must be used inside the doctor app frame.');
  return value;
}
