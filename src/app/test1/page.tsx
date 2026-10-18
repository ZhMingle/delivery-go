'use client';
import { useState } from 'react';
export default function Test1() {
  const [ advice, setAdvice ] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  async function fetchAdvice() {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetch('https://api.adviceslip.com/advice');
      if (!response.ok) throw new Error('Unable to fetch advice');
      const data = await response.json();
      setAdvice(data.slip.advice);
    } catch (error) {
      console.error('Error fetching advice:', error);
      setErrorMessage('Could not load advice. Please try again.');
    } finally {
      setLoading(false);
    }
  }
  return (
    <main className="min-h-screen bg-slate-100 px-6 py-16 text-slate-900">
      <section className="mx-auto flex w-full max-w-lg flex-col items-start gap-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">A little advice</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Click the button for a fresh piece of advice.</p>
        </div>
        <button
          type="button"
          onClick={fetchAdvice}
          disabled={loading}
          className="cursor-pointer rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-60"
        >
          {loading ? 'Loading…' : 'Get Advice'}
        </button>
        <div aria-live="polite" aria-busy={loading} className="w-full">
          {advice && <p className="rounded-xl border border-blue-100 bg-blue-50 p-5 text-base leading-7 text-slate-800">{advice}</p>}
          {errorMessage && <p role="alert" className="mt-3 text-sm text-red-700">{errorMessage}</p>}
        </div>
      </section>
    </main>
  );
}
