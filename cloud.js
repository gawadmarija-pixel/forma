/* Forma — konta i synchronizacja (Supabase).
   Cały stan użytkownika to jeden dokument JSON w tabeli forma_state (wiersz na osobę). */
(function () {
  "use strict";
  const cfg = window.FORMA_CONFIG || {};
  const lib = window.supabase;
  const enabled = !!(lib && cfg.supabaseUrl && cfg.supabaseKey);
  const client = enabled ? lib.createClient(cfg.supabaseUrl, cfg.supabaseKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "forma.auth" },
  }) : null;

  let user = null;
  let timer = null;
  let pending = null;
  let status = "idle"; // idle | saving | saved | offline
  const listeners = new Set();
  const setStatus = (s) => { status = s; listeners.forEach((fn) => fn(s)); };

  const MESSAGES = [
    [/invalid login credentials/i, "Nieprawidłowy e-mail lub hasło."],
    [/email not confirmed/i, "Najpierw potwierdź adres e-mail. Link jest w twojej skrzynce."],
    [/already registered|already exists/i, "Konto z tym adresem już istnieje. Zaloguj się."],
    [/password should be at least|password.*(short|length)/i, "Hasło musi mieć co najmniej 6 znaków."],
    [/weak password|pwned|easy to guess/i, "To hasło jest zbyt łatwe do odgadnięcia. Wybierz inne."],
    [/invalid.*email|email.*invalid|unable to validate email/i, "Sprawdź adres e-mail. Wygląda na niepoprawny."],
    [/rate limit|too many/i, "Za dużo prób w krótkim czasie. Odczekaj chwilę i spróbuj ponownie."],
    [/signups? not allowed|signup.*disabled/i, "Rejestracja jest teraz wyłączona."],
    [/same password|different from the old/i, "Nowe hasło musi się różnić od poprzedniego."],
    [/failed to fetch|network|load failed/i, "Brak połączenia z serwerem. Sprawdź internet."],
  ];
  function plError(err) {
    const msg = (err && (err.message || err.error_description || err.msg)) || String(err || "");
    for (const [re, pl] of MESSAGES) if (re.test(msg)) return pl;
    return "Coś poszło nie tak. Spróbuj ponownie za chwilę.";
  }
  const redirectUrl = () => location.origin + location.pathname;

  async function init(onAuth) {
    if (!enabled) return null;
    client.auth.onAuthStateChange((event, session) => {
      user = session?.user || null;
      onAuth && onAuth(event, user);
    });
    try {
      const { data } = await client.auth.getSession();
      user = data.session?.user || null;
    } catch (e) { user = null; }
    return user;
  }

  async function signUp(email, password) {
    const { data, error } = await client.auth.signUp({ email, password, options: { emailRedirectTo: redirectUrl() } });
    if (error) throw new Error(plError(error));
    // Supabase przy istniejącym adresie (z potwierdzaniem) zwraca użytkownika bez tożsamości
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) throw new Error("Konto z tym adresem już istnieje. Zaloguj się.");
    return { needsConfirm: !data.session, user: data.user };
  }
  async function signIn(email, password) {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw new Error(plError(error));
    user = data.user;
    return data.user;
  }
  async function resetPassword(email) {
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl() });
    if (error) throw new Error(plError(error));
  }
  async function updatePassword(password) {
    const { error } = await client.auth.updateUser({ password });
    if (error) throw new Error(plError(error));
  }
  async function signOut() {
    await flush();
    try { await client.auth.signOut(); } catch (e) { /* lokalne wylogowanie i tak nastąpi */ }
    user = null;
  }

  // ---------- dane ----------
  async function load() {
    const { data, error } = await client.from("forma_state").select("data, updated_at").eq("user_id", user.id).maybeSingle();
    if (error) throw new Error(plError(error));
    return data; // null, gdy pierwszy raz
  }
  async function push(doc) {
    const { error } = await client.from("forma_state").upsert({ user_id: user.id, data: doc, updated_at: new Date().toISOString() });
    if (error) throw error;
  }
  // zapis z opóźnieniem — zaznaczanie kilku serii pod rząd to jeden zapis
  function queueSave(doc) {
    if (!user) return;
    pending = doc;
    setStatus("saving");
    clearTimeout(timer);
    timer = setTimeout(flush, 1200);
  }
  async function flush() {
    clearTimeout(timer);
    if (!pending || !user) return;
    const doc = pending;
    pending = null;
    try { await push(JSON.parse(JSON.stringify(doc))); if (!pending) setStatus("saved"); }
    catch (e) { pending = pending || doc; setStatus("offline"); clearTimeout(timer); timer = setTimeout(flush, 15000); }
  }
  addEventListener("online", () => { if (pending) flush(); });
  addEventListener("pagehide", () => { if (pending) flush(); });

  window.FormaCloud = {
    enabled, init, signUp, signIn, signOut, resetPassword, updatePassword, load, queueSave, flush,
    get user() { return user; }, get status() { return status; }, onStatus: (fn) => listeners.add(fn),
  };
})();
