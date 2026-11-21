import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import loadingAnimVideo from "../assets/fr-loading-anim.webm";

interface LoadingScreenProps {
  isLoading?: boolean;
  minDurationMs?: number;
  message?: string;
}

export default function LoadingScreen({
  isLoading = true,
  minDurationMs = 1000,
  message,
}: LoadingScreenProps) {
  const [prevIsLoading, setPrevIsLoading] = useState(isLoading);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [shouldRender, setShouldRender] = useState(true);

  if (isLoading !== prevIsLoading) {
    setPrevIsLoading(isLoading);
    if (isLoading) {
      setMinTimeElapsed(false);
      setShouldRender(true);
    }
  }

  // Ensure the loading animation plays for at least minDurationMs (1 second by default)
  useEffect(() => {
    if (minTimeElapsed) return;
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, minDurationMs);
    return () => clearTimeout(timer);
  }, [minTimeElapsed, minDurationMs]);

  const isActive = isLoading || !minTimeElapsed;

  // Smoothly unmount after the 750ms fade-out transition completes
  useEffect(() => {
    if (isActive) return;
    const timer = setTimeout(() => {
      setShouldRender(false);
    }, 800);
    return () => clearTimeout(timer);
  }, [isActive]);

  if (!shouldRender) {
    return null;
  }

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      aria-hidden={!isActive}
      aria-label={message || "Loading FoodRush"}
      style={{ backgroundColor: "#ffffff" }}
      className={`loading-screen-overlay fixed inset-0 z-[9999] flex flex-col items-center justify-center ${
        isActive
          ? "opacity-100 scale-100"
          : "opacity-0 scale-105 pointer-events-none"
      }`}
    >
      <video
        src={loadingAnimVideo}
        autoPlay
        loop
        muted
        playsInline
        onLoadedMetadata={(e) => {
          e.currentTarget.muted = true;
          e.currentTarget.volume = 0;
        }}
        className="w-64 sm:w-80 max-w-[85vw] h-auto object-contain select-none pointer-events-none"
      />
      {message && (
        <p
          style={{ color: "#64748b" }}
          className="mt-3 text-sm font-medium animate-pulse"
        >
          {message}
        </p>
      )}
    </div>,
    document.body
  );
}
