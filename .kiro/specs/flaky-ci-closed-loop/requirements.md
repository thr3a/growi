# Requirements Document

## Project Description (Input)

flaky-ci-closed-loop — 完了済み spec `ci-flaky-test-detection` を改修する amend spec（spec-lifecycle ルール適用: 実装後に元 spec へ移して自分を削除する）。

### Amend target

`.kiro/specs/ci-flaky-test-detection/`（Requirement 1〜5 のうち 1・2・3・5 の契約、および `.claude/skills/detect-flaky-ci/SKILL.md`、`.claude/skills/investigate-flaky-test/SKILL.md`、`.claude/commands/flaky-ci-routine.md`、クラウド routine `growi-flaky-ci-routine`（trig_015hftCjMvk2F6AW59t3tLLV）と汎用 routine「Investigate GROWI Issues」（trig_01VWWpiRKJPhKM55BiUEmPtb）のプロンプト）。

### 背景（2026-09-14 の実測に基づく問題）

現行の仕組みは「検出→調査→PR」の一気通貫を目指しているが、無人運用で flaky test が収束しない。原因は調査力ではなく、次の 5 点。

1. クラウド routine の実行時トークンに `actions:write` が無く（組織にインストールされた Claude GitHub App 自体は `actions: write` を持っているが、実行環境が発行するトークンはそれより狭い。付与先が手元に無い）、`investigate-flaky-test` が必須ゲートにしている「CI 再実行による確認」（`gh run rerun`）が毎回 403 で失敗する。ゲートの定義上 MEDIUM 確信度で止まるため、vitest 系 issue は全件「人の判断待ち」で停止する。PR を draft から Ready にする操作（GraphQL 限定）も不可で、PR が draft のまま放置される。
2. routine は `phase/new` の issue しか調査対象にせず、一度 `under-investigation` になった issue は新しい観測が追加されても再調査されない。「人の判断待ち」であることがラベルにもダッシュボードにも現れず、誰も拾いに来ない。
3. 「1 テスト = 1 issue」のため、共有 setup フックの timeout（#11752）の巻き添え（同一実行の他ファイルの 5000ms timeout: #11851/#11852/#11858）や 1 ファイル内の連鎖失敗（#11849/#11890/#11891/#11892）が別 issue になり、原因の数の数倍に見える。
4. flaky でないものを flaky として拾う: (a) dependabot が再生成した lockfile で `@codemirror/state` が 2 バージョン併存 → 判定①「PR の差分が該当箇所を触っていない」が `pnpm-lock.yaml` の変更を無関係と読み飛ばした（#11849、13 回観測）。(b) master の祖先でないコミット（マージキュー・機能ブランチ）で、その PR 自身が追加・変更した spec の失敗（#11799、#11864）。(c) github.com から実ダウンロードするテストのネットワーク失敗（#11708）。
5. 運用パラメータのずれ: cron が `0 0,16`（16h/8h 交互）なのにスキャン窓の既定が 16h（8h 周期前提）。汎用 routine「Investigate GROWI Issues」が `phase/new` の flaky issue も拾ってしまう（#11870 で発生）。routine セッションが PR イベント購読で長時間 active のまま残る。

### 目指す形

