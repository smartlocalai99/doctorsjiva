import {
  ArrowUpRight,
  Bookmark,
  Eye,
  Heart,
  MessageCircle,
  Plus,
} from 'lucide-react';
import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { StatCard } from '@/components/Ui';
import { useWorkspace } from '@/contexts/WorkspaceContext';

const activityRanges = ['Today', '7D', '30D'];

export default function DashboardPage() {
  const { analytics, posts, error, refresh, refreshAnalytics } = useWorkspace();
  const [activityRange, setActivityRange] = useState('7D');
  useEffect(() => { void refreshAnalytics(); }, [refreshAnalytics]);
  const published = posts.filter((post) => post.status === 'published');
  const totals = published.reduce(
    (result, post) => ({
      views: result.views + Number(post.views_count || 0),
      likes: result.likes + Number(post.likes_count || 0),
      comments: result.comments + Number(post.comments_count || 0),
      saves: result.saves + Number(post.saves_count || 0),
    }),
    { views: 0, likes: 0, comments: 0, saves: 0 },
  );
  const averageViews = published.length ? Math.round(totals.views / published.length) : 0;

  return (
    <>
      <Head><title>Dashboard · DRJIVA Doctors</title></Head>
      <div className="page-container doctor-dashboard">
        {error ? <div className="error-banner" role="alert"><span>{error}</span><button type="button" onClick={refresh}>Try again</button></div> : null}

        <section aria-labelledby="reach-heading">
          <div className="dashboard-section-heading">
            <div><p>Content performance</p><h2 id="reach-heading">Content reach</h2></div>
            <span>{published.length} published {published.length === 1 ? 'post' : 'posts'}</span>
          </div>
          <RangeSelector selected={activityRange} onChange={setActivityRange} />
          <WeeklyActivity analytics={analytics} range={activityRange} />
          <div className="dashboard-metric-grid">
            <StatCard label="Total views" value={totals.views} icon={Eye} detail={`${formatCount(averageViews)} average per post`} />
            <StatCard label="Likes" value={totals.likes} icon={Heart} tone="rose" detail="Patient appreciation" />
            <StatCard label="Comments" value={totals.comments} icon={MessageCircle} tone="violet" detail="Patient conversations" />
            <StatCard label="Saves" value={totals.saves} icon={Bookmark} tone="amber" detail="Patients returning later" />
          </div>
          <Link className="dashboard-create-cta primary-button" href="/create"><Plus aria-hidden="true" size={20} /> Create a post <ArrowUpRight aria-hidden="true" size={18} /></Link>
        </section>
      </div>
    </>
  );
}

function RangeSelector({ selected, onChange }) {
  return <div className="activity-range" aria-label="Activity range" role="group">
    {activityRanges.map((range) => <button className={selected === range ? 'selected' : ''} key={range} type="button" onClick={() => onChange(range)}>{range}</button>)}
  </div>;
}

function WeeklyActivity({ analytics, range }) {
  const chart = getChartData(analytics, range);
  const peak = Math.max(1, ...chart.views);
  const viewPoints = chartPoints(chart.views, peak);
  const areaPoints = `${viewPoints} ${chartX(chart.views.length - 1, chart.views.length)},220 36,220`;
  return <section className="weekly-activity" aria-labelledby="activity-heading">
    <div className="weekly-activity-heading"><h3 id="activity-heading">Views</h3><span><i className="activity-views" /> Views</span></div>
    <div className={`weekly-chart weekly-chart-${range.toLowerCase()}`} role="img" aria-label={`Views for ${range}`}>
      <svg aria-hidden="true" className="activity-line-graph" viewBox="0 0 720 260" preserveAspectRatio="none">
        {[0, 0.25, 0.5, 0.75, 1].map((step) => <line key={step} x1="36" x2="700" y1={220 - step * 180} y2={220 - step * 180} />)}
        <polygon className="activity-area-views" points={areaPoints} />
        <polyline className="activity-line activity-line-views" points={viewPoints} />
        <text x="2" y="44">{formatCount(peak)}</text><text x="2" y="134">{formatCount(Math.round(peak / 2))}</text><text x="16" y="224">0</text>
      </svg>
      <div className="activity-line-labels">{chart.labels.map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}</div>
    </div>
  </section>;
}

function chartX(index, count) {
  return count === 1 ? 368 : 36 + (index * 664) / (count - 1);
}

function chartY(value, peak) {
  return 220 - (value / peak) * 180;
}

function chartPoints(values, peak) {
  return values.map((value, index) => `${chartX(index, values.length)},${chartY(value, peak)}`).join(' ');
}

function getChartData(analytics, range) {
  const now = new Date();
  if (range === 'Today') {
    const labels = ['12a', '4a', '8a', '12p', '4p', '8p'];
    const bucket = (event) => Math.min(5, Math.floor(new Date(event.created_at).getHours() / 4));
    return { labels, views: bucketEvents(analytics.views, bucket, 6, now, true), likes: bucketEvents(analytics.likes, bucket, 6, now, true) };
  }
  if (range === '30D') {
    const labels = ['1', '5', '10', '15', '20', '25', '30'];
    const start = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
    const bucket = (event) => Math.min(6, Math.floor((new Date(event.created_at) - start) / (5 * 24 * 60 * 60 * 1000)));
    return { labels, views: bucketEvents(analytics.views, bucket, 7), likes: bucketEvents(analytics.likes, bucket, 7) };
  }
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const start = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
  const bucket = (event) => {
    const date = new Date(event.created_at);
    if (date < start) return -1;
    return (date.getDay() + 6) % 7;
  };
  return { labels, views: bucketEvents(analytics.views, bucket, 7), likes: bucketEvents(analytics.likes, bucket, 7) };
}

function bucketEvents(events, getBucket, length, now, today = false) {
  return events.reduce((values, event) => {
    if (today && new Date(event.created_at).toDateString() !== now.toDateString()) return values;
    const bucket = getBucket(event);
    if (bucket >= 0 && bucket < values.length) values[bucket] += 1;
    return values;
  }, Array.from({ length }, () => 0));
}

function formatCount(value = 0) {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value) || 0);
}
