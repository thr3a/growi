# Research & Design Decisions

## Summary
- **Feature**: `flaky-ci-closed-loop`（`ci-flaky-test-detection` の amend spec）
- **Discovery Scope**: Extension（既存の 2 スキル＋1 コマンド＋2 つのクラウド routine の改修。新しい外部サービスは無し。新規ファイルは GitHub Actions workflow 1 本）
- **Key Findings**:
  - クラウド routine の実行時トークンは、組織にインストールされた Claude GitHub App の権限（`actions: write` を含む）より狭く発行されており、`gh run rerun` は毎回 403 になる。付与先が手元に無いため、確認手段は「push で起動する workflow」に置き換える
  - GitHub Actions の `paths` フィルタは新しいブランチへの push で「最も深いコミットの祖先の親」との差分を見るため、失敗コミットから切ったブランチへの空コミット push でも通常 CI が動きうる。通常 CI を余計に回さない保証は `branches-ignore` で明示する
  - 直近 20 回の routine 実行ログで、`flaky/suspected` の issue は例外なく Step 2 の確認ゲートで停止しており、停止後に再選択される経路が無い。「判断待ち」を状態にし、人の返答で再開する経路を追加する

## Research Log

### クラウド routine の権限と、なぜ `gh run rerun` が使えないか
- **Context**: `investigate-flaky-test` の Step 2 が「疑いあり issue は CI を 1 回再実行して確認する」を必須ゲートにしており、routine 実行ログでこのゲートが毎回 `403 Resource not accessible by integration` で止まっていた
- **Sources Consulted**: `gh api orgs/growilabs/installations`（Claude App の installation permissions）、routine 実行ログ（cse_01G2RFMDW4G7ya1pogZC169p 他）、PR #11824 / #11853 / #11863 の本文
- **Findings**:
  - App installation の権限は `actions: write, checks: write, contents: write, issues: write, pull_requests: write, workflows: write, statuses: read`。App 自体には再実行権限がある
  - それでも routine 内の `gh run rerun` と REST `POST .../rerun-failed-jobs` は 403。実行環境がセッションごとに発行するトークンが App の権限より狭い（推定。設定項目は見当たらない）
  - 同じ環境で `git push`・PR 作成・issue コメント・ラベル変更は成功している（contents / pull_requests / issues の write は持っている）
  - `gh pr ready`（draft → Ready）は GraphQL 専用で、この環境の egress proxy が GraphQL を遮断しているため別の理由で不可
- **Implications**: 確認と検証の手段は「push できること」「REST で読めること」だけで成立させる。PR は最初から Ready で開く（draft を経由しない）

### `gh run rerun` と push 起動の再現 workflow の測定器としての比較
- **Context**: 権限が将来取れた場合も含めて、どちらを主手段にするか
- **Findings**:
  - `rerun --failed` は元 run の失敗ジョブを丸ごと 1 回（約 10 分 × matrix）流す 1 標本。再び落ちたときに「運悪く 2 回目」と「本物の回帰」を区別できない（実際に #11853 / #11863 はこの曖昧さで却下された）
  - 対象ファイルだけを別プロセスで N 回流せば、k/N の集計が得られ、本物の回帰は N/N で落ちるので区別できる。1 回あたり 10〜20 秒
  - 修正の検証も同じ手段で「修正後 N 回連続成功」を数分で取れる。`rerun` だと PR の CI を丸ごと 2〜3 回（30 分前後）
- **Implications**: 権限の有無に関係なく push 起動の再現 workflow を主手段にする。権限が取れたら「元 run と同条件で 1 回流す」補助として `rerun` を足せるが、要件は変えない

### 回数の既定値（確認 3 回・検証 3 回連続成功）
- **Context**: 当初案の 10 回 / 5 回は多すぎるとユーザーが判断
- **Findings**: 疑いあり issue には CI 上の失敗が最低 1 回記録されているので、それを失敗側の標本に数えれば、確認に必要なのは「1 回でも成功すること」。本物の回帰は 3/3 で落ちるので 3 回で区別できる。修正検証の 3 回連続成功は、失敗率 30% の flake を 34% の確率で見逃す弱さがあるが、PR の通常 CI がもう 1 標本を足すこと、マージ後も `detect-flaky-ci` の再オープン経路が控えていることで補う
- **Implications**: 既定 3 / 3。trailer で上書き可（上限 10）

