import { useEffect, useRef, useState } from "react";
import { applyServiceWorkerUpdate, registerServiceWorker } from "../registerServiceWorker";

function getIsStandalone() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;
}

export function usePwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(() => getIsStandalone());

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const mediaQuery = window.matchMedia?.("(display-mode: standalone)");

    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setDeferredPrompt(event);
    }

    function handleAppInstalled() {
      setDeferredPrompt(null);
      setIsInstalled(true);
    }

    function updateInstalledState() {
      setIsInstalled(getIsStandalone());
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);
    mediaQuery?.addEventListener?.("change", updateInstalledState);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
      mediaQuery?.removeEventListener?.("change", updateInstalledState);
    };
  }, []);

  async function promptInstall() {
    if (!deferredPrompt) {
      return null;
    }

    const nextPrompt = deferredPrompt;
    setDeferredPrompt(null);

    await nextPrompt.prompt();
    const choice = await nextPrompt.userChoice;

    if (choice?.outcome !== "accepted") {
      setDeferredPrompt(nextPrompt);
    }

    return choice;
  }

  return {
    canInstall: Boolean(deferredPrompt) && !isInstalled,
    isInstalled,
    promptInstall,
  };
}

export function useServiceWorkerUpdate() {
  const [waitingRegistration, setWaitingRegistration] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [updateVersion, setUpdateVersion] = useState(0);
  const lastWorkerRef = useRef(null);
  const reloadTriggeredRef = useRef(false);

  useEffect(() => {
    function handleUpdateReady(registration) {
      const waitingWorker = registration?.waiting ?? null;

      if (!waitingWorker) {
        return;
      }

      setWaitingRegistration(registration);

      if (lastWorkerRef.current === waitingWorker) {
        return;
      }

      lastWorkerRef.current = waitingWorker;
      setUpdateVersion((current) => current + 1);
    }

    function handleControllerChange() {
      if (reloadTriggeredRef.current) {
        return;
      }

      reloadTriggeredRef.current = true;
      window.location.reload();
    }

    registerServiceWorker({
      onUpdateReady: handleUpdateReady,
      onControllerChange: handleControllerChange,
    }).then((registration) => {
      setIsReady(Boolean(registration));
    });
  }, []);

  function applyUpdate() {
    if (!waitingRegistration) {
      return;
    }

    applyServiceWorkerUpdate(waitingRegistration);
  }

  return {
    hasUpdate: Boolean(waitingRegistration?.waiting),
    isReady,
    updateVersion,
    applyUpdate,
  };
}
