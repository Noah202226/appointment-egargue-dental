"use client";

import { useEffect, useState } from "react";
import { WifiOffIcon } from "lucide-react";

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-yellow-50 text-center px-6">
      {!isOnline ? (
        <>
          <WifiOffIcon className="w-16 h-16 text-yellow-600 mb-4" />
          <h1 className="text-3xl font-semibold text-yellow-800 mb-2">
            You are offline
          </h1>
          <p className="text-yellow-700">
            It seems you have lost your internet connection. Please check your
            network settings.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-semibold text-green-800 mb-2">
            You are back online!
          </h1>
          <p className="text-green-700">
            Great! Your internet connection has been restored.
          </p>
        </>
      )}
    </div>
  );
}