### GitHub Actions の `paths` フィルタと新しいブランチ
- **Context**: 要件 6.7「確認実行で通常 CI の実行回数を増やさない」を、失敗コミットから切ったブランチへの空コミット push で満たせるか
- **Sources Consulted**: GitHub Docs "Workflow syntax" → `on.<push>.<paths>` の "Git diff comparisons"
- **Findings**（原文引用）:
  - 新しいブランチ: "A two-dot diff against the parent of the ancestor of the deepest commit pushed"
  - "If there are no files changed, the workflow will not run."
  - 1,000 コミット超・diff 生成のタイムアウト時は常に実行される
- **Implications**: 空コミットなら「変更ファイル無し」で動かないと読めるが、新ブランチの比較基準の文言が曖昧で、失敗コミット自身の差分が含まれる可能性を否定できない。`ci-app.yml` / `ci-app-prod.yml` の `branches-ignore` に `flaky-repro/**` を明示して保証する（1 行ずつ）

### 再現結果の置き場所
- **Context**: routine はジョブログを `gh` では読めない（blob storage へのリダイレクトが遮断）。MCP の `get_job_logs` は 50 万文字級のログを返し、結果行の抽出が高コスト
- **Alternatives**: (a) check-run の `output` に集計を書く（`checks: write` が要る。REST `GET commits/{sha}/check-runs` で読める） (b) 追跡 issue にコメントとして書く（`issues: write`。routine が既に読んでいる経路） (c) ジョブサマリのみ
- **Selected**: (b) を正とし、(c) を人向けに併用。check-run の conclusion は「測定が完了したか」だけを表す（success = 測定できた、failure = 測定できなかった）
- **Rationale**: 元 spec の原則「状態は GitHub issue / label / PR のみ」に乗る。routine 側の読み取りコードを増やさない。コメント見出しは `### Repro result` とし、Occurrences 集計の見出し（`### Additional observation` / `### Backfilled observation`）と衝突させない

### 汎用 issue 調査 routine との重なり
- **Context**: 「Investigate GROWI Issues」（trig_01VWWpiRKJPhKM55BiUEmPtb）は `0️⃣ phase/new` の issue を 1 件拾って `/investigate-issue --auto` を実行する
- **Findings**: 2026-09-10 の実行（cse_01N2cafzX2EDGrDnKEsyaRh5）で `flaky/observing` の #11870 を拾い、PR #11882 を出した。結果は正しかったが、flaky 用の手順（identity・tier・ダッシュボード）を経ずに処理され、PR イベントの購読で 1 日半セッションが残った
- **Implications**: 汎用 routine のプロンプトに「`flaky/` で始まるラベルを持つ issue は対象外」を追加する。flaky 側のスキルには「購読・再起床の予約をしない」を明記する

### 汎用 routine と flaky routine の起動間隔
- **Findings**: `growi-flaky-ci-routine` の cron は `0 0,16 * * *`（2026-09-08 変更）。間隔は 16h と 8h の交互。`detect-flaky-ci` の窓の既定は 16h（8h 周期の 2 倍前提）で、1 回抜けると取りこぼす
- **Implications**: プロンプトで `--window-hours=32` を明示する（要件 11.1: 最長間隔の 2 倍）

### 巻き添え・連鎖・誤検出の実例
- **Sources**: 追跡 issue 20 件の本文とコメント（2026-09-14 時点）
- **Findings**:
  - 共有フック timeout（#11752）と同一 run で、他ファイルの 5000ms timeout が独立 issue になった例: #11851, #11852, #11858（run 33650461350 / 33845711223）。#11852 はテスト本体に 5 秒を使い切る要素が無く、巻き添えと判定してクローズ済み
  - 同一ファイル内の連鎖: #11849 の後続 3 テストが #11890 / #11891 / #11892 になった（`Should not already be working` は先頭失敗の後始末に起因）
  - lockfile 起因の決定的失敗: #11849 は dependabot PR の `pnpm-lock.yaml` で `@codemirror/state` が 6.7.1 と 6.7.4 に分かれていたもの。判定①は `pnpm-lock.yaml` しか触っていない差分を「無関係」と読んだ
  - master に無いコミット: #11799（マージキュー上の PR #11750 のコミット）、#11864（PR #11827 が追加した spec。マージ先は機能ブランチ `feat/185872-backlinks`）
  - ネットワーク: #11708 は github.com からの実ダウンロード
