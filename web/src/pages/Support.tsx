import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

const CATEGORIES = ['Bug', 'Idea / Feature', 'Question', 'Other'] as const;
type Category = (typeof CATEGORIES)[number];

const TEMPLATES: Record<Category, string> = {
  'Bug': 'What happened:\n\nWhat I expected:\n\nSteps to reproduce:\n1. \n2. ',
  'Idea / Feature': "What I'd like:\n\nWhy it would help:\n",
  'Question': 'My question:\n',
  'Other': '',
};

export default function Support() {
  const [category, setCategory] = useState<Category>('Bug');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState(TEMPLATES['Bug']);
  const [touched, setTouched] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState('');

  // Swap the template when the category changes, unless the user has typed their own.
  const placeholder = useMemo(() => TEMPLATES[category], [category]);
  function pickCategory(c: Category) {
    setCategory(c);
    if (!touched || message.trim() === '' || Object.values(TEMPLATES).includes(message)) {
      setMessage(TEMPLATES[c]);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setStatus('sending');
    setError('');
    try {
      await api.sendFeedback({ category, subject: subject.trim() || undefined, message: message.trim(), page_url: window.location.href });
      setStatus('sent');
    } catch (err: any) {
      setStatus('error');
      setError(err.message || 'Could not send');
    }
  }

  const input = 'w-full rounded-lg bg-field px-3 py-2 text-sm ring-1 ring-ink/10 outline-none focus:ring-rose-400/40';
  const label = 'mb-1 block text-xs font-medium uppercase tracking-wide text-ink/40';

  if (status === 'sent') {
    return (
      <div className="mx-auto max-w-lg py-10 text-center">
        <div className="mb-3 text-5xl">📨</div>
        <h1 className="text-2xl font-bold">Thanks — sent to Jarvis</h1>
        <p className="mt-2 text-sm text-ink/50">Jarvis will email your feedback along. We appreciate it!</p>
        <div className="mt-6 flex justify-center gap-2">
          <Link to="/" className="rounded-lg bg-ink/10 px-4 py-2 text-sm hover:bg-ink/20">Back to catalog</Link>
          <button
            onClick={() => { setStatus('idle'); setSubject(''); setMessage(TEMPLATES[category]); setTouched(false); }}
            className="rounded-lg px-4 py-2 text-sm text-ink/60 hover:bg-ink/10"
          >Send another</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-1 text-2xl font-bold">Support &amp; feedback</h1>
      <p className="mb-6 text-sm text-ink/40">Send a note to Jarvis — it'll be emailed straight to Dan.</p>

      <form onSubmit={submit} className="space-y-4 rounded-2xl bg-ink/5 p-6 ring-1 ring-ink/10">
        <div>
          <label className={label}>Type</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => pickCategory(c)}
                className={`rounded-lg px-3 py-1.5 text-sm ring-1 ${
                  category === c ? 'bg-rose-500 text-white ring-rose-400' : 'bg-ink/5 text-ink/70 ring-ink/10 hover:bg-ink/10'
                }`}
              >{c}</button>
            ))}
          </div>
        </div>

        <div>
          <label className={label}>Subject</label>
          <input className={input} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Short summary (optional)" />
        </div>

        <div>
          <label className={label}>Message</label>
          <textarea
            className={input + ' min-h-40 font-mono text-[13px] leading-relaxed'}
            value={message}
            onChange={(e) => { setMessage(e.target.value); setTouched(true); }}
            placeholder={placeholder}
            required
          />
        </div>

        {status === 'error' && <div className="rounded-lg bg-rose-500/15 px-3 py-2 text-sm text-rose-500">{error}</div>}

        <div className="flex gap-2">
          <button type="submit" disabled={status === 'sending' || !message.trim()} className="rounded-lg bg-rose-500 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-400 disabled:opacity-50">
            {status === 'sending' ? 'Sending…' : 'Send to Jarvis'}
          </button>
          <Link to="/" className="rounded-lg px-4 py-2 text-sm text-ink/60 hover:bg-ink/10">Cancel</Link>
        </div>
      </form>
    </div>
  );
}
