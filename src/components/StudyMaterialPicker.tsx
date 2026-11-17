import React, { useRef, useState } from 'react';
import { FileText, Link2, LoaderCircle, Plus, Upload, Video, X } from 'lucide-react';
import { extractStudyText } from '../services/studyFiles';
import { StudyMaterialSelection } from '../services/quizGenerator';

const MAX_VIDEO_BYTES = 14 * 1024 * 1024;
const VIDEO_MIME_BY_EXTENSION: Record<string, string> = {
  avi: 'video/avi',
  m4v: 'video/mp4',
  mov: 'video/mov',
  mp4: 'video/mp4',
  mpeg: 'video/mpeg',
  mpg: 'video/mpg',
  webm: 'video/webm',
};
const ACCEPTED_VIDEO_MIME_TYPES = new Set(Object.values(VIDEO_MIME_BY_EXTENSION));

function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host === '::1') {
    return true;
  }
  const octets = host.split('.').map(Number);
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return host.includes(':') && (
      host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe80')
    );
  }
  return octets[0] === 10 || octets[0] === 127 || octets[0] === 0 ||
    (octets[0] === 169 && octets[1] === 254) ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168);
}

function validateUrl(value: string, video: boolean): string {
  if (value.length > 2048) throw new Error('URL must be 2,048 characters or fewer.');
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error('Enter a complete URL starting with https:// or http://.');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || isPrivateHost(url.hostname)) {
    throw new Error('Use a public HTTP or HTTPS URL without embedded credentials.');
  }
  const host = url.hostname.toLowerCase();
  const isYouTube = host === 'youtu.be' || host === 'youtube.com' ||
    host.endsWith('.youtube.com') || host === 'youtube-nocookie.com' ||
    host.endsWith('.youtube-nocookie.com');
  if (video && !isYouTube) {
    throw new Error('For video links, use a public YouTube URL. Other supported videos can be uploaded.');
  }
  if (!video && isYouTube) {
    throw new Error('Choose Video for a YouTube link so Gemini can analyze it as video.');
  }
  return url.toString();
}

async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

interface StudyMaterialPickerProps {
  value: StudyMaterialSelection | null;
  onSelect: (selection: StudyMaterialSelection) => void;
  disabled?: boolean;
}