- **Implications**: 要件 7・8 の各ルールはこれらの実例をそのまま判定条件にする

### 人のコメントの判定
- **Context**: 要件 9.3「人のコメントで再開」の「人」をどう判定するか。routine がローカル実行されたときは `yuki-takei` 名義で Claude 署名付きコメントが投稿される
- **Findings**: 自動投稿は (a) `user.type == "Bot"`（`claude[bot]`）か、(b) 本文末尾に `_Generated by [Claude Code]` または `*Investigated by Claude Code` の署名を持つ。人の判断コメントはどちらも持たない
- **Implications**: 「`user.type == "User"` かつ署名無し、かつ `flaky/needs-decision` ラベル付与イベント（REST `GET /issues/{n}/events` の `labeled`）より後」を人の返答とみなす

### Playwright の扱い
- **Findings**: `ci-app-prod.yml` は push では master / dev ブランチしか動かず、PR で動く。fix ブランチへの push だけでは e2e は走らない
- **Implications**: Playwright の修正は再現 workflow の対象外。PR を Ready で開き、PR 自身の `run-playwright`（retries: 2）を検証とする。修正後も retry が要ったら `detect-flaky-ci` の Step 2b がそれを観測して issue に戻す（既存経路）

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| A. `gh run rerun` に権限を付ける | 環境側で `actions:write` を持つトークンを発行してもらう | 変更最小 | 付与先が手元に無い。得られるのは 1 標本の丸ごと再実行で、回帰との区別がつかない | 将来権限が取れても補助扱い |
| B. push 起動の再現 workflow（採用） | trailer で対象を指定し、ファイル単位で N 回実行して集計を issue に書く | 権限不要。k/N の数字が出る。修正検証にも使える | workflow 1 本と trailer の約束事が増える。サービス起動手順が `ci-app.yml` と重複 | 重複は Revalidation Trigger に登録 |
| C. `workflow_dispatch` | 手動起動 API で対象を渡す | 入力の型が明示できる | `workflow_dispatch` の起動も `actions:write` が要る | 不可 |
| D. 再現専用の reusable workflow を `ci-app.yml` から呼ぶ | サービス起動を共通化 | 重複が消える | `ci-app.yml` のジョブ構造（YAML anchor）を組み替える必要があり、本 spec の変更範囲を超える | 後続候補として記録 |

## Design Decisions

### Decision: 確認・検証の手段は push 起動の再現 workflow に統一する
- **Context**: 上記「権限」「測定器の比較」
- **Alternatives Considered**: 上表 A〜D
- **Selected Approach**: `.github/workflows/flaky-repro.yml` を追加。`flaky-repro/**`（確認用の空コミット）と `fix/flaky-**`（修正ブランチ）への push で起動。対象は head commit の git trailer で指定。結果は追跡 issue への `### Repro result` コメントとジョブサマリ
- **Rationale**: routine が持つ能力（push・REST 読み書き）だけで閉じる。数字で判断できる
- **Trade-offs**: workflow 1 本の保守。サービス起動手順の重複
- **Follow-up**: 実装後、既知の安定 spec と #11849 型の決定的失敗の両方で 3/3 の挙動を実測する

### Decision: check-run の conclusion は「測定できたか」だけを表す
- **Context**: 確認実行ではテストが落ちることが正常な結果。conclusion にテスト結果を載せると、通常の「赤＝異常」と意味が混ざる
- **Selected Approach**: 前処理（checkout・依存・サービス起動・対象 spec の存在確認）が完了しテストを N 回流せたら success。前処理で失敗したら failure。合否は issue コメントとサマリに書く
- **Rationale**: routine 側は「success なら結果コメントを読む、failure なら要件 6.6（確認未実施）」の 2 分岐で済む

