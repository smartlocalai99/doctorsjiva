import { AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';
import Head from 'next/head';
import { useEffect, useState } from 'react';

import { EmptyState, PageHeading } from '@/components/Ui';
import { loadReports, resolveReport } from '@/lib/repository';

const REASON_LABELS = {
  harassment: 'Harassment or bullying',
  misleading_medical: 'Misleading medical information',
  objectionable: 'Objectionable content',
  other: 'Something else',
  spam: 'Spam',
  violence: 'Violence',
};

export default function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resolvingId, setResolvingId] = useState('');

  const refresh = () => {
    setLoading(true);
    loadReports()
      .then(setReports)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(refresh, []);

  const resolve = async (reportId, action) => {
    setResolvingId(reportId);
    setError('');
    try {
      await resolveReport(reportId, action);
      setReports((current) => current.filter((report) => report.id !== reportId));
    } catch (resolveError) {
      setError(resolveError.message);
    } finally {
      setResolvingId('');
    }
  };

  return (
    <>
      <Head><title>Reports · DRJIVA Doctors</title></Head>
      <div className="page-container">
        <PageHeading
          eyebrow="Health Feed"
          title="Content Reports"
          description="Patient reports on the Health Feed — review within 24 hours."
        />

        {error ? <p className="error-banner" role="alert">{error}</p> : null}

        {loading ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : reports.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="No open reports"
            description="Nothing waiting on review right now."
          />
        ) : (
          <div className="grid gap-3">
            {reports.map((report) => (
              <article className="panel p-4" key={report.id}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <AlertTriangle aria-hidden="true" className="text-amber-500" size={16} />
                      <p className="font-semibold text-ink">{REASON_LABELS[report.reason] || report.reason}</p>
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {report.target_type === 'comment' ? 'Comment' : 'Post'} on{' '}
                      <span className="font-medium">{report.post?.title || 'a Health Feed post'}</span>
                    </p>
                    {report.comment ? (
                      <p className="mt-2 rounded-xl bg-canvas p-3 text-sm text-ink">
                        <span className="font-semibold">{report.comment.author_name}: </span>
                        {report.comment.body}
                      </p>
                    ) : null}
                    {report.description ? (
                      <p className="mt-2 text-sm italic text-muted">&ldquo;{report.description}&rdquo;</p>
                    ) : null}
                    <p className="mt-2 text-xs text-muted">
                      Reported {new Date(report.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    className="quiet-button"
                    disabled={resolvingId === report.id}
                    type="button"
                    onClick={() => void resolve(report.id, 'dismiss')}
                  >
                    Dismiss
                  </button>
                  <button
                    className="primary-button"
                    disabled={resolvingId === report.id}
                    type="button"
                    onClick={() => void resolve(report.id, 'remove_content')}
                  >
                    <Trash2 aria-hidden="true" size={16} />
                    Remove content
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
