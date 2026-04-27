let registrationPromise = null;
let latestRegistration = null;
let listenersAttached = false;
const watchedRegistrations = new WeakSet();
const updateReadyListeners = new Set();
const controllerChangeListeners = new Set();

function emitUpdateReady(registration) {
  updateReadyListeners.forEach((listener) => listener(registration));
}

function emitControllerChange() {
  controllerChangeListeners.forEach((listener) => listener());
}

function watchRegistration(registration) {
  if (!registration) {
    return;
  }

  latestRegistration = registration;

  if (registration.waiting) {
    emitUpdateReady(registration);
  }

  if (watchedRegistrations.has(registration)) {
    return;
  }

  watchedRegistrations.add(registration);

  registration.addEventListener("updatefound", () => {
    const installingWorker = registration.installing;

    if (!installingWorker) {
      return;
    }

    installingWorker.addEventListener("statechange", () => {
      if (installingWorker.state === "installed" && navigator.serviceWorker.controller) {
        emitUpdateReady(registration);
      }
    });
  });

  if (!listenersAttached) {
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      emitControllerChange();
    });
    listenersAttached = true;
  }
}

export function registerServiceWorker(options = {}) {
  if (!("serviceWorker" in navigator)) {
    return Promise.resolve(null);
  }

  if (options.onUpdateReady) {
    updateReadyListeners.add(options.onUpdateReady);
  }

  if (options.onControllerChange) {
    controllerChangeListeners.add(options.onControllerChange);
  }

  if (!import.meta.env.PROD) {
    return navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations
        .filter((registration) => registration.active?.scriptURL?.endsWith("/sw.js"))
        .forEach((registration) => registration.unregister());
    });
  }

  if (latestRegistration?.waiting && options.onUpdateReady) {
    options.onUpdateReady(latestRegistration);
  }

  if (registrationPromise) {
    return registrationPromise;
  }

  registrationPromise = new Promise((resolve) => {
    async function handleRegister() {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");
        watchRegistration(registration);
        registration.update().catch(() => undefined);
        navigator.serviceWorker.ready.then((readyRegistration) => {
          watchRegistration(readyRegistration);
        });
        resolve(registration);
      } catch (error) {
        console.error("Service worker registration failed.", error);
        resolve(null);
      }
    }

    if (document.readyState === "complete") {
      handleRegister();
      return;
    }

    window.addEventListener("load", handleRegister, { once: true });
  });

  return registrationPromise;
}

export function applyServiceWorkerUpdate(registration) {
  if (!registration?.waiting) {
    return;
  }

  registration.waiting.postMessage({ type: "SKIP_WAITING" });
}
