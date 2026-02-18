'use client';

const labels: Record<number, { text: string; emoji: string }> = {
  1: { text: 'Unproductive', emoji: '😞' },
  2: { text: 'Below average', emoji: '😐' },
  3: { text: 'Decent progress', emoji: '🙂' },
  4: { text: 'Good execution', emoji: '😊' },
  5: { text: 'Excellent', emoji: '🔥' },
};

interface Props {
  value: number;
  onChange: (score: number) => void;
}

export default function ScoreSelector({ value, onChange }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex-1 py-4 rounded-2xl text-sm font-bold transition-all border flex flex-col items-center gap-1 ${
              value === n
                ? 'bg-[#0f0f0f] text-white border-[#0f0f0f] scale-[1.03]'
                : 'bg-white text-[#737373] border-[#e8e8e8] hover:border-[#0f0f0f] hover:text-[#0f0f0f]'
            }`}
            style={{ boxShadow: value === n ? '0 4px 12px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.04)' }}
          >
            <span className="text-lg leading-none">{labels[n].emoji}</span>
            <span className="text-[13px]">{n}</span>
          </button>
        ))}
      </div>
      {value > 0 ? (
        <div className="rounded-xl bg-[#f5f5f5] border border-[#e8e8e8] px-4 py-2.5 text-center">
          <p className="text-[13px] font-medium text-[#0f0f0f]">{labels[value].text}</p>
        </div>
      ) : (
        <p className="text-[11px] text-[#bbb] text-center">1 = rough day · 3 = decent · 5 = excellent</p>
      )}
    </div>
  );
}
