# Forma

Osobisty trener na siłownię, po polsku. Ankieta w 7 krokach układa 4-tygodniowy blok treningowy: trzy tygodnie progresji i tydzień odciążenia. Ćwiczenia są dobierane do sprzętu, ograniczeń i czasu na sesję. Na ekranie treningu zaznaczasz serie i wpisujesz ciężar. Do tego dochodzą kalendarz bloku, odżywianie i sen, postępy oraz eksport programu do Worda (.docx).

## Jak to działa

- Czysty HTML, CSS i JavaScript, bez kroku budowania. Wystarczy dowolny serwer plików statycznych, np. GitHub Pages.
- Konta i synchronizacja działają przez [Supabase](https://supabase.com). Konfiguracja jest w `config.js`. Bez konta dane zostają w przeglądarce (`localStorage`).
- Biblioteki są w `vendor/`: `docx` do eksportu i `@supabase/supabase-js`.

## Pliki

| Plik | Rola |
|---|---|
| `index.html` | strona |
| `styles.css` | wygląd (tokeny systemu Steep, tryb ciemny) |
| `engine.js` | plan: biblioteka ćwiczeń, progresja, odciążenie, wzór Epleya, dopasowanie do czasu |
| `app.js` | interfejs: ankieta, dzisiejszy trening, kalendarz, nawyki, postępy, podsumowanie tygodnia |
| `cloud.js` | logowanie i synchronizacja z Supabase |
| `export.js` | eksport bloku do .docx |
| `config.js` | adres projektu Supabase i klucz publiczny |
| `supabase/schema.sql` | tabela i reguły Row Level Security |
| `DESIGN.md` | tokeny projektowe |

## Uruchomienie lokalnie

```bash
python3 -m http.server 8765
# potem otwórz http://localhost:8765
```

## Konfiguracja Supabase

1. W **SQL Editor** uruchom `supabase/schema.sql`.
2. W **Authentication → URL Configuration** ustaw **Site URL** na adres strony i dodaj ten adres w **Redirect URLs**. Linki z e-maili (potwierdzenie konta, reset hasła) wracają właśnie tam.
3. W `config.js` wpisuj tylko klucz publiczny (`publishable` / `anon`). Nigdy nie wpisuj klucza `service_role` / `secret`.
