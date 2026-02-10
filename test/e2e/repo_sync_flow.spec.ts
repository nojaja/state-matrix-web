import { test, expect } from '@playwright/test'

// E2E skeleton: 設定登録 -> onSync -> 競合発生 -> モーダルで解決 -> push
// 実行には開発サーバが必要。手動で `npm run dev` を用意してください。

test.describe('Repo sync end-to-end (skeleton)', () => {
  test('settings -> sync -> conflict -> resolve', async ({ page }) => {
    // TODO: implement steps
    // 1. Open app
    // await page.goto('http://localhost:8080')
    // 2. Open ProjectView, create/select project
    // 3. Open RepoSettingsModal, input provider/owner/repo/branch/token and save
    // 4. Trigger Sync button and wait for status
    // 5. Assert conflict badge shown
    // 6. Open ThreeWayCompareModal, apply resolution
    // 7. Assert .repo-conflicts.json updated via network or API

    test.skip(true, 'skeleton placeholder')
  })
})
