/* eslint-disable @next/next/no-img-element -- this screen previews a local object URL before upload */
import { BadgeCheck, FileImage, Heart, ImagePlus, MessageCircle, Send, ShieldCheck, Video } from 'lucide-react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';

import { Field, PageHeading } from '@/components/Ui';
import { useWorkspace } from '@/contexts/WorkspaceContext';

const initialForm = { title: '', caption: '', hashtags: '', safety_note: '', source_url: '' };

export default function CreatePage() {
  const router = useRouter();
  const inputRef = useRef(null);
  const { profile, savePost } = useWorkspace();
  const [mediaType, setMediaType] = useState('image');
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => {
    const hasUnsavedWork = Boolean(file || Object.values(form).some((value) => value.trim()));
    if (!hasUnsavedWork) return undefined;
    const warnBeforeLeaving = (event) => event.preventDefault();
    window.addEventListener('beforeunload', warnBeforeLeaving);
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving);
  }, [file, form]);

  const chooseFile = (selectedFile) => {
    if (!selectedFile) return;
    const maxSize = mediaType === 'video' ? 50 * 1024 * 1024 : 8 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError(mediaType === 'video' ? 'Choose a video below 50 MB.' : 'Choose an image below 8 MB.');
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setError('');
  };

  const changeType = (type) => {
    if (preview) URL.revokeObjectURL(preview);
    setMediaType(type);
    setFile(null);
    setPreview('');
  };

  const submit = async () => {
    setSaving('published');
    setError('');
    try {
      await savePost({ ...form, file, media_type: mediaType, status: 'published' });
      setFile(null);
      setForm(initialForm);
      await router.push('/posts?published=1');
    } catch (saveError) {
      setError(saveError.message);
      setSaving('');
    }
  };

  return (
    <>
      <Head><title>Create post · DRJIVA Doctors</title></Head>
      <div className="page-container">
        <PageHeading eyebrow="New Post" title="Create for the Patient Feed" description="Your post publishes immediately after the upload finishes." />
        <div className="composer-grid">
          <section className="social-preview-column">
            <div className="segmented-control" aria-label="Media type">
              <button className={mediaType === 'image' ? 'selected' : ''} type="button" onClick={() => changeType('image')}><FileImage size={18} /> Image</button>
              <button className={mediaType === 'video' ? 'selected' : ''} type="button" onClick={() => changeType('video')}><Video size={18} /> Video</button>
            </div>

            <button className="media-dropzone social-media-preview" type="button" onClick={() => inputRef.current?.click()}>
              {preview ? (
                mediaType === 'video' ? <video className="size-full object-cover" src={preview} muted loop autoPlay playsInline /> : <img className="size-full object-cover" src={preview} alt="Selected post preview" width="720" height="1120" />
              ) : (
                <span className="grid place-items-center gap-3 px-5 text-center"><span className="grid size-14 place-items-center rounded-2xl bg-white text-brand shadow-sm"><ImagePlus size={26} /></span><strong>Add {mediaType === 'video' ? 'a short video' : 'a cover image'}</strong><small>Tap to browse · {mediaType === 'video' ? 'MP4 up to 50 MB' : 'JPG, PNG or WebP up to 8 MB'}</small></span>
              )}
              <span className="composer-preview-overlay">
                <span className="composer-doctor"><b>RR</b><span><strong>{profile?.display_name || 'Dr. Ritish Reddy'} <BadgeCheck size={12} fill="currentColor" /></strong><small>{profile?.specialty || 'Gastroenterology'}</small></span></span>
                <span className="composer-caption"><strong>{form.title || 'Your post title appears here'}</strong><small>{form.caption || 'Add a clear caption patients can understand.'}</small></span>
                <span className="composer-social-actions"><i><Heart size={21} />Like</i><i><MessageCircle size={21} />Comment</i></span>
              </span>
            </button>
            <input ref={inputRef} className="sr-only" type="file" accept={mediaType === 'video' ? 'video/mp4,video/quicktime' : 'image/jpeg,image/png,image/webp'} onChange={(event) => chooseFile(event.target.files?.[0])} />
          </section>

          <section className="composer-form-column">
            <div className="panel grid gap-5 p-5 sm:p-6">
              <Field label="Post Title" placeholder="Example: 3 Signs Your Gut Needs Attention…" maxLength={90} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} hint={`${form.title.length}/90 characters`} />
              <Field label="Caption" placeholder="Explain the guidance in simple language…" maxLength={1200} textarea value={form.caption} onChange={(event) => setForm((current) => ({ ...current, caption: event.target.value }))} hint={`${form.caption.length}/1,200 characters`} />
              <Field label="Hashtags" placeholder="#GutHealth #Gastroenterology…" value={form.hashtags} onChange={(event) => setForm((current) => ({ ...current, hashtags: event.target.value }))} hint="Use up to 10 relevant topics." />
              <Field label="Safety Note" placeholder="Example: Seek medical care if symptoms persist…" textarea value={form.safety_note} onChange={(event) => setForm((current) => ({ ...current, safety_note: event.target.value }))} />
              <Field label="Clinical source (optional)" type="url" placeholder="https://…" value={form.source_url} onChange={(event) => setForm((current) => ({ ...current, source_url: event.target.value }))} />
            </div>
            <div className="panel p-5">
              <p className="eyebrow">Before Publishing</p>
              <ul className="mt-4 grid gap-4 text-sm leading-6 text-muted">
                <li className="flex gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-success" size={19} /><span>Keep the language educational and understandable.</span></li>
                <li className="flex gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-success" size={19} /><span>Do not include patient-identifying information.</span></li>
                <li className="flex gap-3"><ShieldCheck className="mt-0.5 shrink-0 text-success" size={19} /><span>Add a safety note when advice has limitations.</span></li>
              </ul>
            </div>
            {error ? <p className="error-banner" role="alert">{error}</p> : null}
            <button className="primary-button w-full" type="button" disabled={Boolean(saving)} onClick={submit}><Send aria-hidden="true" size={18} /> {saving ? 'Publishing…' : 'Publish Now'}</button>
          </section>
        </div>
      </div>
    </>
  );
}
