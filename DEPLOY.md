# Daily-Vibe 2.0 — 部署指南（GitHub + Vercel + Supabase）

產品顯示名稱統一為 **Daily-Vibe 2.0**（程式套件名為 `daily-vibe-2`，見 `package.json`）。

## 1. Supabase（新專案）

1. 建立專案後，於 **Project Settings → API** 取得：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`（僅伺服器，勿公開）
2. 在 **SQL Editor** 依序執行 [`supabase/migrations/`](supabase/migrations/) 內 `001` … `007`（或使用 Supabase CLI `supabase db push`）。
3. 部署取得正式網址後，於 **Authentication → URL Configuration** 設定：
   - **Site URL**：`https://你的網域`
   - **Redirect URLs**：`https://你的網域/**`、`http://localhost:3000/**`（本機開發）

## 2. GitHub（請使用全新倉庫，勿沿用舊 remote）

1. 在 GitHub 建立一個**新的空倉庫**（不要選「從範本／匯入舊 repo」）。
2. 在本機專案目錄（已含 `.git` 與初始提交時）：
   ```bash
   git remote add origin https://github.com/<你的帳號>/<新倉庫名稱>.git
   git push -u origin main
   ```
   若從未連過舊網址，請勿設定任何指向舊 `daily-vibe` 的 `origin`。
3. **勿**提交 `.env.local` 或金鑰。

- **CI（GitHub Actions）**：本專案已含 [`.github/workflows/ci.yml`](.github/workflows/ci.yml)。若 `git push` 因 OAuth 缺少 `workflow` 權限被拒，可改在 GitHub 網頁新增該檔，或執行 `gh auth login -s workflow` 後再推。
- **備份**：與 CI 相同內容亦在 [`docs/github-actions-ci.yml`](docs/github-actions-ci.yml)。
- **自動部署（Vercel）**：在 [Vercel](https://vercel.com) **Import** 上述**新倉庫**並連結 `main`；之後每次 `git push`，Vercel 會自動建置與部署。

## 3. Vercel

1. Import GitHub 倉庫；Framework：Next.js；Node 20.x。
2. 於 **Environment Variables** 填入 [`.env.local.example`](.env.local.example) 所列變數，並補上：
   - `RESEND_API_KEY`、`RESEND_FROM_EMAIL`（週報／匯出寄信，若使用）
3. Deploy 後將 **Vercel URL** 填回 Supabase 的 Site URL / Redirect URLs。

## 4. 推播 Cron

`POST /api/push/cron`，Header：`Authorization: Bearer <CRON_SECRET>`。可用外部排程（如 cron-job.org）每分鐘呼叫生產網址。

## 5. 驗收

登入、今日頁、設定、（可選）推播與寄信流程。

更細步驟可對照根目錄 [`deploy-checklist.txt`](deploy-checklist.txt)。
