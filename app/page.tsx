"use client";
import { useEffect, useMemo, useRef, useState } from 'react';
import { beginAuth, clearTokens, ensureAccessToken, loadTokens } from '@/lib/oauth';
import { startResumableUpload, uploadToResumableUrl, type UploadParams } from '@/lib/youtube';

export default function Page() {
  const [signedIn, setSignedIn] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('shorts');
  const [privacy, setPrivacy] = useState<'private' | 'public' | 'unlisted'>('private');
  const [schedule, setSchedule] = useState(false);
  const [publishAt, setPublishAt] = useState<string>('');
  const [madeForKids, setMadeForKids] = useState(false);

  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    (async () => {
      const at = await ensureAccessToken();
      const ok = Boolean(at || loadTokens());
      setSignedIn(ok);
      if (at) setAccessToken(at);
    })();
  }, []);

  async function handleSignIn() {
    await beginAuth();
  }

  function handleSignOut() {
    clearTokens();
    setSignedIn(false);
    setAccessToken(null);
  }

  const canUpload = useMemo(() => signedIn && file && title.trim().length > 0, [signedIn, file, title]);

  async function onUpload() {
    setError('');
    setStatus('Initializing upload...');
    setProgress(0);

    try {
      const token = await ensureAccessToken();
      if (!token) throw new Error('Not authenticated');
      setAccessToken(token);
      if (!file) throw new Error('Select a video file');

      const params: UploadParams = {
        title: title.trim(),
        description: description.trim(),
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        privacyStatus: privacy,
        publishAt: schedule && privacy === 'private' && publishAt ? new Date(publishAt).toISOString() : undefined,
        madeForKids,
      };

      const uploadUrl = await startResumableUpload(token, params, file);
      setStatus('Uploading video... This may take a while.');

      const controller = new AbortController();
      abortRef.current = controller;

      // Track progress via experimental upload progress using XMLHttpRequest as fetch lacks progress events
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', uploadUrl, true);
      xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
      xhr.setRequestHeader('Content-Length', String(file.size));
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) {
            setStatus('Upload complete! Processing on YouTube...');
          } else {
            setError(`Upload failed: ${xhr.status} ${xhr.responseText}`);
            setStatus('');
          }
        }
      };
      xhr.onerror = () => {
        setError('Network error during upload');
        setStatus('');
      };
      controller.signal.addEventListener('abort', () => xhr.abort());
      xhr.send(file);
    } catch (e: any) {
      setError(e.message || 'Upload failed');
      setStatus('');
    }
  }

  function onCancelUpload() {
    abortRef.current?.abort();
    setStatus('Upload canceled');
  }

  return (
    <div className="card">
      <div className="authBar">
        <div className="badge">
          <span>Auth</span>
          <span className={signedIn ? 'success' : 'error'}>{signedIn ? 'Signed in' : 'Signed out'}</span>
        </div>
        <div>
          {!signedIn ? (
            <button onClick={handleSignIn}>Sign in with Google</button>
          ) : (
            <button className="secondary" onClick={handleSignOut}>Sign out</button>
          )}
        </div>
      </div>

      <div className="row">
        <div className="field" style={{flexBasis:'100%'}}>
          <label>Video file (vertical, under 60s)</label>
          <input type="file" accept="video/*" onChange={e => setFile(e.target.files?.[0] || null)} />
        </div>
      </div>

      <div className="row">
        <div className="field">
          <label>Title</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Catchy title" />
        </div>
        <div className="field">
          <label>Tags (comma separated)</label>
          <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="shorts, funny, tips" />
        </div>
      </div>

      <div className="row">
        <div className="field" style={{flexBasis:'100%'}}>
          <label>Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="#Shorts Your description here"></textarea>
        </div>
      </div>

      <div className="row">
        <div className="field">
          <label>Privacy</label>
          <select value={privacy} onChange={e => setPrivacy(e.target.value as any)}>
            <option value="private">Private</option>
            <option value="unlisted">Unlisted</option>
            <option value="public">Public</option>
          </select>
        </div>
        <div className="field">
          <label>Made for kids</label>
          <select value={madeForKids ? 'yes' : 'no'} onChange={e => setMadeForKids(e.target.value === 'yes')}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>
        <div className="field">
          <label>Schedule publish</label>
          <select value={schedule ? 'yes' : 'no'} onChange={e => setSchedule(e.target.value === 'yes')}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>
        {schedule && (
          <div className="field">
            <label>Publish at (local time)</label>
            <input type="datetime-local" value={publishAt} onChange={e => setPublishAt(e.target.value)} />
            <div className="small">Must keep privacy as Private for scheduling</div>
          </div>
        )}
      </div>

      <div className="row" style={{marginTop:12, alignItems:'center'}}>
        <button onClick={onUpload} disabled={!canUpload}>Upload to YouTube</button>
        <button className="secondary" onClick={onCancelUpload}>Cancel</button>
        {progress > 0 && (
          <div style={{flex:1}}>
            <div className="progress"><div style={{width: `${progress}%`}} /></div>
            <div className="status">{progress}%</div>
          </div>
        )}
      </div>

      {status && <div className="status">{status}</div>}
      {error && <div className="status error">{error}</div>}
    </div>
  );
}
