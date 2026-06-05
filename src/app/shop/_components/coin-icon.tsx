export function CoinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <circle cx="12" cy="12" r="10" opacity="0.15" />
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <text
        x="12" y="16"
        textAnchor="middle"
        fontSize="10"
        fontWeight="700"
        fill="currentColor"
        fontFamily="sans-serif"
      >
        C
      </text>
    </svg>
  );
}