- **再実行ゲートを `actions:write` 不要の方式に置き換える**: `.github/workflows/flaky-repro.yml`（新規）を追加し、`flaky-repro/**` および `fix/flaky-**` ブランチへの push で起動。head commit の git trailer（`Flaky-Repro-Spec: <path>` / `Flaky-Repro-Project: <vitest project>` / `Flaky-Repro-Mode: file|suite` / `Flaky-Repro-Repeat: N`）で対象を指定し、file モードは対象 spec を別プロセスで N 回、suite モードは対象プロジェクトのテストスクリプトを CI と同条件で 1 回実行し、合否の集計を check-run の出力に残す。routine は push と REST の check-runs 参照だけで「本当に非決定的か」「修正後 N 回連続成功か」を数字で確認でき、HIGH 確信度に到達できる。修正 PR は集計が揃ってから最初から Ready 状態で開く（draft→ready 操作を不要にする）。空コミットは ci-app.yml の paths フィルタに掛からないので通常 CI を余計に回さない。Playwright の再現は本 spec の対象外（in-run retry で既に confirmed になるため）。
- **識別子のまとめ方**: 共有フック timeout はフックのパスで 1 件（現状どおり）。同一実行に共有フック timeout があるときの他ファイルの timeout は既存 issue への「巻き添えの可能性」コメントに留め、フック timeout の無い実行で再発したときだけ独立 issue にする。同一ファイル内の連鎖失敗は先頭 1 件のみ issue 化する。
- **誤検出の除外**: (a) 失敗コミットが master の祖先でなく、かつその PR 自身が対象 spec を追加・変更している場合は追跡対象外。(b) 判定①は `pnpm-lock.yaml` の差分に、失敗箇所のスタックトレースに現れるパッケージ名が含まれるかまで確認する。(c) denylist に `Failed to download file.` を追加。
- **「判断待ち」を状態として持つ**: MEDIUM/LOW で停止するとき `flaky/needs-decision` ラベルを付け、ダッシュボードに「人の判断待ち」の節（推奨案の 1 行付き）を設ける。人がその issue にコメントすると、次の routine がそれを判断として読み取り再開する（Step 2 の選択条件に追加）。
- **停滞の自動処理**: `flaky/observing` のまま 14 日以上再発なし → 「再現せず」でクローズ（再発時は既存の再オープン経路で戻る）。
- **禁止事項**: routine は PR イベントの購読や wakeup の予約をしない。
- **運用パラメータ**: スキャン窓を cron 周期の 2 倍に合わせる（`--window-hours=32` を prompt で明示、または cron を `0 */8`）。汎用 routine は `flaky/*` ラベル付きを対象外にする。routine のモデルを Opus にする案は費用と合わせて判断材料として記載。

### スコープ外

テスト基盤そのものの修正（`test/setup/migrate-mongo.ts` の削除 = #11752 の根本修正）と個別テストの設計不良の修正は、通常の PR として別途行う（本 spec は仕組み側のみ）。

### 制約

状態は GitHub issue/label/PR のみ（元 spec の原則を維持）。REST 専用（GraphQL 不可）。ジョブログ取得手段は実行開始時に 1 回決定。既存の Requirement ID は変更せず、追加分は末尾に追記する（spec-lifecycle ルール (a)）。

## Introduction

本ドキュメントは、無人で動いている flaky test 対応ルーティン（`ci-flaky-test-detection`
で定義済み）が「放っておいても flaky test の件数が減っていく」状態になるための追加要件を
定義する。既存の Requirement 1〜5 は変更しない。本 spec の要件は **Requirement 6 から採番**
し、元 spec に移すときもこの番号のまま末尾に追記する（実装コードや issue コメントが
番号を参照しても壊れないようにするため）。

2026-09-14 の実測で分かった止まり方は、調査の中身ではなく次の 3 種類だった。
(1) 実行環境が持たない権限（CI の再実行）を必須ゲートにしていたため全件が判断待ちで
止まる。(2) 判断待ちで止まった事実がどこにも見えず、再び拾われない。(3) 1 つの原因が
複数 issue に分かれ、flaky でないものも混ざるため、件数が実態より膨らむ。本要件は
この 3 点をそれぞれ塞ぐ。

## Boundary Context

- **In scope**:
  - 疑いあり issue の確認と修正 PR の検証を、CI 再実行権限が無い実行環境でも数値の
    証拠で完了できるようにすること
  - 1 つの原因から出た複数の失敗を 1 件として追跡し、flaky でない失敗を追跡対象から
    外すこと
  - 人の判断待ちで止まった issue を状態として持ち、ダッシュボードで見え、人の返答で
    再開すること
  - 再発しない issue を自動で閉じること
  - routine の起動間隔・隣接する汎用 issue 調査ルーティンとの整合
- **Out of scope**:
  - テスト基盤そのものの修正（共有 setup フックの負荷除去 = #11752 の根本修正）と、
    個別テストの設計不良の修正。これらは本 spec と並行して通常の PR で行う
  - Playwright（e2e）の再現実行。Playwright は同一 run 内の retry で既に確定済みの
    証拠が得られるため、本 spec の確認手段の対象外
  - routine が使うモデルの選択。判断材料は設計で記録するが、要件では定めない
