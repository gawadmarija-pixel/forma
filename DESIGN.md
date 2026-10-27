# Steep — tokeny używane w „Forma”

> Źródło: Refero, styl „Steep” — https://styles.refero.design/style/75fdb89f-ca64-41b3-af36-7a78bd09448e
> Strona była niedostępna z tego środowiska (polityka sieci), więc tokeny zebrano
> z jej opisu w wynikach wyszukiwania. Pełny DESIGN.md warto pobrać ręcznie i porównać.

## Kolory
| Token | Hex | Rola |
|---|---|---|
| `--color-canvas` | `#ffffff` | tło główne, powierzchnie kart |
| `--color-ink` | `#17191c` | tekst główny, wypełnione przyciski |
| `--color-graphite` | `#000000` | awaryjny ciemny tekst, obrys przycisków „ghost” |
| `--color-warm-mist` | `#fbe1d1` | jedyny ciepły (brzoskwiniowy) akcent — tło wybranych kart i sekcji |
| `--color-terracotta` | `#5d2a1a` | obramowania i elementy dekoracyjne |
| `--color-fog` | `#f7f7f8` | powierzchnia drugorzędna |
| `--color-muted-stone` | `#4c4c4c` | tekst drugorzędny, ikony |
| `--color-light-steel` | `#777b86` | ciche linki, spokojne elementy UI |
| `--color-hint-of-grey` | `#a3a6af` | linie pomocnicze, nieaktywne stany |

## Typografia
- Display: **Signifier** (płatny, Klim) → zamiennik bezpłatny: **Newsreader** (Google Fonts), waga 400.
- Interfejs: **Söhne** (płatny, Klim) → zamiennik bezpłatny: **Inter**.
- Skala: Minor Third (×1,2) od 15 px: 15 · 18 · 21,6 · 25,9 · 31,1 · 37,3 · 44,8 · 53,7 · 64,5 · 77,4 · 90.
- Display 90 px / 400 / line-height 1,3 (na telefonie skalowane przez `clamp`).

## Promienie
- Przyciski: `9999px` (pełna pigułka) — nigdy mniej.
- Karty treści: `24px` — nigdy poniżej `16px`.

## Cienie / elewacja
- Karty treści bez cienia; hairline 1 px.
- Cień tylko dla elementów „pływających” (arkusz dolny, toast).

## Odstępy
Siatka 4 px: 4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96.

## Zalecenia i zakazy
- ✅ Dużo bieli, jeden brzoskwiniowy akcent, cienkie obramowania.
- ✅ Duży nagłówek szeryfowy, interfejs bezszeryfowy.
- ❌ Brak cieni na kartach treści.
- ❌ Brak promieni kart < 16 px i przycisków < pigułki.
- ❌ Linki bez podkreślenia w spoczynku — podkreślenie dopiero po najechaniu, strzałka niesie sygnał linku.
