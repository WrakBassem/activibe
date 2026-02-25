"use client";

import { useState, useEffect } from "react";

export function NotificationPrompt() {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if ("Notification" in window && "serviceWorker" in navigator && "PushManager" in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
      
      // Register custom Service Worker
      navigator.serviceWorker.register('/sw.js').catch(err => {
        console.error('Service Worker registration failed:', err);
      });

      if (Notification.permission === "default") {
        setShowPrompt(true);
      } else if (Notification.permission === "granted") {
        // If they already granted permission in the past, silently refresh the subscription
        // to ensure the backend database always has their most recent endpoint.
        navigator.serviceWorker.ready.then(async (registration) => {
          try {
             const sub = await registration.pushManager.getSubscription();
             if (sub) {
               await fetch("/api/notifications/subscribe", {
                 method: "POST",
                 headers: { "Content-Type": "application/json" },
                 body: JSON.stringify(sub)
               });
             }
          } catch (e) { console.error('Silent sync failed', e); }
        });
      }
    }
  }, []);

  const urlBase64ToUint8Array = (base64String: string) => {
    // Aggressively strip any accidental quotes, spaces, newlines, or hidden characters
    const safeString = (base64String || '').replace(/[^a-zA-Z0-9\-_]/g, '');
    const padding = "=".repeat((4 - safeString.length % 4) % 4);
    const base64 = (safeString + padding).replace(/\-/g, "+").replace(/_/g, "/");
    
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeToPush = async () => {
    try {
      setLoading(true);
      
      // Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);
      
      if (perm === "granted") {
        // Get service worker registration
        const registration = await navigator.serviceWorker.ready;
        
        const applicationServerKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        console.log("VAPID Key read by browser:", typeof applicationServerKey, applicationServerKey);
        
        if (!applicationServerKey || applicationServerKey === 'undefined' || applicationServerKey === 'null' || applicationServerKey.length < 20) {
          alert("VAPID Key is missing! Please restart your dev server with 'npm run dev' to load .env variables.");
          throw new Error("VAPID public key is missing or corrupted from environment variables.");
        }

        // Subscribe
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(applicationServerKey),
        });

        // Send to backend
        await fetch("/api/notifications/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription),
        });

        setShowPrompt(false);
      } else {
        setShowPrompt(false);
      }
    } catch (error) {
      console.error("Failed to subscribe to push notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported || !showPrompt || permission !== "default") {
    return null;
  }

  return (
    <div className="mb-6 p-4 rounded-xl border border-indigo-500/30 bg-indigo-900/20 backdrop-blur-sm relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-2">
        <button onClick={() => setShowPrompt(false)} className="text-gray-400 hover:text-white transition">
          ✖
        </button>
      </div>
      
      <div className="flex items-start gap-4">
        <div className="text-4xl filter drop-shadow-[0_0_8px_rgba(99,102,241,0.6)] animate-pulse">
           📡
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-white mb-1">Engage Neural Comms?</h3>
          <p className="text-sm text-indigo-200 mb-4 line-clamp-2 md:line-clamp-none">
            The AI Coach requires a direct link to your device to warn you of incoming Boss attacks and drops. Allow background alerts to stay alive.
          </p>
          <div className="flex gap-3">
            <button 
              onClick={subscribeToPush}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-lg transition-all shadow-lg hover:shadow-indigo-500/50 flex items-center gap-2"
            >
              {loading ? <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"/> : "Accept Connection"}
            </button>
            <button 
              onClick={() => setShowPrompt(false)}
              className="px-4 py-2 font-semibold text-gray-400 hover:text-white transition-colors"
            >
              Decline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
