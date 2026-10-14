// Which deploy the server is on. The nurse desk reloads itself when the
// open page is from an older deploy (see components/nurse/NurseFrame).
export default function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  response.status(200).json({ build: process.env.APP_BUILD_ID || null });
}
