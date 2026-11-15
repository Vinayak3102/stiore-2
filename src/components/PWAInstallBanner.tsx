import React, { useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'header' | 'footer';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'footer' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        aria-label="Install ShivAmrit Healers App"
        className={
          variant === 'header'
            ? 'hidden md:inline-flex items-center gap-1.5 rounded-full bg-[#d4af37]/20 border border-[#d4af37]/50 px-3 py-1.5 text-[11px] font-bold text-[#f3d37a] hover:bg-[#d4af37] hover:text-[#142438] transition cursor-pointer'
            : 'inline-flex items-center gap-2 rounded-lg bg-[#d4af37] px-3.5 py-2 text-xs font-bold text-[#142438] hover:bg-[#e5c158] transition shadow-sm cursor-pointer'
        }
      >
        <Download className="size-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          aria-label="Install ShivAmrit Healers App on iOS"
          className={
            variant === 'header'
              ? 'hidden md:inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/25 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-white/20 transition cursor-pointer'
              : 'inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/20 transition cursor-pointer'
          }
        >
          <Smartphone className="size-3.5 text-[#f3d37a]" />
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Install on iPhone or iPad"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
            onClick={() => setShowIOSGuide(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl bg-white p-6 text-slate-900 shadow-2xl border border-slate-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-serif text-lg font-bold text-[#142438]">
                  Install on iPhone / iPad
                </h3>
                <button
                  type="button"
                  onClick={() => setShowIOSGuide(false)}
                  aria-label="Close iOS install instructions"
                  className="p-1 rounded hover:bg-slate-100 text-slate-500"
                >
                  <X className="size-4" />
                </button>
              </div>
              <ol className="mt-3 space-y-2 text-xs text-slate-600 list-decimal pl-4">
                <li>
                  Tap the <strong>Share</strong> icon in the Safari toolbar.
                </li>
                <li>
                  Scroll down and tap <strong>Add to Home Screen</strong>.
                </li>
                <li>
                  Tap <strong>Add</strong> to launch ShivAmrit Healers like a native app.
                </li>
              </ol>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-xl bg-[#142438] py-2.5 text-xs font-bold text-white hover:bg-[#1e334d] transition cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 right-24 sm:right-auto sm:max-w-sm z-50 flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xl border border-amber-400/50"
    >
      <WifiOff className="size-4 shrink-0" />
      <span>Offline Mode — Browsing cached storefront catalog.</span>
    </div>
  );
};
