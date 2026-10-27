/* Forma — interfejs aplikacji */
(function () {
  "use strict";
  const F = window.FormaEngine;
  const KEY = "forma.v1";
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = F.fmtNum;
  const plural = F.plural;

  // ---------- stan ----------
  const blank = () => ({
    version: 1, theme: "auto", blockNo: 0,
    onb: { step: 0, profile: { goal: null, goalOther: "", level: null, maxes: {}, equipment: null, days: null, minutes: null, limits: [], limitsNote: "", name: "" } },
    profile: null, plan: null, logs: {}, ratings: [], adjust: { factor: 1, since: 0, history: [] },
    daily: {}, bodyweight: [], reviews: [], tab: "today", active: null,
  });
  let state;
  try { state = Object.assign(blank(), JSON.parse(localStorage.getItem(KEY) || "null") || {}); } catch (e) { state = blank(); }
  const Cloud = window.FormaCloud && window.FormaCloud.enabled ? window.FormaCloud : null;
  const saveLocal = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* tryb prywatny */ } };
  // zapis lokalny zawsze; do chmury — gdy ktoś jest zalogowany
  const save = () => {
    state.savedAt = Date.now();
    saveLocal();
    if (Cloud && Cloud.user) Cloud.queueSave(state);
  };
  const localMode = () => { try { return localStorage.getItem("forma.mode") === "local"; } catch (e) { return false; } };
  const setLocalMode = (on) => { try { on ? localStorage.setItem("forma.mode", "local") : localStorage.removeItem("forma.mode"); } catch (e) { /* brak */ } };

  const todayISO = () => {
    try { const o = new URLSearchParams(location.search).get("dzis") || localStorage.getItem("forma.today"); if (o && /^\d{4}-\d{2}-\d{2}$/.test(o)) return o; } catch (e) { /* brak */ }
    return F.toISO(new Date());
  };
  const dateObj = (iso) => new Date(iso + "T12:00:00");
  const longDate = (iso) => dateObj(iso).toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" });
  const shortDate = (iso) => dateObj(iso).toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
  const weekdayName = (iso) => dateObj(iso).toLocaleDateString("pl-PL", { weekday: "long" });
  const daysBetween = (a, b) => Math.round((dateObj(b) - dateObj(a)) / 864e5);

  // ---------- ikony ----------
  const I = {
    today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
    leaf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19 13 11"/></svg>',
    chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 19h16M6 15l4-4 3 3 5-6"/></svg>',
    week: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 6h16M4 12h10M4 18h7"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    moon: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/></svg>',
    sun: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    back: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M15 5l-7 7 7 7"/></svg>',
  };

  // ---------- motyw ----------
  function applyTheme() {
    const root = document.documentElement;
    if (state.theme === "auto") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", state.theme);
  }
  function isDark() {
    return state.theme === "dark" || (state.theme === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  }

  // ---------- toast ----------
  let toastTimer;
  function toast(msg) {
    let t = $("#toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 3800);
  }

  // =====================================================================
  // ANKIETA
  // =====================================================================
  const STEPS = [
    {
      key: "goal", q: "Jaki jest twój główny cel na najbliższe 4 tygodnie?", hint: "Jeden cel. Pod niego ustawimy serie, powtórzenia i intensywność.",
      type: "radio", options: [
        ["sila", "Siła", "Mniej powtórzeń, większe ciężary"], ["masa", "Budowanie mięśni", "Więcej objętości, umiarkowany ciężar"],
        ["redukcja", "Odchudzanie z zachowaniem siły", "Ciężko i krótko, plus kondycja"], ["powrot", "Powrót do formy po przerwie", "Spokojny start, technika przede wszystkim"],
        ["wydarzenie", "Przygotowanie do wydarzenia", "Wyprawa, sezon, zawody"], ["inny", "Inny cel", "Opiszesz go własnymi słowami"],
      ],
      valid: (p) => p.goal && (p.goal !== "inny" || p.goalOther.trim().length > 1),
    },
    {
      key: "level", q: "Na jakim jesteś poziomie?", hint: "Uczciwie — od tego zależy start, nie ambicja.",
      type: "radio", options: [
        ["pocz", "Początkujący", "Regularnie mniej niż rok"], ["sredni", "Średnio zaawansowany", "1–3 lata, znam technikę podstawowych bojów"], ["zaaw", "Zaawansowany", "Ponad 3 lata, planuję progresję"],
      ],
      valid: (p) => !!p.level,
    },
    {
      key: "equipment", q: "Na jakim sprzęcie trenujesz?", hint: "Ćwiczenia dobierzemy tylko z tego, co masz pod ręką.",
      type: "radio", options: Object.entries(F.EQUIPMENT).map(([k, v]) => [k, v, { gym: "Sztangi, wyciągi, maszyny", home: "Sztanga, stojaki, ławka, drążek, hantle", db: "Para hantli, najlepiej regulowanych", kb: "Jeden lub dwa kettlebelle", bw: "Podłoga, krzesło, drążek lub stół" }[k]]),
      valid: (p) => !!p.equipment,
    },
    {
      key: "days", q: "Ile dni w tygodniu realnie możesz trenować?", hint: "Realnie, nie ambitnie. Trzy dni przez cztery tygodnie dają więcej niż pięć przez jeden.",
      type: "radio", cols: true, options: [2, 3, 4, 5, 6].map((n) => [n, String(n), ""]),
      valid: (p) => !!p.days,
    },
    {
      key: "minutes", q: "Ile czasu masz na jedną sesję?", hint: "Razem z rozgrzewką i wyciszeniem. Jeśli zabraknie czasu, skrócimy ćwiczenia pomocnicze — nie rozgrzewkę.",
      type: "radio", cols: true, options: [30, 45, 60, 75, 90].map((n) => [n, `${n}′`, ""]),
      valid: (p) => !!p.minutes,
    },
    {
      key: "limits", q: "Co trzeba uwzględnić?", hint: "Kontuzje, bóle, ograniczenia. Zamienimy ćwiczenia, które mogą przeszkadzać.",
      type: "check", options: [["brak", "Brak", ""], ...Object.entries(F.LIMITS).map(([k, v]) => [k, v, ""])],
      valid: (p) => p.limits.length > 0 || p.limitsNote.trim().length > 1,
    },
    {
      key: "name", q: "Jak masz na imię?", hint: "Tak będzie podpisany twój program.",
      type: "text", valid: (p) => p.name.trim().length > 0,
    },
  ];

  function renderStep() {
    const o = state.onb, p = o.profile, step = STEPS[o.step];
    let body = "";
    if (step.type === "radio" || step.type === "check") {
      const isCheck = step.type === "check";
      const vals = isCheck ? p.limits.concat(p.limits.length === 0 && o.noneChosen ? ["brak"] : []) : [p[step.key]];
      body = `<div class="options ${step.cols ? "cols" : ""}" role="${isCheck ? "group" : "radiogroup"}" aria-label="${esc(step.q)}">` +
        step.options.map(([val, label, sub], i) => {
          const checked = vals.map(String).includes(String(val)) ? "checked" : "";
          return `<label class="option"><input type="${isCheck ? "checkbox" : "radio"}" name="${step.key}" value="${esc(val)}" ${checked} data-step-input>
            <span class="face"><span>${esc(label)}${sub ? `<small>${esc(sub)}</small>` : ""}</span>${i < 9 && !step.cols ? `<span class="key" aria-hidden="true">${i + 1}</span>` : ""}</span></label>`;
        }).join("") + "</div>";
    }
    if (step.key === "goal" && p.goal === "inny") {
      body += `<div class="field" style="margin-top:16px"><label for="goalOther">Opisz swój cel</label><textarea id="goalOther" class="input" data-field="goalOther" placeholder="Np. przebiec 10 km bez bólu kolan i podciągnąć się 5 razy">${esc(p.goalOther)}</textarea></div>`;
    }
    if (step.key === "level") {
      const open = Object.values(p.maxes || {}).some((v) => v > 0);
      body += `<details class="more" ${open ? "open" : ""} style="margin-top:16px"><summary>Znam swoje maksymalne ciężary (opcjonalnie)</summary>
        <p class="muted" style="margin-bottom:12px;font-size:14px">Ciężar na jedno powtórzenie. Na tej podstawie wzorem Epleya policzymy ciężary robocze.</p>
        <div class="max-grid">${Object.entries(F.LIFTS).map(([k, label]) => `<div class="field"><label for="max-${k}">${label} (kg)</label><input id="max-${k}" class="input" type="number" inputmode="decimal" min="0" step="2.5" data-max="${k}" value="${p.maxes?.[k] || ""}" placeholder="—"></div>`).join("")}</div></details>`;
    }
    if (step.key === "limits") {
      body += `<div class="field" style="margin-top:16px"><label for="limitsNote">Coś jeszcze? (opcjonalnie)</label><textarea id="limitsNote" class="input" data-field="limitsNote" placeholder="Np. po rekonstrukcji ACL w 2023, lekarz pozwala na pełny zakres">${esc(p.limitsNote)}</textarea></div>`;
    }
    if (step.key === "name") {
      body = `<label class="sr-only" for="name">Imię</label><input id="name" class="input name-input" data-field="name" autocomplete="given-name" placeholder="Twoje imię" value="${esc(p.name)}" maxlength="40">`;
    }
    const pct = ((o.step + 1) / STEPS.length) * 100;
    const last = o.step === STEPS.length - 1;
    return `
      <div class="step-count">Krok ${o.step + 1} z ${STEPS.length}</div>
      <div class="progress" role="progressbar" aria-valuemin="1" aria-valuemax="${STEPS.length}" aria-valuenow="${o.step + 1}" aria-label="Postęp ankiety"><span style="width:${pct}%"></span></div>
      <form class="step" id="stepForm" novalidate>
        <h1 class="question" id="q">${esc(step.q)}</h1>
        <p class="hint">${esc(step.hint)}</p>
        ${body}
        <p class="kbd-hint">Klawiatura: cyfry wybierają odpowiedź · Enter — dalej · Esc — wstecz</p>
      </form>
      <nav class="onb-nav" aria-label="Nawigacja ankiety">
        <button type="button" class="btn ghost" data-action="onb-back" ${o.step === 0 ? "disabled" : ""}>Wstecz</button>
        <button type="button" class="btn" data-action="onb-next" ${step.valid(p) ? "" : "disabled"}>${last ? "Stwórz plan" : "Dalej"}</button>
      </nav>`;
  }

  // Wstępny plan — liczony tym samym silnikiem, co docelowy
  let lastDraft = {};
  function draftHTML() {
    const p = state.onb.profile;
    const filled = Object.assign({ goal: "inny", level: "sredni", equipment: "gym", days: 3, minutes: 60 }, JSON.parse(JSON.stringify(p)));
    filled.limits = p.limits.filter((l) => l !== "brak");
    const plan = F.generatePlan(filled, todayISO());
    const rows = [];
    rows.push(["Dla", p.name.trim() ? esc(p.name.trim()) : null]);
    if (p.goal) {
      const s = F.SCHEMES[p.goal].M;
      const sc = (w) => { const x = F.scheme(filled, "M", w); return `${x.sets}×${x.reps} @${fmt(x.rpe)}`; };
      const d = F.deloadOf(F.scheme(filled, "M", 2));
      rows.push(["Cel", `${esc(F.GOALS[p.goal].label)}${p.goal === "inny" && p.goalOther ? ` — „${esc(p.goalOther.trim())}”` : ""}`]);
      rows.push(["Progresja ćwiczeń głównych", `${sc(0)} → ${sc(1)} → ${sc(2)}<br><span class="faint">Tydzień 4: ${d.sets}×${d.reps} @6 — odciążenie</span>`]);
      void s;
    } else rows.push(["Cel", null]);
    rows.push(["Poziom", p.level ? esc(F.LEVELS[p.level]) : null]);
    const maxes = Object.entries(p.maxes || {}).filter(([, v]) => v > 0);
    if (maxes.length) {
      rows.push(["Ciężary robocze — tydzień 1 (Epley)", maxes.map(([k, v]) => { const x = F.scheme(filled, "M", 0); return `${F.LIFTS[k]}: ${fmt(F.epleyWeight(v, x.reps, x.rpe))} kg`; }).join("<br>")]);
    }
    if (p.equipment) {
      const names = [...new Set(plan.weeks[0].sessions.flatMap((s) => s.exercises.filter((e) => e.role !== "A").map((e) => e.name)))].slice(0, 4);
      rows.push(["Sprzęt", `${esc(F.EQUIPMENT[p.equipment])}<br><span class="faint">${names.map(esc).join(" · ")}</span>`]);
    } else rows.push(["Sprzęt", null]);
    if (p.days) {
      const dn = ["pn", "wt", "śr", "cz", "pt", "sb", "nd"];
      const start = dateObj(todayISO()).getDay(); // 0 = niedziela
      const labels = plan.weekdays.map((d) => dn[(start + 6 + d) % 7]);
      rows.push(["Tydzień", `${p.days} ${plural(p.days, "dzień", "dni", "dni")}: ${labels.join(" · ")}<br><span class="faint">${esc(plan.split)}</span>`]);
    } else rows.push(["Tydzień", null]);
    if (p.minutes) {
      const s = plan.weeks[2].sessions[0];
      rows.push(["Sesja", `${p.minutes} min: rozgrzewka ${F.WARMUP_MIN}′ · trening · wyciszenie ${F.COOLDOWN_MIN}′<br><span class="faint">${s.exercises.length} ${plural(s.exercises.length, "ćwiczenie", "ćwiczenia", "ćwiczeń")} na sesję${plan.dropped.length ? ` · skrócone pomocnicze: ${plan.dropped.length}` : ""}</span>`]);
    } else rows.push(["Sesja", null]);
    if (state.onb.step >= 5 || p.limits.length) {
      const lim = filled.limits;
      rows.push(["Uwzględniam", lim.length || p.limitsNote ? `${lim.map((l) => esc(F.LIMITS[l])).join(", ")}${p.limitsNote ? `${lim.length ? "; " : ""}${esc(p.limitsNote)}` : ""}${plan.swaps.length ? `<br><span class="faint">${plan.swaps.map((s) => `${esc(s.from)} → ${esc(s.to)}`).join("<br>")}</span>` : ""}` : (p.limits.includes("brak") ? "Bez ograniczeń" : null)]);
    }
    const html = rows.map(([k, v]) => {
      const fresh = v && lastDraft[k] !== v ? "fresh" : "";
      lastDraft[k] = v;
      return `<div><dt>${esc(k)}</dt><dd class="${v ? fresh : "empty"}">${v || "—"}</dd></div>`;
    }).join("");
    return `<h2>Wstępny plan</h2><dl>${html}</dl><p class="faint" style="margin-top:24px;font-size:13px">4 tygodnie: 3 tygodnie stopniowego wzrostu obciążenia i tydzień odciążenia (50–60% objętości tygodnia 3).</p>`;
  }

  function renderOnboarding(focus = true) {
    const app = $("#app");
    app.innerHTML = `
      <div class="onb">
        <main class="onb-main">
          <div class="spread"><div class="wordmark">Forma<i>.</i></div><div class="row"><a class="draft-link" href="#draft">Wstępny plan ↓</a>${Cloud && !Cloud.user ? '<button class="btn quiet" data-action="auth-mode" data-mode="login">Zaloguj się</button>' : ""}${themeButton()}</div></div>
          <div id="stepWrap">${renderStep()}</div>
        </main>
        <aside class="draft" aria-live="polite" aria-label="Wstępny plan" id="draft">${draftHTML()}</aside>
      </div>`;
    if (focus) focusStep();
  }
  function refreshOnb() {
    const nextBtn = $('[data-action="onb-next"]');
    if (nextBtn) nextBtn.disabled = !STEPS[state.onb.step].valid(state.onb.profile);
    const d = $("#draft"); if (d) d.innerHTML = draftHTML();
  }
  function focusStep() {
    const el = $("#stepForm input:checked") || $("#stepForm input, #stepForm textarea");
    if (el) el.focus({ preventScroll: true }); else $("#q")?.focus();
  }
  function onbGo(dir) {
    const o = state.onb;
    if (dir > 0 && !STEPS[o.step].valid(o.profile)) return;
    if (dir > 0 && o.step === STEPS.length - 1) return finishOnboarding();
    o.step = Math.max(0, Math.min(STEPS.length - 1, o.step + dir));
    save();
    $("#stepWrap").innerHTML = renderStep();
    refreshOnb();
    focusStep();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function finishOnboarding() {
    const p = JSON.parse(JSON.stringify(state.onb.profile));
    p.limits = p.limits.filter((l) => l !== "brak");
    p.name = p.name.trim();
    Object.keys(p.maxes).forEach((k) => { if (!(p.maxes[k] > 0)) delete p.maxes[k]; });
    state.profile = p;
    $("#app").innerHTML = `<div class="view empty-state" style="padding-top:20vh"><p class="eyebrow">Chwila</p><h1 class="display" style="margin-top:12px">Układam twój blok…</h1><p class="muted" style="margin-top:16px">${p.days} ${plural(p.days, "dzień", "dni", "dni")} · ${p.minutes} min · ${esc(F.EQUIPMENT[p.equipment].toLowerCase())}</p></div>`;
    setTimeout(() => { newBlock(); state.tab = "today"; save(); render(); toast("Plan gotowy. Zaczynamy."); }, 900);
  }
  function newBlock(maxesOverride) {
    if (maxesOverride) state.profile.maxes = Object.assign({}, state.profile.maxes, maxesOverride);
    state.blockNo = (state.blockNo || 0) + 1;
    const plan = F.generatePlan(state.profile, todayISO(), 1);
    plan.weeks.forEach((w) => w.sessions.forEach((s) => { s.id = `b${state.blockNo}${s.id}`; }));
    plan.blockNo = state.blockNo;
    state.plan = plan;
    state.adjust = { factor: 1, since: state.ratings.length, history: state.adjust?.history || [] };
    state.active = null;
  }

  // =====================================================================
  // LOGIKA DNIA
  // =====================================================================
  const allSessions = () => (state.plan ? state.plan.weeks.flatMap((w) => w.sessions) : []);
  const findSession = (id) => allSessions().find((s) => s.id === id);
  const logOf = (id) => state.logs[id];
  const isDone = (s) => !!logOf(s.id)?.completedAt;
  function statusOf(s) {
    const t = todayISO();
    if (isDone(s)) return "done";
    if (s.date < t) return "missed";
    if (s.date === t) return "today";
    return "planned";
  }
  function setsCount(s) {
    const planned = s.exercises.reduce((a, e) => a + e.sets, 0);
    const log = logOf(s.id);
    let done = 0;
    if (log) Object.values(log.sets || {}).forEach((arr) => arr.forEach((x) => { if (x?.done) done++; }));
    return { planned, done };
  }
  function streak() {
    const t = todayISO();
    const past = allSessions().filter((s) => s.date <= t).sort((a, b) => a.date.localeCompare(b.date));
    let n = 0;
    for (let i = past.length - 1; i >= 0; i--) {
      const s = past[i];
      if (isDone(s)) n++;
      else if (s.date === t) continue;
      else break;
    }
    return n;
  }
  function weekIndex() {
    if (!state.plan) return 0;
    return Math.max(0, Math.min(3, Math.floor(daysBetween(state.plan.start, todayISO()) / 7)));
  }
  function missedRecent() {
    const t = todayISO();
    return allSessions().filter((s) => statusOf(s) === "missed" && daysBetween(s.date, t) <= 7 && !logOf(s.id)?.dismissed);
  }
  function lastCompleted() {
    return allSessions().filter(isDone).sort((a, b) => (logOf(b.id).completedAt || "").localeCompare(logOf(a.id).completedAt || ""))[0];
  }

  function coachWord(todaySession, scheduledToday) {
    const n = streak();
    const sub = n > 0 ? `Seria: ${n} ${plural(n, "trening", "treningi", "treningów")} z rzędu.` : "Seria: zaczyna się od następnego treningu.";
    const last = lastCompleted();
    const t = todayISO();
    const missed = missedRecent();
    // świeższa sprawa ma pierwszeństwo: pominięty trening po ostatnim zapisanym → najpierw o nim
    const missedNewer = missed.length && (!last || missed[missed.length - 1].date > logOf(last.id).completedAt.slice(0, 10));
    if (last && !missedNewer && daysBetween(logOf(last.id).completedAt.slice(0, 10), t) <= 3) {
      const c = setsCount(last);
      const miss = c.planned - c.done;
      if (miss > 0) {
        const pct = Math.round((miss / c.planned) * 100);
        return {
          quote: pct >= 30
            ? `W „${last.title}” zabrakło ${miss} z ${c.planned} serii. To już nie drobiazg — jeśli to czas, skracamy przerwy; jeśli siła, oceń trening jako „Bardzo ciężko”, a ciężar spadnie.`
            : `W „${last.title}” ${miss === 1 ? "wypadła 1 seria" : `wypadły ${miss} ${plural(miss, "seria", "serie", "serii")}`} z ${c.planned}. Mało, ale dziś domykamy wszystkie — postęp robią właśnie te ostatnie.`,
          sub,
        };
      }
    }
    if (missed.length) {
      const m = missed[0];
      return {
        quote: missed.length > 1
          ? `Wypadły ${missed.length} treningi w ostatnim tygodniu. Jeden to przypadek, dwa to już wzór. Odrób jeden w najbliższy wolny dzień — nie wszystkie naraz.`
          : `Wypadł trening „${m.title}” (${weekdayName(m.date)}). Jedna przerwa nic nie psuje. ${scheduledToday ? "Najpierw dzisiejszy, zaległy — w dzień wolny." : "Dziś jest dobry dzień, żeby go odrobić."}`,
        sub,
      };
    }
    if (todaySession?.deload) return { quote: "Tydzień odciążenia. Lżej i krócej — to nie strata, tylko moment, w którym zmęczenie schodzi, a forma wychodzi.", sub };
    if (n >= 3) return { quote: `${n} ${plural(n, "trening", "treningi", "treningów")} z rzędu bez dziury. Tak właśnie wygląda progres: nudno, regularnie, do skutku.`, sub };
    if (!last && todaySession) return { quote: "Pierwszy trening. Cel na dziś: czysta technika i ciężar, przy którym zostają 2–3 powtórzenia w zapasie.", sub };
    if (todaySession) return { quote: "Rozgrzewka w całości, potem serie po kolei. Nie gonisz rekordu — zbierasz dobre powtórzenia.", sub };
    return { quote: "Dziś odpoczynek. Mięśnie rosną między treningami, nie w ich trakcie. Sen, białko, woda.", sub };
  }

  // ---------- sugestie ciężaru ----------
  function stepFor(load) { return load === "bar" || load === "mach" ? 2.5 : 1; }
  function lastWeightFor(name, excludeId) {
    const entries = Object.entries(state.logs).filter(([id, l]) => id !== excludeId && l.completedAt && l.names && l.names[name] != null)
      .sort((a, b) => b[1].completedAt.localeCompare(a[1].completedAt));
    if (!entries.length) return null;
    const [, l] = entries[0];
    return { w: l.names[name], factor: l.factor || 1 };
  }
  function suggestWeight(ex, sid) {
    const f = state.adjust.factor || 1;
    if (ex.weight) return F.round(ex.weight * f / (state.plan.factorAtCreation || 1), 2.5);
    const last = lastWeightFor(ex.name, sid);
    if (last && last.w > 0) return F.round(last.w * f / last.factor, stepFor(ex.load));
    return null;
  }

  // =====================================================================
  // WIDOKI APLIKACJI
  // =====================================================================
  function themeButton() {
    return `<button class="icon-btn" data-action="theme" aria-label="Przełącz tryb ${isDark() ? "jasny" : "ciemny"}" title="Tryb jasny / ciemny">${isDark() ? I.sun : I.moon}</button>`;
  }
  function shell(inner) {
    const tabs = [["today", "Dzisiaj", I.today], ["cal", "Kalendarz", I.cal], ["habits", "Nawyki", I.leaf], ["progress", "Postępy", I.chart], ["week", "Tydzień", I.week]];
    return `
      <header class="topbar">
        <div class="wordmark">Forma<i>.</i></div>
        <div class="actions">
          <button class="btn small soft" data-action="export">Pobierz program</button>
          ${themeButton()}
        </div>
      </header>
      <main class="view" id="main">${inner}</main>
      <nav class="tabbar" aria-label="Sekcje"><div class="tabbar-inner">
        ${tabs.map(([k, l, ic]) => `<button class="tab" data-action="tab" data-tab="${k}" ${state.tab === k ? 'aria-current="page"' : ""}>${ic}<span>${l}</span></button>`).join("")}
      </div></nav>`;
  }

  function exLine(ex, sid) {
    const w = suggestWeight(ex, sid);
    return `<li><span>${esc(ex.name)}</span><span class="faint" style="white-space:nowrap">${ex.sets} × ${esc(ex.repsLabel)}${w ? ` · ${fmt(w)} kg` : ""}</span></li>`;
  }

  function viewToday() {
    const t = todayISO();
    const p = state.profile;
    const all = allSessions();
    const todays = all.find((s) => s.date === t);
    const blockOver = t > state.plan.end;
    const missed = missedRecent();
    const wk = weekIndex();
    let main = "";
    let featured = null;
    if (todays && !isDone(todays)) {
      featured = todays;
      main = sessionCard(todays, "Zaplanowany trening");
      if (missed.length) main += `<p class="muted" style="margin-top:12px;font-size:14px">Zaległy: „${esc(missed[0].title)}” z ${esc(weekdayName(missed[0].date))}. Odrób go w dzień wolny.</p>`;
    } else if (todays && isDone(todays)) {
      const c = setsCount(todays);
      const r = { easy: "Łatwo", ok: "W sam raz", hard: "Bardzo ciężko" }[logOf(todays.id).rating] || "";
      main = `<section class="card fog stack"><p class="eyebrow">Zrobione</p><h2 class="h1">${esc(todays.title)} ✓</h2>
        <div class="meta"><span>${c.done}/${c.planned} serii</span>${r ? `<span>Ocena: ${r}</span>` : ""}</div>
        ${nextSessionLine()}</section>`;
      if (missed.length) main += makeupCard(missed[0]);
    } else if (missed.length && !blockOver) {
      featured = missed[0];
      main = makeupCard(missed[0], true);
    } else if (blockOver) {
      main = `<section class="card peach stack"><p class="eyebrow">Koniec bloku</p><h2 class="h1">4 tygodnie za tobą.</h2>
        <p>Policzę nowe maksymalne ciężary z twoich najlepszych serii i ułożę kolejny blok.</p>
        <button class="btn big" data-action="new-block">Zaplanuj kolejny blok</button></section>`;
    } else {
      main = `<section class="card fog stack"><p class="eyebrow">Odpoczynek</p><h2 class="h1">Dziś regeneracja.</h2>
        <p class="muted">Spacer, rozciąganie, 7–9 godzin snu.</p>${nextSessionLine()}</section>`;
    }
    const cw = coachWord(featured, !!(todays && !isDone(todays)));
    return shell(`
      <div class="today-head">
        <p class="eyebrow">${esc(longDate(t))} · tydzień ${wk + 1} z 4${wk === 3 ? " · odciążenie" : ""}</p>
        <h1 class="display" style="margin-top:8px">Cześć, ${esc(p.name)}.</h1>
      </div>
      <div class="stack">
        <section class="card peach coach" aria-label="Słowo trenera"><p class="eyebrow">Słowo trenera</p><p class="quote">${esc(cw.quote)}</p><p class="sub">${esc(cw.sub)}</p></section>
        ${main}
      </div>
      <div class="footer-links">${accountLine()}<button data-action="reset">Zacznij od nowa</button></div>`);
  }
  function nextSessionLine() {
    const t = todayISO();
    const next = allSessions().find((s) => s.date > t && !isDone(s));
    return next ? `<p class="muted">Następny: <strong>${esc(next.title)}</strong> — ${esc(longDate(next.date))}</p>` : "";
  }
  function makeupCard(s, big) {
    return `<section class="card ${big ? "" : "fog"} stack" style="margin-top:16px"><p class="eyebrow">Odrabianie</p>
      <h2 class="${big ? "h1" : "h2"}">${esc(s.title)}</h2><p class="muted">Pominięty ${esc(longDate(s.date))}.</p>
      ${big ? `<ul class="ex-list">${s.exercises.map((e) => exLine(e, s.id)).join("")}</ul>` : ""}
      <div class="row"><button class="btn ${big ? "big" : ""}" data-action="start" data-id="${s.id}" data-makeup="1">Odrób trening</button>
      <button class="btn quiet" data-action="dismiss" data-id="${s.id}">Odpuść</button></div></section>`;
  }
  function sessionCard(s, label) {
    const inProgress = logOf(s.id)?.startedAt;
    const maxRpe = Math.max(...s.exercises.map((e) => e.rpe));
    return `<section class="card stack">
      <p class="eyebrow">${esc(label)}${s.deload ? " · odciążenie" : ""}</p>
      <h2 class="h1">${esc(s.title)}</h2>
      <div class="meta"><span>~${s.minutes} min</span><span>${s.exercises.length} ${plural(s.exercises.length, "ćwiczenie", "ćwiczenia", "ćwiczeń")}</span><span>RPE do ${fmt(maxRpe)}</span></div>
      <ul class="ex-list">${s.exercises.map((e) => exLine(e, s.id)).join("")}</ul>
      ${s.dropped?.length ? `<p class="faint" style="font-size:13px">Limit czasu: pominięte pomocnicze — ${s.dropped.map(esc).join(", ")}. Rozgrzewka i wyciszenie zostają.</p>` : ""}
      <button class="btn big" data-action="start" data-id="${s.id}">${inProgress ? "Wróć do treningu" : "Zaczynamy"}</button>
    </section>`;
  }

  // ---------- ekran treningu ----------
  function ensureLog(s) {
    if (!state.logs[s.id]) state.logs[s.id] = { sets: {}, warm: [], cool: [], startedAt: null };
    const log = state.logs[s.id];
    s.exercises.forEach((e, i) => {
      if (!log.sets[i]) {
        const w = suggestWeight(e, s.id);
        log.sets[i] = Array.from({ length: e.sets }, () => ({ done: false, w }));
      }
    });
    return log;
  }
  function fmtRest(sec) { return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`; }

  function viewWorkout() {
    const s = findSession(state.active);
    if (!s) { state.active = null; return viewToday(); }
    const log = ensureLog(s);
    const c = setsCount(s);
    const checklist = (items, key) => `<ul class="checklist">${items.map((it, i) => `<li><input type="checkbox" id="${key}${i}" data-action="tick-list" data-list="${key}" data-i="${i}" ${log[key][i] ? "checked" : ""}><label for="${key}${i}">${esc(it)}</label></li>`).join("")}</ul>`;
    const allWarm = s.warmup.every((_, i) => log.warm[i]);
    const exCards = s.exercises.map((e, i) => {
      const sets = log.sets[i];
      const complete = sets.every((x) => x.done);
      const unit = e.load === "bw" ? "" : " kg";
      return `<section class="card ex-card ${complete ? "complete" : ""}" id="ex${i}">
        <div class="ex-name">${esc(e.name)}</div>
        <div class="ex-target">${e.sets} × ${esc(e.repsLabel)} · RPE ${fmt(e.rpe)} · przerwa ${fmtRest(e.rest)}</div>
        <div class="sets">${sets.map((x, j) => `
          <div class="set ${x.done ? "done" : ""}">
            <span class="n">${j + 1}</span>
            <button class="weight-btn" data-action="weight" data-ex="${i}" data-set="${j}" aria-label="Ciężar, seria ${j + 1}">${x.w != null && x.w !== "" ? `${fmt(x.w)}${unit || " kg"}` : e.load === "bw" ? "MC" : "<small>+ ciężar</small>"}</button>
            <button class="check" data-action="set" data-ex="${i}" data-set="${j}" aria-pressed="${x.done}" aria-label="Seria ${j + 1} wykonana">${I.check}</button>
          </div>`).join("")}</div>
      </section>`;
    }).join("");
    return `
      <header class="topbar">
        <button class="icon-btn" data-action="leave" aria-label="Wróć">${I.back}</button>
        <div style="text-align:center;flex:1"><div style="font-family:var(--font-display);font-size:20px">${esc(s.title)}</div><div class="faint" style="font-size:12px">${esc(shortDate(s.date))}${log.makeup ? " · odrabianie" : ""}</div></div>
        ${themeButton()}
      </header>
      <main class="view workout">
        <details class="card collapse" ${allWarm ? "" : "open"}><summary><span class="h3">Rozgrzewka · ${F.WARMUP_MIN} min</span></summary>${checklist(s.warmup, "warm")}</details>
        <div style="margin-top:16px">${exCards}</div>
        <details class="card collapse" style="margin-top:16px" open><summary><span class="h3">Wyciszenie · ${F.COOLDOWN_MIN} min</span></summary>${checklist(s.cooldown, "cool")}</details>
      </main>
      <div class="workout-bar"><div class="inner">
        ${rest.left > 0 ? `<button class="rest-pill" data-action="skip-rest" aria-label="Pomiń przerwę">Przerwa <strong id="restLeft">${fmtRest(rest.left)}</strong></button>` : `<div class="progress-mini"><strong>${c.done}</strong>/${c.planned} serii</div>`}
        <button class="btn" data-action="finish">Zakończ</button>
      </div></div>`;
  }

  // licznik przerwy
  const rest = { left: 0, timer: null };
  function startRest(sec) {
    clearInterval(rest.timer);
    rest.left = sec;
    rest.timer = setInterval(() => {
      rest.left--;
      const el = $("#restLeft");
      if (rest.left <= 0) {
        clearInterval(rest.timer); rest.left = 0;
        try { navigator.vibrate && navigator.vibrate([120, 80, 120]); } catch (e) { /* brak */ }
        if (state.active) renderKeepScroll();
      } else if (el) el.textContent = fmtRest(rest.left);
    }, 1000);
  }
  function renderKeepScroll() { const y = window.scrollY; render(); window.scrollTo(0, y); }

  // ---------- arkusze ----------
  function openSheet(html, onMount) {
    closeSheet();
    const wrap = document.createElement("div");
    wrap.id = "sheetWrap";
    wrap.innerHTML = `<div class="sheet-backdrop" data-action="close-sheet"></div><div class="sheet" role="dialog" aria-modal="true"><div class="grabber"></div>${html}</div>`;
    document.body.appendChild(wrap);
    if (onMount) onMount(wrap);
    const first = wrap.querySelector("[autofocus], .sheet button, .sheet input");
    first && first.focus({ preventScroll: true });
  }
  function closeSheet() { $("#sheetWrap")?.remove(); }

  function weightSheet(exI, setJ) {
    const s = findSession(state.active), log = ensureLog(s), e = s.exercises[exI];
    const cur = log.sets[exI][setJ].w;
    const plan = suggestWeight(e, s.id);
    const last = lastWeightFor(e.name, s.id);
    const st = stepFor(e.load);
    const steps = st === 2.5 ? [-5, -2.5, 2.5, 5] : [-2, -1, 1, 2];
    openSheet(`
      <p class="eyebrow" style="text-align:center">${esc(e.name)} · seria ${setJ + 1}</p>
      <div class="weight-display"><input id="wInput" type="number" inputmode="decimal" step="${st}" min="0" value="${cur ?? plan ?? ""}" aria-label="Ciężar w kilogramach" placeholder="0"><span style="font-size:var(--fs-4)"> kg</span></div>
      ${e.load === "bw" ? '<p class="faint" style="text-align:center;margin-top:-8px">Dodatkowy ciężar ponad masę ciała</p>' : ""}
      <div class="steppers">${steps.map((d) => `<button class="btn ghost" data-action="w-step" data-d="${d}">${d > 0 ? "+" : "−"}${fmt(Math.abs(d))}</button>`).join("")}</div>
      <div class="quick">${plan ? `<button class="btn small soft" data-action="w-set" data-v="${plan}">Plan: ${fmt(plan)} kg</button>` : ""}${last ? `<button class="btn small ghost" data-action="w-set" data-v="${last.w}">Ostatnio: ${fmt(last.w)} kg</button>` : ""}</div>
      <label class="row" style="justify-content:center;margin-bottom:16px;font-size:14px;color:var(--text-2)"><input type="checkbox" id="wAll" checked style="width:20px;height:20px"> Ustaw też dla kolejnych serii</label>
      <button class="btn big" data-action="w-save" data-ex="${exI}" data-set="${setJ}">Zapisz</button>`, (w) => {
      const inp = w.querySelector("#wInput");
      inp.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); w.querySelector('[data-action="w-save"]').click(); } });
      setTimeout(() => inp.select(), 50);
    });
  }

  function ratingSheet() {
    const s = findSession(state.active);
    const c = setsCount(s);
    openSheet(`
      <h2 class="h2" style="text-align:center">Jak było?</h2>
      <p class="muted" style="text-align:center;margin:8px 0 24px">${c.done} z ${c.planned} serii${c.done < c.planned ? " — reszta zostanie zapisana jako pominięta" : ""}</p>
      <div class="rating">
        <button class="btn ghost" data-action="rate" data-r="easy">Łatwo</button>
        <button class="btn soft" data-action="rate" data-r="ok">W sam raz</button>
        <button class="btn ghost" data-action="rate" data-r="hard">Bardzo ciężko</button>
      </div>`);
  }

  function finishWorkout(r) {
    const s = findSession(state.active);
    const log = ensureLog(s);
    log.completedAt = new Date().toISOString().slice(0, 10) === todayISO() ? new Date().toISOString() : todayISO() + "T12:00:00.000Z";
    log.rating = r;
    log.factor = state.adjust.factor;
    log.names = {};
    s.exercises.forEach((e, i) => {
      const ws = log.sets[i].filter((x) => x.done && x.w != null && x.w !== "").map((x) => +x.w);
      if (ws.length) log.names[e.name] = Math.max(...ws);
    });
    const prs = detectPRs(s, log);
    state.ratings.push({ sid: s.id, r, date: todayISO() });
    let msg = { easy: "Zapisane. Łatwo — dobrze to wiedzieć.", ok: "Zapisane. Dokładnie tak ma być.", hard: "Zapisane. Odpocznij porządnie." }[r];
    const recent = state.ratings.slice(state.adjust.since).slice(-3);
    if (recent.length === 3 && recent.every((x) => x.r === "hard")) {
      state.adjust.factor = +(state.adjust.factor * 0.9).toFixed(4);
      state.adjust.since = state.ratings.length;
      state.adjust.history.push({ date: todayISO(), pct: -10, reason: "3 × „Bardzo ciężko” z rzędu" });
      msg = "Trzy razy „Bardzo ciężko” z rzędu — zmniejszam ciężary o 10%.";
    } else if (recent.length === 3 && recent.every((x) => x.r === "easy")) {
      const pct = state.profile.level === "pocz" || state.profile.goal === "powrot" ? 5 : 2.5;
      state.adjust.factor = +(state.adjust.factor * (1 + pct / 100)).toFixed(4);
      state.adjust.since = state.ratings.length;
      state.adjust.history.push({ date: todayISO(), pct, reason: "3 × „Łatwo” z rzędu" });
      msg = `Trzy razy „Łatwo” z rzędu — podnoszę ciężary o ${fmt(pct)}%.`;
    }
    if (prs.length) msg += ` Nowy rekord: ${prs[0]}.`;
    state.active = null;
    clearInterval(rest.timer); rest.left = 0;
    save(); closeSheet(); render(); window.scrollTo(0, 0);
    toast(msg);
  }

  // ---------- rekordy ----------
  function bestSets(excludeId) {
    const best = {};
    allLoggedSessions().forEach(({ s, log }) => {
      if (s.id === excludeId) return;
      s.exercises.forEach((e, i) => {
        (log.sets[i] || []).forEach((x) => {
          if (!x.done || !(+x.w > 0)) return;
          const reps = parseInt(e.repsLabel, 10) || e.reps;
          const e1 = F.epley1RM(+x.w, reps);
          if (!best[e.name] || e1 > best[e.name].e1) best[e.name] = { e1, w: +x.w, reps, date: log.completedAt.slice(0, 10), lift: e.lift, pattern: e.pattern };
        });
      });
    });
    return best;
  }
  function allLoggedSessions() {
    // bieżący blok + wcześniejsze (zachowane w archiwum)
    const sessions = allSessions().concat((state.archive || []).flatMap((p) => p.weeks.flatMap((w) => w.sessions)));
    return sessions.filter((s) => state.logs[s.id]?.completedAt).map((s) => ({ s, log: state.logs[s.id] }));
  }
  function detectPRs(s, log) {
    const before = bestSets(s.id);
    const out = [];
    s.exercises.forEach((e, i) => {
      if (e.role !== "M") return;
      log.sets[i].forEach((x) => {
        if (!x.done || !(+x.w > 0)) return;
        const e1 = F.epley1RM(+x.w, e.reps);
        const base = e.lift && state.profile.maxes[e.lift] ? state.profile.maxes[e.lift] : 0;
        const prev = Math.max(before[e.name]?.e1 || 0, base);
        if (prev > 0 && e1 > prev + 0.01 && !out.find((o) => o.startsWith(e.name))) out.push(`${e.name} ${fmt(x.w)} kg × ${e.reps}`);
      });
    });
    return out;
  }

  // ---------- kalendarz ----------
  function viewCalendar() {
    const t = todayISO();
    const plan = state.plan;
    const byDate = {};
    allSessions().forEach((s) => { byDate[s.date] = s; });
    const dn = ["pn", "wt", "śr", "cz", "pt", "sb", "nd"];
    const weeks = plan.weeks.map((w) => {
      const days = Array.from({ length: 7 }, (_, d) => F.addDays(plan.start, w.week * 7 + d));
      const doneN = w.sessions.filter(isDone).length;
      return `<section class="week-block">
        <div class="spread"><h2 class="h3">Tydzień ${w.week + 1} <span class="faint" style="font-family:var(--font-ui);font-size:14px">· ${w.deload ? `odciążenie, ${Math.round(plan.deloadRatio * 100)}% objętości tyg. 3` : ["start progresji", "więcej obciążenia", "szczyt bloku"][w.week]}</span></h2><span class="faint" style="font-size:13px">${doneN}/${w.sessions.length}</span></div>
        <div class="cal">${days.map((d) => {
          const s = byDate[d];
          const st = s ? statusOf(s) : "";
          const wd = dn[(dateObj(d).getDay() + 6) % 7];
          return `<button class="cal-day ${s ? "has " + (st === "today" ? "planned today" : st) : ""} ${w.deload ? "deload" : ""} ${d === t ? "today" : ""}" ${s ? `data-action="cal-open" data-id="${s.id}"` : "disabled"} aria-label="${esc(longDate(d))}${s ? ": " + esc(s.title) : ": odpoczynek"}">
            <span class="d">${wd} ${dateObj(d).getDate()}</span>${s ? `<span class="t">${esc(s.title)}</span>` : ""}</button>`;
        }).join("")}</div></section>`;
    }).join("");
    return shell(`
      <p class="eyebrow">${esc(shortDate(plan.start))} – ${esc(shortDate(plan.end))}</p>
      <h1 class="h1" style="margin:8px 0 8px">Kalendarz bloku</h1>
      <p class="muted">${esc(plan.split)} · ${state.profile.minutes} min</p>
      <div class="legend"><span style="--sw:var(--accent)">zaplanowany</span><span style="--sw:var(--surface-2)">zrobiony</span><span style="--sw:transparent">pominięty (przekreślony)</span></div>
      <div style="margin-top:24px">${weeks}</div>`);
  }
  function calSheet(id) {
    const s = findSession(id);
    const st = statusOf(s);
    const c = setsCount(s);
    const log = logOf(id);
    openSheet(`
      <p class="eyebrow">${esc(longDate(s.date))} · tydzień ${s.week + 1}${s.deload ? " · odciążenie" : ""}</p>
      <h2 class="h1" style="margin:8px 0 12px">${esc(s.title)}</h2>
      ${st === "done" ? `<p class="muted">Zrobione: ${c.done}/${c.planned} serii · ${esc({ easy: "Łatwo", ok: "W sam raz", hard: "Bardzo ciężko" }[log.rating] || "")}</p>` : `<p class="muted">~${s.minutes} min</p>`}
      <ul class="ex-list" style="margin:12px 0 20px">${s.exercises.map((e) => exLine(e, s.id)).join("")}</ul>
      ${st !== "done" ? `<button class="btn big" data-action="start" data-id="${s.id}" ${st === "missed" ? 'data-makeup="1"' : ""}>${st === "missed" ? "Odrób trening" : st === "today" ? "Zaczynamy" : "Zrób teraz"}</button>` : ""}
      <button class="btn quiet" style="width:100%;margin-top:8px" data-action="close-sheet">Zamknij</button>`);
  }

  // ---------- nawyki: odżywianie i regeneracja ----------
  const PROTEIN = { sila: 1.8, masa: 2.0, redukcja: 2.2, powrot: 1.6, wydarzenie: 1.8, inny: 1.8 };
  const currentBW = () => (state.bodyweight.length ? state.bodyweight[state.bodyweight.length - 1].kg : null);
  const day = (iso) => (state.daily[iso] = state.daily[iso] || { protein: 0, water: 0, sleep: null });
  function targets() {
    const bw = currentBW();
    if (!bw) return null;
    const trainingDay = allSessions().some((s) => s.date === todayISO());
    return { protein: Math.round(bw * PROTEIN[state.profile.goal]), water: Math.round((bw * 35 + (trainingDay ? 500 : 0)) / 50) * 50, perKg: PROTEIN[state.profile.goal] };
  }
  function last7(fn) {
    const t = todayISO();
    return Array.from({ length: 7 }, (_, i) => F.addDays(t, -i)).map(fn);
  }
  function viewHabits() {
    const t = todayISO();
    const d = day(t);
    const tg = targets();
    const sleeps = last7((iso) => state.daily[iso]?.sleep).filter((x) => x != null);
    const avgSleep = sleeps.length ? sleeps.reduce((a, b) => a + b, 0) / sleeps.length : null;
    const meter = (v, max) => `<div class="meter" role="img" aria-label="${Math.round((v / max) * 100)}% celu"><span style="width:${Math.min(100, (v / max) * 100)}%"></span></div>`;
    const bwForm = `<section class="card peach stack"><p class="eyebrow">Na start</p><h2 class="h2">Podaj masę ciała</h2><p class="muted">Z niej policzę cel białka i wody.</p>
      <form class="row" data-form="bw"><label class="sr-only" for="bwIn">Masa ciała w kg</label><input id="bwIn" class="input" style="flex:1;min-width:120px" type="number" inputmode="decimal" step="0.1" min="30" max="300" placeholder="kg" required><button class="btn">Zapisz</button></form></section>`;
    return shell(`
      <p class="eyebrow">${esc(longDate(t))}</p>
      <h1 class="h1" style="margin:8px 0 24px">Odżywianie i regeneracja</h1>
      <div class="stack">
        ${!tg ? bwForm : ""}
        <section class="card stack">
          <div class="spread"><h2 class="h3">Białko</h2><span class="faint" style="font-size:13px">${tg ? `cel ${tg.protein} g · ${fmt(tg.perKg)} g/kg` : "cel po podaniu masy ciała"}</span></div>
          <div class="stat"><span class="v">${d.protein} g</span></div>${tg ? meter(d.protein, tg.protein) : ""}
          <div class="row"><button class="btn ghost" data-action="habit" data-k="protein" data-d="-10">−10 g</button><button class="btn soft" data-action="habit" data-k="protein" data-d="10">+10 g</button><button class="btn soft" data-action="habit" data-k="protein" data-d="25">+25 g</button></div>
          <p class="faint" style="font-size:13px">25 g ≈ pierś z kurczaka 110 g, 200 g skyru albo 4 jajka.</p>
        </section>
        <section class="card stack">
          <div class="spread"><h2 class="h3">Woda</h2><span class="faint" style="font-size:13px">${tg ? `cel ${fmt(tg.water / 1000)} l` : ""}</span></div>
          <div class="stat"><span class="v">${fmt(d.water / 1000, 2)} l</span></div>${tg ? meter(d.water, tg.water) : ""}
          <div class="row"><button class="btn ghost" data-action="habit" data-k="water" data-d="-250">−250 ml</button><button class="btn soft" data-action="habit" data-k="water" data-d="250">+ szklanka</button><button class="btn soft" data-action="habit" data-k="water" data-d="500">+ butelka</button></div>
        </section>
        <section class="card stack">
          <div class="spread"><h2 class="h3">Sen ostatniej nocy</h2><span class="faint" style="font-size:13px">cel 7–9 h</span></div>
          <div class="row" style="justify-content:space-between"><button class="btn ghost" data-action="sleep" data-d="-0.5" aria-label="Mniej o pół godziny">−</button>
          <span class="stat"><span class="v">${d.sleep != null ? fmt(d.sleep) + " h" : "—"}</span></span>
          <button class="btn ghost" data-action="sleep" data-d="0.5" aria-label="Więcej o pół godziny">+</button></div>
          <p class="muted" style="font-size:14px">${avgSleep != null ? `Średnio z ${sleeps.length} ${plural(sleeps.length, "nocy", "nocy", "nocy")}: <strong>${fmt(avgSleep)} h</strong>. ${avgSleep < 7 ? "To za mało, żeby w pełni się regenerować — ciężar idzie w górę wolniej." : "Dobra baza pod progres."}` : "Wpisz sen, a policzę średnią z tygodnia."}</p>
        </section>
        <section class="card fog stack"><h2 class="h3">Regeneracja</h2>
          <p class="muted">${weekIndex() === 3 ? "Tydzień odciążenia: śpij tyle, ile możesz, i nie dokładaj treningów „bo jest lżej”." : "Między ciężkimi dniami: spacer 20–30 min, mobilność 5 min, stała pora snu."}</p></section>
      </div>`);
  }

  // ---------- postępy ----------
  function viewProgress() {
    const sessions = allSessions();
    const done = sessions.filter(isDone);
    let setsDone = 0, tonnage = 0;
    allLoggedSessions().forEach(({ s, log }) => s.exercises.forEach((e, i) => (log.sets[i] || []).forEach((x) => { if (x.done) { setsDone++; if (+x.w > 0) tonnage += +x.w * (parseInt(e.repsLabel, 10) || e.reps); } })));
    const best = bestSets();
    const mainNames = [];
    ["squat", "hinge", "hpush", "vpush"].forEach((pat) => {
      const ex = sessions.flatMap((s) => s.exercises).find((e) => e.pattern === pat && e.role === "M") || sessions.flatMap((s) => s.exercises).find((e) => e.pattern === pat);
      if (ex && !mainNames.find((m) => m.name === ex.name)) mainNames.push(ex);
    });
    const bw = state.bodyweight.slice(-30);
    const factorPct = Math.round((state.adjust.factor - 1) * 1000) / 10;
    return shell(`
      <h1 class="h1" style="margin:0 0 24px">Postępy</h1>
      <div class="stack">
        <div class="stat-grid">
          <div class="card stat"><div class="v">${done.length}/${sessions.length}</div><div class="l">treningów w bloku</div></div>
          <div class="card stat"><div class="v">${setsDone}</div><div class="l">wykonanych serii</div></div>
          <div class="card stat"><div class="v">${fmt(tonnage / 1000, 1)} t</div><div class="l">przerzucony ciężar</div></div>
          <div class="card stat"><div class="v">${streak()}</div><div class="l">z rzędu</div></div>
        </div>
        <section class="card stack">
          <h2 class="h3">Rekordy w podstawowych ćwiczeniach</h2>
          <table class="table"><thead><tr><th>Ćwiczenie</th><th class="num">Start</th><th class="num">Najlepsza seria</th><th class="num">Szac. 1RM</th></tr></thead><tbody>
          ${mainNames.map((e) => { const b = best[e.name]; const base = e.lift ? state.profile.maxes[e.lift] : null; return `<tr><td>${esc(e.name)}</td><td class="num">${base ? fmt(base) + " kg" : "—"}</td><td class="num">${b ? `${fmt(b.w)} × ${b.reps}` : "—"}</td><td class="num">${b ? fmt(F.round(b.e1, 0.5)) + " kg" : "—"}</td></tr>`; }).join("")}
          </tbody></table>
          <p class="faint" style="font-size:13px">1RM szacowany wzorem Epleya: ciężar × (1 + powtórzenia / 30).</p>
        </section>
        <section class="card stack">
          <div class="spread"><h2 class="h3">Masa ciała</h2><span class="faint" style="font-size:13px">${bw.length ? `${fmt(bw[bw.length - 1].kg)} kg` : ""}</span></div>
          <form class="row" data-form="bw"><label class="sr-only" for="bwIn2">Masa ciała w kg</label><input id="bwIn2" class="input" style="flex:1;min-width:120px" type="number" inputmode="decimal" step="0.1" min="30" max="300" placeholder="Dzisiejszy pomiar, kg" required><button class="btn">Dodaj</button></form>
          ${bw.length >= 2 ? `<div class="chart" id="bwChart" aria-label="Wykres masy ciała">${bwChart(bw)}<div class="tip" hidden></div></div>` : bw.length === 1 ? '<p class="faint">Drugi pomiar narysuje wykres.</p>' : ""}
          ${bw.length ? `<details><summary class="faint" style="cursor:pointer;font-size:14px">Tabela pomiarów</summary><table class="table" style="margin-top:8px"><tbody>${bw.slice().reverse().map((x) => `<tr><td>${esc(longDate(x.date))}</td><td class="num">${fmt(x.kg)} kg</td></tr>`).join("")}</tbody></table></details>` : ""}
        </section>
        <section class="card fog stack"><h2 class="h3">Korekty ciężaru</h2>
          <p class="muted">${state.adjust.history.length ? state.adjust.history.map((h) => `${esc(shortDate(h.date))}: ${h.pct > 0 ? "+" : ""}${fmt(h.pct)}% (${esc(h.reason)})`).join("<br>") : "Na razie bez korekt. Trzy oceny „Bardzo ciężko” z rzędu obniżą ciężar o 10%, trzy „Łatwo” — podniosą o 2,5–5%."}</p>
          ${factorPct ? `<p>Aktualnie: <strong>${factorPct > 0 ? "+" : ""}${fmt(factorPct)}%</strong> względem planu.</p>` : ""}</section>
      </div>`);
  }
  function bwChart(pts) {
    const W = 600, H = 180, P = { l: 36, r: 12, t: 12, b: 24 };
    const ys = pts.map((p) => p.kg);
    let min = Math.min(...ys), max = Math.max(...ys);
    if (max - min < 2) { min -= 1; max += 1; }
    const x = (i) => P.l + (i / (pts.length - 1)) * (W - P.l - P.r);
    const y = (v) => P.t + (1 - (v - min) / (max - min)) * (H - P.t - P.b);
    const path = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.kg).toFixed(1)}`).join("");
    const grid = [min, (min + max) / 2, max].map((v) => `<line x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${P.l - 6}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="var(--text-3)">${fmt(v)}</text>`).join("");
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="Masa ciała od ${fmt(ys[0])} do ${fmt(ys[ys.length - 1])} kg">
      ${grid}
      <path d="${path}" fill="none" stroke="var(--accent-ink)" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round"/>
      ${pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.kg)}" r="4" fill="var(--accent-ink)" stroke="var(--surface)" stroke-width="2" vector-effect="non-scaling-stroke"/>`).join("")}
      <text x="${P.l}" y="${H - 4}" font-size="11" fill="var(--text-3)">${esc(shortDate(pts[0].date))}</text>
      <text x="${W - P.r}" y="${H - 4}" font-size="11" fill="var(--text-3)" text-anchor="end">${esc(shortDate(pts[pts.length - 1].date))}</text>
    </svg>`;
  }
  function bindChart() {
    const c = $("#bwChart"); if (!c) return;
    const pts = state.bodyweight.slice(-30);
    const tip = c.querySelector(".tip");
    c.addEventListener("pointermove", (ev) => {
      const r = c.getBoundingClientRect();
      const rel = (ev.clientX - r.left) / r.width;
      const i = Math.max(0, Math.min(pts.length - 1, Math.round(((rel * 600 - 36) / (600 - 48)) * (pts.length - 1))));
      const circle = c.querySelectorAll("circle")[i];
      const cr = circle.getBoundingClientRect();
      tip.hidden = false;
      tip.style.left = `${cr.left - r.left + cr.width / 2}px`;
      tip.style.top = `${cr.top - r.top}px`;
      tip.textContent = `${shortDate(pts[i].date)}: ${fmt(pts[i].kg)} kg`;
    });
    c.addEventListener("pointerleave", () => { tip.hidden = true; });
  }

  // ---------- podsumowanie tygodnia ----------
  const Q = [
    ["mood", "Jak oceniasz samopoczucie w tym tygodniu?", [["1", "Słabo"], ["2", "Tak sobie"], ["3", "OK"], ["4", "Dobrze"], ["5", "Świetnie"]]],
    ["sleepq", "Jak oceniasz swój sen?", [["1", "Źle"], ["2", "Przeciętnie"], ["3", "Dobrze"]]],
    ["pain", "Czy coś boli?", [["0", "Nic"], ["1", "Zakwasy"], ["2", "Ból, który niepokoi"]]],
    ["stress", "Poziom stresu poza siłownią?", [["1", "Niski"], ["2", "Średni"], ["3", "Wysoki"]]],
  ];
  function weekData() {
    const t = todayISO();
    const from = F.addDays(t, -6);
    const inWin = (iso) => iso >= from && iso <= t;
    const planned = allSessions().filter((s) => inWin(s.date));
    const doneLogs = allLoggedSessions().filter(({ log }) => inWin(log.completedAt.slice(0, 10)));
    let setsPlanned = 0, setsDone = 0, tonnage = 0;
    doneLogs.forEach(({ s, log }) => s.exercises.forEach((e, i) => { setsPlanned += e.sets; (log.sets[i] || []).forEach((x) => { if (x.done) { setsDone++; if (+x.w > 0) tonnage += +x.w * (parseInt(e.repsLabel, 10) || e.reps); } }); }));
    const ratings = state.ratings.filter((r) => inWin(r.date));
    const days = last7((iso) => state.daily[iso]).filter(Boolean);
    const sleeps = days.map((d) => d.sleep).filter((x) => x != null);
    const tg = targets();
    const proteinDays = tg ? days.filter((d) => d.protein >= tg.protein * 0.9).length : null;
    const waterLogged = days.filter((d) => d.water > 0);
    const bws = state.bodyweight.filter((b) => inWin(b.date) || b.date < from).slice(-8);
    const bwIn = state.bodyweight.filter((b) => inWin(b.date));
    const prs = doneLogs.flatMap(({ s, log }) => detectPRs(s, log));
    return {
      from, to: t, planned, doneN: doneLogs.length, plannedDone: planned.filter(isDone).length, setsPlanned, setsDone, tonnage, ratings,
      sleepAvg: sleeps.length ? sleeps.reduce((a, b) => a + b, 0) / sleeps.length : null, sleepN: sleeps.length,
      proteinDays, waterAvg: waterLogged.length ? waterLogged.reduce((a, d) => a + d.water, 0) / waterLogged.length : null, waterN: waterLogged.length,
      bwChange: bwIn.length && bws.length >= 2 ? bws[bws.length - 1].kg - bws[0].kg : null, prs, tg,
    };
  }
  function coachReply(a, d) {
    const out = [];
    const missedSessions = d.planned.filter((s) => statusOf(s) === "missed").length;
    if (d.doneN === 0) out.push(`W ostatnich 7 dniach nie ma ani jednego zapisanego treningu. ${a.stress === "3" ? "Przy wysokim stresie to zrozumiałe, ale ruch jest jednym z lepszych sposobów, żeby go rozładować." : ""} Zacznij od jednej sesji — nawet skróconej.`);
    else {
      out.push(`Zapisane treningi: ${d.doneN}${d.planned.length ? ` (zaplanowane w tym oknie: ${d.planned.length})` : ""}, serie: ${d.setsDone}/${d.setsPlanned}, przerzucone ${fmt(d.tonnage)} kg.`);
      const pct = d.setsPlanned ? d.setsDone / d.setsPlanned : 1;
      if (pct < 0.85) out.push(`Szczerze: ${Math.round((1 - pct) * 100)}% serii zostało niezrobionych. Jeśli powodem jest czas — powiedz sobie wprost, że sesja ma ${state.profile.minutes} min, i pilnuj przerw. Jeśli siła — oceniaj uczciwie, system zdejmie ciężar.`);
      else out.push("Serie domknięte prawie w całości — to jest fundament postępu.");
      if (missedSessions) out.push(`${missedSessions === 1 ? "Jeden trening wypadł" : `Wypadło ${missedSessions} ${plural(missedSessions, "trening", "treningi", "treningów")}`}. Odrób jeden w dzień wolny, resztę puść.`);
    }
    const hard = d.ratings.filter((r) => r.r === "hard").length, easy = d.ratings.filter((r) => r.r === "easy").length;
    if (hard >= 2 && (a.sleepq === "1" || (d.sleepAvg != null && d.sleepAvg < 7))) out.push(`Treningi oceniane jako „Bardzo ciężko” (${hard}×) idą w parze ze słabym snem${d.sleepAvg != null ? ` (średnio ${fmt(d.sleepAvg)} h)` : ""}. Najpierw sen, potem ciężar.`);
    else if (hard >= 2) out.push(`${hard} × „Bardzo ciężko”. Jeszcze jedna taka ocena z rzędu i ciężar spadnie o 10% — to nie kara, tylko korekta.`);
    else if (easy >= 2 && a.mood >= "4") out.push("Jest lekko i samopoczucie dopisuje — jeśli następna ocena też będzie „Łatwo”, podniesiemy ciężar.");
    if (d.sleepAvg != null && !(hard >= 2)) out.push(d.sleepAvg < 7 ? `Sen: średnio ${fmt(d.sleepAvg)} h z ${d.sleepN} ${plural(d.sleepN, "nocy", "nocy", "nocy")}. Poniżej 7 h regeneracja zwalnia — celuj w stałą porę zasypiania.` : `Sen: średnio ${fmt(d.sleepAvg)} h — solidnie.`);
    else if (d.sleepAvg == null && a.sleepq === "1") out.push("Sen oceniasz źle, a w zakładce Nawyki nie ma wpisów — zacznij go zapisywać, to łatwiej zobaczyć, co pomaga.");
    if (d.tg && d.proteinDays != null) out.push(d.proteinDays >= 5 ? `Białko: cel osiągnięty w ${d.proteinDays} z 7 dni. Tak trzymaj.` : `Białko: cel (${d.tg.protein} g) osiągnięty w ${d.proteinDays} z 7 dni. ${state.profile.goal === "redukcja" ? "Na redukcji to ono chroni siłę." : "Dołóż jedną porcję dziennie."}`);
    if (d.waterAvg != null && d.tg) out.push(d.waterAvg < d.tg.water * 0.8 ? `Woda: średnio ${fmt(d.waterAvg / 1000)} l przy celu ${fmt(d.tg.water / 1000)} l.` : `Woda: średnio ${fmt(d.waterAvg / 1000)} l — w normie.`);
    if (d.bwChange != null) out.push(`Masa ciała: ${d.bwChange > 0 ? "+" : ""}${fmt(d.bwChange)} kg względem poprzednich pomiarów.${state.profile.goal === "redukcja" && d.bwChange > 0.3 ? " Na redukcji to sygnał, żeby przyjrzeć się porcjom." : ""}`);
    if (d.prs.length) out.push(`Rekord${d.prs.length > 1 ? "y" : ""}: ${d.prs.join(", ")}.`);
    if (a.pain === "2") out.push("Ból, który niepokoi, to sygnał stop dla ćwiczeń, które go wywołują. Zmniejsz ciężar o połowę lub pomiń ruch i skonsultuj to z fizjoterapeutą.");
    else if (a.pain === "1") out.push("Zakwasy są w porządku — rozruch i spacer pomagają bardziej niż odpoczynek na kanapie.");
    if (a.mood <= "2" && a.stress === "3") out.push("Niski nastrój i wysoki stres: w tym tygodniu wystarczy wykonać plan, nie trzeba go przekraczać.");
    if (weekIndex() === 2) out.push("Przed tobą tydzień odciążenia — zaplanowany, nie z litości.");
    return out;
  }
  function viewWeek() {
    const d = weekData();
    const last = state.reviews[state.reviews.length - 1];
    const fresh = last && last.date === todayISO();
    return shell(`
      <p class="eyebrow">${esc(shortDate(d.from))} – ${esc(shortDate(d.to))}</p>
      <h1 class="h1" style="margin:8px 0 24px">Podsumowanie tygodnia</h1>
      <div class="stack">
        <div class="stat-grid">
          <div class="card stat"><div class="v">${d.doneN}</div><div class="l">treningi zapisane</div></div>
          <div class="card stat"><div class="v">${d.setsDone}/${d.setsPlanned}</div><div class="l">serie</div></div>
          <div class="card stat"><div class="v">${d.sleepAvg != null ? fmt(d.sleepAvg) + " h" : "—"}</div><div class="l">średni sen</div></div>
          <div class="card stat"><div class="v">${d.ratings.length ? d.ratings.map((r) => ({ easy: "Ł", ok: "S", hard: "C" }[r.r])).join(" ") : "—"}</div><div class="l">oceny (Łatwo · W sam raz · Ciężko)</div></div>
        </div>
        ${fresh ? replyCard(last) : ""}
        <form class="card stack" data-form="review">
          <h2 class="h2">Jak minął tydzień?</h2>
          ${Q.map(([k, q, opts]) => `<fieldset style="border:0;padding:0;margin:0"><legend style="margin-bottom:8px">${esc(q)}</legend><div class="seg">${opts.map(([v, l]) => `<label class="option"><input type="radio" name="${k}" value="${v}" required ${fresh && last.answers[k] === v ? "checked" : ""}><span class="face">${esc(l)}</span></label>`).join("")}</div></fieldset>`).join("")}
          <div class="field"><label for="revNote">Coś jeszcze? (opcjonalnie)</label><textarea id="revNote" class="input" name="note" placeholder="Np. w czwartek bolało kolano przy wykrokach">${fresh ? esc(last.answers.note || "") : ""}</textarea></div>
          <button class="btn big">${fresh ? "Zaktualizuj odpowiedź trenera" : "Poproś o odpowiedź trenera"}</button>
          <p class="faint" style="font-size:13px">Odpowiedź opiera się wyłącznie na tym, co zapisano w ostatnich 7 dniach.</p>
        </form>
        ${state.reviews.filter((r) => r !== last || !fresh).slice(-4).reverse().map((r) => `<details class="card fog"><summary style="cursor:pointer">${esc(longDate(r.date))}</summary><div class="stack" style="margin-top:12px">${r.reply.map((p) => `<p>${esc(p)}</p>`).join("")}</div></details>`).join("")}
      </div>`);
  }
  function replyCard(r) {
    return `<section class="card peach stack" id="reply"><p class="eyebrow">Odpowiedź trenera</p>${r.reply.map((p, i) => `<p class="${i === 0 ? "quote" : ""}" style="${i === 0 ? "font-family:var(--font-display);font-size:var(--fs-3);line-height:1.35" : ""}">${esc(p)}</p>`).join("")}</section>`;
  }

  // =====================================================================
  // RENDER I ZDARZENIA
  // =====================================================================
  function render() {
    applyTheme();
    if (Cloud && !Cloud.user && !localMode()) return renderAuth(authMode || "login");
    if (!state.plan) return renderOnboarding();
    const app = $("#app");
    const key = state.active ? "w:" + state.active : state.tab;
    app.innerHTML = state.active ? viewWorkout() : { today: viewToday, cal: viewCalendar, habits: viewHabits, progress: viewProgress, week: viewWeek }[state.tab]();
    // animacja wejścia tylko przy zmianie widoku — nie przy każdym zaznaczeniu serii
    if (key === lastViewKey) app.querySelectorAll(".view").forEach((v) => v.classList.add("static"));
    lastViewKey = key;
    if (!state.active && state.tab === "progress") bindChart();
  }
  let lastViewKey = null;

  document.addEventListener("change", (ev) => {
    const t = ev.target;
    if (t.matches("[data-step-input]")) {
      const p = state.onb.profile, step = STEPS[state.onb.step];
      if (step.type === "radio") {
        p[step.key] = step.cols ? +t.value : t.value;
        if (step.key === "goal") { save(); $("#stepWrap").innerHTML = renderStep(); $(`#stepForm input[value="${t.value}"]`)?.focus(); }
      } else {
        if (t.value === "brak") { p.limits = []; state.onb.noneChosen = t.checked; }
        else { state.onb.noneChosen = false; p.limits = p.limits.filter((x) => x !== t.value); if (t.checked) p.limits.push(t.value); }
        p.limits = p.limits.filter((x) => x !== "brak");
        if (state.onb.noneChosen) p.limits = ["brak"];
        save(); $("#stepWrap").innerHTML = renderStep(); $(`#stepForm input[value="${t.value}"]`)?.focus();
      }
      save(); refreshOnb();
    }
  });
  document.addEventListener("input", (ev) => {
    const t = ev.target;
    if (t.dataset.field) { state.onb.profile[t.dataset.field] = t.value; save(); refreshOnb(); }
    if (t.dataset.max) { const v = parseFloat(t.value.replace(",", ".")); state.onb.profile.maxes[t.dataset.max] = v > 0 ? v : 0; save(); refreshOnb(); }
  });

  document.addEventListener("keydown", (ev) => {
    if (state.plan || !$("#stepForm")) {
      if (ev.key === "Escape") closeSheet();
      return;
    }
    const tag = ev.target.tagName;
    const typing = tag === "TEXTAREA" || (tag === "INPUT" && ["text", "number"].includes(ev.target.type));
    if (ev.key === "Enter" && !(tag === "TEXTAREA" && !ev.ctrlKey && !ev.metaKey) && !(ev.target.tagName === "BUTTON")) { ev.preventDefault(); onbGo(1); return; }
    if (ev.key === "Escape" || (ev.altKey && ev.key === "ArrowLeft")) { ev.preventDefault(); onbGo(-1); return; }
    if (!typing && /^[1-9]$/.test(ev.key)) {
      const inputs = [...document.querySelectorAll("#stepForm [data-step-input]")];
      const el = inputs[+ev.key - 1];
      if (el) { ev.preventDefault(); el.click(); }
    }
  });

  document.addEventListener("submit", (ev) => {
    const f = ev.target;
    ev.preventDefault();
    if (f.id === "stepForm") return onbGo(1);
    if (f.dataset.form === "auth") return authSubmit(f);
    if (f.dataset.form === "bw") {
      const v = parseFloat(f.querySelector("input").value.replace(",", "."));
      if (!(v > 20 && v < 400)) return toast("Podaj masę ciała w kilogramach.");
      const t = todayISO();
      state.bodyweight = state.bodyweight.filter((b) => b.date !== t).concat([{ date: t, kg: v }]).sort((a, b) => a.date.localeCompare(b.date));
      save(); render(); toast("Zapisane.");
    }
    if (f.dataset.form === "review") {
      const fd = new FormData(f);
      const answers = Object.fromEntries(fd.entries());
      if (Q.some(([k]) => !answers[k])) return toast("Odpowiedz na wszystkie cztery pytania.");
      const reply = coachReply(answers, weekData());
      const t = todayISO();
      state.reviews = state.reviews.filter((r) => r.date !== t).concat([{ date: t, answers, reply }]);
      save(); render();
      $("#reply")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  document.addEventListener("click", (ev) => {
    const el = ev.target.closest("[data-action]");
    if (!el) return;
    const a = el.dataset.action;
    const s = state.active ? findSession(state.active) : null;
    switch (a) {
      case "onb-next": return onbGo(1);
      case "onb-back": return onbGo(-1);
      case "theme": {
        state.theme = isDark() ? "light" : "dark"; save();
        if (Cloud && !Cloud.user && !localMode()) { applyTheme(); renderAuth(authMode || "login"); }
        else if (!state.plan) { applyTheme(); renderOnboarding(false); } else renderKeepScroll();
        return;
      }
      case "tab": state.tab = el.dataset.tab; save(); render(); window.scrollTo(0, 0); return;
      case "start": {
        const ses = findSession(el.dataset.id);
        const log = ensureLog(ses);
        if (!log.startedAt) log.startedAt = new Date().toISOString();
        if (el.dataset.makeup) log.makeup = true;
        state.active = ses.id; save(); closeSheet(); render(); window.scrollTo(0, 0); return;
      }
      case "leave": state.active = null; clearInterval(rest.timer); rest.left = 0; save(); render(); return;
      case "dismiss": ensureLog(findSession(el.dataset.id)).dismissed = true; save(); render(); toast("Odpuszczone. Patrzymy do przodu."); return;
      case "tick-list": { const log = ensureLog(s); log[el.dataset.list][+el.dataset.i] = el.checked; save(); return; }
      case "set": {
        const log = ensureLog(s);
        const i = +el.dataset.ex, j = +el.dataset.set;
        const x = log.sets[i][j];
        x.done = !x.done;
        save();
        if (x.done) {
          const allDone = log.sets[i].every((y) => y.done);
          if (!allDone) startRest(s.exercises[i].rest); else { clearInterval(rest.timer); rest.left = 0; }
        }
        renderKeepScroll();
        return;
      }
      case "weight": return weightSheet(+el.dataset.ex, +el.dataset.set);
      case "w-step": { const inp = $("#wInput"); const v = (parseFloat(inp.value) || 0) + parseFloat(el.dataset.d); inp.value = Math.max(0, Math.round(v * 100) / 100); return; }
      case "w-set": $("#wInput").value = el.dataset.v; return;
      case "w-save": {
        const log = ensureLog(s);
        const i = +el.dataset.ex, j = +el.dataset.set;
        const raw = $("#wInput").value.replace(",", ".");
        const v = raw === "" ? null : Math.max(0, parseFloat(raw));
        const all = $("#wAll").checked;
        log.sets[i].forEach((x, k) => { if (k === j || (all && k > j && !x.done)) x.w = v; });
        save(); closeSheet(); renderKeepScroll(); return;
      }
      case "skip-rest": clearInterval(rest.timer); rest.left = 0; renderKeepScroll(); return;
      case "finish": return ratingSheet();
      case "rate": return finishWorkout(el.dataset.r);
      case "close-sheet": return closeSheet();
      case "cal-open": return calSheet(el.dataset.id);
      case "habit": {
        const d = day(todayISO());
        d[el.dataset.k] = Math.max(0, d[el.dataset.k] + +el.dataset.d);
        save(); renderKeepScroll(); return;
      }
      case "sleep": {
        const d = day(todayISO());
        d.sleep = Math.max(0, Math.min(14, (d.sleep ?? 7) + (d.sleep == null ? 0 : +el.dataset.d)));
        save(); renderKeepScroll(); return;
      }
      case "new-block": {
        const best = bestSets();
        const maxes = {};
        allSessions().flatMap((x) => x.exercises).forEach((e) => { if (e.lift && best[e.name]) maxes[e.lift] = Math.max(state.profile.maxes[e.lift] || 0, F.round(best[e.name].e1, 2.5)); });
        state.archive = (state.archive || []).concat([state.plan]);
        newBlock(maxes); save(); render(); toast("Nowy blok gotowy."); return;
      }
      case "export": {
        if (!window.FormaExport) return toast("Eksport niedostępny.");
        el.disabled = true;
        window.FormaExport.download(state, { suggestWeight, todayISO }).then(() => toast("Program pobrany."))
          .catch((e) => { if (e?.code === "declined") return toast("Pobieranie anulowane."); console.error(e); toast("Nie udało się zapisać pliku. Spróbuj ponownie."); })
          .finally(() => { el.disabled = false; });
        return;
      }
      case "reset":
        // potwierdzenie w arkuszu — systemowe confirm() bywa zablokowane
        return openSheet(`<h2 class="h2" style="text-align:center">Zacząć od nowa?</h2>
          <p class="muted" style="text-align:center;margin:8px 0 24px">Plan i wszystkie zapisy z tej przeglądarki zostaną usunięte.</p>
          <div class="rating"><button class="btn" data-action="reset-confirm">Usuń i zacznij od nowa</button><button class="btn ghost" data-action="close-sheet">Anuluj</button></div>`);
      case "reset-confirm": {
        const theme = state.theme, owner = state.owner; state = blank(); state.theme = theme; state.owner = owner; save(); closeSheet(); render(); return;
      }
      case "auth-mode": authMsg = ""; closeSheet(); return renderAuth(el.dataset.mode);
      case "local-mode": setLocalMode(true); authMode = null; render(); window.scrollTo(0, 0); return;
      case "logout": return logout();
    }
  });

  // =====================================================================
  // KONTO I SYNCHRONIZACJA
  // =====================================================================
  let authMode = null, authMsg = "", recovering = false;
  const AUTH = {
    login: ["Witaj z powrotem.", "Zaloguj się, a plan, treningi i postępy będą na każdym twoim urządzeniu.", "Zaloguj się"],
    signup: ["Załóż konto.", "Plan i zapisy będą bezpieczne w chmurze — na telefonie i na komputerze.", "Załóż konto"],
    reset: ["Nowe hasło.", "Podaj e-mail konta. Wyślemy link do ustawienia nowego hasła.", "Wyślij link"],
    newpass: ["Ustaw nowe hasło.", "Co najmniej 6 znaków.", "Zapisz hasło"],
    check: ["Sprawdź skrzynkę.", "", "Wróć do logowania"],
  };
  function renderAuth(mode) {
    authMode = mode;
    const [title, hint, cta] = AUTH[mode];
    const email = mode !== "newpass" && mode !== "check";
    const pass = mode === "login" || mode === "signup" || mode === "newpass";
    const links = {
      login: `<button type="button" class="linkish" data-action="auth-mode" data-mode="reset">Nie pamiętam hasła</button><button type="button" class="linkish" data-action="auth-mode" data-mode="signup">Nie masz konta? <strong>Załóż je</strong></button>`,
      signup: `<button type="button" class="linkish" data-action="auth-mode" data-mode="login">Masz już konto? <strong>Zaloguj się</strong></button>`,
      reset: `<button type="button" class="linkish" data-action="auth-mode" data-mode="login">Wróć do logowania</button>`,
      newpass: "", check: "",
    }[mode];
    $("#app").innerHTML = `
      <div class="auth"><main class="auth-main view">
        <div class="spread"><div class="wordmark">Forma<i>.</i></div>${themeButton()}</div>
        <h1 class="question" style="margin-top:48px">${esc(title)}</h1>
        <p class="hint">${esc(mode === "check" ? authMsg : hint)}</p>
        ${mode === "check" ? `<button class="btn big" data-action="auth-mode" data-mode="login">${cta}</button>` : `
        <form id="authForm" data-form="auth" class="stack" novalidate>
          ${email ? `<div class="field"><label for="authEmail">E-mail</label><input id="authEmail" class="input" type="email" autocomplete="email" inputmode="email" required></div>` : ""}
          ${pass ? `<div class="field"><label for="authPass">Hasło${mode !== "login" ? " (min. 6 znaków)" : ""}</label><input id="authPass" class="input" type="password" minlength="6" autocomplete="${mode === "login" ? "current-password" : "new-password"}" required></div>` : ""}
          <p class="auth-error" id="authErr" role="alert" ${authMsg ? "" : "hidden"}>${esc(authMsg)}</p>
          <button class="btn big" id="authSubmit">${cta}</button>
        </form>
        <div class="auth-links">${links}</div>`}
        ${mode !== "newpass" ? `<hr class="divider">
        <div class="stack"><button class="btn ghost" data-action="local-mode" style="width:100%">Używaj bez konta</button>
        <p class="faint" style="font-size:13px;text-align:center">Bez konta dane zostają tylko w tej przeglądarce.</p></div>` : ""}
      </main></div>`;
    authMsg = "";
    const first = $("#authEmail") || $("#authPass");
    first && first.focus({ preventScroll: true });
  }
  async function authSubmit(f) {
    const btn = $("#authSubmit"), err = $("#authErr");
    const email = $("#authEmail")?.value.trim();
    const pass = $("#authPass")?.value || "";
    const fail = (m) => { err.textContent = m; err.hidden = false; btn.disabled = false; btn.textContent = AUTH[authMode][2]; };
    if ($("#authEmail") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Wpisz poprawny adres e-mail.");
    if ($("#authPass") && authMode !== "login" && pass.length < 6) return fail("Hasło musi mieć co najmniej 6 znaków.");
    if ($("#authPass") && !pass) return fail("Wpisz hasło.");
    btn.disabled = true; btn.textContent = "Chwila…"; err.hidden = true;
    try {
      if (authMode === "login") { const u = await Cloud.signIn(email, pass); await adoptUser(u); }
      else if (authMode === "signup") {
        const r = await Cloud.signUp(email, pass);
        if (r.needsConfirm) { authMsg = `Wysłaliśmy link potwierdzający na ${email}. Kliknij go, a Forma otworzy się z aktywnym kontem.`; return renderAuth("check"); }
        await adoptUser(r.user);
      } else if (authMode === "reset") {
        await Cloud.resetPassword(email);
        authMsg = `Jeśli konto z adresem ${email} istnieje, wysłaliśmy na nie link do zmiany hasła.`;
        renderAuth("check");
      } else if (authMode === "newpass") {
        await Cloud.updatePassword(pass);
        recovering = false;
        toast("Hasło zmienione.");
        await adoptUser(Cloud.user);
      }
    } catch (e) { fail(e.message || "Coś poszło nie tak. Spróbuj ponownie."); }
  }
  // Po zalogowaniu: wybierz nowszą wersję danych (chmura vs to urządzenie)
  async function adoptUser(u) {
    if (!u) return render();
    let remote = null;
    try { remote = await Cloud.load(); } catch (e) { toast(e.message); }
    const r = remote && remote.data;
    const theme = state.theme;
    const localIsMine = state.owner === u.id;
    let push = false;
    if (r && !(localIsMine && (state.savedAt || 0) > (r.savedAt || 0))) state = Object.assign(blank(), r);
    else if (r) push = true; // to urządzenie ma nowsze zapisy tego konta
    else if (state.owner && !localIsMine) state = blank(); // dane innej osoby na tym urządzeniu
    else push = !!(state.plan || state.onb.step); // pierwsze logowanie: zabierz dotychczasowe zapisy
    if (!r) state.theme = theme;
    state.owner = u.id;
    setLocalMode(false);
    authMode = null;
    saveLocal();
    if (push) Cloud.queueSave(state);
    render();
    window.scrollTo(0, 0);
  }
  async function logout() {
    await Cloud.signOut();
    try { localStorage.removeItem(KEY); } catch (e) { /* brak */ }
    const theme = state.theme;
    state = blank(); state.theme = theme;
    renderAuth("login");
    toast("Wylogowano. Dane z tego urządzenia usunięte, w chmurze zostają.");
  }
  function accountLine() {
    if (!Cloud) return "<span>Dane zapisują się tylko w tej przeglądarce.</span>";
    if (!Cloud.user) return `<span>Dane tylko na tym urządzeniu.</span><button data-action="auth-mode" data-mode="signup">Załóż konto, by mieć je wszędzie</button>`;
    const st = { saving: "zapisuję…", saved: "zapisane w chmurze", offline: "brak sieci — zapiszę później", idle: "zsynchronizowane" }[Cloud.status];
    return `<span>${esc(Cloud.user.email || "Konto")} · <span id="syncState">${st}</span></span><button data-action="logout">Wyloguj</button>`;
  }
  async function boot() {
    applyTheme();
    if (!Cloud) return render();
    $("#app").innerHTML = '<div class="view empty-state" style="padding-top:30vh"><div class="wordmark">Forma<i>.</i></div></div>';
    let offlineWarned = false;
    Cloud.onStatus((st) => {
      const el = $("#syncState");
      if (el) el.textContent = { saving: "zapisuję…", saved: "zapisane w chmurze", offline: "brak sieci — zapiszę później", idle: "zsynchronizowane" }[st];
      if (st === "offline" && !offlineWarned) { offlineWarned = true; toast("Brak połączenia. Zapiszę w chmurze, gdy wróci internet."); }
      if (st === "saved") offlineWarned = false;
    });
    const u = await Cloud.init((event) => {
      if (event === "PASSWORD_RECOVERY") { recovering = true; renderAuth("newpass"); }
    });
    if (recovering) return renderAuth("newpass");
    if (u) return adoptUser(u);
    render();
  }
  // powrót do karty: pobierz nowsze zapisy z innego urządzenia
  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState !== "visible" || !Cloud || !Cloud.user || state.active || $("#sheetWrap")) return;
    try {
      const remote = await Cloud.load();
      if (remote && remote.data && (remote.data.savedAt || 0) > (state.savedAt || 0)) { state = Object.assign(blank(), remote.data); saveLocal(); renderKeepScroll(); }
    } catch (e) { /* offline — zostają dane lokalne */ }
  });

  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => { if (state.theme === "auto") render(); });
  boot();
  window.__forma = { get state() { return state; } };
})();