- **Adjacent expectations**:
  - 追跡 issue のラベル追加・cron ルーティンのプロンプトや起動間隔の変更は、リポジトリ
    外のオペレーター作業として本 spec の実装タスクに含める（自動では変わらない）
  - 本 spec が作る修正 PR は、従来どおり GROWI の通常のレビュー・マージ手順に乗る。
    routine は自分でマージしない

## Requirements

### Requirement 6: CI 再実行権限に依存しない非決定性の確認と修正の検証

**Objective:** 無人でルーティンを運用するオペレーターとして、実行環境が CI の再実行権限を持たなくても「本当に非決定的か」「修正で直ったか」を数値の証拠で確定してほしい。それにより、確認できないことを理由に調査が全件止まる状態をなくす。

#### Acceptance Criteria

1. When 疑いあり状態の issue の確認が必要になった場合, the flaky-ci-routine shall 対象テストを、コードを変更せずに、独立した複数回（回数は設定可能、既定 3 回）実行した合否の集計を、CI ワークフローの再実行権限を必要としない手段で取得する。
2. When 合否の集計に 1 回以上の成功が含まれる場合, the flaky-ci-routine shall issue に記録済みの CI 上の失敗を失敗側の標本として数え、その issue を確定済みに格上げし、集計値（失敗回数 / 実行回数、記録済みの失敗を含む）を issue に記録する。
3. If 合否の集計が全回失敗だった場合, the flaky-ci-routine shall それを「本物の回帰の可能性」として issue に明示し、flaky の修正として扱わない。
4. When 修正の検証が必要になった場合, the flaky-ci-routine shall 修正後のコードに対して同じ手段で連続成功回数を取得し、既定回数（設定可能、既定 3 回）の連続成功が得られた場合に限り、修正 PR を最初からレビュー可能な状態で作成する（下書き状態を経由しない）。
5. If 修正後の連続実行のいずれかが失敗した場合, the flaky-ci-routine shall 修正 PR を作成せず、失敗の内容を issue に記録して人の判断待ち（Requirement 9）に回す。
6. If 確認手段そのものが利用できなかった場合（実行が始まらない、または結果が取得できない）, the flaky-ci-routine shall 既存の静的な証拠を確認の代わりとして扱わず、「確認未実施」として人の判断待ち（Requirement 9）に回す。
7. The flaky-ci-routine shall コード差分の無い確認実行のために、監視対象の通常 CI ワークフローの実行回数を増やさない。

### Requirement 7: 同一原因から出た複数の失敗の集約

**Objective:** GROWI のメンテナーとして、1 つの原因から出た失敗は 1 件の issue として追跡されてほしい。それにより、ダッシュボードの件数が原因の数と一致し、優先順位を正しく判断できる。

#### Acceptance Criteria

1. When 1 つの run で共有 setup フックの timeout が観測され、かつ同じ run で別のテストファイルの timeout（フックまたはテスト本体）が観測された場合, the flaky-ci-routine shall 後者を新しい issue にせず、共有 setup フックの追跡 issue に「巻き添えの可能性」として記録する。
2. When 前項で「巻き添えの可能性」として記録したテストが、共有 setup フックの timeout を含まない run で再び失敗した場合, the flaky-ci-routine shall そのときに初めて独立した追跡 issue を作成する。
3. When 1 つのテストファイル内で、先頭の失敗に続いて同じ run の後続テストが連鎖して失敗した場合, the flaky-ci-routine shall 先頭の失敗だけを識別として issue 化し、連鎖した失敗は同じ issue に列挙する。
4. The flaky-ci-routine shall 「巻き添えの可能性」として記録したテストと、連鎖として列挙したテストを、ダッシュボードの独立した行として数えない。

### Requirement 8: flaky でない失敗の追跡対象からの除外

**Objective:** GROWI のメンテナーとして、決定的に失敗するものや変更中の PR 自身の失敗が flaky として追跡されないでほしい。それにより、追跡 issue はすべて「master 上で非決定的に失敗するもの」だけになる。

