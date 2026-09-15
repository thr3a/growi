# GROWI 翻訳プログラム運用準備手順（メンテナー向け）

このドキュメントは、GROWI のコミュニティ翻訳の受け皿となる POEditor 環境と、リポジトリ側の自動反映に必要な承認ボットアカウントを、メンテナーが実際に用意するための手順書です。

対象読者は、GROWI 組織の GitHub リポジトリ設定権限と、GROWI 用の POEditor アカウントを作成できる立場にあるメンテナーです。貢献者（翻訳者）向けの案内は [`docs/i18n-community-translation.md`](./i18n-community-translation.md) を参照してください。この文書はその前提となる環境を作る側の手順です。

## この手順が満たすべき条件

- POEditor の OSS プランが承認されるまで、本番運用（実際の同期ワークフローの起動）を進めてはいけません（`.kiro/specs/i18n-community-translation/requirements.md` 要件7.2）。OSS プランが承認されない場合は、同等の規模を満たす代替プラン・代替サービスが確認できるまで本番運用へ移行しません。
- この条件は、以下の手順のうち「1. POEditor OSS プランの申請」が承認された後にのみ、後続タスク（5.1・5.2 のワークフロー配線、6.1・6.2 の実環境確認）を本番相当で動かしてよいことを意味します。承認前の段階では、テスト用の POEditor プロジェクト（無償の Free プランなど、上限のある個人・テスト用プロジェクト）で動作確認を行っても構いません。OSS プラン承認前に行うのはあくまで動作確認であり、実際の翻訳者を受け入れる本番運用ではありません。

## 1. POEditor OSS プランの申請

POEditor 上のプロジェクトは単一（後述の「2. 単一の POEditor プロジェクトを作成する」）なので、この OSS プラン申請も GROWI プロジェクト全体に対して一度だけ行えば済みます。namespace ごとに申請し直す必要はありません。

### 1.1 申請できる条件

POEditor が公開している OSS プログラムの適用条件は「OSI 認定ライセンスであること」のみで、商用製品の有無を理由にした除外条項はありません（`.kiro/specs/i18n-community-translation/brief.md` の Approach 節）。GROWI は MIT ライセンスなので、この条件を満たします。

承認された場合、文字列数・言語数・貢献者数の上限が撤廃されます（要件7.1）。承認されるかどうか、および承認までの所要期間は POEditor 側の裁量であり、GROWI 側でコントロールできません。

### 1.2 申請手順

1. POEditor（`https://poeditor.com/`）にサインインします。GROWI 組織として使うアカウント（個人アカウントではなく、複数のメンテナーが引き継げるアカウント）を用意してください。
2. POEditor が提供している OSS プログラムの申請ページへ進みます（POEditor 側のサイト内に申請導線があります。具体的な申請フォームの URL はサイト構成の変更で変わる可能性があるため、`poeditor.com` 内の OSS / Open Source 向けページを都度確認してください）。
3. 申請フォームには少なくとも次の情報を用意します。
   - プロジェクト名（GROWI）
   - ライセンス種別（MIT）
   - リポジトリの公開 URL（`https://github.com/growilabs/growi`）
   - プロジェクトの簡単な説明（GROWI がチーム向け Wiki プラットフォームであること）
4. 申請後は POEditor からの返信を待ちます。承認・却下いずれの通知が来ても、このドキュメントの「1. この手順が満たすべき条件」に戻り、次のステップに進んでよいかを確認してください。

### 1.3 却下された場合

要件7.2により、却下された場合は同等規模（文字列数・言語数・貢献者数に実用上の上限がない）の代替プラン・代替サービスが確認できるまで本番運用に進みません。代替の検討は本ドキュメントの範囲外です（`.kiro/specs/i18n-community-translation/brief.md` の「他候補を落とした理由」に、検討済みの候補とその却下理由が記録されています。POEditor 自体が使えなくなった場合はこの記録を出発点に再検討してください）。

## 2. 単一の POEditor プロジェクトを作成する

### 2.1 なぜ1プロジェクトで足りるのか

