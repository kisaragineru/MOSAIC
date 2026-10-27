import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { setBirthTime } from "./birth-time";

const E2E_OWNER_DB = process.env.E2E_MIGRATION_DATABASE_URL ?? "postgres://mosaic_owner:owner_dev_pw@localhost:5432/mosaic_e2e";

test("a new account is guided: the chart (not skippable) and its tour, three questions from three chapters, a bio, then a connection", async ({ browser }) => {
  const ctx = await browser.newContext({ locale: "ja-JP", extraHTTPHeaders: { "Accept-Language": "ja-JP,ja;q=0.9", "x-e2e-client-ip": `10.2.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });
  const page = await ctx.newPage();
  await page.goto("/register");
  await page.getByLabel("なんと呼べばいいですか？").fill("リン");
  await page.getByLabel("メールアドレス").fill(`${randomUUID().slice(0, 8)}@example.test`);
  await page.getByLabel(/^パスワード/).fill("e2e correct horse battery");
  await page.getByRole("button", { name: "アカウントを作成" }).click();
  await page.waitForURL(/\/welcome$/);
  await expect(page.getByRole("heading", { name: "ようこそ、リンさん" })).toBeVisible();
  // What MOSAIC is, as a short film: a type from a birth date, pieces from answers, a story, handing it over.
  const film = page.getByTestId("intro-film");
  for (const x of ["あなたは、どのタイプ？", "あなたのかけらが、増えていく", "かけらは、あなたの物語になる", "誰かに、知ってほしくなったら"]) await expect(film.getByRole("heading", { name: x })).toBeAttached();
  await expect(film.getByText("例", { exact: true })).toHaveCount(2); // the sample manual and story say they're examples
  await expect(film.getByText(/見せるのは、あなたが選んだ人だけ/)).toBeAttached();
  // The film opens the guide on its own: one mark, the greeting inside it, no step bar yet.
  await expect(film.getByText("ようこそ、リンさん")).toBeVisible();
  await expect(film.getByText("ひとかけらずつ、あなたになる。")).toBeVisible();
  await expect(film.getByRole("img", { name: "MOSAIC" })).toBeVisible();
  await expect(page.getByRole("button", { name: "ガイドを終了" })).toHaveCount(0);
  await page.getByRole("link", { name: /はじめる/ }).click();

  // The chart: what it gives, why it matters for the people you love, and that it stays yours.
  await page.waitForURL(/step=2/);
  // From here the guide shows its steps and can be ended at any one.
  await expect(page.getByRole("button", { name: "ガイドを終了" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "まずは、あなたの命盤をつくりましょう" })).toBeVisible();
  await expect(page.getByTestId("tuvi-preview")).toContainText("あなたの本質");
  await expect(page.getByText(/つながった人との相性や、お互いの取扱説明書も/)).toBeVisible();
  await expect(page.getByText(/生年月日と時刻は、あなたにしか見えません/)).toBeVisible();
  // The fourteen types, as a reason to enter the chart (and the time).
  await expect(page.getByTestId("type-gallery").locator("li")).toHaveCount(14);
  await page.getByLabel("生年月日 (新暦（グレゴリオ暦）)").fill("1990-06-07");
  await setBirthTime(page, "06:30");
  await page.getByLabel("伝統的な計算で使う性別").selectOption("male");
  await page.getByRole("button", { name: "命盤をつくる" }).click();

  // The result first, then the board with a hands-on tour.
  await page.waitForURL(/step=3/);
  await expect(page.getByTestId("chart-result")).toContainText("あなたの本質は「");
  // The type straight away, as a picture.
  await expect(page.getByTestId("chart-result").getByTestId("type-portraits").locator("img").first()).toBeVisible();
  const tour = page.getByTestId("chart-tour");
  await page.locator("[data-menh]").click();
  await expect(tour.locator("li").nth(0)).toContainText("✓");
  await page.getByRole("dialog").getByRole("button", { name: "閉じる" }).click();
  await expect(tour.locator("li").nth(1)).toContainText("✓");
  await page.locator("[data-now]").click();
  await expect(tour).toContainText("これで命盤の基本はばっちりです！");
  await page.getByRole("link", { name: /次へ（質問に答える）/ }).click();

  // One question from each of three chapters: what you love, how you decide, what comes next.
  await expect(page.getByText("0 / 3")).toBeVisible();
  await page.getByLabel("海", { exact: true }).check();
  await page.getByRole("button", { name: "回答を保存" }).click();
  await page.waitForURL(/step=4/);
  await expect(page.getByText("1 / 3")).toBeVisible();
  await page.getByLabel("自分の直感", { exact: true }).check();
  await page.getByRole("button", { name: "回答を保存" }).click();
  await page.waitForURL(/step=4/);
  await expect(page.getByText("2 / 3")).toBeVisible();
  await page.getByLabel("今年中にやりたいことを一つ。").fill("富士山に登る");
  await page.getByRole("button", { name: "回答を保存" }).click();
  await page.waitForURL(/step=4/);
  await expect(page.getByRole("heading", { name: /3つの章に、最初のピースが置かれました/ })).toBeVisible();
  const seeded = page.getByTestId("seed-pieces");
  for (const x of ["好きなもの", "「海」", "考え方・決め方", "「自分の直感」", "これまでとこれから", "「富士山に登る」"]) await expect(seeded).toContainText(x);
  await page.getByRole("link", { name: "次へ" }).click();

  await expect(page.getByRole("heading", { name: "あなたのことを、ひとことで" })).toBeVisible();
  await page.getByRole("textbox").fill("週末は山とパン屋めぐり。");
  await page.getByRole("button", { name: "保存して次へ" }).click();
  await page.waitForURL(/step=6/);
  // A clear end, then what the guide made: the chart's word, the first pieces, the manual.
  const done = page.getByTestId("guide-finished");
  await expect(done.getByRole("heading", { name: "はじめてガイド、完了です！" })).toBeVisible();
  await expect(page.getByTestId("guide-achievements").locator('li[data-done="true"]')).toHaveCount(3);
  await expect(done).toContainText("あなたの本質は「");
  await expect(done).toContainText("3つの章の最初のピース");
  await expect(done.getByTestId("seed-pieces")).toContainText("「富士山に登る」");
  await expect(done).toContainText(/文字・\d+章が書けました/);
  await expect(page.getByTestId("pieces")).toHaveText("16"); // 3 answers + bio + chart
  // Handing the story to someone is mentioned lightly, for later; going home is the main way on.
  await expect(done.getByRole("link", { name: /物語を渡すって？/ })).toHaveAttribute("href", "/me/work");
  await done.getByRole("link", { name: "ホームへ（MOSAICをはじめる）" }).click();
  await page.waitForURL(/\/home$/);
  const list = page.getByTestId("starter-checklist");
  await expect(list).toContainText("あと1つ");
  await expect(list.getByRole("link", { name: /最初の記録を書く/ })).toBeVisible();
  // Connecting isn't a task to tick off.
  await expect(list).not.toContainText("つながる");
  await expect(page.getByText("はじめてガイドの続き")).toHaveCount(0);
  // After the guide the checklist can be closed for good; the rest stays doable from each page.
  page.once("dialog", (d) => void d.accept());
  await list.getByRole("button", { name: "チェックリストを終了" }).click();
  await expect(page.getByTestId("starter-checklist")).toHaveCount(0);
  await page.reload();
  await expect(page.getByTestId("starter-checklist")).toHaveCount(0);

  // Monthly look back: this month so far, and a note saved as a record.
  await page.goto("/reflection");
  await expect(page.getByRole("heading", { level: 2, name: /年\d+月のあなた/ })).toBeVisible();
  // What was answered this month is listed, once per question.
  await expect(page.getByRole("heading", { name: "💬 この月に答えたこと（3問）" })).toBeVisible();
  await expect(page.getByText("富士山に登る", { exact: true })).toBeVisible();
  await page.getByLabel("この1か月で、いちばん心に残ったことは？").fill("はじめてMOSAICを使った。");
  await page.getByRole("button", { name: "振り返りを記録する" }).click();
  await expect(page).toHaveURL(/ok=saved/);
  // What was written stays on the month's page, and more can be added.
  await expect(page.getByRole("heading", { name: "📝 この月の振り返り" })).toBeVisible();
  await expect(page.locator("#lookback").getByText("はじめてMOSAICを使った。")).toBeVisible();
  await expect(page.getByText("＋ もう一度書く・書き足す")).toBeVisible();
  await page.goto("/memories");
  await expect(page.getByText(/はじめてMOSAICを使った。/).first()).toBeVisible();
  await ctx.close();
});

test("while the guide isn't finished every page says so, with the way back; it can be ended any time", async ({ browser }) => {
  const ctx = await browser.newContext({ locale: "en-US", extraHTTPHeaders: { "x-e2e-client-ip": `10.2.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });
  const page = await ctx.newPage();
  await page.goto("/register");
  await page.getByLabel("What should we call you?").fill("Lin");
  await page.getByLabel("Email").fill(`${randomUUID().slice(0, 8)}@example.test`);
  await page.getByLabel(/^Password/).fill("e2e correct horse battery");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/welcome$/);
  // Elsewhere, a bar says the guide is under way and leads back to where it left off (the chart).
  await page.goto("/discover");
  const bar = page.getByTestId("guide-bar");
  await expect(bar).toContainText("Welcome guide (2/6)");
  await bar.getByRole("link", { name: /Back to the guide/ }).click();
  await page.waitForURL(/\/welcome\?step=2$/);
  await expect(page.getByTestId("guide-bar")).toHaveCount(0);
  // Only the birth date is needed: the time left empty, no sex.
  await page.getByLabel("Date of birth (Solar (Gregorian))").fill("1990-06-07");
  await page.getByRole("button", { name: "Make my chart" }).click();
  await page.waitForURL(/step=3/);
  await expect(page.getByTestId("chart-result")).toContainText("Your chart is ready");
  // Without the time MOSAIC doesn't guess a type: it says why, offers to add the time, and lets you
  // pick up to two that feel like you — kept as your own pick, not MOSAIC's judgment.
  const status = page.getByTestId("type-status");
  await expect(status).toContainText("Your type isn't known yet");
  await expect(status).toContainText("as you answer more questions, MOSAIC will judge it");
  await expect(status.getByRole("link", { name: /Add your birth time/ })).toHaveAttribute("href", "/welcome?step=2");
  const pick = (name: RegExp) => status.locator("label").filter({ hasText: name }).first().click();
  await pick(/warm sun/);
  await pick(/quiet moon/);
  await pick(/curious charmer/); // a third tick is undone, with a note
  await expect(status.getByRole("alert")).toContainText("up to two");
  await status.getByRole("button", { name: "Save my pick" }).click();
  await expect(page.getByTestId("self-types")).toContainText("the warm sun");
  await expect(page.getByTestId("self-types")).toContainText("the quiet moon");
  await expect(page.getByTestId("self-types")).toContainText("not MOSAIC's judgment");
  // A short quiz tells the two picks apart; the result sits beside the pick.
  await page.getByTestId("type-status").getByRole("link", { name: /Find your type in five questions/ }).click();
  await page.waitForURL(/\/tuvi\/type/);
  await expect(page.getByText(/You picked “the warm sun” and “the quiet moon”/)).toBeVisible();
  for (let i = 0; i < 10 && !(await page.getByTestId("quiz-result").count()); i++) {
    await page.locator('input[name="choice"], input[name="scale"]').first().check();
    await page.locator('form:has(input[name="questionId"]) button[type="submit"]').first().click();
    await page.waitForURL(new RegExp(`[?&]n=${i + 1}(&|$)`));
  }
  await expect(page.getByTestId("quiz-result")).toBeVisible();
  await expect(page.getByTestId("quiz-compare")).toContainText("Types you picked");
  await page.getByRole("link", { name: /Continue/ }).click();
  await page.waitForURL(/\/welcome\?step=3/);
  // On the Tử Vi page: not known yet, how far along MOSAIC is, and what helps.
  await page.goto("/tuvi");
  await expect(page.getByTestId("type-progress")).toContainText(/MOSAIC understands \d+% of you/);
  await expect(page.getByTestId("type-status").getByRole("link", { name: /Answer questions/ })).toBeVisible();
  await page.goto("/home");
  await expect(page.getByTestId("guide-bar")).toContainText("Welcome guide (4/6)");
  // Ending it (after a confirmation) keeps you where you are; Home's checklist keeps what is left.
  page.once("dialog", (d) => void d.accept());
  await page.getByTestId("guide-bar").getByRole("button", { name: "End guide" }).click();
  await expect(page.getByTestId("guide-bar")).toHaveCount(0);
  // The quiz's answers already count toward the questions; the bio is still left.
  await expect(page.getByTestId("starter-checklist").getByRole("link", { name: /Write your bio/ })).toBeVisible();
  await ctx.close();
});

