"use client";

import { useEffect, useRef } from "react";

export function PayPalPayButton({
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
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || disabled || unavailable || loading) return;

    const handler = () => onPay();
    el.addEventListener("click", handler);
    return () => el.removeEventListener("click", handler);
  }, [disabled, unavailable, loading, onPay]);

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
        className={`flex h-[45px] w-full items-center justify-center rounded bg-black/5 text-sm text-muted ${className ?? ""}`}
      >
        Loading…
      </div>
    );
  }

  return (
    <div
      className={`paypal-pay-button-wrap w-full ${disabled ? "pointer-events-none opacity-50" : ""} ${className ?? ""}`}
    >
      <paypal-button ref={ref} type="pay" className="paypal-gold" />
    </div>
  );
}