### Decision: trailer の値は allowlist で検証する
- **Context**: コミットメッセージが実行内容を決める。push 権限を持つ人は既に任意の CI を動かせるが、値の取り違えで無関係なコマンドが走るのは避ける
- **Selected Approach**: `Flaky-Repro-Project` は `app-unit | app-components | app-integration | app-integration-exclusive` のみ。`Flaky-Repro-Spec` はリポジトリ内に存在するファイルパスのみ（パスをそのまま vitest の引数に渡す。シェル展開しない）。`Flaky-Repro-Repeat` は 1〜10 の整数。`Flaky-Repro-Mode` は `file | suite`。`Flaky-Repro-Issue` は整数。検証に落ちたら前処理失敗として終了
- **Trade-offs**: 新しい vitest project を足すときに allowlist の更新が要る（Revalidation Trigger）

### Decision: 通常 CI の除外は `branches-ignore` で明示する
- **Context**: 上記「`paths` フィルタと新しいブランチ」
- **Selected Approach**: `ci-app.yml` と `ci-app-prod.yml` の `push.branches-ignore` に `flaky-repro/**` を追加。`fix/flaky-**` は除外しない（本物の変更なので通常 CI も走るべき）
- **Rationale**: `paths` の挙動に依存しない 1 行の保証

### Decision: 「巻き添え」は同一 run の timeout に限る
- **Context**: 要件 7.1 の範囲
- **Selected Approach**: 共有 setup フック（`test/setup/` 配下）の `Hook timed out` を含む run において、他ファイルの `Hook timed out` / `Test timed out` だけを巻き添え候補にする。アサーション失敗・unhandled rejection・接続エラーは対象外（負荷で説明できないため）
- **Rationale**: #11852（timeout・巻き添え）と #11864（unhandled rejection・独立）の実例に合わせる

### Decision: 判断待ちの再開は「人の新規コメント」だけをトリガーにする
- **Alternatives**: (1) 人のコメント (2) 新規観測が k 件以上 (3) 一定日数経過
- **Selected**: (1) のみ。(2)(3) はダッシュボードの表示に反映するに留める
- **Rationale**: 判断待ちで止まった理由は「人の判断が要る」ことなので、判断が来ていないのに再開すると同じ場所で止まって費用だけ増える

### Decision: 自動クローズは `flaky/observing` のみ、14 日
- **Context**: 要件 10。`suspected` / `confirmed` は既に証拠が複数あるか調査対象なので対象外
- **Selected Approach**: 最終観測 `Date:`（本文＋観測コメント）から 14 日以上経過した `observing` を `not planned` でクローズし、`### Auto-closed: not reproduced within 14 days` を書く。再オープンは既存の CLOSED issue 経路（`Fixed by` が無い＝解決時刻不明→再オープン）で成立する

### Decision: routine のモデル（判断材料として記録、要件では定めない）
- **Findings**: 現在 `claude-sonnet-5`。調査は原因追及の質が結果を左右し、今回の分析でも「読めば分かる」原因（#11818 のモック漏れ、#11823 の `fs.rm` の `force` 欠落）を調査コメントが取り逃がしている
- **Recommendation**: `investigate-flaky-test` の実行だけ Opus 系にする案を tasks の運用タスクで提示する。費用はユーザー判断

## Risks & Mitigations
- 再現 workflow のサービス起動手順が `ci-app.yml` と乖離する — 両ファイルに相互参照コメントを置き、Revalidation Triggers に登録する
- 3 回連続成功で見逃す flake がある — PR の通常 CI とマージ後の `detect-flaky-ci` 再オープン経路が控えている。見逃しは「別の日に再び追跡される」だけで、無言で消えることはない
- 人のコメント判定が署名の文言に依存する — 署名文言を `flaky-ci-routine.md` に定数として明記し、両スキルがそれを参照する
- 巻き添え判定で独立した flake を見逃す — 巻き添えコメントは残るので、フック timeout の無い run で再発したときに独立 issue になる（要件 7.2）

## References
- GitHub Docs: Workflow syntax — `on.<push>.<paths>` / Git diff comparisons — https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- GitHub REST: Compare two commits（祖先判定） / Check runs for a Git reference / Issue events
- 元 spec: `.kiro/specs/ci-flaky-test-detection/`（research.md に既存ツール比較と状態設計の理由）
- 分析レポート: `.kiro/specs/ci-flaky-test-detection/flaky-issue-mechanism-review.md`（2026-09-14）
