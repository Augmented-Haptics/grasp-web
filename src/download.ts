import "./styles.css";
import { LATEST_JSON_URL } from "./config";
import { getUser, requestCode, verifyCode } from "./auth";

type Installer = { url: string; size?: number };
type Latest = {
  version: string;
  released: string;
  macos: Installer;
  windows: Installer;
  testflight: string;
};

const gate = document.querySelector<HTMLDivElement>("#gate")!;
const downloads = document.querySelector<HTMLDivElement>("#downloads")!;

init();

async function init() {
  // detectSessionInUrl has already consumed any tokens from the confirm-link
  // redirect by the time getUser() resolves.
  const user = await getUser();
  if (user) {
    await showDownloads();
  } else {
    showEmailStep();
  }
}

async function showDownloads() {
  downloads.hidden = false;
  gate.hidden = true;
  downloads.innerHTML = `<p class="status">Loading downloads…</p>`;

  let data: Latest;
  try {
    const res = await fetch(LATEST_JSON_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    data = (await res.json()) as Latest;
  } catch {
    downloads.innerHTML =
      `<p class="status error">Couldn't load the download list. Please try again later.</p>`;
    return;
  }

  downloads.innerHTML = `
    <h1>Download Grasp It</h1>
    <p class="version">Version ${esc(data.version)} · ${esc(data.released)}</p>
    <div class="buttons">
      ${installerButton("Download for macOS", data.macos)}
      ${installerButton("Download for Windows", data.windows)}
      <a class="btn" href="${esc(data.testflight)}" target="_blank" rel="noopener">Join the iOS TestFlight</a>
    </div>`;
}

function installerButton(label: string, installer: Installer) {
  const size = installer.size ? ` <span class="size">${formatSize(installer.size)}</span>` : "";
  return `<a class="btn" href="${esc(installer.url)}">${label}${size}</a>`;
}

function showEmailStep() {
  gate.hidden = false;
  downloads.hidden = true;
  gate.innerHTML = `
    <h1>Download Grasp It</h1>
    <p>Enter your email to get a sign-in code.</p>
    <form id="email-form">
      <input id="email" type="email" placeholder="you@example.com" autocomplete="email" required />
      <button type="submit">Send code</button>
    </form>
    <p id="gate-status" class="status"></p>`;

  const form = gate.querySelector<HTMLFormElement>("#email-form")!;
  const emailInput = gate.querySelector<HTMLInputElement>("#email")!;
  const status = gate.querySelector<HTMLParagraphElement>("#gate-status")!;
  const btn = form.querySelector<HTMLButtonElement>("button")!;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = emailInput.value.trim();
    if (!email) return;

    btn.disabled = true;
    status.className = "status";
    status.textContent = "";

    // create: false — /download never signs up new testers; it only lets existing
    // (or interrupted) ones recover access and confirm themselves via the code.
    const { error } = await requestCode(email, { create: false });
    btn.disabled = false;

    if (error) {
      status.className = "status error";
      status.textContent = error.status === 429
        ? "Too many requests. Wait a minute and try again."
        : "This email isn't registered. Scan the QR or go to /join first.";
      return;
    }

    showCodeStep(email);
  });
}

function showCodeStep(email: string) {
  gate.innerHTML = `
    <h1>Enter your code</h1>
    <p>We sent a 6-digit code to <strong>${esc(email)}</strong>.</p>
    <form id="code-form">
      <input id="code" inputmode="numeric" autocomplete="one-time-code" placeholder="123456" required />
      <button type="submit">Verify</button>
    </form>
    <p id="code-status" class="status"></p>`;

  const form = gate.querySelector<HTMLFormElement>("#code-form")!;
  const codeInput = gate.querySelector<HTMLInputElement>("#code")!;
  const status = gate.querySelector<HTMLParagraphElement>("#code-status")!;
  const btn = form.querySelector<HTMLButtonElement>("button")!;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const token = codeInput.value.trim();
    if (!token) return;

    btn.disabled = true;
    status.className = "status";
    status.textContent = "";

    const { error } = await verifyCode(email, token);
    if (error) {
      btn.disabled = false;
      status.className = "status error";
      status.textContent = "That code didn't work. Check it and try again.";
      return;
    }

    await showDownloads();
  });
}

function formatSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

function esc(value: string) {
  const el = document.createElement("div");
  el.textContent = value;
  return el.innerHTML;
}
