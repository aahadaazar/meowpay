"use client";

const presets = [100, 500, 1000] as const;

export function TopupPresets({ onPick }: { onPick: (amount: number) => void }) {
  return (
    <div aria-label="Top-up shortcuts" className="flex flex-wrap gap-2">
      {presets.map((amount) => (
        <button className="button-secondary shrink-0" key={amount} onClick={() => onPick(amount)} type="button">
          +{amount.toLocaleString()}
        </button>
      ))}
    </div>
  );
}