export const StudyMaterialPicker: React.FC<StudyMaterialPickerProps> = ({ value, onSelect, disabled = false }) => {
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [urlMode, setUrlMode] = useState<'url' | 'video' | 'videoUrl' | null>(null);
  const [urlValue, setUrlValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectStudyFile = async (file: File, kind: 'pdf' | 'text') => {
    setLoading(true);
    setError(null);
    try {
      const text = await extractStudyText(file);
      onSelect({ kind, name: file.name, notes: text });
      setMenuOpen(false);
      setUrlMode(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not read this study file.');
    } finally {
      setLoading(false);
    }
  };

  const selectVideoFile = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      const declaredType = file.type.split(';')[0];
      const mimeType = ACCEPTED_VIDEO_MIME_TYPES.has(declaredType)
        ? declaredType
        : VIDEO_MIME_BY_EXTENSION[extension];
      if (!ACCEPTED_VIDEO_MIME_TYPES.has(mimeType)) {
        throw new Error('Supported video formats are MP4, WebM, MOV, AVI, and MPEG.');
      }
      if (!file.size || file.size > MAX_VIDEO_BYTES) {
        throw new Error('Choose a video smaller than 14 MB for secure inline analysis.');
      }
      onSelect({
        kind: 'video',
        name: file.name,
        video: { data: await fileToBase64(file), mimeType, name: file.name },
      });
      setMenuOpen(false);
      setUrlMode(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not read this video.');
    } finally {
      setLoading(false);
    }
  };

  const submitUrl = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const url = validateUrl(urlValue, urlMode === 'videoUrl');
      const isVideo = urlMode === 'videoUrl';
      onSelect({
        kind: isVideo ? 'video' : 'url',
        name: new URL(url).hostname,
        sourceUrl: url,
      });
      setUrlValue('');
      setMenuOpen(false);
      setUrlMode(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Enter a valid public URL.');
    }
  };

  return (
    <div className="relative flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
      <div className="min-w-0 flex-1">
        <div className="truncate text-[10px] font-bold text-slate-700" title={value?.name || 'Attach PDF, TXT, link, or video'}>
          {value?.name || 'Attach PDF, TXT, link, or video'}
        </div>
        {value && <div className="truncate text-[9px] text-slate-500">{value.kind === 'pdf' ? 'PDF text extracted' : value.kind === 'text' ? 'Text file loaded' : value.kind === 'video' ? 'Video ready for AI' : value.sourceUrl}</div>}
      </div>
      <div className="relative shrink-0">
        <button
          type="button"
          aria-label="Add study material"
          aria-expanded={menuOpen}
          disabled={disabled || loading}
          onClick={() => {
            setError(null);
            setMenuOpen((open) => !open);
            setUrlMode(null);
          }}
          className="grid h-8 w-12 place-items-center rounded-lg border border-amber-300 bg-slate-900 text-yellow-300 shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : menuOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
        </button>
        <input ref={pdfInputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (file) void selectStudyFile(file, 'pdf');
        }} />
        <input ref={textInputRef} type="file" accept=".txt,text/plain" className="hidden" onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (file) void selectStudyFile(file, 'text');
        }} />
        <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime,video/x-msvideo,video/mpeg,.mp4,.webm,.mov,.avi,.mpeg,.mpg,.m4v" className="hidden" onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = '';
          if (file) void selectVideoFile(file);
        }} />

        {menuOpen && (
          <div className="absolute right-0 top-10 z-30 w-64 rounded-2xl border border-slate-200 bg-white p-2 text-slate-900 shadow-xl">
            {!urlMode ? (
              <div className="space-y-1">
                <button type="button" onClick={() => pdfInputRef.current?.click()} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold hover:bg-amber-50">
                  <FileText className="h-4 w-4 text-rose-600" /> PDF document
                </button>
                <button type="button" onClick={() => textInputRef.current?.click()} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold hover:bg-amber-50">
                  <FileText className="h-4 w-4 text-sky-700" /> TXT document
                </button>
                <button type="button" onClick={() => setUrlMode('url')} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold hover:bg-amber-50">
                  <Link2 className="h-4 w-4 text-emerald-700" /> Link / URL
                </button>
                <button type="button" onClick={() => setUrlMode('video')} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold hover:bg-amber-50">
                  <Video className="h-4 w-4 text-violet-700" /> Video
                </button>
              </div>
            ) : urlMode === 'video' ? (
              <div className="space-y-1">
                <button type="button" onClick={() => videoInputRef.current?.click()} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold hover:bg-amber-50">
                  <Upload className="h-4 w-4 text-violet-700" /> Upload video (under 14 MB)
                </button>
                <button type="button" onClick={() => setUrlMode('videoUrl')} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold hover:bg-amber-50">
                  <Link2 className="h-4 w-4 text-emerald-700" /> Use a YouTube link
                </button>
                <button type="button" onClick={() => setUrlMode(null)} className="w-full rounded-xl px-3 py-2 text-left text-[10px] font-bold text-slate-500 hover:bg-slate-50">Back to material options</button>
              </div>
            ) : (
              <form onSubmit={submitUrl} className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-wide text-slate-600">
                  {urlMode === 'videoUrl' ? 'Public YouTube URL' : 'Public study URL'}
                </label>
                <input
                  autoFocus
                  type="url"
                  required
                  value={urlValue}
                  onChange={(event) => setUrlValue(event.target.value)}
                  placeholder="https://..."
                  className="h-9 w-full rounded-lg border border-slate-300 px-2 text-xs outline-none focus:border-amber-400"
                />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setUrlMode(null)} className="h-8 flex-1 rounded-lg border border-slate-200 text-[10px] font-bold hover:bg-slate-50">Back</button>
                  <button type="submit" className="h-8 flex-1 rounded-lg bg-slate-900 text-[10px] font-bold text-yellow-300 hover:bg-slate-800">Use URL</button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
      {error && <div className="absolute left-0 right-0 top-full z-20 mt-1.5 rounded-lg border border-rose-200 bg-rose-50 p-2 text-[10px] font-bold text-rose-700 shadow-lg">{error}</div>}
    </div>
  );
};
