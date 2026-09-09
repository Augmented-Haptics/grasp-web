import "./styles.css";
import { ANON_KEY, LATEST_RELEASE_URL } from "./config";
import { getUser, requestCode, signOut, verifyCode } from "./auth";

type Installer = { url: string; size?: number };
type Latest = {
  version: string;
  released_at: string;
  // Platforms are published one at a time, so any entry may be missing.
  installers: {
    macos?: Installer;
    windows?: Installer;
    ios?: { url: string };
    android?: Installer;
  };
};

// Matches the backend's per-address max_frequency so resend never fires early into
// a 429. The link stays hidden this long, then appears; each use restarts the wait.
const RESEND_DELAY = 30;

// Inline brand glyphs, tinted via currentColor.
const APPLE_ICON =
  `<svg class="icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.51 4.09z"/><path d="M12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>`;
const ANDROID_ICON =
  `<svg class="icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M18.4395 5.5586c-.675 1.1664-1.352 2.3318-2.0274 3.498-.0366-.0155-.0742-.0286-.1113-.043-1.8249-.6957-3.484-.8-4.42-.787-1.8551.0185-3.3544.4643-4.2597.8203-.084-.1494-1.7526-3.021-2.0215-3.4864a1.1451 1.1451 0 0 0-.1406-.1914c-.3312-.364-.9054-.4859-1.379-.203-.475.282-.7136.9361-.3886 1.5019 1.9466 3.3696-.0966-.2158 1.9473 3.3593.0172.031-.4946.2642-1.3926 1.0177C2.8987 12.176.452 14.772 0 18.9902h24c-.119-1.1108-.3686-2.099-.7461-3.0683-.7438-1.9118-1.8435-3.2928-2.7402-4.1836a12.1048 12.1048 0 0 0-2.1309-1.6875c.6594-1.122 1.312-2.2559 1.9649-3.3848.2077-.3615.1886-.7956-.0079-1.1191a1.1001 1.1001 0 0 0-.8515-.5332c-.5225-.0536-.9392.3128-1.0488.5449zm-.0391 8.461c.3944.5926.324 1.3306-.1563 1.6503-.4799.3197-1.188.0985-1.582-.4941-.3944-.5927-.324-1.3307.1563-1.6504.4727-.315 1.1812-.1086 1.582.4941zM7.207 13.5273c.4803.3197.5506 1.0577.1563 1.6504-.394.5926-1.1038.8138-1.584.4941-.48-.3197-.5503-1.0577-.1563-1.6504.4008-.6021 1.1087-.8106 1.584-.4941z"/></svg>`;
const WINDOWS_ICON =
  `<svg class="icon" viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><path d="M3 5.1 10.4 4v7.3H3V5.1zm0 13.8 7.4 1v-7.2H3v6.2zM11.3 3.9 21 2.5v8.8h-9.7V3.9zm0 8.4H21v8.8l-9.7-1.4v-7.4z"/></svg>`;

// Single origin, single page: QR → here. New and returning testers share one
// email → code flow; a live session skips straight to the downloads.
const view = document.querySelector<HTMLDivElement>("#view")!;

init();

async function init() {
  view.innerHTML = `<p class="status">Checking your session…</p>`;
  const user = await getUser();
  if (user) {
    await showDownloads();
  } else {
    showEmailStep();
  }
}

function showEmailStep() {
  view.innerHTML = `
    <h1>Get early access to Grasp It</h1>
    <form id="email-form">
      <input id="email" type="email" placeholder="you@example.com" autocomplete="email" required />
      <button type="submit">Continue with email</button>
    </form>
    <p id="status" class="status"></p>
    <p class="fine">By continuing, you agree to our
      <a href="https://legal.grasp.it/privacy.html" target="_blank" rel="noopener">Privacy Statement</a>.</p>`;

  const form = view.querySelector<HTMLFormElement>("#email-form")!;
  const emailInput = view.querySelector<HTMLInputElement>("#email")!;
  const status = view.querySelector<HTMLParagraphElement>("#status")!;
  const btn = form.querySelector<HTMLButtonElement>("button")!;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = emailInput.value.trim();
    if (!email) return;

    setLoading(btn, true, "Continue with email");
    status.className = "status";
    status.textContent = "";

    // create: true — this page is the signup funnel. Existing users get a login
    // code, new ones a confirm-signup code; both verify the same way.
    const { error } = await requestCode(email, { create: true });

    if (error) {
      setLoading(btn, false, "Continue with email");
      status.className = "status error";
      status.textContent = error.status === 429
        ? "Too many requests. Wait a minute and try again."
        : "Something went wrong. Please try again.";
      return;
    }

    showCodeStep(email);
  });
}