test("development: try sign-up and the guide with a throwaway account, then go back to your own", async ({ browser }) => {
  const ctx = await browser.newContext({ locale: "ja-JP", extraHTTPHeaders: { "Accept-Language": "ja-JP,ja;q=0.9", "x-e2e-client-ip": `10.5.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });
  const page = await ctx.newPage();
  await page.goto("/register");
  await page.getByLabel("なんと呼べばいいですか？").fill("ねる");
  await page.getByLabel("メールアドレス").fill(`${randomUUID().slice(0, 8)}@example.test`);
  await page.getByLabel(/^パスワード/).fill("e2e correct horse battery");
  await page.getByRole("button", { name: "アカウントを作成" }).click();
  await page.waitForURL(/\/welcome$/);

  await page.goto("/settings");
  await page.getByTestId("trial-start").getByRole("button", { name: /会員登録から試す/ }).click();
  await page.waitForURL(/\/register$/);
  await expect(page.getByTestId("trial-bar")).toContainText("会員登録のテスト中です");
  // Everything is filled in; the address is a throwaway one.
  await expect(page.getByLabel("メールアドレス")).toHaveValue(/@trial\.mosaic\.invalid$/);
  const trialEmail = await page.getByLabel("メールアドレス").inputValue();
  await page.getByRole("button", { name: "アカウントを作成" }).click();
  await page.waitForURL(/\/welcome$/);
  await expect(page.getByRole("heading", { name: /^ようこそ、テスト/ })).toBeVisible();
  await expect(page.getByTestId("trial-bar")).toContainText("テスト用アカウントで体験中です");

  await page.getByTestId("trial-bar").getByRole("button", { name: "元のアカウントに戻る" }).click();
  await page.waitForURL(/\/settings\?ok=trial_ended/);
  await expect(page.getByText("元のアカウントに戻りました。テスト用アカウントは削除しました。")).toBeVisible();
  await expect(page.getByTestId("trial-bar")).toHaveCount(0);
  // The throwaway account is gone.
  const left = execSync(`psql ${E2E_OWNER_DB} -tAc "select count(*) from users where email = '${trialEmail}'"`).toString().trim();
  expect(left).toBe("0");
  await page.goto("/home");
  await expect(page.getByRole("heading", { level: 1, name: "こんにちは、ねるさん" })).toBeVisible();
  await ctx.close();
});

test("before signing up, the top page tells MOSAIC as a short film and leads to sign-up or log-in", async ({ browser }) => {
  const page = await (await browser.newContext({ locale: "ja-JP", extraHTTPHeaders: { "Accept-Language": "ja-JP,ja;q=0.9" } })).newPage();
  await page.goto("/");
  const film = page.getByTestId("intro-film");
  await expect(film.getByText("もしかしたら、自分かもしれない。")).toBeVisible();
  await expect(film.getByText("A lifetime, piece by piece.")).toBeAttached();
  await expect(film.getByText("Every piece of you matters.")).toBeAttached();
  await expect(film.getByRole("link", { name: "はじめる（約3分）" })).toHaveAttribute("href", "/register");
  await film.getByRole("link", { name: /ログイン/ }).click();
  await page.waitForURL(/\/login/);
});
