"use client";

export function StripePayButton({
  disabled,
  unavailable,
  loading,
  onPay,
  className,
}: {
  disabled?: boolean;
  unavailable?: boolean;
  loading?: boolean;
  onPay: () => void;
  className?: string;
}) {
  if (unavailable) {
    return (
      <div
        className={`flex h-[45px] w-full items-center justify-center rounded text-sm text-muted ${className ?? ""}`}
      >
        Unavailable
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className={`flex h-[45px] w-full items-center justify-center rounded bg-black/5 dark:bg-white/5 text-sm text-muted ${className ?? ""}`}
      >
        Redirecting…
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPay}
      className={`flex h-[45px] w-full items-center justify-center rounded bg-[#635bff] text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50 ${className ?? ""}`}
    >
      Pay with Stripe
    </button>
  );
}
