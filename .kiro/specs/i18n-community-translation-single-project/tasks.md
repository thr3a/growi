# Implementation Plan

## 1. Foundation: 単一プロジェクト向けの共有部品

- [x] 1.1 (P) SyncConfigをnamespaceごとの複数プロジェクトIDから単一の共有プロジェクトIDへ変更する
  - `NamespaceSyncEntry` からnamespaceごとの `poeditorProjectId` フィールドを廃止し、全namespaceで共有する単一のプロジェクトID定数に置き換える
  - 既存のテストを、3つの別々のプロジェクトIDではなく単一の共有プロジェクトIDを検証する内容に書き換える
  - 観測可能な完了状態: `SYNC_TARGETS` の全エントリが同一のプロジェクトID定数を参照していることをテストが確認する
  - _Requirements: 1.1_
  - _Boundary: SyncConfig_

- [x] 1.2 (P) namespaceのJSONをラップ/アンラップする純粋関数を実装する
  - 複数namespaceの内容を、namespace名をキーとする1つのJSONに統合する処理を実装する
  - 単一namespaceの内容を、namespace名でラップする処理を実装する
  - 統合されたJSONから特定namespaceの内容だけを取り出す処理を実装する。対象namespaceのキーが存在しない、またはオブジェクトでない場合は空オブジェクトを返す（例外を投げない）
  - ファイル読み込みやAPI呼び出しを一切行わない純粋関数として実装する
  - 統合・単体ラップ・存在しないnamespaceの取り出し（空オブジェクトが返ること）の3パターンを検証する単体テストを書く
  - 観測可能な完了状態: 上記3パターンそれぞれで期待した結果が返ることをテストが確認する
  - _Requirements: 1.2, 1.3_
  - _Boundary: NamespaceEnvelope_

- [x] 1.3 (P) POEditorクライアントのアップロード処理に、削除有無の切り替えとタグ付けを追加する
  - アップロード処理に、プロジェクト全体をファイル内容へ収束させる（ファイルに無いキーを削除する）かどうかを切り替えられるオプションを追加する（省略時は現状通り収束させる）
  - アップロード処理に、渡した内容に含まれる全ての用語へタグを付与できるオプションを追加する（省略時はタグを付けない）
  - 削除を無効化した場合にAPIへ削除指示が送られないこと、タグを指定した場合に正しい形式でタグ指定が送られることを検証する単体テストを書く（HTTPモック）
  - 観測可能な完了状態: 削除無効化・タグ指定それぞれのケースで、モックしたAPI呼び出しの引数が期待通りであることをテストが確認する
  - _Requirements: 1.1, 1.2, 2.1_
  - _Boundary: PoeditorClient_

- [x] 1.4 (P) GROWIのロケールコードとPOEditorの言語コードの対応表を実装する
  - GROWIの5言語（`en_US`/`ja_JP`/`zh_CN`/`fr_FR`/`ko_KR`）それぞれに対応するPOEditorの言語コード（`en`/`ja`/`zh-CN`/`fr`/`ko`）を宣言データとして持つ
  - 宣言されていないロケールコードを渡した場合は例外を投げる
  - GROWIの5言語それぞれが正しいPOEditor言語コードに変換されること、未宣言のロケールで例外になることを検証する単体テストを書く
  - 観測可能な完了状態: 5言語分の変換結果が期待通りであることと、未宣言ロケールで例外が投げられることをテストが確認する
  - _Requirements: 4.1, 4.2_
  - _Boundary: LanguageCodeMap_

## 2. Core: push経路を統合アップロード＋namespace別タグ付けに書き換える

