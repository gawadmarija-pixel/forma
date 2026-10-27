/* Forma — silnik planu: biblioteka ćwiczeń, progresja, Epley, dopasowanie do czasu */
(function () {
  "use strict";

  const ALL = ["gym", "home", "db", "kb", "bw"];

  const GOALS = {
    sila: { label: "Siła", short: "siła" },
    masa: { label: "Budowanie mięśni", short: "budowanie mięśni" },
    redukcja: { label: "Odchudzanie z zachowaniem siły", short: "redukcja z zachowaniem siły" },
    powrot: { label: "Powrót do formy po przerwie", short: "powrót do formy" },
    wydarzenie: { label: "Przygotowanie do wydarzenia", short: "przygotowanie do wydarzenia" },
    inny: { label: "Inny cel", short: "własny cel" },
  };
  const LEVELS = { pocz: "Początkujący", sredni: "Średnio zaawansowany", zaaw: "Zaawansowany" };
  const EQUIPMENT = {
    gym: "W pełni wyposażona siłownia",
    home: "Domowa siłownia",
    db: "Tylko hantle",
    kb: "Tylko kettlebelle",
    bw: "Tylko masa własnego ciała",
  };
  const LIMITS = {
    kolano: "Kolano",
    plecy: "Dolny odcinek pleców",
    bark: "Bark",
    nadgarstek: "Łokieć lub nadgarstek",
    biodro: "Biodro",
    kark: "Kark / odcinek szyjny",
    cisnienie: "Nadciśnienie",
  };
  const LIFTS = { squat: "Przysiad", bench: "Wyciskanie na ławce", deadlift: "Martwy ciąg", ohp: "Wyciskanie stojąc" };

  // Biblioteka: wzorzec ruchu → kandydaci w kolejności preferencji
  const E = (n, eq, avoid, extra) => Object.assign({ n, eq, avoid: avoid || [] }, extra || {});
  const LIB = {
    squat: [
      E("Przysiad ze sztangą", ["gym", "home"], ["kolano", "plecy", "kark"], { lift: "squat", load: "bar" }),
      E("Przysiad do skrzyni ze sztangą", ["gym", "home"], ["plecy", "kark"], { load: "bar", ref: "squat", ratio: 0.9 }),
      E("Prasa nożna", ["gym"], ["kolano"], { load: "mach" }),
      E("Przysiad goblet z hantlą", ["gym", "home", "db"], ["kolano"], { load: "db" }),
      E("Przysiad goblet do skrzyni", ["gym", "home", "db"], [], { load: "db" }),
      E("Przysiad goblet z kettlebellem", ["kb"], ["kolano"], { load: "kb" }),
      E("Przysiad goblet z kettlebellem do skrzyni", ["kb"], [], { load: "kb" }),
      E("Przysiad z pauzą", ["bw"], ["kolano"], { load: "bw" }),
      E("Przysiad do krzesła", ["bw"], [], { load: "bw" }),
    ],
    hinge: [
      E("Martwy ciąg", ["gym", "home"], ["plecy"], { lift: "deadlift", load: "bar" }),
      E("Hip thrust ze sztangą", ["gym", "home"], ["biodro"], { load: "bar" }),
      E("Rumuński martwy ciąg z hantlami", ["db"], ["plecy"], { load: "db" }),
      E("Hip thrust z hantlą", ["db"], ["biodro"], { load: "db" }),
      E("Martwy ciąg z kettlebellem", ["kb"], ["plecy"], { load: "kb" }),
      E("Hip thrust z kettlebellem", ["kb"], ["biodro"], { load: "kb" }),
      E("Most biodrowy jednonóż", ["bw"], ["biodro"], { load: "bw" }),
      E("Most biodrowy", ALL, [], { load: "bw" }),
    ],
    hpush: [
      E("Wyciskanie sztangi na ławce", ["gym", "home"], ["bark"], { lift: "bench", load: "bar" }),
      E("Wyciskanie hantli na ławce", ["gym", "home", "db"], ["bark"], { load: "db" }),
      E("Wyciskanie hantli chwytem neutralnym", ["gym", "home", "db"], [], { load: "db" }),
      E("Wyciskanie kettlebelli z podłogi", ["kb"], [], { load: "kb" }),
      E("Pompki", ["bw"], ["nadgarstek", "bark"], { load: "bw" }),
      E("Pompki na podwyższeniu (na uchwytach)", ["bw"], [], { load: "bw" }),
    ],
    vpush: [
      E("Wyciskanie żołnierskie", ["gym", "home"], ["bark", "plecy", "kark"], { lift: "ohp", load: "bar" }),
      E("Wyciskanie hantli nad głowę siedząc", ["gym", "home", "db"], ["bark"], { load: "db" }),
      E("Wyciskanie kettlebella jednorącz", ["kb"], ["bark"], { load: "kb" }),
      E("Pompki w pozycji pike", ["bw"], ["bark", "nadgarstek"], { load: "bw" }),
      E("Wyciskanie landmine", ["gym", "home"], [], { load: "bar" }),
      E("Wyciskanie hantli na skosie", ["db"], [], { load: "db" }),
      E("Wyciskanie kettlebella jednorącz z podłogi", ["kb"], [], { load: "kb" }),
      E("Pompki na podwyższeniu", ["bw"], [], { load: "bw" }),
    ],
    hpull: [
      E("Wiosłowanie sztangą w opadzie", ["gym", "home"], ["plecy"], { load: "bar" }),
      E("Wiosłowanie na wyciągu siedząc", ["gym"], [], { load: "mach" }),
      E("Wiosłowanie hantlem z podparciem", ["gym", "home", "db"], [], { load: "db" }),
      E("Wiosłowanie kettlebellem z podparciem", ["kb"], [], { load: "kb" }),
      E("Wiosłowanie australijskie (pod stołem)", ["bw"], [], { load: "bw" }),
    ],
    vpull: [
      E("Podciąganie na drążku", ["gym", "home"], ["bark", "nadgarstek"], { load: "bw" }),
      E("Ściąganie drążka wyciągu do klatki", ["gym"], [], { load: "mach" }),
      E("Pullover z hantlą", ["db"], ["bark"], { load: "db" }),
      E("Wiosłowanie oburącz kettlebellami", ["kb"], ["plecy"], { load: "kb" }),
      E("Podciąganie (lub negatywy)", ["bw"], ["bark", "nadgarstek"], { load: "bw" }),
      E("Odwrotne rozpiętki w opadzie", ["home", "db"], [], { load: "db" }),
      E("Wiosłowanie kettlebellem szerokim łokciem", ["kb"], [], { load: "kb" }),
      E("Wiosłowanie z ręcznikiem na drzwiach", ["bw"], [], { load: "bw" }),
    ],
    single: [
      E("Przysiad bułgarski z hantlami", ["gym", "home", "db"], ["kolano"], { load: "db" }),
      E("Wykroki w tył z kettlebellem", ["kb"], ["kolano"], { load: "kb" }),
      E("Przysiad bułgarski", ["bw"], ["kolano"], { load: "bw" }),
      E("Wejścia na niski stopień", ALL, [], { load: "db" }),
    ],
    hamstring: [
      E("Uginanie nóg na maszynie", ["gym"], [], { load: "mach" }),
      E("Martwy ciąg jednonóż z hantlą", ["home", "db"], ["plecy"], { load: "db" }),
      E("Swing kettlebellem", ["kb"], ["plecy"], { load: "kb" }),
      E("Uginanie nóg na ręczniku (ślizg)", ["home", "db", "kb", "bw"], ["kolano"], { load: "bw" }),
      E("Most biodrowy na piętach", ALL, [], { load: "bw" }),
    ],
    biceps: [
      E("Uginanie ramion ze sztangą łamaną", ["gym", "home"], ["nadgarstek"], { load: "bar" }),
      E("Uginanie ramion z hantlami (młotkowe)", ["gym", "home", "db"], [], { load: "db" }),
      E("Uginanie ramion z kettlebellem", ["kb"], [], { load: "kb" }),
      E("Uginanie ramion z plecakiem", ["bw"], [], { load: "bw" }),
    ],
    triceps: [
      E("Prostowanie ramion na wyciągu", ["gym"], [], { load: "mach" }),
      E("Wyciskanie francuskie hantlą", ["home", "db"], ["nadgarstek"], { load: "db" }),
      E("Prostowanie ramion w opadzie z hantlą", ["home", "db"], [], { load: "db" }),
      E("Prostowanie ramion z kettlebellem nad głową", ["kb"], ["bark", "nadgarstek"], { load: "kb" }),
      E("Wąskie wyciskanie kettlebella z podłogi", ["kb"], [], { load: "kb" }),
      E("Pompki w wąskim ustawieniu", ["bw"], ["nadgarstek"], { load: "bw" }),
      E("Wąskie pompki na podwyższeniu", ["bw"], [], { load: "bw" }),
    ],
    lateral: [
      E("Unoszenie hantli bokiem", ["gym", "home", "db"], ["bark"], { load: "db" }),
      E("Face pull na wyciągu", ["gym"], [], { load: "mach" }),
      E("Odwrotne rozpiętki z hantlami", ["home", "db"], [], { load: "db" }),
      E("Halo z kettlebellem", ["kb"], ["bark"], { load: "kb" }),
      E("Y-T-W leżąc na brzuchu", ALL, [], { load: "bw" }),
    ],
    core: [
      E("Martwy robak (dead bug)", ALL, [], { load: "bw", reps: "8/str." }),
      E("Pallof press na wyciągu", ["gym"], [], { load: "mach" }),
      E("Deska (plank)", ALL, [], { load: "bw", time: true }),
      E("Bird dog", ALL, [], { load: "bw" }),
    ],
    calves: [E("Wspięcia na palce", ALL, [], { load: "db" })],
    carry: [
      E("Spacer farmera", ["gym", "home", "db", "kb"], [], { load: "db", time: true }),
      E("Marsz z plecakiem / szybkie wejścia na stopień", ["bw"], [], { load: "bw", time: true }),
    ],
    cond: [
      E("Swing kettlebellem (interwały)", ["kb", "gym", "home"], ["plecy"], { load: "kb" }),
      E("Rower / wioślarz — interwały 30/30", ["gym"], [], { load: "bw", time: true }),
      E("Pajacyki / skip A — interwały 30/30", ["db", "bw", "home", "kb"], ["kolano"], { load: "bw", time: true }),
      E("Marsz szybkim tempem pod górę / na stopień", ALL, [], { load: "bw", time: true }),
    ],
  };

  // Szablony sesji: [wzorzec, rola] — M: główne, S: drugorzędne, A: pomocnicze
  const T = {
    fbA2: { name: "Całe ciało A", parts: [["squat", "M"], ["hpush", "M"], ["hpull", "S"], ["hamstring", "A"], ["lateral", "A"], ["core", "A"]] },
    fbB2: { name: "Całe ciało B", parts: [["hinge", "M"], ["vpush", "M"], ["vpull", "S"], ["single", "A"], ["biceps", "A"], ["triceps", "A"]] },
    fbA: { name: "Całe ciało A", parts: [["squat", "M"], ["hpush", "S"], ["hpull", "S"], ["lateral", "A"], ["biceps", "A"], ["core", "A"]] },
    fbB: { name: "Całe ciało B", parts: [["hinge", "M"], ["vpush", "S"], ["vpull", "S"], ["single", "A"], ["triceps", "A"], ["core", "A"]] },
    fbC: { name: "Całe ciało C", parts: [["hpush", "M"], ["squat", "S"], ["hpull", "S"], ["hamstring", "A"], ["lateral", "A"], ["core", "A"]] },
    upA: { name: "Góra A", parts: [["hpush", "M"], ["hpull", "S"], ["vpush", "S"], ["vpull", "A"], ["lateral", "A"], ["triceps", "A"], ["biceps", "A"]] },
    loA: { name: "Dół A", parts: [["squat", "M"], ["hamstring", "S"], ["single", "A"], ["calves", "A"], ["core", "A"]] },
    upB: { name: "Góra B", parts: [["vpush", "M"], ["vpull", "S"], ["hpush", "S"], ["hpull", "A"], ["lateral", "A"], ["biceps", "A"], ["triceps", "A"]] },
    loB: { name: "Dół B", parts: [["hinge", "M"], ["squat", "S"], ["single", "A"], ["hamstring", "A"], ["core", "A"]] },
    push: { name: "Pchanie", parts: [["hpush", "M"], ["vpush", "S"], ["lateral", "A"], ["triceps", "A"], ["core", "A"]] },
    pull: { name: "Ciąganie", parts: [["hinge", "M"], ["vpull", "S"], ["hpull", "S"], ["biceps", "A"], ["lateral", "A"]] },
    legs: { name: "Nogi", parts: [["squat", "M"], ["single", "S"], ["hamstring", "A"], ["calves", "A"], ["core", "A"]] },
    pushB: { name: "Pchanie B", parts: [["vpush", "M"], ["hpush", "S"], ["lateral", "A"], ["triceps", "A"], ["core", "A"]] },
    pullB: { name: "Ciąganie B", parts: [["hpull", "M"], ["vpull", "S"], ["biceps", "A"], ["lateral", "A"], ["core", "A"]] },
    legsB: { name: "Nogi B", parts: [["single", "M"], ["hinge", "S"], ["hamstring", "A"], ["calves", "A"], ["core", "A"]] },
  };
  const SPLITS = {
    2: { name: "Całe ciało ×2", days: [0, 3], t: ["fbA2", "fbB2"] },
    3: { name: "Całe ciało A / B / C", days: [0, 2, 4], t: ["fbA", "fbB", "fbC"] },
    4: { name: "Góra / Dół ×2", days: [0, 1, 3, 4], t: ["upA", "loA", "upB", "loB"] },
    5: { name: "Góra / Dół + Pchanie / Ciąganie / Nogi", days: [0, 1, 2, 4, 5], t: ["upA", "loA", "push", "pull", "legs"] },
    6: { name: "Pchanie / Ciąganie / Nogi ×2", days: [0, 1, 2, 3, 4, 5], t: ["push", "pull", "legs", "pushB", "pullB", "legsB"] },
  };

  // Schematy progresji: [serie, powtórzenia, RPE] dla tygodni 1–3
  const SCHEMES = {
    sila: { M: [[4, 5, 7], [4, 4, 8], [5, 3, 8.5]], S: [[3, 6, 7], [3, 6, 7.5], [4, 5, 8]], A: [[2, 10, 7], [3, 10, 7.5], [3, 10, 8]] },
    masa: { M: [[3, 8, 7], [4, 8, 7.5], [4, 8, 8.5]], S: [[3, 10, 7], [3, 12, 7.5], [4, 10, 8.5]], A: [[2, 12, 7], [3, 12, 8], [3, 15, 8.5]] },
    redukcja: { M: [[3, 5, 7], [3, 5, 7.5], [4, 5, 8]], S: [[3, 8, 7], [3, 8, 7.5], [3, 10, 8]], A: [[2, 12, 7], [3, 12, 7.5], [3, 12, 8]] },
    powrot: { M: [[2, 8, 6], [3, 8, 6.5], [3, 8, 7]], S: [[2, 10, 6], [3, 10, 6.5], [3, 10, 7]], A: [[2, 12, 6], [2, 12, 6.5], [3, 12, 7]] },
    wydarzenie: { M: [[3, 6, 7], [4, 6, 7.5], [4, 5, 8]], S: [[3, 10, 7], [3, 12, 7.5], [3, 12, 8]], A: [[2, 12, 7], [3, 12, 7.5], [3, 15, 8]] },
    inny: { M: [[3, 6, 7], [4, 6, 7.5], [4, 5, 8]], S: [[3, 10, 7], [3, 10, 7.5], [3, 12, 8]], A: [[2, 12, 7], [3, 12, 7.5], [3, 12, 8]] },
  };
  const REST = { M: 150, S: 105, A: 60 };
  const WARMUP_MIN = 8, COOLDOWN_MIN = 6;

  function scheme(profile, role, week) {
    const goal = profile.goal || "inny";
    let [sets, reps, rpe] = SCHEMES[goal][role][week];
    if (profile.level === "pocz") rpe = Math.min(rpe - 0.5, 8);
    if (profile.level === "zaaw" && week > 0) rpe = Math.min(rpe + 0.5, 9);
    if ((profile.limits || []).includes("cisnienie")) rpe = Math.min(rpe, 8);
    return { sets, reps, rpe };
  }

  // Tydzień 4: 50–60% objętości tygodnia 3 (serie × powtórzenia)
  function deloadOf(w3) {
    const vol = w3.sets * w3.reps;
    let best = null;
    for (let s = 1; s <= w3.sets; s++) {
      for (let r = Math.ceil(w3.reps / 2); r <= w3.reps + 2; r++) {
        const ratio = (s * r) / vol;
        const inRange = ratio >= 0.5 && ratio <= 0.6;
        // preferuj te same powtórzenia i mniej serii
        const score = (inRange ? 0 : 10) + Math.abs(ratio - 0.55) + Math.abs(w3.reps - r) * 0.05;
        if (!best || score < best.score) best = { sets: s, reps: r, score };
      }
    }
    return { sets: best.sets, reps: best.reps, rpe: 6 };
  }

  function pick(pattern, eq, limits, used) {
    const cands = LIB[pattern].filter((e) => e.eq.includes(eq));
    const ok = cands.filter((e) => !e.avoid.some((a) => limits.includes(a)) && !used.has(e.n));
    const choice = ok[0] || cands.find((e) => !used.has(e.n)) || cands[0];
    const preferred = cands[0];
    return { ex: choice, swapped: preferred && choice && preferred.n !== choice.n && preferred.avoid.some((a) => limits.includes(a)) ? preferred.n : null };
  }

  const round = (x, step) => Math.round(x / step) * step;
  // Epley: 1RM = w × (1 + r/30) → w = 1RM / (1 + (r + RIR)/30), RIR = 10 − RPE
  function epleyWeight(oneRm, reps, rpe) {
    const rir = Math.max(0, 10 - rpe);
    return round(oneRm / (1 + (reps + rir) / 30), 2.5);
  }
  function epley1RM(w, reps) { return reps <= 1 ? w : w * (1 + reps / 30); }

  function exMinutes(ex) {
    const work = ex.time ? 0.75 : 0.6;
    return ex.sets * (work + ex.rest / 60) + 1;
  }

  function buildTemplate(tKey, profile) {
    const eq = profile.equipment || "gym";
    const limits = profile.limits || [];
    const used = new Set();
    const items = [];
    const swaps = [];
    const parts = T[tKey].parts.slice();
    if (profile.goal === "wydarzenie") parts.push(["carry", "A"]);
    if (profile.goal === "redukcja") parts.push(["cond", "A"]);
    for (const [pattern, role] of parts) {
      const { ex, swapped } = pick(pattern, eq, limits, used);
      if (!ex) continue;
      used.add(ex.n);
      if (swapped) swaps.push({ from: swapped, to: ex.n });
      items.push({ pattern, role, name: ex.n, lift: ex.lift || null, ref: ex.ref || ex.lift || null, ratio: ex.ratio || 1, load: ex.load, time: !!ex.time, repsLabel: ex.reps || null });
    }
    return { name: T[tKey].name, items, swaps };
  }

  // Dopasowanie do czasu — liczone na najcięższym tygodniu (3). Rozgrzewka i wyciszenie zostają.
  function fitToTime(tpl, profile) {
    const budget = (profile.minutes || 60) - WARMUP_MIN - COOLDOWN_MIN;
    const lim = { rest: REST, cap: 99 };
    const est = (items) => items.reduce((sum, it) => {
      const s = scheme(profile, it.role, 2);
      return sum + exMinutes({ sets: Math.min(s.sets, lim.cap), rest: lim.rest[it.role], time: it.time });
    }, 0);
    let items = tpl.items.slice();
    const dropped = [];
    // 1) najpierw ćwiczenia pomocnicze, 2) potem drugorzędne (zostają min. 2 kluczowe)
    while (est(items) > budget) {
      let idx = -1;
      for (let i = items.length - 1; i >= 0; i--) if (items[i].role === "A") { idx = i; break; }
      if (idx < 0) for (let i = items.length - 1; i >= 0; i--) if (items[i].role === "S" && items.filter((x) => x.role !== "A").length > 2) { idx = i; break; }
      if (idx < 0) break;
      dropped.push(items[idx].name);
      items.splice(idx, 1);
    }
    // 3) krótsze przerwy, 4) limit serii — rozgrzewka i wyciszenie nietknięte
    if (est(items) > budget) lim.rest = { M: 120, S: 75, A: 60 };
    if (est(items) > budget) lim.cap = 4;
    if (est(items) > budget) lim.cap = 3;
    return { items, dropped, rest: lim.rest, cap: lim.cap, mainMinutes: Math.round(est(items)) };
  }

  function addDays(iso, n) {
    const d = new Date(iso + "T12:00:00");
    d.setDate(d.getDate() + n);
    return toISO(d);
  }
  function toISO(d) {
    const z = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
  }

  function warmup(profile) {
    const L = profile.limits || [];
    const list = [
      "5 min lekkiego cardio — rower, skakanka lub szybki marsz",
      "Mobilizacja: krążenia bioder, kot–krowa, otwieranie klatki — 2 min",
      "2–3 serie rozgrzewkowe pierwszego ćwiczenia z rosnącym ciężarem",
    ];
    if (L.includes("kolano")) list.push("Kolano: mostek biodrowy i chód bokiem z gumą, 2 × 10");
    if (L.includes("bark")) list.push("Bark: rotacje zewnętrzne z gumą, 2 × 15");
    if (L.includes("plecy")) list.push("Plecy: bird dog, 2 × 6 na stronę");
    if (L.includes("biodro")) list.push("Biodro: rozciąganie zginaczy bioder, 2 × 30 s");
    if (L.includes("nadgarstek")) list.push("Nadgarstki i łokcie: krążenia, 1 min");
    if (L.includes("kark")) list.push("Kark: spokojne skłony i rotacje głowy, 1 min");
    if (L.includes("cisnienie")) list.push("Spokojny start: tętno podnoś stopniowo");
    return list;
  }
  function cooldown(profile) {
    const list = [
      "3 min spokojnego marszu — wydech dłuższy niż wdech",
      "Rozciąganie trenowanych mięśni: 3 pozycje po 30 s",
    ];
    if ((profile.limits || []).includes("cisnienie")) list.push("Wstawaj z podłogi powoli");
    return list;
  }

  function generatePlan(profile, startISO, factor) {
    const days = Math.min(6, Math.max(2, profile.days || 3));
    const split = SPLITS[days];
    const maxes = profile.maxes || {};
    const f = factor || 1;
    const templates = split.t.map((k) => {
      const tpl = buildTemplate(k, profile);
      const fit = fitToTime(tpl, profile);
      return { key: k, name: tpl.name, items: fit.items, dropped: fit.dropped, swaps: tpl.swaps, rest: fit.rest, cap: fit.cap };
    });
    const weeks = [];
    for (let w = 0; w < 4; w++) {
      const sessions = templates.map((tpl, i) => {
        const exercises = tpl.items.map((it, j) => {
          // Masa ciała: minimum 8 powtórzeń, zanim policzymy odciążenie
          const adj = (x) => Object.assign({}, x, {
            sets: Math.min(x.sets, tpl.cap),
            reps: profile.equipment === "bw" && it.load === "bw" && !it.time ? Math.max(x.reps, 8) : x.reps,
          });
          const s = w < 3 ? adj(scheme(profile, it.role, w)) : deloadOf(adj(scheme(profile, it.role, 2)));
          const reps = s.reps;
          let weight = null;
          if (it.ref && maxes[it.ref] > 0) {
            const orm = maxes[it.ref] * it.ratio;
            weight = epleyWeight(orm * f, reps, s.rpe);
            // odciążenie: ok. 90% ciężaru z tygodnia 3
            if (w === 3) { const w3 = scheme(profile, it.role, 2); weight = Math.min(weight, round(epleyWeight(orm * f, w3.reps, w3.rpe) * 0.9, 2.5)); }
          }
          return {
            id: `${w}-${i}-${j}`, name: it.name, role: it.role, pattern: it.pattern, lift: it.lift, load: it.load,
            sets: s.sets, reps, repsLabel: it.time ? (profile.goal === "redukcja" && it.pattern === "cond" ? "8 × 30 s" : "40 s") : (it.repsLabel || String(reps)),
            rpe: s.rpe, rest: tpl.rest[it.role], weight, time: it.time,
          };
        });
        const minutes = WARMUP_MIN + COOLDOWN_MIN + Math.round(exercises.reduce((a, e) => a + exMinutes(e), 0));
        return {
          id: `w${w + 1}s${i + 1}`, week: w, index: i, date: addDays(startISO, w * 7 + split.days[i]),
          title: tpl.name, deload: w === 3, exercises, minutes,
          warmup: warmup(profile), cooldown: cooldown(profile), dropped: tpl.dropped,
        };
      });
      weeks.push({ week: w, deload: w === 3, sessions });
    }
    // Kontrola objętości odciążenia
    const vol = (ss) => ss.reduce((a, s) => a + s.exercises.reduce((b, e) => b + e.sets * e.reps, 0), 0);
    const deloadRatio = vol(weeks[3].sessions) / vol(weeks[2].sessions);
    const swaps = [];
    templates.forEach((t) => t.swaps.forEach((s) => { if (!swaps.find((x) => x.from === s.from)) swaps.push(s); }));
    const dropped = [...new Set(templates.flatMap((t) => t.dropped))];
    return {
      createdAt: new Date().toISOString(), start: startISO, end: addDays(startISO, 27), split: split.name,
      weekdays: split.days, weeks, deloadRatio, swaps, dropped, factorAtCreation: f,
    };
  }

  function plural(n, one, few, many) {
    const n10 = n % 10, n100 = n % 100;
    if (n === 1) return one;
    if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return few;
    return many;
  }
  const fmtNum = (x, d = 1) => Number(x).toLocaleString("pl-PL", { maximumFractionDigits: d });

  window.FormaEngine = {
    GOALS, LEVELS, EQUIPMENT, LIMITS, LIFTS, SPLITS, SCHEMES, WARMUP_MIN, COOLDOWN_MIN,
    generatePlan, scheme, deloadOf, epleyWeight, epley1RM, addDays, toISO, plural, fmtNum, round,
  };
})();
