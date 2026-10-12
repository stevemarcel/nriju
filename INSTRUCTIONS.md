# Nriju — Build Instructions

## Critical Rules

1. **Always make the Write/Edit tool call.** Never announce you will write something and then stop. If you say you're going to write a file, write it in that same turn.

2. **Frontend components: const + export {} style.**
   - Write: `const ComponentName = () => { ... };`
   - End with: `export { ComponentName };`
   - NEVER use `export default function` or `export default () => {}`
   - Applies to all files under `client/src/components/` and `client/src/pages/`

3. **Backend controllers: const + export {} style** (already done).

4. **Verify the file path before writing.** The project root is `C:\Users\justs\STEVE JIGGY\WEB\PROJECTS\nriju`. Never write to `nriju Backend` (with a space) — that creates a stray directory.

5. **Write real code, not placeholders.** Never write `// placeholder` or `// TODO` as the entire file content.

## Project Status

- **Backend:** COMPLETE. 13 controllers + 13 routes + 16 models + server boots + seed verified.
- **Frontend:** 13 pages/components written. Remaining: CheckoutPage, App.jsx, account pages, static pages, admin pages.

## Remaining Frontend Pages

| Area | Pages |
|------|-------|
| Public | CheckoutPage |
| Account | Dashboard, Orders, Profile |
| Static | About, Contact, FAQ, Delivery, Returns, Privacy, Terms |
| Admin | Dashboard, Products, Orders, Customers, Users, Reviews, Coupons, Settings |
| Core | App.jsx (routing) |

## Run Commands

```bash
npm run server    # backend on port 5000
npm run client    # frontend on port 5173
npm run seed      # populate database
```