- [x] 2.1 (P) push CLIを、全namespace統合アップロード1回＋namespaceごとの非破壊的なタグ付けアップロードの2段階に書き換える
  - 全namespaceのen_USファイルを読み込み、1つのJSONに統合したうえで、プロジェクト全体を収束させるアップロードを**1回だけ**実行する
  - 続けてnamespaceごとに、そのnamespaceの内容だけをラップしたJSONを、削除を発生させない設定・該当namespaceのタグ付きでアップロードする
  - POEditor APIを呼ぶ直前に、GROWIのソース言語コード（`en_US`）をPOEditorの言語コード（`en`）へ変換する（既存実装が変換していなかった不具合の修正）
  - いずれかのnamespaceファイルの読み込みに失敗した場合、アップロードを一切行わずに処理全体を中止する
  - 統合アップロードまたはいずれかのタグ付けアップロードが失敗した場合、以降の呼び出しを行わずに非ゼロ終了コードで終了する
  - namespaceごとに個別に収束アップロードを行った場合、後続の呼び出しが前のnamespaceのキーを削除してしまうことを再現するミューテーションテストを書き、現在の実装（統合1回＋非破壊的タグ付け）ではこれが起きないことを確認する
  - 観測可能な完了状態: 統合テストが、収束アップロードが1回・タグ付けアップロードがnamespace数分呼ばれ、統合アップロードが失敗した場合はタグ付けアップロードが一切呼ばれないこと、およびPOEditorへの呼び出しに渡る言語コードが`en`であることを確認する
  - _Requirements: 1.1, 1.2, 2.1, 4.1_
  - _Depends: 1.1, 1.2, 1.3, 1.4_
  - _Boundary: PushSourceSync_

## 3. Core: pull経路を言語ごとの統合exportに書き換える

- [x] 3.1 (P) pull CLIのexport集計処理を、namespaceごとの個別exportから言語ごとの統合exportへ書き換える
  - 非ソース言語ごとに、GROWIのロケールコードをPOEditorの言語コードへ変換したうえで、全namespaceを含む統合exportを**1回だけ**呼ぶ
  - 統合結果を namespace ごとに分割してから、既存の変更判定処理（`DiffClassifier.classify`）へ渡す。判定結果の集計・グループ化・PR分岐ロジック自体は変更しない。リポジトリへの書き込み先ファイルパスの解決は引き続きGROWIのロケールコードで行う
  - ある言語の統合exportがJSONとして不正な形式だった場合、その言語に属する全namespaceの組み合わせをまとめてスキップ対象として扱い、他の言語の処理は継続する
  - 言語ごとのexportが1回だけ呼ばれ、結果が正しくnamespaceへ分割されて変更判定処理に渡ることを検証する統合テストを書く
  - 不正な形式のexportが該当言語の全namespace分をスキップし、他の言語の処理が継続することを検証する統合テストを書く
  - 観測可能な完了状態: 3 namespace × 4非ソース言語の入力に対し、export呼び出しが言語ごとに1回（合計4回）だけ行われ、それぞれ正しいPOEditor言語コードで呼ばれ、結果が正しくnamespaceへ分割されていることをテストが確認する
  - _Requirements: 1.1, 1.3, 4.1_
  - _Depends: 1.1, 1.2, 1.3, 1.4_
  - _Boundary: PullTranslationSync_

## 4. Integration: 運用手順書と貢献者向けガイドの書き換え

- [x] 4.1 メンテナー向け運用手順書と貢献者向けガイドを単一プロジェクト向けに書き換える
  - メンテナー向け運用手順書の「namespaceごとに3プロジェクトを作成する」手順を「単一プロジェクトを作成する」手順に書き換え、OSSプラン申請とpublic join page有効化がそれぞれ1回で済むことを明記する
  - 貢献者向けガイドの参加リンクが単一プロジェクトのものになることを反映する
  - 貢献者向けガイドに、POEditor画面上でnamespaceタグによる絞り込み表示を利用する方法を追記する
  - 観測可能な完了状態: 手順書に記載された順序通りに作業すれば、単一のプロジェクトと承認ボットアカウントが用意され、貢献者が参加可能な状態に至る
  - _Requirements: 2.2, 2.3, 3.1, 3.2_
  - _Depends: 2.1, 3.1_

## 5. Validation: 実環境での動作確認と回帰確認

