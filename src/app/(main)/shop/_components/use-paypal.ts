"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Minimal typings for the PayPal Web SDK v6 global. The SDK is loaded from
// PayPal's CDN at runtime, so we describe only the pieces we use.
type CreateOrder = () => Promise<{ orderId: string }>;

type PayPalSession = {
  start: (
    options: { presentationMode: "auto" | "popup" | "modal" | "redirect" },
    createOrder: ReturnType<CreateOrder>
  ) => Promise<void>;
};

type PayPalSdkInstance = {
  createPayPalOneTimePaymentSession: (handlers: {
    onApprove: (data: { orderId: string }) => void | Promise<void>;
    onCancel?: (data?: unknown) => void;
    onError?: (error?: unknown) => void;
  }) => PayPalSession;
};

type PayPalGlobal = {
  createInstance: (options: {
    clientId: string;
    components: string[];
    pageType?: string;
  }) => Promise<PayPalSdkInstance>;
};

declare global {
  interface Window {
    paypal?: PayPalGlobal;
  }
}

const SDK_SRC = "https://www.paypal.com/web-sdk/v6/core";

let scriptPromise: Promise<void> | null = null;

function loadCoreScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("PayPal SDK can only load in the browser."));
  }
  if (window.paypal?.createInstance) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SDK_SRC}"]`
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load PayPal SDK."))
      );
      return;
    }
    const script = document.createElement("script");
    script.src = SDK_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load PayPal SDK."));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

export type PurchaseHandlers = {
  onApprove: (data: { orderId: string }) => void | Promise<void>;
  onCancel?: () => void;
  onError?: (error: unknown) => void;
};

export function usePayPal(clientId: string | undefined) {
  const sdkRef = useRef<PayPalSdkInstance | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;

    (async () => {
      try {
        await loadCoreScript();
        if (cancelled || !window.paypal) return;
        const instance = await window.paypal.createInstance({
          clientId,
          components: ["paypal-payments"],
          pageType: "checkout",
        });
        if (cancelled) return;
        sdkRef.current = instance;
        setReady(true);
      } catch (error) {
        console.error("PayPal init failed:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const startPurchase = useCallback(
    async (createOrder: CreateOrder, handlers: PurchaseHandlers) => {
      const sdk = sdkRef.current;
      if (!sdk) throw new Error("PayPal is not ready yet.");

      const session = sdk.createPayPalOneTimePaymentSession({
        onApprove: handlers.onApprove,
        onCancel: handlers.onCancel,
        onError: handlers.onError,
      });

      await session.start({ presentationMode: "popup" }, createOrder());
    },
    []
  );

  return { ready, startPurchase };
}
