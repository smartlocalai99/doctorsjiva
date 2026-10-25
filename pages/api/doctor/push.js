import { doctorRoute } from '@/lib/server/doctor-api';
import { pushKeys, removeSubscription, requestOrigin, saveSubscription, sendToSubscriptions } from '@/lib/server/doctor-push';

// GET: the key the phone needs to subscribe. POST: turn notifications on
// for this phone; with `welcome`, send a first message so she sees it
// works. DELETE: turn them off.
export default doctorRoute(async (request, response, doctor) => {
  if (request.method === 'GET') {
    const { publicKey } = await pushKeys();
    return response.status(200).json({ publicKey });
  }
  const subscription = request.body?.subscription;
  if (request.method === 'DELETE') {
    await removeSubscription(doctor.phone_number, subscription?.endpoint || request.body?.endpoint);
    return response.status(200).json({ ok: true });
  }
  const saved = await saveSubscription(doctor.phone_number, subscription, request.headers['user-agent']);
  if (!saved) return response.status(400).json({ error: 'This phone did not allow notifications. Try again.' });
  if (request.body?.welcome !== true) return response.status(200).json({ ok: true });
  await sendToSubscriptions([{ auth: subscription.keys.auth, endpoint: subscription.endpoint, p256dh: subscription.keys.p256dh }], {
    body: 'You will hear when the nurse sees your patients, and get the day’s list at 8 AM.',
    tag: 'welcome',
    title: 'Notifications are on',
    url: '/',
  }, requestOrigin(request));
  return response.status(200).json({ ok: true });
}, { methods: ['GET', 'POST', 'DELETE'] });
