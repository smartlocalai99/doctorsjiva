// Local preview of the usage page when Supabase is not configured: made-up
// numbers in the same shape as usage_dashboard() (supabase migration
// 20261029091000_app_usage.sql). Never used in production.
import { addDays } from '@/lib/nurse-schedule';

function wave(index, base, swing) {
  return Math.max(0, Math.round(base + swing * Math.sin(index / 2.3) + ((index * 7) % 5) - 2));
}

export function usageSample(days) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
  const now = Date.now();
  const ago = (minutes) => new Date(now - minutes * 60000).toISOString();
  const scale = days === 1 ? 0.18 : days === 7 ? 1 : 3.4;
  const daily = Array.from({ length: 30 }, (_, index) => ({
    day: addDays(today, index - 29),
    doctor: index % 7 === 6 ? 0 : wave(index, 1.4, 0.6),
    minutes: wave(index, 140, 50),
    newPhones: wave(index, 1.5, 1.5),
    nurse: index % 7 === 6 ? 1 : wave(index, 4, 1.5),
    patient: wave(index, 11, 5),
  }));
  const app = (people, minutes, screens) => ({
    minutes: Math.round(minutes * scale),
    newPeople: Math.max(0, Math.round(people * 0.2 * scale)),
    opens: Math.round(people * 3.2 * scale),
    people: Math.max(1, Math.round(people * Math.min(scale, 1.6))),
    personDays: Math.round(people * 2.6 * scale),
    screens: screens.map(([screen, share, views]) => ({
      minutes: Math.round(minutes * share * scale * 10) / 10,
      people: Math.max(1, Math.round(people * Math.min(1, share * 2.2))),
      screen,
      views: Math.round(views * scale),
    })),
    signedIn: Math.max(1, Math.round(people * 0.85 * Math.min(scale, 1.6))),
  });
  return {
    apps: {
      doctor: app(2, 74, [['Today', 0.52, 41], ['Patient page', 0.27, 36], ['Calendar', 0.13, 12], ['Patients', 0.08, 9]]),
      nurse: app(6, 512, [['Patient page', 0.58, 214], ['Today', 0.31, 120], ['All patients', 0.08, 33], ['Login', 0.03, 5]]),
      patient: app(34, 402, [['My Care', 0.34, 160], ['Today', 0.22, 210], ['Health feed', 0.17, 88], ['Reminders', 0.11, 64], ['Shop', 0.07, 37], ['Medicine', 0.05, 30], ['Login', 0.04, 41]]),
    },
    daily,
    days,
    doctors: [
      { hospital: 'Dhruva Hospitals', lastOpened: ago(14), minutes: Math.round(61 * scale), name: 'Dr. Mounika', notifications: 2 },
      { hospital: 'Dhruva Hospitals', lastOpened: ago(60 * 26), minutes: Math.round(13 * scale), name: 'Dr. Sudarshan Reddy', notifications: 0 },
      { hospital: 'Asian Hospitals', lastOpened: null, minutes: 0, name: 'Dr. Ritish Reddy', notifications: 0 },
    ],
    from: addDays(today, 1 - days),
    generatedAt: new Date(now).toISOString(),
    live: [
      { app: 'nurse', detail: 'Dhruva Hospitals', minutes: 18, name: 'Anitha', screen: 'Patient page', signedIn: true, since: ago(18) },
      { app: 'patient', detail: '9849012345', minutes: 4.5, name: 'Lakshmi Prasanna', screen: 'My Care', signedIn: true, since: ago(5) },
      { app: 'doctor', detail: 'Dhruva Hospitals', minutes: 2, name: 'Dr. Mounika', screen: 'Today', signedIn: true, since: ago(2) },
      { app: 'patient', detail: null, minutes: 1, name: 'Not logged in', screen: 'Login', signedIn: false, since: ago(1) },
    ],
    nurses: [
      { hospital: 'Dhruva Hospitals', lastLogin: ago(40), lastOpened: ago(1), name: 'Anitha', patientsAdded: Math.round(6 * scale), visitsSaved: Math.round(31 * scale) },
      { hospital: 'Dhruva Hospitals', lastLogin: ago(60 * 5), lastOpened: ago(60 * 3), name: 'Swapna', patientsAdded: Math.round(3 * scale), visitsSaved: Math.round(17 * scale) },
      { hospital: 'Shankar Gastro Hospital', lastLogin: ago(60 * 30), lastOpened: ago(60 * 29), name: 'Ramya', patientsAdded: 0, visitsSaved: Math.round(4 * scale) },
      { hospital: 'Asian Hospitals', lastLogin: null, lastOpened: null, name: 'Bhavani', patientsAdded: 0, visitsSaved: 0 },
    ],
    opensByHour: Array.from({ length: 24 }, (_, hour) => ({
      hour,
      opens: hour < 7 ? (hour === 6 ? 2 : 0) : Math.round(scale * (hour >= 9 && hour <= 13 ? 14 - Math.abs(11 - hour) * 2 : hour >= 18 && hour <= 21 ? 9 - Math.abs(20 - hour) * 2 : 3)),
    })),
    people: [
      ['nurse', 'Anitha', 'Dhruva Hospitals', 212, 6, 24, 1, 'Patient page'],
      ['patient', 'Lakshmi Prasanna', '9849012345', 46, 5, 9, 5, 'My Care'],
      ['doctor', 'Dr. Mounika', 'Dhruva Hospitals', 61, 5, 11, 14, 'Today'],
      ['patient', 'Not logged in', null, 3, 1, 2, 1, 'Login'],
      ['nurse', 'Swapna', 'Dhruva Hospitals', 128, 4, 13, 180, 'Patient page'],
      ['patient', 'Sravani Kurapati', '9701122334', 22, 3, 4, 300, 'Health feed'],
      ['patient', 'Haritha Reddy', '9000456789', 9, 2, 3, 900, 'My Care'],
      ['doctor', 'Dr. Sudarshan Reddy', 'Dhruva Hospitals', 13, 2, 3, 1560, 'Patient page'],
      ['nurse', 'Ramya', 'Shankar Gastro Hospital', 31, 1, 2, 1740, 'Today'],
      ['patient', 'Anusha Gaddam', '9603344556', 14, 2, 2, 2900, 'Reminders'],
    ].map(([appName, name, detail, minutes, active, opens, minutesAgo, topScreen], index) => ({
      app: appName, days: Math.min(active, days), detail, id: `sample-${index}`, lastSeen: ago(minutesAgo),
      minutes: Math.round(minutes * scale * 10) / 10, name, opens: Math.max(1, Math.round(opens * scale)), signedIn: name !== 'Not logged in', topScreen,
    })),
    phones: {
      active1: 7, active30: 61, active7: 28, chatQuestions: Math.round(9 * scale), firstOpen: '2026-07-28T05:10:00Z', loggedIn: 60,
      opened: 267, openedInPeriod: Math.round(10 * scale), orders: days === 30 ? 1 : 0, patientsLoggedIn: 59,
      reelViewers: Math.round(14 * Math.min(scale, 1.6)), reelViews: Math.round(120 * scale), reminderPhones: 1, remindersSent: Math.round(2 * scale),
    },
    today,
    trackingSince: { doctor: addDays(today, -29), nurse: addDays(today, -29), patient: addDays(today, -29) },
  };
}
