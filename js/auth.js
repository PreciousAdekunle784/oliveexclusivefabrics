/* =========================================================
   OLIVE EXCLUSIVE FABRICS — authentication (Supabase Auth)
   Loaded on the account/* pages. Depends on js/config.js
   (which creates window.sb) loaded first.
   ========================================================= */
const $ = (id) => document.getElementById(id);

function msg(el, text, kind) {
  if (!el) return;
  el.textContent = text;
  el.className = "auth-msg show " + (kind || "err");
}
function clearMsg(el){ if(el){ el.className="auth-msg"; el.textContent=""; } }

function requireConfig(box) {
  if (!window.sb) {
    msg(box, "This site isn't connected to Supabase yet. Add your project keys in js/config.js (see SETUP.md).", "err");
    return false;
  }
  return true;
}
function setLoading(btn, on, label) {
  if (!btn) return;
  btn.classList.toggle("loading", on);
  btn.dataset._label = btn.dataset._label || btn.textContent;
  btn.textContent = on ? "Please wait…" : (label || btn.dataset._label);
}

/* friendlier copy for common Supabase auth errors */
function friendly(err) {
  const m = (err && err.message ? err.message : "").toLowerCase();
  if (m.includes("invalid login")) return "Email or password is incorrect.";
  if (m.includes("already registered") || m.includes("already been registered")) return "An account with this email already exists. Try signing in.";
  if (m.includes("password should be")) return "Password must be at least 6 characters.";
  if (m.includes("unable to validate email") || m.includes("invalid email")) return "Please enter a valid email address.";
  if (m.includes("email not confirmed")) return "Please confirm your email first — check your inbox.";
  if (m.includes("rate limit")) return "Too many attempts. Please wait a moment and try again.";
  return err && err.message ? err.message : "Something went wrong. Please try again.";
}

/* ---------------- SIGN UP ---------------- */
async function doSignUp(e) {
  e.preventDefault();
  const box = $("authMsg"); clearMsg(box);
  const btn = $("submitBtn");
  const name = $("name").value.trim();
  const email = $("email").value.trim();
  const password = $("password").value;
  if (!name)  return msg(box, "Please enter your name.");
  if (!email) return msg(box, "Please enter your email.");
  if (password.length < 6) return msg(box, "Password must be at least 6 characters.");
  if (!requireConfig(box)) return;

  setLoading(btn, true);
  const { data, error } = await window.sb.auth.signUp({
    email, password,
    options: { data: { full_name: name }, emailRedirectTo: location.origin + "/account/sign-in.html" }
  });
  setLoading(btn, false, "Create account");
  if (error) return msg(box, friendly(error));

  if (data.session) {                        // email confirmation OFF -> logged in now
    location.href = "account.html";
  } else {                                   // confirmation ON -> check inbox
    msg(box, "Account created! Check your email to confirm, then sign in.", "ok");
    e.target.reset();
  }
}

/* ---------------- SIGN IN ---------------- */
async function doSignIn(e) {
  e.preventDefault();
  const box = $("authMsg"); clearMsg(box);
  const btn = $("submitBtn");
  const email = $("email").value.trim();
  const password = $("password").value;
  if (!email || !password) return msg(box, "Enter your email and password.");
  if (!requireConfig(box)) return;

  setLoading(btn, true);
  const { error } = await window.sb.auth.signInWithPassword({ email, password });
  setLoading(btn, false, "Sign in");
  if (error) return msg(box, friendly(error));

  const params = new URLSearchParams(location.search);
  location.href = params.get("next") || "account.html";
}

/* ---------------- FORGOT PASSWORD ---------------- */
async function doForgot(e) {
  e.preventDefault();
  const box = $("authMsg"); clearMsg(box);
  const btn = $("submitBtn");
  const email = $("email").value.trim();
  if (!email) return msg(box, "Enter your email.");
  if (!requireConfig(box)) return;

  setLoading(btn, true);
  const { error } = await window.sb.auth.resetPasswordForEmail(email, {
    redirectTo: location.origin + "/account/reset-password.html"
  });
  setLoading(btn, false, "Send reset link");
  if (error) return msg(box, friendly(error));
  msg(box, "If that email has an account, a reset link is on its way. Check your inbox.", "ok");
  e.target.reset();
}

/* ---------------- RESET PASSWORD (from email link) ---------------- */
async function doReset(e) {
  e.preventDefault();
  const box = $("authMsg"); clearMsg(box);
  const btn = $("submitBtn");
  const pw = $("password").value, pw2 = $("password2").value;
  if (pw.length < 6) return msg(box, "Password must be at least 6 characters.");
  if (pw !== pw2)   return msg(box, "Passwords don't match.");
  if (!requireConfig(box)) return;

  setLoading(btn, true);
  const { error } = await window.sb.auth.updateUser({ password: pw });
  setLoading(btn, false, "Update password");
  if (error) return msg(box, friendly(error));
  msg(box, "Password updated. Redirecting to sign in…", "ok");
  setTimeout(() => (location.href = "sign-in.html"), 1400);
}

/* ---------------- ACCOUNT PAGE ---------------- */
async function initAccount() {
  const box = $("authMsg");
  if (!window.sb) { msg(box, "Not connected to Supabase yet (see SETUP.md)."); return; }
  const { data: { session } } = await window.sb.auth.getSession();
  if (!session) { location.href = "sign-in.html?next=account.html"; return; }

  const user = session.user;
  let profile = null;
  const { data } = await window.sb.from("profiles").select("full_name,email,role").eq("id", user.id).single();
  profile = data || {};
  const name = profile.full_name || (user.user_metadata && user.user_metadata.full_name) || "there";
  if ($("acctName")) $("acctName").textContent = name;
  if ($("acctEmail")) $("acctEmail").textContent = profile.email || user.email;
  if ($("acctInitial")) $("acctInitial").textContent = (name[0] || "O").toUpperCase();

  // show Admin entry only for admins
  if (profile.role === "admin" && $("adminEntry")) $("adminEntry").style.display = "";
}

async function doSignOut() {
  if (window.sb) await window.sb.auth.signOut();
  location.href = "../index.html";
}

/* wire up whichever form is on the page */
document.addEventListener("DOMContentLoaded", () => {
  const f = document.querySelector("form[data-auth]");
  if (f) {
    const kind = f.dataset.auth;
    const map = { signup: doSignUp, signin: doSignIn, forgot: doForgot, reset: doReset };
    if (map[kind]) f.addEventListener("submit", map[kind]);
  }
  if (document.body.dataset.auth === "account") initAccount();
});