function showCodeStep(email: string) {
  view.innerHTML = `
    <p class="subtitle">We sent a 6-digit code to <strong>${esc(email)}</strong>. Enter it below.</p>
    <form id="code-form" class="form-narrow">
      <input id="code" class="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" required />
      <button type="submit">Verify</button>
    </form>
    <p id="status" class="status"></p>
    <div id="resend"></div>
    <button id="back" class="link-btn" type="button">← Use a different email</button>`;

  const form = view.querySelector<HTMLFormElement>("#code-form")!;
  const codeInput = view.querySelector<HTMLInputElement>("#code")!;
  const status = view.querySelector<HTMLParagraphElement>("#status")!;
  const verifyBtn = form.querySelector<HTMLButtonElement>("button")!;
  const backBtn = view.querySelector<HTMLButtonElement>("#back")!;
  const resendSlot = view.querySelector<HTMLDivElement>("#resend")!;
  codeInput.focus();

  backBtn.addEventListener("click", showEmailStep);

  // The resend link is withheld at first, then appears; each use restarts the wait.
  const revealResend = () => {
    if (!resendSlot.isConnected) return;
    resendSlot.innerHTML = `<button class="inline-link" type="button">Resend code</button>`;
    const btn = resendSlot.querySelector<HTMLButtonElement>("button")!;
    btn.addEventListener("click", async () => {
      startCountdown(btn, RESEND_DELAY);
      status.className = "status";
      status.textContent = "";

      const { error } = await requestCode(email, { create: true });
      if (error) {
        status.className = "status error";
        status.textContent = error.status === 429
          ? "Please wait before requesting another code."
          : "Couldn't resend. Please try again.";
        return;
      }
      status.className = "status success";
      status.textContent = "New code sent.";
    });
  };
  setTimeout(revealResend, RESEND_DELAY * 1000);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const token = codeInput.value.trim();
    if (!token) return;

    setLoading(verifyBtn, true, "Verify");
    status.className = "status";
    status.textContent = "";

    const { error } = await verifyCode(email, token);
    if (error) {
      setLoading(verifyBtn, false, "Verify");
      status.className = "status error";
      status.textContent = "That code didn't work. Check it and try again.";
      return;
    }

    await showDownloads();
  });
}

async function showDownloads() {
  view.innerHTML = `<p class="status">Loading downloads…</p>`;

  let data: Latest;
  try {
    const res = await fetch(LATEST_RELEASE_URL, {
      cache: "no-store",
      headers: { apikey: ANON_KEY },
    });
    if (!res.ok) throw new Error(String(res.status));
    // PostgREST returns a row array; the view yields at most one row.
    const rows = (await res.json()) as Latest[];
    if (rows.length === 0) throw new Error("empty");
    data = rows[0];
  } catch {
    view.innerHTML =
      `<p class="status error">Couldn't load the download list. Please try again later.</p>`;
    return;
  }

  view.innerHTML = `
    <h1>Download the Grasp It app</h1>
    <p class="version">Version ${esc(data.version)} · ${esc(data.released_at)}</p>
    <div class="group">
      <p class="group-label">Desktop</p>
      <div class="buttons">
        ${installerButton("Download for macOS", data.installers.macos, APPLE_ICON)}
        ${installerButton("Download for Windows", data.installers.windows, WINDOWS_ICON)}
      </div>
    </div>
    <div class="group">
      <p class="group-label">Tablet</p>
      <div class="buttons">
        ${data.installers.ios ? `<a class="btn" href="${esc(data.installers.ios.url)}" target="_blank" rel="noopener">${APPLE_ICON}<span>Join the iPad TestFlight beta</span></a>` : ""}
        ${installerButton("Download for Android", data.installers.android, ANDROID_ICON)}
      </div>
    </div>
    <button id="logout" class="link-btn" type="button">Sign out</button>`;

  view.querySelector<HTMLButtonElement>("#logout")!.addEventListener("click", async () => {
    await signOut();
    showEmailStep();
  });
}

/** Empty when the release has no installer for that platform yet. */
function installerButton(label: string, installer: Installer | undefined, icon: string) {
  if (!installer) return "";
  const size = installer.size ? ` <span class="size">${formatSize(installer.size)}</span>` : "";
  return `<a class="btn" href="${esc(installer.url)}">${icon}<span>${label}${size}</span></a>`;
}

/** Swap a button between its label and a spinner while an async action runs. */
function setLoading(btn: HTMLButtonElement, loading: boolean, label: string) {
  btn.disabled = loading;
  btn.innerHTML = loading ? `<span class="spinner" aria-hidden="true"></span>` : label;
}

/** Disable the resend button and count down before re-enabling it. */
function startCountdown(btn: HTMLButtonElement, seconds: number) {
  let remaining = seconds;
  const render = () => {
    if (remaining <= 0) {
      btn.disabled = false;
      btn.textContent = "Resend code";
      clearInterval(id);
      return;
    }
    btn.disabled = true;
    btn.textContent = `Resend code in ${remaining}s`;
    remaining -= 1;
  };
  render();
  const id = setInterval(render, 1000);
}

function formatSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

function esc(value: string) {
  const el = document.createElement("div");
  el.textContent = value;
  return el.innerHTML;
}