- [x] 5.1 実際のPOEditorプロジェクト（"GROWI"、id: 839626）に対して、設計上の前提をスモールスタートで検証する
  - 使い捨てのダミーキー（`_amend_probe.*`）を用いて、namespaceラップが統合export（`type=i18next`）でも入れ子構造のまま返ることを確認した（確認済み。`research.md`参照）
  - namespaceごとに`sync_terms=1`で個別アップロードすると、他namespaceが実際に削除されることを確認した（確認済み。単一の統合アップロードに限定する設計判断の正しさが裏付けられた）
  - POEditorが言語コード`en_US`を受け付けず`en`が正しいことを確認し、GROWIの5言語分のPOEditor言語コード（タスク1.4）を確定させた
  - 検証に使ったダミー用語は削除し、プロジェクトを検証前の状態（実データ無し）に戻した
  - 観測可能な完了状態: 上記3点の実測結果が`research.md`に記録され、実装（タスク1〜4）がこの実測結果に基づいている
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 4.1, 4.2_

- [ ] 5.2 実際のPOEditorプロジェクトに対して、本番相当のnamespace構成での統合アップロード・タグ付け・統合exportを確認する
  - 3 namespace分の実データ相当の内容で統合アップロードとnamespaceごとのタグ付けアップロードを実行し、キー構成・値・タグが意図通り反映されていることを確認する
  - namespaceごとのタグ付けアップロード（削除無効化）が、他namespaceの用語を`obsolete`扱いにしないことを確認する（5.1では他namespaceの内容が存在しない状態でしか検証できていない、残された未確認事項）
  - 観測可能な完了状態: 3 namespace分のキー構成・タグ付与状況が実プロジェクト上で意図通りであることが確認できる
  - _Requirements: 1.1, 1.2, 2.1_
  - _Depends: 2.1, 3.1, 4.1_
  - _Blocked: 本番運用として貢献者に公開する前の最終確認であり、`docs/i18n-community-translation-setup.md`の残りのプロビジョニング手順（承認ボットアカウント等）が完了してから実行すること。_

- [x] 5.3 リポジトリ全体のlint・test・buildが green であること、既存の同期ロジックに回帰が無いことを確認する
  - 変更した5ファイル（`sync-config.ts`/`poeditor-client.ts`/`push-source.ts`/`pull-translations.ts`/`language-code-map.ts`）が、既存の `turbo run lint` / `turbo run test` / `turbo run build`（`@growi/app`）に悪影響を与えていないことを確認する
  - `DiffClassifier`・GitHub アダプタ・承認ボット分離など、本amendで変更していないコンポーネントの既存テストが引き続き通過することを確認する
  - 観測可能な完了状態: `turbo run lint --filter @growi/app` / `turbo run test --filter @growi/app` / `turbo run build --filter @growi/app` がすべて成功する
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 4.1_
  - _Depends: 2.1, 3.1, 4.1_

## 6. amend spec の後始末: 変更内容を i18n-community-translation へ差し戻し、本specを削除する

- [x] 6.1 design.mdの変更内容を i18n-community-translation の design.md へ反映する
  - Architecture・File Structure Plan・Components and Interfacesのうち、単一プロジェクト構成に関わる箇所（`SyncConfig`/`NamespaceEnvelope`/`PoeditorClient`/`PushSourceSync`/`PullTranslationSync`の記述）を書き換える。「namespaceごとに3プロジェクト」という記述を残さない
  - Boundary Commitments > Revalidation Triggers を、本amendで確定した内容（プロジェクト数固定に伴うトリガーの退役、機能単位タグ追加時の再検証条件）に更新する
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 4.1_
  - _Depends: 5.3_

- [x] 6.2 i18n-community-translation の requirements.md に不足している要件を末尾へ追加する
  - タスク6.1のレビューで判明: amendのRequirement 2（namespaceタグ付け）とRequirement 4（言語コードの対応）に対応する要件が、i18n-community-translationのrequirements.md（Requirement 1〜8）に存在しない。既存の要件番号は振り直さず、末尾にRequirement 9（namespace・機能単位のタグによる絞り込み）・Requirement 10（言語コードの対応）を追加する
  - 追加する要件の内容は、本amendのrequirements.mdのRequirement 2・Requirement 4の受け入れ基準をベースに、i18n-community-translation側の既存の書きぶりに合わせて転記する
  - i18n-community-translationのdesign.mdのRequirements Traceability表・各コンポーネント節（`NamespaceEnvelope`/`LanguageCodeMap`/`PoeditorClient`/`PushSourceSync`/`PullTranslationSync`）のRequirements欄を、タスク6.1で暫定的に既存要件（1.1/1.2/2.1/3.1等）へ割り当てていた箇所から、新設したRequirement 9・10を参照する形に修正する
  - _Requirements: (i18n-community-translation-single-project) 2.1, 2.2, 2.3, 4.1, 4.2_
  - _Depends: 6.1_

