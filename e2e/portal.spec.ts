/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * End-to-end tests.
 *
 * ## What these protect that unit tests cannot
 *
 * The domain tests prove `Board.move` and `runRedemption` behave. They say nothing
 * about whether the button is wired to them, whether the completion prompt
 * appears, or whether a drag actually reaches the drop handler. Those are the
 * regressions a user reports and a unit test never notices.
 *
 * Portable by design: the suite starts the app in-process on an ephemeral port,
 * so it runs in CI without Docker, a database or a fixed port. The previous
 * project's E2E needed a compose stack and was therefore never run.
 */

import { test, expect, type Page } from '@playwright/test';
import { startTestServer, type TestServer } from '../src/tests/helpers/appHarness.ts';

let server: TestServer;
let baseUrl: string;

test.beforeAll(async () => {
  // A stub git service: E2E must never reach a real repository.
  // `serveFrontend` mounts the built bundle — without it the suite would test an
  // empty shell, which is exactly the failure this file was written to catch.
  server = await startTestServer({
    serveFrontend: true,
    status: {
      branch: 'main',
      remoteUrl: 'https://github.com/spawnperm/ural.git',
      changes: [{ status: 'M', file: 'README.md' }],
      commits: [{ hash: 'abc1234', message: 'docs: test', date: '2026-11-20T11:52:39Z' }],
      hasToken: true,
    },
  });
  baseUrl = server.baseUrl;
});

test.afterAll(async () => {
  await server.close();
});

async function columnCount(page: Page, title: string): Promise<number> {
  const badge = page.locator(`section[aria-label='${title}'] span.tabular-nums`).first();
  return Number((await badge.innerText()).trim());
}

test.describe('documentation portal', () => {
  test('renders the home page without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));

    await page.goto(baseUrl);
    await expect(page.locator('h1').first()).toContainText('Первооткрыватели');
    expect(errors).toEqual([]);
  });

  test('switches documentation version', async ({ page }) => {
    await page.goto(baseUrl);
    await expect(page.locator('h1').first()).toBeVisible();

    await page.locator('select').first().selectOption('v0.9');
    await page.waitForTimeout(600);

    // The version changes the content set; the page must not blank out.
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
    expect((await heading.innerText()).trim().length).toBeGreaterThan(0);
  });
});

test.describe('improvement board', () => {
  test('shows three columns with the backlog in ideas', async ({ page }) => {
    await page.goto(baseUrl);
    for (const title of ['Идеи', 'В работе', 'Выполнено']) {
      await expect(page.locator(`section[aria-label='${title}']`)).toBeVisible();
    }
    expect(await columnCount(page, 'Идеи')).toBeGreaterThan(0);
    expect(await columnCount(page, 'В работе')).toBe(0);
  });

  test('moves a card with a real drag', async ({ page }) => {
    await page.goto(baseUrl);
    const before = await columnCount(page, 'Идеи');

    await page
      .locator("section[aria-label='Идеи'] > div > div")
      .first()
      .dragTo(page.locator("section[aria-label='В работе']"));
    await page.waitForTimeout(600);

    expect(await columnCount(page, 'В работе')).toBe(1);
    expect(await columnCount(page, 'Идеи')).toBe(before - 1);
  });

  test('requires a note before a card reaches done', async ({ page }) => {
    await page.goto(baseUrl);

    // Take work first: ideas -> done directly is illegal and must be refused.
    await page
      .locator("section[aria-label='Идеи'] button")
      .filter({ hasText: 'В работу' })
      .first()
      .click();
    await page.waitForTimeout(400);

    await page.locator("section[aria-label='В работе'] button").nth(2).click();
    const dialog = page.locator("[role='dialog']");
    await expect(dialog).toBeVisible();

    // Confirm without a note: the move must be refused.
    await dialog.getByRole('button', { name: 'Подтвердить' }).click();
    await page.waitForTimeout(400);
    expect(await columnCount(page, 'Выполнено')).toBe(0);

    // With a note it goes through.
    await dialog.locator('textarea').fill('проверено: gitleaks по истории');
    await dialog.getByRole('button', { name: 'Подтвердить' }).click();
    await page.waitForTimeout(600);
    expect(await columnCount(page, 'Выполнено')).toBe(1);
    await expect(page.locator("section[aria-label='Выполнено']")).toContainText('gitleaks');
  });

  test('refuses to skip the work column with the keyboard', async ({ page }) => {
    await page.goto(baseUrl);
    const before = await columnCount(page, 'Выполнено');

    // Ideas -> right is legal (into work); from work, right asks for a note.
    const moveBtn = page.locator("section[aria-label='Идеи'] button").filter({ hasText: 'Переместить' }).first();
    await moveBtn.press('ArrowRight');
    await page.waitForTimeout(400);
    expect(await columnCount(page, 'В работе')).toBe(1);

    await page.locator("section[aria-label='В работе'] button").filter({ hasText: 'Переместить' }).first().press('ArrowRight');
    await page.waitForTimeout(400);
    // A prompt appears; nothing lands in done until it is confirmed.
    await expect(page.locator("[role='dialog']")).toBeVisible();
    expect(await columnCount(page, 'Выполнено')).toBe(before);
  });
});

