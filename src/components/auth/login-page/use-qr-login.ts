"use client";

import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  createQrLoginSession,
  pollQrLogin,
  type QrLoginStatus,
} from "@/lib/api/qr-login";
import { persistStoredToken } from "@/lib/api/core";
import {
  createOneScanOffer,
  finishOneScan,
  oneScanPayload,
} from "@/lib/one-scan/one-scan";

type QrLoginState = {
  status: QrLoginStatus | "loading" | "error";
  imageUrl: string;
  error: string;
  secondsLeft: number;
  /** Six digits over the QR's message key; the phone shows the same. */
  verificationCode: string;
};

const INITIAL: QrLoginState = {
  status: "loading",
  imageUrl: "",
  error: "",
  secondsLeft: 0,
  verificationCode: "",
};

export function useQrLogin(active: boolean, onApproved: () => void) {
  const [state, setState] = useState<QrLoginState>(INITIAL);
  const [nonce, setNonce] = useState(0);

  const restart = useCallback(() => {
    setState(INITIAL);
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    const run = async () => {
      try {
        const [session, offer] = await Promise.all([
          createQrLoginSession("AbabilX Chat Web"),
          createOneScanOffer(),
        ]);
        // Two keys make a dense code; "L" keeps the modules large enough.
        const imageUrl = await QRCode.toDataURL(
          oneScanPayload(session.qrPayload, offer),
          { margin: 1, width: 320, errorCorrectionLevel: "L" },
        );
        if (cancelled) return;
        setState({
          status: "pending",
          imageUrl,
          error: "",
          secondsLeft: Math.max(
            0,
            Math.round((session.expiresAt - Date.now()) / 1000),
          ),
          verificationCode: offer.link.verificationCode,
        });

        while (!cancelled) {
          await new Promise((r) => setTimeout(r, session.pollIntervalMs));
          if (cancelled) return;

          const left = Math.max(
            0,
            Math.round((session.expiresAt - Date.now()) / 1000),
          );
          setState((prev) => ({ ...prev, secondsLeft: left }));
          if (left <= 0) {
            setState((prev) => ({ ...prev, status: "expired" }));
            return;
          }

          const { status, identityEnvelope } = await pollQrLogin(session.token);
          if (status === "approved") {
            // Runs to the end even if the panel unmounts: the link key lives
            // only in this closure. The session flag goes up last, because it
            // makes LoginRedirect drop this page and would cut adoption short.
            if (!cancelled) setState((prev) => ({ ...prev, status }));
            await finishOneScan(offer, session.token, identityEnvelope);
            persistStoredToken();
            onApproved();
            return;
          }
          if (cancelled) return;
          if (status === "pending") continue;
          setState((prev) => ({ ...prev, status }));
          return;
        }
      } catch (err) {
        if (cancelled) return;
        setState({
          status: "error",
          imageUrl: "",
          error: err instanceof Error ? err.message : "QR login failed",
          secondsLeft: 0,
          verificationCode: "",
        });
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [active, nonce, onApproved]);

  return { ...state, restart };
}
