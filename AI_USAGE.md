# Penggunaan AI

Dokumen ini berisi prompt yang digunakan selama pengembangan. Keterangan dan judul ditulis dalam bahasa Indonesia, sedangkan isi prompt tetap dalam bahasa Inggris.

## Tools yang Digunakan

- Claude Code
- GitHub Copilot

## 1. Membuat atau Memperbarui README

```text
Review the repository source code and configuration, then create or update the root README.md.

Document the project, implemented features, tech stack, structure, architecture, prerequisites, setup, usage, API, commands, tests, and license where applicable. Use clear, professional English.

Verify every command, endpoint, and configuration against the repository. Don’t invent features or expose secrets. Modify only README.md, then check it for accuracy and formatting.
```

## 2. Review Kode dengan E2E Test

```text
Review the repository for bugs, regressions, and security or data-integrity risks. Inspect the existing end-to-end test setup, then run the relevant E2E tests using verified project commands.

Do not modify files. Report findings first, ordered by severity, with file references, impact, and reproduction steps. Include the E2E test results and note important workflows that are not covered. Do not invent test commands or claim tests passed unless they were run.
```

## 3. Unit Test untuk Autentikasi

```text
Add tests for login, logout, and authorization based on the code that exists. First inspect the auth routes, JWT plugin, frontend token handling, logout behavior, and current test setup.

Use the project’s existing test tools. Cover successful and failed login, logout behavior, and protected routes with valid, missing, invalid, or expired tokens. Do not assume a logout API endpoint exists; test the implemented logout flow. Avoid changing application code or adding dependencies unless necessary.

Run the relevant tests and report what you added, which commands you ran, and their results.
```

## 4. Seeder Produk dan Pelanggan

```text
Review the Prisma schema and existing seed script. Create or update development seed data for products and customers, using fields that match the actual models.

Include realistic product codes, names, prices, and stock, plus customer names and contact details. Make the seed repeatable without creating duplicates or deleting unrelated data. Use the project’s existing Prisma setup, then run the seeder and verify the records were created.
```