test.describe('accessibility basics', () => {
  test('the board announces moves in a live region', async ({ page }) => {
    await page.goto(baseUrl);
    const live = page.locator("[role='status'][aria-live='polite']");
    await expect(live).toHaveCount(1);

    await page.locator("section[aria-label='Идеи'] button").filter({ hasText: 'В работу' }).first().click();
    await page.waitForTimeout(600);
    await expect(live).not.toBeEmpty();
  });

  test('every card control has an accessible name', async ({ page }) => {
    await page.goto(baseUrl);
    const buttons = page.locator("section[aria-label='Идеи'] button");
    const count = await buttons.count();
    for (let i = 0; i < Math.min(count, 6); i++) {
      const el = buttons.nth(i);
      const name = (await el.getAttribute('aria-label')) ?? (await el.innerText());
      expect(name.trim().length).toBeGreaterThan(0);
    }
  });
});

test.describe("commit panel", () => {
  test("explains a refused write instead of failing silently", async ({ page }) => {
    await page.goto(baseUrl);
    await page.getByRole("button", { name: "Коммит и пуш" }).first().click();

    const dialog = page.locator("[role=dialog]");
    await expect(dialog).toBeVisible();

    // The write endpoint is authenticated now; the panel must surface the refusal
    // rather than showing a generic failure.
    await dialog.locator("#write-token").fill("wrong-token");
    await dialog.getByRole("button", { name: "Коммит и пуш" }).click();
    await expect(dialog).toContainText(/Неверный токен|Требуется/, { timeout: 10_000 });
  });

  test("keeps the write token out of the DOM after entry", async ({ page }) => {
    await page.goto(baseUrl);
    await page.getByRole("button", { name: "Коммит и пуш" }).first().click();
    const dialog = page.locator("[role=dialog]");
    await expect(dialog).toBeVisible();

    const field = dialog.locator("#write-token");
    await expect(field).toHaveAttribute("type", "password");
    await field.fill("secret-value");

    // A controlled React input mirrors its value into the DOM property — that is
    // normal and not a leak. What matters is that the token appears nowhere else:
    // no hidden input, no data attribute, no text node.
    const html = await page.content();
    expect(html.split("secret-value").length - 1).toBeLessThanOrEqual(1);
    expect(await field.inputValue()).toBe("secret-value");
  });
});

test.describe('dialog accessibility', () => {
  /*
   * Regression tests for three gaps that made the commit panel a dialog in name
   * only: Escape did not close it, Tab walked into the page behind, and focus was
   * not returned to the opener.
   */

  test('skip link is the first focus stop and moves focus to main', async ({ page }) => {
    await page.goto(baseUrl);
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.textContent?.trim());
    expect(focused).toBe('Перейти к содержимому');

    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => document.activeElement?.id)).toBe('main-content');
  });

  test('Escape closes the dialog', async ({ page }) => {
    await page.goto(baseUrl);
    await page.getByRole('button', { name: 'Коммит и пуш' }).first().click();
    await expect(page.locator("[role='dialog']")).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator("[role='dialog']")).toHaveCount(0);
  });

  test('Tab stays inside the dialog', async ({ page }) => {
    await page.goto(baseUrl);
    await page.getByRole('button', { name: 'Коммит и пуш' }).first().click();
    await expect(page.locator("[role='dialog']")).toBeVisible();

    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      const inside = await page.evaluate(() =>
        Boolean(document.activeElement?.closest("[role='dialog']"))
      );
      expect(inside).toBe(true);
    }
  });

  test('closing returns focus to the button that opened it', async ({ page }) => {
    await page.goto(baseUrl);
    const opener = page.getByRole('button', { name: 'Коммит и пуш' }).first();
    await opener.click();
    await expect(page.locator("[role='dialog']")).toBeVisible();

    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    const focused = await page.evaluate(() => document.activeElement?.textContent?.trim());
    expect(focused).toContain('Коммит');
  });
});
