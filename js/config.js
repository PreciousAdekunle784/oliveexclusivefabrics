/* =========================================================
   OLIVE EXCLUSIVE FABRICS — configuration
   ---------------------------------------------------------
   EDIT THE THREE VALUES BELOW, then everything works.
   Get URL + anon key from: Supabase Dashboard → Project Settings
   → API → "Project URL" and "anon public" key.
   The anon key is SAFE to expose in the browser — Row Level
   Security (see sql/schema.sql) is what protects your data.
   ========================================================= */
window.OEF_CONFIG = {
  SUPABASE_URL: "https://agmjulrcqlyyrcxoqxqr.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnbWp1bHJjcWx5eXJjeG9reHFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0MTYwMzQsImV4cCI6MjEwMTk5MjAzNH0.Iw9VM3EJq9RnbmgzTSvmOZ38FZxzwyTWB7pWurhUM_Y",
  WA_NUMBER: "2349163341233",   // WhatsApp number, digits only, incl. country code
  CURRENCY: "\u20a6"           // ₦
};

/* ---- client bootstrap (don't edit below) ---- */
(function () {
  const cfg = window.OEF_CONFIG;
  const configured =
    typeof cfg.SUPABASE_URL === "string" &&
    cfg.SUPABASE_URL.startsWith("https://") &&
    !cfg.SUPABASE_URL.includes("YOUR_PROJECT") &&
    !cfg.SUPABASE_ANON_KEY.includes("YOUR_");

  window.OEF_CONFIGURED = configured;

  if (configured && window.supabase && window.supabase.createClient) {
    window.sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  } else {
    window.sb = null;
    if (!configured) {
      console.warn(
        "[Olive] Supabase not configured yet — edit js/config.js with your project URL and anon key. " +
        "The storefront will show a setup notice until then."
      );
    }
  }
})();