GROWI の翻訳ファイルは `admin.json` / `translation.json` / `commons.json` の3 namespace に分かれており、`commons.json` には他ファイルと同一のキー文字列が意図的に複製されているものがあります。以前はこの衝突を避けるため namespace ごとに POEditor プロジェクトを分ける設計でしたが、現在は同期ツール側（`apps/app/tools/i18n-sync/`）が各 namespace の用語を `{namespace: 内容}` という構造で包んでから POEditor に送るようになっており、同一キー文字列が別の namespace に存在してもツール側の仕組みで区別できます。そのため、POEditor 上のプロジェクトを namespace ごとに分ける必要がなくなり、単一のプロジェクトで全 namespace の内容をまとめて扱えます（詳しい実装は `.kiro/specs/i18n-community-translation-single-project/design.md` を参照してください。この手順書ではその詳細までは踏み込みません）。

なお、GROWI 側で namespace ごとの絞り込み表示自体が不要になったわけではありません。同期ツールは用語を POEditor に送る際、その用語がどの namespace に属するかをタグとして付与します。貢献者は POEditor 画面上のタグ絞り込み機能を使うことで、関心のある namespace だけに絞って翻訳作業ができます（詳細は `docs/i18n-community-translation.md` の「参加方法」を参照してください）。

### 2.2 作成するプロジェクト

POEditor の「New project」機能で、GROWI の翻訳全体を受け皿とするプロジェクトを1つ作成します。

| 対応するリポジトリ側ファイル | プロジェクト名の例 |
|---|---|
| `apps/app/public/static/locales/<lang>/{admin,translation,commons}.json`（3 namespace すべて。`translation.json` には `packages/editor` の `toolbar.*` キーも含まれる） | GROWI |

このプロジェクトに、対応する言語を追加します。基準言語（ソース言語）は `en_US`、翻訳対象言語は `ja_JP` / `zh_CN` / `fr_FR` / `ko_KR` の4言語です（`docs/i18n-community-translation.md` の「対応している言語」と同じ一覧）。

### 2.3 初回の用語投入

プロジェクト作成直後は用語（キー）が空です。初回投入は、後続タスク5.1で配線される `i18n-sync-push` ワークフロー（または `apps/app/tools/i18n-sync/` のスクリプトを手動実行する形）で、リポジトリ側の `en_US` の JSON ファイルをアップロードして行います。この初回投入自体は本ドキュメントの手順の範囲外です（後続タスクの担当）。

### 2.4 プロジェクト ID をリポジトリに反映する（後続の作業）

プロジェクトを作成すると、POEditor 上のプロジェクト ID が割り当てられます。このプロジェクト ID は非公開情報ではなく、公開してよい情報です（トークンではないため）。

`apps/app/tools/i18n-sync/sync-config.ts` の `SHARED_POEDITOR_PROJECT_ID` には、現在プレースホルダー値 `'PENDING_SHARED_PROJECT_ID'` が入っています。

プロジェクトの作成後、このプレースホルダーを実際のプロジェクト ID に置き換えるコード変更を行ってください。この置き換えは本ドキュメントの手順書という文書だけでは完結せず、`sync-config.ts` を編集してコミットする作業が別途必要です。

## 3. public join page を有効化する

貢献者向けの参加方法（`docs/i18n-community-translation.md` の「参加方法」）は、GitHub アカウントなしで POEditor プロジェクトに参加できることを前提にしています。これは POEditor プロジェクトの「public join page」機能で実現します（要件1.1: GitHub アカウントを要求せずに参加手段を提示する）。プロジェクトが単一になったことで、この設定も一度だけ行えば済みます。

1. 作成したプロジェクトの設定画面を開きます。
2. 「Public」または「Join」に相当する設定を有効化し、招待メールなしで誰でも参加できる公開参加リンク（public join page の URL）を発行します。
3. 発行された参加リンクを控えます。プロジェクトは1つなので、URL も1つです。
4. 控えた参加リンクを `docs/i18n-community-translation.md` の「参加方法」セクションにある `（参加リンクをここに追記する。...）` の記載箇所に追記してください。これは `docs/i18n-community-translation.md` 自体の編集であり、本タスクの境界外（タスク4.1で作成済みの別ファイル）のため、別のコード変更として行ってください。

参加した利用者は、POEditor アカウント自体は必要です（匿名投稿はできません）が、個別の招待メールを待つ必要はありません（`.kiro/specs/i18n-community-translation/brief.md` の Constraints 節）。

## 4. 承認ボットアカウントを用意する

### 4.1 なぜ必要か

「訳文のみ」の変更提案 PR は、既存の i18n CI ゲート（`lint:i18n`、`ci-app-lint` に含まれる）を通過した場合に限り、人レビューを待たずに反映されます。この経路は、既存の `.github/mergify.yml` にある「Automatic queue to merge」ルール（`#approved-reviews-by >= 1` かつ変更要求レビューが無いこと）にそのまま乗せることで実現します。このルール自体は変更しません。