#### Acceptance Criteria

1. When 失敗した run のコミットが既定ブランチの履歴に含まれず、かつその run に紐づく PR が失敗したテストのファイルを追加または変更している場合, the flaky-ci-routine shall その失敗を追跡対象外とし（issue を作らず）、実行サマリーに件数を報告する。
2. When 「変更内容と無関係な失敗」の判定を行う際に、PR の差分に依存関係のロックファイルの変更が含まれる場合, the flaky-ci-routine shall 失敗のスタックトレースに現れるパッケージ名がそのロックファイル差分に含まれるかを確認し、含まれる場合は「無関係」と判定しない。
3. When 失敗ログが外部ネットワークからの取得失敗（例: `Failed to download file.`）に一致する場合, the flaky-ci-routine shall それをインフラノイズとして flaky 分類から除外する。
4. When 調査の結果、失敗が非決定的ではなく決定的な原因（依存関係の重複、生成物の不足、ビルド順序など）によるものと判定された場合, the flaky-ci-routine shall 追跡 issue に判定理由を記録して flaky 追跡としてはクローズし、原因の修正は通常の issue / PR として扱う旨を残す。

### Requirement 9: 人の判断待ちの可視化と、人の返答による再開

**Objective:** GROWI のメンテナーとして、自動調査が人の判断を待って止まっている issue がどれで、何を決めればよいかが一目で分かってほしい。それにより、判断を返せばそこから自動で再開する。

#### Acceptance Criteria

1. When 調査が中程度または低い確信度で停止する場合, the flaky-ci-routine shall その issue に「人の判断待ち」を表す状態を付け、推奨する選択肢を 1 行で issue に残す。
2. When ダッシュボードを更新する場合, the flaky-ci-routine shall 判断待ちの issue を専用の節に、停止日と推奨する選択肢とともに一覧する。
3. When 判断待ちの issue に、停止後に自動処理以外の人からのコメントが追加された場合, the flaky-ci-routine shall 次回の実行でその issue を調査対象に再選択し、そのコメントを判断結果として扱って調査を再開する。
4. When 判断待ちの issue に停止後も新しい観測が追加された場合, the flaky-ci-routine shall ダッシュボードの判断待ちの節にその件数を反映する。
5. The flaky-ci-routine shall 停止した issue や作成した PR を、イベントの購読や再起床の予約によって監視し続けない。次回の定期実行で改めて拾う。

### Requirement 10: 再発しない issue の自動クローズ

**Objective:** GROWI のメンテナーとして、1 回観測されただけで再発しない issue が一覧に残り続けないでほしい。それにより、ダッシュボードには対応が必要なものだけが残る。

#### Acceptance Criteria

1. When 観測中（observing）状態の issue の最終観測から既定日数（設定可能、既定 14 日）以上、新しい観測が無い場合, the flaky-ci-routine shall 「期間内に再現せず」の記録を残してその issue をクローズする。
2. When 前項でクローズした識別が再び失敗した場合, the flaky-ci-routine shall 既存の再オープン経路でその issue を再オープンする（修正による解決ではないため、時刻の前後判定を要しない）。
3. When 自動クローズを行った場合, the flaky-ci-routine shall 実行サマリーとダッシュボードにその件数と issue 番号を報告する。

### Requirement 11: 起動間隔と隣接ルーティンとの整合

**Objective:** ルーティンを運用するオペレーターとして、起動間隔の変更や別のルーティンとの重なりで検出漏れや二重処理が起きないでほしい。

#### Acceptance Criteria

1. The flaky-ci-routine shall スキャン窓を、実際の起動間隔のうち最長のものの 2 倍以上にする（起動間隔が不均一な場合は最長間隔を基準とする）。
2. The 汎用 issue 調査ルーティン shall flaky 追跡 issue（flaky 系のラベルを持つ issue）を調査対象から除外する。
3. When ルーティンの実行が完了した場合, the flaky-ci-routine shall 実行サマリーに、確認実行の回数と消費した CI 時間、判断待ちの件数、自動クローズの件数を含める。
