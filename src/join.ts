import "./styles.css";
import { requestCode } from "./auth";

const form = document.querySelector<HTMLFormElement>("#join-form")!;
const emailInput = document.querySelector<HTMLInputElement>("#email")!;
const status = document.querySelector<HTMLParagraphElement>("#status")!;
const submitBtn = form.querySelector<HTMLButtonElement>("button")!;

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = emailInput.value.trim();
  if (!email) return;

  setBusy(true);
  status.className = "status";
  status.textContent = "";

  // create: true — /join is the only place new testers are allowed to sign up.
  const { error } = await requestCode(email, { create: true });
  setBusy(false);

  if (error) {
    status.className = "status error";
    status.textContent = "Something went wrong. Please try again.";
    return;
  }

  // New user → Confirm signup template (a link). Existing user → Magic Link (a code),
  // but the copy below is fine for both: they continue from their email either way.
  form.hidden = true;
  status.className = "status success";
  status.textContent = "Check your email and tap the link to continue.";
});

function setBusy(busy: boolean) {
  submitBtn.disabled = busy;
  submitBtn.textContent = busy ? "Sending…" : "Continue";
}