GitHub は PR 作成者自身による自己承認を拒否するため、「PR を作る ID」とは別の ID が承認レビューを送る必要があります。この別 ID が、ここで用意する承認ボットアカウントです（`.kiro/specs/i18n-community-translation/design.md` の Boundary Commitments「承認ボットの必要性」、および Security Considerations）。

「構造変更」を伴う PR（namespace 内のキーの増減など）には承認ボットは関与しません。これは通常の人レビュー必須 PR として作成され、人が承認すれば同じ既存ルールでキューに乗ります。

### 4.2 役割を分けるべき2つの identity

この仕組みでは、最終的に「PR を作る identity」と「PR を承認する identity」の2つを分けて運用します。どちらも GitHub Actions から使う対象ですが、長期保持する情報と一時的に mint する情報は分けます。

#### 4.2.1 `I18N_SYNC_PUBLISH_TOKEN`（公開系 identity）

`I18N_SYNC_PUBLISH_TOKEN` は、同期ブランチの push、PR の作成・更新、必要に応じた追跡ジョブの起動に使う identity です。`git push` に使う credential でもあり、ブランチを push した主体がこの identity になります。

この identity は「レビューだけ」ではなく、次のような書き込みが必要です。

- 同期ブランチの push
- PR の作成または更新
- CI を起動し、レビュー待ちの状態へ進める

そのため、`I18N_SYNC_PUBLISH_TOKEN` は通常、以下のどちらかで生成します。

- GitHub App のインストールアクセストークン（`contents: write` / `pull_requests: write` を持つ App から mint する）
- 専用ボットアカウントの PAT（必要最小限の権限のみ）

`i18n-sync-pull` ワークフローでは、`actions/checkout` に対して `token: ${{ secrets.I18N_SYNC_PUBLISH_TOKEN || secrets.GITHUB_TOKEN }}` を渡します。これは、同期ブランチの push に使う認証情報がこの identity であることを意味します。

> 重要: `I18N_SYNC_PUBLISH_TOKEN` は「承認レビュー用」ではありません。これは PR を作る側の identity であり、CI を動かし、ブランチを書き換え、PR を公開するための identity です。

#### 4.2.2 `I18N_SYNC_APPROVAL_TOKEN`（承認用 identity）

`I18N_SYNC_APPROVAL_TOKEN` は、作成された訳文のみ PR に対して承認レビューを出す identity です。

- これは「PR を作る identity」ではなく、「レビューを送る identity」です。
- `contents: write` のような書き込み権限は持たせません。
- `POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews` など、承認レビュー送信用 API のみに限定します。

この値が `I18N_SYNC_PUBLISH_TOKEN` と同じだと、GitHub は自己承認を拒否し、`apps/app/tools/i18n-sync/pull-translations.ts` 側でも実行時に弾きます。これは「PR を作る ID」と「PR にレビューを出す ID」を分ける設計です。

### 4.3 GitHub App を使う場合の正しい運用

GitHub App を選ぶ場合、長期間保持するのは「トークン」ではなく「秘密鍵」です。GitHub App の installation token は短時間で失効するので、repo secret に固定の長寿命 token を置いて使い回す設計は避けます。

正しい運用は次の流れです。

1. GitHub App を作成し、秘密鍵を安全に保管する。
2. App ID と秘密鍵を使って JWT を作成する。
3. installation ID を指定して `/app/installations/{installation_id}/access_tokens` を呼び、短命の installation token を mint する。
4. その短命 token を workflow の実行時にだけ使う。
5. 処理が終わった後に token は失効して使えなくなる。

つまり、repository secrets に保管してよいのは「長期で持つべき credential」であり、`I18N_SYNC_APPROVAL_TOKEN` / `I18N_SYNC_PUBLISH_TOKEN` のような short-lived token を固定長く持つのは避けるべきです。

> 重要: 長期保存すべきものは private key であり、token そのものは動的に mint して一時的に使うのが正しいです。

### 4.4 どの secret を repo に置くべきか

GitHub App 方式の場合、repository secret として置くべきものは次のように整理します。

- `I18N_SYNC_PRIVATE_KEY` または `GROWI_I18N_APP_PRIVATE_KEY` など
  - GitHub App の private key
  - これは長期保管対象
