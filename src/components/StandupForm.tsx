'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createDailyLog } from '@/lib/queries';
import ScoreSelector from './ScoreSelector';

interface Props {
  userId: string;
}

const steps = ['worked_on', 'working_next', 'blockers', 'score'] as const;
type Step = typeof steps[number];

const stepMeta: Record<Step, { label: string; sublabel?: string; type: 'textarea' | 'score'; placeholder?: string }> = {
  worked_on: {
    label: 'What did you work on today?',
    type: 'textarea',
    placeholder: 'Describe what you built, fixed, or progressed on...',
  },
  working_next: {
    label: "What's next on your plate?",
    type: 'textarea',
    placeholder: 'What are you picking up tomorrow or next session...',
  },
  blockers: {
    label: 'Any blockers?',
    sublabel: "Skip if you're all clear.",
    type: 'textarea',
    placeholder: "Describe what's in your way, or leave blank...",
  },
  score: {
    label: 'How was your day?',
    sublabel: "Be honest. No one's watching.",
    type: 'score',
  },
};

const stepLabels = ['Worked on', 'Up next', 'Blockers', 'Score'];

export default function StandupForm({ userId }: Props) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [values, setValues] = useState({ worked_on: '', working_next: '', blockers: '', score: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const step = steps[currentStep];
  const meta = stepMeta[step];
  const isLast = currentStep === steps.length - 1;

  function canAdvance() {
    if (step === 'score') return values.score > 0;
    if (step === 'blockers') return true;
    return (values[step as keyof typeof values] as string).trim().length > 0;
  }

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValues((v) => ({ ...v, [step]: e.target.value }));
  }

  async function handleNext() {
    if (!isLast) { setCurrentStep((s) => s + 1); return; }
    setLoading(true);
    setError('');
    try {
      await createDailyLog(userId, {
        worked_on: values.worked_on,
        working_next: values.working_next,
        blockers: values.blockers || 'None',
        score: values.score,
      });
      router.push('/dashboard?checked=1');
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-7">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {steps.map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold transition-all ${
              i < currentStep
                ? 'bg-[#0f0f0f] text-white'
                : i === currentStep
                  ? 'bg-[#0f0f0f] text-white ring-4 ring-[#0f0f0f]/10'
                  : 'bg-[#f0f0f0] text-[#aaa]'
            }`}>
              {i < currentStep ? '✓' : i + 1}
            </div>
            {i < steps.length - 1 && (
              <div className={`h-px w-6 transition-colors ${i < currentStep ? 'bg-[#0f0f0f]' : 'bg-[#e8e8e8]'}`} />
            )}
          </div>
        ))}
        <span className="ml-1 text-[12px] text-[#737373] font-medium">{stepLabels[currentStep]}</span>
      </div>

      {/* Question */}
      <div className="space-y-1">
        <h2 className="text-[18px] font-semibold text-[#0f0f0f] tracking-tight leading-snug">{meta.label}</h2>
        {meta.sublabel && <p className="text-[13px] text-[#737373]">{meta.sublabel}</p>}
      </div>

      {/* Input */}
      {meta.type === 'textarea' ? (
        <textarea
          autoFocus
          value={values[step as 'worked_on' | 'working_next' | 'blockers']}
          onChange={handleTextChange}
          placeholder={meta.placeholder}
          rows={5}
          className="w-full rounded-2xl border border-[#e8e8e8] bg-[#fafafa] px-4 py-3.5 text-[13px] text-[#0f0f0f] placeholder:text-[#bbb] focus:outline-none focus:bg-white focus:border-[#0f0f0f] resize-none transition-all leading-relaxed"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && canAdvance()) handleNext();
          }}
        />
      ) : (
        <ScoreSelector value={values.score} onChange={(s) => setValues((v) => ({ ...v, score: s }))} />
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5">
          <p className="text-[13px] text-red-600">{error}</p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 rounded-full transition-all ${i === currentStep ? 'w-4 bg-[#0f0f0f]' : i < currentStep ? 'w-2 bg-[#0f0f0f]' : 'w-2 bg-[#e8e8e8]'}`} />
          ))}
        </div>
        <div className="flex items-center gap-2">
          {currentStep > 0 && (
            <button
              onClick={() => setCurrentStep((s) => s - 1)}
              className="px-4 py-2 text-[13px] font-medium text-[#737373] hover:text-[#0f0f0f] transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canAdvance() || loading}
            className="px-5 py-2.5 bg-[#0f0f0f] text-white text-[13px] font-semibold rounded-full hover:bg-[#262626] disabled:opacity-40 transition-all"
          >
            {loading ? 'Saving...' : isLast ? 'Submit ✓' : 'Next →'}
          </button>
        </div>
      </div>

      {!isLast && (
        <p className="text-[11px] text-[#bbb] text-right -mt-4">⌘ + Enter to continue</p>
      )}
    </div>
  );
}