- [x] 6.3 research.mdの設計判断（JSON統合ラップ方式、2段階アップロード、export入れ子保持の未検証事項）を i18n-community-translation の research.md へ転記する
  - _Requirements: 1.1, 1.2, 2.1_
  - _Depends: 6.1_

- [ ] 6.4 i18n-community-translation の tasks.md を更新する
  - 単一プロジェクト構成に関わる箇所（旧タスク4.2の「3プロジェクト作成」等の記述）を単一プロジェクト向けに書き換える
  - 本amendの5.2（本番相当のnamespace構成での確認）を、i18n-community-translation側の既存の実環境検証タスク（プロビジョニング待ちで`_Blocked:_`のもの）へ統合し、確認事項として引き継ぐ。二重のタスクを作らない
  - 本amendで発見・修正した言語コード変換の不具合（`en_US`をそのままPOEditorへ渡すと失敗する）と、その修正（`LanguageCodeMap`）を Implementation Notes に記録し、既存タスクの完了状態と矛盾しないようにする
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 4.1, 4.2_
  - _Depends: 6.1, 6.2_

- [ ] 6.5 i18n-community-translation の spec.json の `updated_at` を更新する（`phase`/`approvals`はそのまま）
  - _Depends: 6.4_

- [ ] 6.6 本spec（`i18n-community-translation-single-project`）のディレクトリを削除する
  - `.kiro/specs/i18n-community-translation-single-project/` を削除する
  - 観測可能な完了状態: 変更内容が i18n-community-translation 側に反映済みで、本specのディレクトリが存在しない
  - _Depends: 6.2, 6.3, 6.4, 6.5_

## Implementation Notes

- (タスク生成時のレビューで発見) 当初のタスク案では、design.mdで「未検証」としていた前提（namespaceラップの入れ子保持、`sync_terms=1`のnamespace間削除挙動）の確認が、実装（タスク1〜4）をすべて終えた後の検証タスクに置かれていた。この構成だと、前提が外れていた場合に実装全体の手戻りになる。ユーザーの指摘により、実際の本番POEditorプロジェクト（"GROWI"、id: 839626）に対する使い捨てのダミーキーでの小規模な検証を、実装より前のタスク5.1として繰り上げて先に実施した（結果は`research.md`参照）。
- (5.1実施時の発見) POEditorは言語コード`en_US`を受け付けず`"Wrong language code"`エラーになる。正しくは`en`。これは今回のamend（プロジェクト数の話）とは無関係な、既存のマージ済み実装（`push-source.ts`の`SOURCE_LANGUAGE = 'en_US'`）の不具合であり、実際にpushを実行すると毎回失敗する状態だった。ユーザーの判断で本amendのスコープに含め、Requirement 4として要件を追加し、`LanguageCodeMap`という新規コンポーネントで対応する。
- (5.1実施時の発見) `sync_terms=1`をnamespaceごとに個別呼び出しした場合に他namespaceを削除してしまうという設計上の懸念は、実際に本番プロジェクトで再現し確認済み。統合アップロード1回に限定する設計判断の正しさが裏付けられた。
- (5.1実施時、未解決のまま残った点) namespaceごとのタグ付けアップロード（`sync_terms`無効）が、他namespaceの用語を`tags`の`obsolete`スコープの対象にしないかどうかは、検証時に他namespaceの内容が存在しない状態だったため確認できていない。タスク5.2（本番相当のnamespace構成での確認、複数namespaceが同時に存在する状態）で確認すること。
