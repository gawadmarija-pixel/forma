/* Forma — eksport bloku do .docx */
(function () {
  "use strict";
  const F = window.FormaEngine;
  const INK = "17191C", MUTED = "4C4C4C", STEEL = "777B86", TERRA = "5D2A1A", PEACH = "FBE1D1", LINE = "E2E2E6";
  const SERIF = "Georgia", SANS = "Calibri";
  const CONTENT_W = 11906 - 2 * 1200; // A4, marginesy 1200 twip

  function build(state, helpers) {
    const D = window.docx;
    const { Document, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, ShadingType, PageBreak, Footer, PageNumber, TableLayoutType, VerticalAlign } = D;
    const p = state.profile, plan = state.plan;
    const fmt = F.fmtNum;
    const dObj = (iso) => new Date(iso + "T12:00:00");
    const longDate = (iso) => { const s = dObj(iso).toLocaleDateString("pl-PL", { weekday: "long", day: "numeric", month: "long" }); return s.charAt(0).toUpperCase() + s.slice(1); };
    const fullDate = (iso) => dObj(iso).toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });

    const t = (text, o = {}) => new TextRun(Object.assign({ text, font: SANS, size: 21, color: INK }, o));
    const para = (runs, o = {}) => new Paragraph(Object.assign({ children: Array.isArray(runs) ? runs : [runs], spacing: { after: 120, line: 300 } }, o));
    const serif = (text, size, o = {}) => para([t(text, { font: SERIF, size, color: o.color || INK })], Object.assign({ spacing: { after: o.after ?? 160, before: o.before ?? 0 }, keepNext: true }, o.p || {}));
    const eyebrow = (text, o = {}) => para([t(text.toUpperCase(), { size: 16, color: STEEL, characterSpacing: 40 })], Object.assign({ spacing: { after: 80 }, keepNext: true }, o));
    const bullet = (text) => para([t("—  ", { color: TERRA }), t(text)], { spacing: { after: 60 }, indent: { left: 240 }, keepNext: true });
    const none = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
    const hair = { style: BorderStyle.SINGLE, size: 4, color: LINE };

    const cell = (text, o = {}) => new TableCell({
      children: [para([t(text, { size: o.size || 19, bold: !!o.bold, color: o.color || INK, font: o.font || SANS })], { spacing: { after: 0 }, alignment: o.align || AlignmentType.LEFT })],
      width: o.width ? { size: Math.round((o.width / 100) * CONTENT_W), type: WidthType.DXA } : undefined,
      shading: o.fill ? { type: ShadingType.CLEAR, color: "auto", fill: o.fill } : undefined,
      margins: { top: 90, bottom: 90, left: 110, right: 110 },
      verticalAlign: VerticalAlign.CENTER,
      borders: { top: none, left: none, right: none, bottom: hair },
    });
    const table = (header, rows, widths) => new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: widths.map((w) => Math.round((w / 100) * CONTENT_W)),
      layout: TableLayoutType.FIXED,
      borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none },
      rows: [
        new TableRow({ tableHeader: true, cantSplit: true, children: header.map((h, i) => cell(h, { width: widths[i], size: 16, color: STEEL, fill: "F7F7F8", align: i > 0 ? AlignmentType.CENTER : AlignmentType.LEFT })) }),
        ...rows.map((r) => new TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, { width: widths[i], align: i > 0 ? AlignmentType.CENTER : AlignmentType.LEFT, font: i === 0 ? SERIF : SANS, size: i === 0 ? 20 : 19 })) })),
      ],
    });
    const peachBox = (lines) => new Table({
      width: { size: CONTENT_W, type: WidthType.DXA },
      columnWidths: [CONTENT_W],
      borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none },
      rows: [new TableRow({ children: [new TableCell({
        shading: { type: ShadingType.CLEAR, color: "auto", fill: PEACH },
        margins: { top: 240, bottom: 240, left: 300, right: 300 },
        borders: { top: none, bottom: none, left: none, right: none },
        width: { size: CONTENT_W, type: WidthType.DXA },
        children: lines,
      })] })],
    });

    // ---------- okładka ----------
    const goal = F.GOALS[p.goal].label + (p.goal === "inny" && p.goalOther ? ` — ${p.goalOther}` : "");
    const cover = [
      para([t("FORMA", { font: SERIF, size: 28, color: TERRA, characterSpacing: 120 })], { spacing: { before: 1400, after: 1600 } }),
      eyebrow("Osobisty program treningowy"),
      para([t("4 tygodnie.", { font: SERIF, size: 96 })], { spacing: { after: 0 } }),
      para([t("Jeden cel.", { font: SERIF, size: 96, color: TERRA })], { spacing: { after: 600 } }),
      para([t(`Dla: `, { color: STEEL, size: 24 }), t(p.name, { font: SERIF, size: 32 })], { spacing: { after: 200 } }),
      para([t(goal, { size: 24 })], { spacing: { after: 120 } }),
      para([t(`${fullDate(plan.start)} – ${fullDate(plan.end)}`, { size: 22, color: MUTED })], { spacing: { after: 900 } }),
      peachBox([
        para([t(`${p.days} dni w tygodniu  ·  ${p.minutes} min na sesję  ·  ${F.LEVELS[p.level]}`, { size: 20 })], { spacing: { after: 80 } }),
        para([t(`Sprzęt: ${F.EQUIPMENT[p.equipment]}`, { size: 20 })], { spacing: { after: 80 } }),
        para([t(`Układ: ${plan.split}`, { size: 20 })], { spacing: { after: 80 } }),
        para([t(`Uwzględnione: ${p.limits.length ? p.limits.map((l) => F.LIMITS[l]).join(", ") : "brak ograniczeń"}${p.limitsNote ? ` (${p.limitsNote})` : ""}`, { size: 20 })], { spacing: { after: 0 } }),
      ]),
      para([new PageBreak()]),
    ];

    // ---------- jak czytać ----------
    const sc = (role, w) => { const x = w < 3 ? F.scheme(p, role, w) : F.deloadOf(F.scheme(p, role, 2)); return `${x.sets} × ${x.reps} @${fmt(x.rpe)}`; };
    const intro = [
      eyebrow("Zasady bloku"),
      serif("Jak czytać ten plan", 48, { after: 240 }),
      para([t("Trzy tygodnie stopniowo rośnie obciążenie — serie, powtórzenia i RPE. Czwarty tydzień to odciążenie: ok. " + Math.round(plan.deloadRatio * 100) + "% objętości tygodnia 3, lżej i krócej.")]),
      para([t("RPE ", { bold: true }), t("to skala wysiłku 1–10. RPE 8 oznacza, że w zapasie zostają ok. 2 powtórzenia; RPE 6 — ok. 4.")]),
      ...(Object.keys(p.maxes || {}).length ? [para([t("Ciężary robocze ", { bold: true }), t("policzono wzorem Epleya: ciężar = 1RM ÷ (1 + (powtórzenia + powtórzenia w zapasie) ÷ 30), zaokrąglone do 2,5 kg.")])] : []),
      para([t("Korekty: ", { bold: true }), t("trzy oceny „Bardzo ciężko” z rzędu — ciężar −10%. Trzy oceny „Łatwo” z rzędu — ciężar +2,5–5%.")]),
      para([t("Czas: ", { bold: true }), t(`rozgrzewka (${F.WARMUP_MIN} min) i wyciszenie (${F.COOLDOWN_MIN} min) zawsze zostają. Gdy brakuje czasu, skracane są ćwiczenia pomocnicze.`)], { spacing: { after: 320 } }),
      table(["Rola ćwiczenia", "Tydzień 1", "Tydzień 2", "Tydzień 3", "Tydzień 4"], [
        ["Główne", sc("M", 0), sc("M", 1), sc("M", 2), sc("M", 3)],
        ["Drugorzędne", sc("S", 0), sc("S", 1), sc("S", 2), sc("S", 3)],
        ["Pomocnicze", sc("A", 0), sc("A", 1), sc("A", 2), sc("A", 3)],
      ], [28, 18, 18, 18, 18]),
      ...(plan.swaps.length ? [para([t("")]), eyebrow("Zamiany z uwagi na ograniczenia"), ...plan.swaps.map((s) => bullet(`${s.from} → ${s.to}`))] : []),
      para([new PageBreak()]),
    ];

    // ---------- tygodnie i sesje ----------
    const weekNames = ["Start progresji", "Więcej obciążenia", "Szczyt bloku", "Odciążenie"];
    const weeks = [];
    plan.weeks.forEach((w, wi) => {
      weeks.push(eyebrow(`Tydzień ${w.week + 1} z 4`));
      weeks.push(serif(weekNames[w.week], 52, { after: 280 }));
      w.sessions.forEach((s, si) => {
        weeks.push(eyebrow(longDate(s.date), { spacing: { before: si ? 360 : 0, after: 40 } }));
        weeks.push(serif(`${s.title}`, 34, { after: 80 }));
        weeks.push(para([t(`ok. ${s.minutes} min  ·  ${s.exercises.length} ${F.plural(s.exercises.length, "ćwiczenie", "ćwiczenia", "ćwiczeń")}${s.deload ? "  ·  odciążenie" : ""}`, { color: STEEL, size: 18 })], { keepNext: true }));
        weeks.push(para([t(`Rozgrzewka · ${F.WARMUP_MIN} min`, { bold: true, size: 19 })], { spacing: { after: 60 }, keepNext: true }));
        s.warmup.forEach((x) => weeks.push(bullet(x)));
        weeks.push(para([t("")], { spacing: { after: 60 }, keepNext: true }));
        weeks.push(table(["Ćwiczenie", "Serie × powt.", "RPE", "Ciężar", "Przerwa", "Wykonano"],
          s.exercises.map((e) => {
            const w8 = helpers.suggestWeight(e, s.id);
            return [e.name, `${e.sets} × ${e.repsLabel}`, fmt(e.rpe), w8 ? `${fmt(w8)} kg` : e.load === "bw" ? "MC" : "____ kg", `${Math.floor(e.rest / 60)}:${String(e.rest % 60).padStart(2, "0")}`, Array.from({ length: e.sets }, () => "☐").join(" ")];
          }), [36, 14, 8, 13, 11, 18]));
        weeks.push(para([t(`Wyciszenie · ${F.COOLDOWN_MIN} min`, { bold: true, size: 19 })], { spacing: { before: 160, after: 60 }, keepNext: true }));
        s.cooldown.forEach((x) => weeks.push(bullet(x)));
        weeks.push(para([t("Ocena:  ☐ Łatwo   ☐ W sam raz   ☐ Bardzo ciężko", { color: MUTED, size: 18 })], { spacing: { before: 80 } }));
      });
      if (wi < plan.weeks.length - 1) weeks.push(para([new PageBreak()]));
    });

    return new Document({
      creator: "Forma", title: `Forma — program dla: ${p.name}`, description: "4-tygodniowy blok treningowy",
      styles: { default: { document: { run: { font: SANS, size: 21, color: INK } } } },
      sections: [{
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1100, bottom: 1100, left: 1200, right: 1200 } } },
        footers: { default: new Footer({ children: [para([t("Forma  ·  ", { size: 16, color: STEEL }), new TextRun({ children: [PageNumber.CURRENT], size: 16, color: STEEL, font: SANS })], { alignment: AlignmentType.RIGHT })] }) },
        children: [...cover, ...intro, ...weeks],
      }],
    });
  }

  async function download(state, helpers) {
    const doc = build(state, helpers);
    const blob = await window.docx.Packer.toBlob(doc);
    const safe = (state.profile.name || "program").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l").replace(/Ł/g, "L").replace(/[^\w-]+/g, "-");
    const filename = `Forma-program-${safe}.docx`;
    // W podglądzie claude.ai pobieranie idzie przez capability „downloads” (z potwierdzeniem)
    const downloads = window.claude?.use ? await window.claude.use("downloads").catch(() => null) : null;
    if (downloads) { await downloads.save({ filename, data: blob }); return; }
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }

  window.FormaExport = { download, build };
})();
