// Stub ABDM HIP/HIU callback receiver — just enough for the gateway to
// register our bridge URL and pass its "verify integration" check. ABDM's
// async pattern expects a 202 Accepted immediately; the real response (if
// any) goes back later via a separate callback. Real HIP/HIU business logic
// (patient discovery, consent, care-context linking, health data bundles)
// is not implemented yet — this only proves the endpoint exists and answers.
export default function handler(request, response) {
  console.log('[abdm]', request.method, request.url, JSON.stringify(request.body || {}));
  return response.status(202).json({});
}
