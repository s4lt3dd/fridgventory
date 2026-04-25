import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/library";
import { X, CameraOff, AlertTriangle } from "lucide-react";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

type ScannerState =
  | "requesting"
  | "scanning"
  | "denied"
  | "error"
  | "unsupported";

interface BarcodeScannerProps {
  onDetected: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({
  onDetected,
  onClose,
}: BarcodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectedRef = useRef(false);
  const [state, setState] = useState<ScannerState>("requesting");
  const [errorMessage, setErrorMessage] = useState("");
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const stopStream = () => {
    if (readerRef.current) {
      try {
        readerRef.current.reset();
      } catch {
        /* noop */
      }
      readerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const start = async () => {
    detectedRef.current = false;
    setErrorMessage("");
    setState("requesting");

    if (
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      setState("unsupported");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;

      if (!videoRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      const reader = new BrowserMultiFormatReader();
      readerRef.current = reader;
      setState("scanning");

      await reader.decodeFromStream(stream, videoRef.current, (result) => {
        if (result && !detectedRef.current) {
          detectedRef.current = true;
          const text = result.getText();
          stopStream();
          onDetected(text);
        }
        // ZXing also passes NotFoundException on every non-match frame —
        // that's expected; we ignore errors and keep scanning.
      });
    } catch (err) {
      const name = (err as { name?: string })?.name;
      if (name === "NotAllowedError" || name === "SecurityError") {
        setState("denied");
      } else if (
        name === "NotFoundError" ||
        name === "OverconstrainedError" ||
        name === "DevicesNotFoundError"
      ) {
        setErrorMessage("No camera was found on this device.");
        setState("error");
      } else {
        setErrorMessage((err as Error)?.message || "Unknown camera error.");
        setState("error");
      }
    }
  };

  useEffect(() => {
    void start();
    return () => {
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    stopStream();
    onClose();
  };

  const reticleAnim = reducedMotion ? "" : "animate-pulse";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Barcode scanner"
      className="fixed inset-0 z-50 bg-black text-white"
    >
      {/* Video */}
      {(state === "scanning" || state === "requesting") && (
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}

      {/* Dimming overlay for non-scanning states */}
      {state !== "scanning" && (
        <div className="absolute inset-0 bg-black/80" aria-hidden="true" />
      )}

      {/* Top bar */}
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-3">
        <h2 className="font-display text-2xl leading-none">Scan barcode</h2>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close scanner"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur text-white transition-colors duration-150 hover:bg-white/30 cursor-pointer focus:outline-none focus-visible:ring-[3px] focus-visible:ring-white/40"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Reticle */}
      {state === "scanning" && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div
            className={`relative rounded-2xl border border-white/40 ${reticleAnim}`}
            style={{
              width: "min(70vw, 320px)",
              height: "min(70vw, 320px)",
            }}
          >
            {/* Corner accents in gold */}
            <span
              aria-hidden="true"
              className="absolute -left-[2px] -top-[2px] h-7 w-7 rounded-tl-2xl border-t-4 border-l-4 border-accent"
            />
            <span
              aria-hidden="true"
              className="absolute -right-[2px] -top-[2px] h-7 w-7 rounded-tr-2xl border-t-4 border-r-4 border-accent"
            />
            <span
              aria-hidden="true"
              className="absolute -left-[2px] -bottom-[2px] h-7 w-7 rounded-bl-2xl border-b-4 border-l-4 border-accent"
            />
            <span
              aria-hidden="true"
              className="absolute -right-[2px] -bottom-[2px] h-7 w-7 rounded-br-2xl border-b-4 border-r-4 border-accent"
            />
          </div>
        </div>
      )}

      {/* Bottom hint */}
      {state === "scanning" && (
        <div className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-[max(env(safe-area-inset-bottom),1.5rem)] text-center">
          <p className="mx-auto max-w-xs rounded-xl bg-black/50 px-4 py-2 text-sm font-semibold backdrop-blur">
            Point at the product&apos;s barcode
          </p>
        </div>
      )}

      {/* Requesting */}
      {state === "requesting" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 text-center">
          <LoadingSpinner size="lg" className="text-white" />
          <p className="text-sm font-semibold">Requesting camera...</p>
        </div>
      )}

      {/* Denied */}
      {state === "denied" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <CameraOff className="h-12 w-12 text-accent" aria-hidden="true" />
          <p className="max-w-sm text-base font-semibold">
            Camera access denied. Enable it in browser settings.
          </p>
          <Button
            variant="secondary"
            onClick={handleClose}
            className="!border-white !text-white hover:!bg-white hover:!text-black"
          >
            Close
          </Button>
        </div>
      )}

      {/* Error */}
      {state === "error" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <AlertTriangle className="h-12 w-12 text-accent" aria-hidden="true" />
          <p className="max-w-sm text-base font-semibold">
            Couldn&apos;t start camera
          </p>
          {errorMessage && (
            <p className="max-w-sm text-sm text-white/80">{errorMessage}</p>
          )}
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={handleClose}
              className="!border-white !text-white hover:!bg-white hover:!text-black"
            >
              Close
            </Button>
            <Button onClick={() => void start()}>Retry</Button>
          </div>
        </div>
      )}

      {/* Unsupported */}
      {state === "unsupported" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 px-6 text-center">
          <CameraOff className="h-12 w-12 text-accent" aria-hidden="true" />
          <p className="max-w-sm text-base font-semibold">
            Your browser doesn&apos;t support camera scanning — enter the item
            manually.
          </p>
          <Button
            variant="secondary"
            onClick={handleClose}
            className="!border-white !text-white hover:!bg-white hover:!text-black"
          >
            Close
          </Button>
        </div>
      )}
    </div>
  );
}
