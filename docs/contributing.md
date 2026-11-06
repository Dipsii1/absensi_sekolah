# CONTRIBUTING

## Alur
1. Buat branch: `feat/nama`, `fix/nama`, `refactor/nama`.
2. Commit kecil dengan prefix `feat:`, `fix:`, `refactor:`, `chore:`, `docs:`.
3. Rename file (`.js` -> `.ts`) dan perubahan logika dipisah commit.
4. Pastikan `npx tsc --noEmit` lolos sebelum PR.
5. Update `docs/DOCUMENTATION.md` jika kontrak API berubah.

## Pull Request
- Jelaskan apa yang berubah dan kenapa (singkat).
- Sertakan langkah uji untuk skenario: tepat waktu, terlambat, > 15 menit, tap-in ganda, tap-out sebelum waktunya, tap-out normal.

## Jangan Commit
`.env`, `dist/`, `node_modules/`, data siswa asli, file Excel import berisi data nyata.