- `I18N_SYNC_APP_ID`
  - App ID
- `I18N_SYNC_INSTALLATION_ID`
  - 対象リポジトリに対する installation ID

一方で、以下は固定 secret として repository に置かない方がよいです。

- `I18N_SYNC_PUBLISH_TOKEN`
- `I18N_SYNC_APPROVAL_TOKEN`

これらは短命な token なので、workflow の起動時に mint して使う設計にするべきです。

### 4.5 役割の分離を守るための設計例

GitHub App 方式で、権限を分けるなら次のようにします。

- 署名・publish 用 App
  - `contents: write`
  - `pull_requests: write`
- 承認用 App
  - `pull_requests: write` のみ
  - `contents: write` は付与しない

この2つの App を分けておくことで、レビュー用 identity と push 用 identity が絶対に混ざらないようにできます。どちらも private key から mint した installation token を使う設計にすれば、固定値の token を環境に置かずに済みます。

### 4.6 どの identity を workflow に渡すか（token は runtime 発行）

最終的に GitHub Actions で必要になるのは次の2種類の identity ですが、固定値の token を長期間保存するのではなく、必要時に mint する運用を前提にします。

- `I18N_SYNC_PUBLISH_TOKEN` = PR を作るための identity
- `I18N_SYNC_APPROVAL_TOKEN` = PR を承認するための identity

ただし、GitHub App を使う場合は、これらの値そのものを repository secret に長期保存するのではなく、private key から発行する workflow 内のプロセスとして扱います。

> つまり、固定シークレットに保存するのは private key、発行するのは token という役割分担にします。token は runtime で mint し、短時間だけ使う設計が正しいです。

### 4.7 実際の発行例（GitHub App の場合）

GitHub App を使う場合、長期で持つのは秘密鍵であり、短命のアクセストークンは以下のような流れで生成します。

```bash
# 1. App ID と秘密鍵のパスを用意する
# 2. JWT を作成して署名する
# 3. installation ID を指定して installation token を mint する
# 4. その token を workflow の実行時にだけ使う
```

実際のワークフローでは、`I18N_SYNC_APPROVAL_TOKEN` はレビュー専用、`I18N_SYNC_PUBLISH_TOKEN` は push / PR 作成専用として mint し、使い切る構造にします。これは `GitHub App` / `PAT` にかかわらず、権限の分離が最優先であるためです。

## 5. POEditor API トークンを用意する

上記のプロジェクト作成・public join page 有効化とは別に、同期ワークフロー（push/pull）が POEditor API を呼び出すための API トークンが必要です。POEditor のアカウント設定画面から API トークンを発行し、GitHub Actions のリポジトリシークレット `POEDITOR_API_TOKEN` として登録してください（`.kiro/specs/i18n-community-translation/design.md` の Security Considerations、および要件2〜3で参照される同期ワークフローの認証情報）。このトークンもログやコードに平文で出力しないでください。

## 6. この手順の成果物を使う後続タスク

この手順を実行すると、以下が用意された状態になります。

- POEditor 上の1プロジェクトと、その public join page の URL
- `apps/app/tools/i18n-sync/sync-config.ts` の `SHARED_POEDITOR_PROJECT_ID` プレースホルダー値を置き換えるためのプロジェクト ID
- GitHub App 方式の場合: App private key、App ID、installation ID（長期保存するのはこれらのみ）
- 実行時に mint する publish/approval token の運用手順（同一 identity を使わないことを含む）
- POEditor API トークン（`POEDITOR_API_TOKEN` として登録予定）

これらは以下の後続タスクが直接使う前提です。

- タスク5.1（push ワークフローの配線）・5.2（pull ワークフローの配線、承認ボット・GitHub 操作の実アダプタ実装）は、上記のシークレット（`POEDITOR_API_TOKEN`、および GitHub App 方式なら private key / App ID / installation ID）と、置き換え済みのプロジェクト ID を前提に配線します。
- タスク6.1（push 経路の実環境確認）・6.2（pull 経路の実環境確認）は、実際の POEditor プロジェクト（本番用のプロジェクト、または OSS プラン承認前であればテスト用の POEditor プロジェクト）に対して動作確認を行うために、この手順で用意した環境を使います。

OSS プラン承認前にタスク6.1・6.2を進める場合は、本ドキュメント冒頭の「この手順が満たすべき条件」に従い、本番のプロジェクトではなくテスト用のプロジェクトを使ってください。
