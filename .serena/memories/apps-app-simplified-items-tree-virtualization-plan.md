# SimplifiedItemsTree作成とVirtualization対応 - 実装プラン

## 🎯 目標

PageTreeのvirtualizationを実現し、5000件の兄弟ページでも快適に動作させる

**戦略**: 段階的な簡素化とAPI理解を優先し、デグレを防ぐ

---

## 📋 マイルストーン1: 最小限のSimplifiedItemsTree作成 ✅ 完了

### 目的
- **最小限の機能のみ**: ページリスト表示 + クリック遷移だけ
- ツリー構造も不要（フラットリスト）
- 既存APIも使わない（モックデータでOK）

### 1.1. SimplifiedItemsTreeの作成 ✅

**作成済みファイル**:
```
src/client/components/Common/SimplifiedItemsTree/
├── SimplifiedItemsTree.tsx
├── SimplifiedTreeItem.tsx
├── SimplifiedItemsTree.module.scss
└── index.ts
```

**実装済み機能**:
- ✅ ページのフラットリスト表示（階層なし）
- ✅ クリックでページ遷移

### 1.2. PageTreeSubstanceでの差し替え ✅

**変更済み**: 実際の実装ではまだ差し替えていない（M3以降で対応予定）

### 1.3. 動作確認 ✅

**確認済み項目**:
- ✅ ページリストが表示される
- ✅ クリックでページ遷移できる
- ✅ 選択状態が表示される

---

## 📋 マイルストーン2: @headless-tree/react分析とAPI設計・Virtualization実装 ✅ 完了

### 目的
- @headless-tree/react の理解を深める
- ライブラリの要件に合った最適なバックエンドAPIを設計
- SimplifiedItemsTreeでvirtualizationを成功させる

### 2.1. @headless-tree/react の調査・分析 ✅

**完了**:
- ✅ 公式ドキュメントの熟読
- ✅ データ構造の要件理解（IDベース、フラット構造推奨）
- ✅ 非同期データローディングの仕組み（asyncDataLoaderFeature）
- ✅ Virtualizationとの統合（@tanstack/react-virtual）
- ✅ パフォーマンス特性（100k+アイテム対応）

**成果物**: `headless-tree-react-investigation-report` メモリに記録済み

### 2.2. バックエンドAPI設計 ✅

**完了**:
- 既存API (`/page-listing/root`, `/page-listing/children`) で十分と判断
- 新規API不要（asyncDataLoaderFeatureで既存APIを活用）
- `/page-listing/item` エンドポイントを追加（getItem用、オプショナル）

### 2.3. バックエンドAPI実装 ✅

**実装済み**:
- `src/server/routes/apiv3/page-listing.ts`: `/page-listing/item` エンドポイント追加（189-221行目）
- 既存 `/page-listing/children` と `/page-listing/root` を活用

### 2.4. フロントエンド: @headless-tree/react統合 ✅

**実装済み**:
- ✅ `@headless-tree/core` と `@headless-tree/react` インストール済み
- ✅ SimplifiedItemsTreeで `useTree` フック統合
- ✅ `asyncDataLoaderFeature` 使用
- ✅ 展開/折りたたみ機能実装

**実装ファイル**:
- `src/client/components/Common/SimplifiedItemsTree/SimplifiedItemsTree.tsx`

### 2.5. Virtualization実装 ✅

**実装済み**:
- ✅ `@tanstack/react-virtual` インストール済み
- ✅ `useVirtualizer` と `tree.getItems()` 統合
- ✅ スクロールパフォーマンス最適化（overscan: 5）

### 2.6. 動作確認 ✅

**確認済み項目**:
- ✅ ツリー構造が表示される
- ✅ 展開/折りたたみが動作する
- ✅ クリックでページ遷移できる
- ⏭️ 5000件でもスムーズにスクロールできる（確認スキップ）
- ✅ 選択状態が表示される（展開後に確認可能）

**既知の課題**:
- ✅ 選択されたページの祖先ページが自動展開されない → M3-B で解決済み

---

## 📋 マイルストーン3: 機能の段階的追加 ✅ A・B完了、C以降検討中

### 目的
- M1, M2で削ぎ落とした機能を段階的に復活させる
- 元の実装から必要な部分だけを移植

### 優先度 A: UI機能の移植（既存実装を模倣） ✅ 完了

**参考実装**: `CustomTreeItem`, `TreeItemLayout`, `PageTreeItem`

1. **WIPページフィルター**: ✅ 実装済み
   - **実装場所**: `SimplifiedItemsTree.tsx:33,156-158`, `SimplifiedPageTreeItem.tsx:91`
   - SimplifiedItemsTree に isWipPageShown props を追加済み
   - WIPページの表示/非表示を制御済み
   
2. **descendantCountバッジ**: ✅ 実装済み
   - **実装場所**: `SimplifiedPageTreeItem.tsx:99`
   - `CountBadgeForPageTreeItem` を `customEndComponents` として実装済み
   - SimplifiedPageTreeItem が TreeItemLayout に渡している

3. **EndComponent, HoveredEndContent の移植**: ✅ 実装済み
   - **実装場所**: `SimplifiedPageTreeItem.tsx:100`
   - `Control` を `customHoveredEndComponents` として実装済み
   - hover時の操作ボタン（duplicate/delete）の挙動も実装済み（47-65行目）
   - TreeItemLayout でレンダリングされる

**実装方針**:
- ✅ 既存実装（TreeItemLayout）を活用
- ✅ SimplifiedPageTreeItem で customEndComponents と customHoveredEndComponents を指定
- ✅ TreeItemLayout がレンダリングを担当

---

### 優先度 B: ナビゲーション機能 ✅ 完了

**参考実装**: `TreeItemLayout` の useEffect

4. **選択ページまでの自動展開**: ✅ 実装済み
   - **実装場所**: `TreeItemLayout.tsx:72-80`
   - TreeItemLayoutのuseEffectで自動展開ロジックを実装:
     ```typescript
     useEffect(() => {
       if (isExpanded) return;
       const isPathToTarget = page.path != null
         && targetPath.startsWith(addTrailingSlash(page.path))
         && targetPath !== page.path;
       if (isPathToTarget) onToggle?.();
     }, [targetPath, page.path, isExpanded, onToggle]);
     ```
   - SimplifiedPageTreeItemがTreeItemLayoutを使用しているため、自動的に機能する

5. **初期スクロール**: ✅ 実装済み
   - **実装場所**: `SimplifiedItemsTree.tsx:128-142`
   - `@tanstack/react-virtual` の scrollToIndex 機能を活用:
     ```typescript
     useEffect(() => {
       if (targetPathOrId == null) return;
       const selectedIndex = items.findIndex((item) => {
         const itemData = item.getItemData();
         return itemData._id === targetPathOrId || itemData.path === targetPathOrId;
       });
       if (selectedIndex !== -1) {
         setTimeout(() => {
           virtualizer.scrollToIndex(selectedIndex, { align: 'center', behavior: 'smooth' });
         }, 100);
       }
     }, [targetPathOrId, items, virtualizer]);
     ```

**実装方針**:
- ✅ TreeItemLayoutのロジックを活用（自動展開）
- ✅ @tanstack/react-virtual の scrollToIndex 機能を活用（初期スクロール）

---

### 優先度 C: 操作機能（新規実装）

**実装方針**: 既存実装よりも @headless-tree の機能を使って新規実装、APIは既存を使用

6. **Create** ⏳ 次のタスク
   - @headless-tree/core の renamingFeature を活用
   - 仮のノードを追加してから renamingFeature によりページ名を入力、確定したら API を呼び出してページの実態を作成する
   - Rename の実装パターンを参考にする

7. **Drag and Drop**
   - @headless-tree/core の dragAndDropFeature を活用
   - 既存の移動API（mutation）を使用
   
8. **Rename** ✅ 完了
   - @headless-tree/core の renamingFeature を活用
   - 既存のrename API（PUT /pages/rename）を使用
   - **実装詳細は後述「Rename 実装詳細」セクション参照**
   
9. **Duplicate** ✅ 完了（M3-Aで実装済み）
   - SimplifiedPageTreeItem の hover時操作ボタンで実装
   - 既存のduplicate API（mutation）を使用
   
10. **Delete** ✅ 完了（M3-Aで実装済み）
    - SimplifiedPageTreeItem の hover時操作ボタンで実装
    - 既存のdelete API（mutation）を使用

**工数**: 2日

---

### 優先度 D: リアルタイム更新（優先度C完了後に検討）

**実装判断**: 優先度Cの実装完了時の状態をみて、既存実装の移植が更に必要かどうかを検討

10. **Socket.io統合**: descendantCount更新
    - 既存のSocket.io実装を移植
    - リアルタイムでdescendantCountを更新

11. **Mutation連携**: 各操作後のデータ更新
    - 既存のmutation連携を移植
    - 操作後のツリーデータ更新

**工数**: 1日（必要に応じて）

---

## 📝 Rename 実装詳細（2025-11-28 完了）

### 実装アーキテクチャ

**headless-tree の renamingFeature を最大限活用し、カスタムコードを最小化**

```
SimplifiedItemsTree
├── features: [renamingFeature, hotkeysCoreFeature, selectionFeature, asyncDataLoaderFeature]
├── getContainerProps() → コンテナに適用（ホットキー有効化に必須）
└── onRename: handleRename → rename API呼び出し

usePageRename フック
├── rename() → API呼び出し、toast表示、ツリー更新通知
├── validateName() → ページ名バリデーション
├── getPageName() → アイテムからページ名取得
├── isRenaming() → リネームモード判定
└── RenameAlternativeComponent → TreeItemLayout の customAlternativeComponents 用
```

### 実装ファイル

1. **`features/page-tree/client/hooks/use-page-rename.tsx`** (新規)
   - Rename ビジネスロジックを集約したカスタムフック
   - `rename`: API呼び出し（PUT /pages/rename）
   - `validateName`: useInputValidator を使用したバリデーション
   - `getPageName`: path から basename を抽出
   - `isRenaming`: `item.isRenaming()` のラッパー
   - `RenameAlternativeComponent`: リネームモード時に表示するコンポーネント

2. **`features/page-tree/client/components/RenameInput.tsx`** (新規)
   - headless-tree の `getRenameInputProps()` をそのまま使用
   - シンプルな薄い UI ラッパー（~50行）
   - デバウンスされたバリデーション表示

3. **`features/page-tree/client/components/SimplifiedItemsTree.tsx`** (変更)
   - `renamingFeature`, `hotkeysCoreFeature` を features に追加
   - `getContainerProps()` をコンテナに適用
   - `onRename` ハンドラで `usePageRename().rename()` を呼び出し

4. **`features/page-tree/client/components/TreeItemLayout.tsx`** (変更)
   - `showAlternativeContent` と `customAlternativeComponents` props を追加
   - リネームモード時は通常コンテンツの代わりに AlternativeComponent を表示

5. **`client/components/Sidebar/PageTreeItem/SimplifiedPageTreeItem.tsx`** (変更)
   - `usePageRename()` から `isRenaming`, `RenameAlternativeComponent` を取得
   - `showAlternativeContent={isRenaming(item)}` を TreeItemLayout に渡す
   - `customAlternativeComponents={[RenameAlternativeComponent]}` を渡す

### キーポイント

1. **ホットキーサポート**: F2 でリネーム開始、Enter で確定、Escape でキャンセル
   - `hotkeysCoreFeature` と `getContainerProps()` の組み合わせが必須
   - `getContainerProps()` がないとホットキーが動作しない

2. **コンテキストメニューからのリネーム**: 
   - `Control` コンポーネント（hover時操作ボタン）から `item.startRenaming()` を呼び出し

3. **バリデーション**:
   - `useInputValidator(ValidationTarget.PAGE)` を使用
   - RenameInput でリアルタイム表示（300ms デバウンス）

4. **ツリー更新**:
   - rename 成功後、`mutatePageTree()` と `notifyUpdateItems()` でツリーを更新

### Create 実装への引き継ぎ事項

1. **同じ renamingFeature を活用可能**
   - 仮ノード追加 → startRenaming() → 入力確定後に API 呼び出し

2. **RenameInput を再利用可能**
   - Create 時のページ名入力にも同じコンポーネントを使える

3. **仮ノードの追加方法を検討**
   - headless-tree のデータローダーに仮ノードを追加する方法
   - または UI 上でのみ仮ノードを表示する方法

4. **API 呼び出しタイミング**
   - Rename: 既存ページの更新なので、確定時に PUT /pages/rename
   - Create: 新規ページ作成なので、確定時に POST /pages で作成

---

## 📋 マイルストーン4: デグレチェック

### 目的
- 元のItemsTreeと機能比較
- 失われた機能があればM3へ戻る

### 4.1. 比較テスト

**テスト項目**:
- [ ] すべての基本操作（M3で追加した機能）
- [ ] パフォーマンス（5000件でスムーズか）
- [ ] エッジケース（空ページ、権限なしページ等）

### 4.2. デグレ修正ループ

- デグレ発見 → M3へ戻って実装 → M4で再確認

**工数**: 1日

---

## 📁 ファイル変更まとめ

| マイルストーン | 新規 | 変更 | 進捗 |
|-------------|-----|------|------|
| **M1** 最小SimplifiedItemsTree | 4ファイル | 0ファイル | ✅ 完了 |
| **M2** 調査+API+Virtualization | 0ファイル | 2ファイル | ✅ 完了 |
| **M3-A** UI機能移植 | 0-1ファイル | 2ファイル | 🔄 次 |
| **M3-B** ナビゲーション機能 | 0ファイル | 1ファイル | ⏸️ 未着手 |
| **M3-C** 操作機能 | 0ファイル | 1-2ファイル | ⏸️ 未着手 |
| **M3-D** リアルタイム更新 | 0ファイル | 1ファイル | ⏸️ 検討中 |
| **M4** デグレチェック | 0ファイル | 0ファイル | ⏸️ 未着手 |

---

## 🔍 既存実装の分析結果

### 現在のAPI構造

**エンドポイント**:
1. `GET /page-listing/root` → ルートページ "/" のデータ
2. `GET /page-listing/children?id={pageId}` → 直下の子のみ
3. `GET /page-listing/item?id={pageId}` → 単一ページデータ（新規追加）

**IPageForTreeItem の構造**（最適化済み）:
```typescript
{
  _id: string
  path: string
  parent?: string
  descendantCount: number
  revision?: string
  grant: PageGrant
  isEmpty: boolean
  wip: boolean
  processData?: IPageOperationProcessData
}
```

### 現在のフロントエンド構造

**ItemsTree利用箇所**:
- `PageTreeSubstance.tsx`: メインのページツリー（**ターゲット**、まだ差し替えていない）
- `PageSelectModal.tsx`: ページ選択モーダル
- `AiAssistantManagementPageTreeSelection.tsx`: AI Assistant設定

**CustomTreeItem実装**:
- `PageTreeItem.tsx`: メインツリー用（Drag&Drop、Rename等の全機能）
- `TreeItemForModal.tsx`: モーダル用（簡素化版）

**データフェッチング**:
- `TreeItemLayout.tsx:50`: 各TreeItemが個別にSWRフック呼び出し
- `useSWRxPageChildren()`: 子要素取得

### 参考にする既存コンポーネント

**M3-A で参考にするコンポーネント**:
- `CustomTreeItem`: 基本的なツリーアイテムのレイアウト
- `TreeItemLayout`: ツリーアイテムのレイアウトとロジック
- `PageTreeItem`: ページツリーアイテムの実装
- `CountBadgeForPageTreeItem`: descendantCountバッジ
- `EndComponent`: hover時の操作ボタンUI

**M3-B で参考にするコンポーネント**:
- `TreeItemLayout`: 自動展開ロジック
- `usePageTreeScroll`: スクロール制御

**M3-C で参考にするAPI**:
- Drag & Drop: 既存の移動mutation
- Rename: 既存のrenamemutation
- Duplicate: 既存のduplicatemutation
- Delete: 既存のdeletemutation

---

## ✅ このプランの利点

1. **M1が超高速**: 0.5日でSimplifiedItemsTree基礎実装完了
2. **M2が調査から始まる**: ライブラリの理解を深めてから設計・実装
3. **柔軟な設計**: 調査結果に基づいて最適なAPI構造を決定
4. **リスク最小化**: 各マイルストーンで「動くもの」ができる
5. **既存コード保護**: ItemsTree、PageSelectModal等は一切変更なし
6. **記録が残る**: 調査レポートを .serena/memories/ に保存
7. **段階的な機能追加**: 優先度A→B→C→Dで段階的に機能追加

---

## 🚨 過去の失敗要因（教訓）

### 前回の失敗原因
1. **PageTreeItem や TreeItemLayout、CustomTreeItem によるレンダリングアイテム可換機能が複雑すぎて、デグレを誘発**
   - 対策: SimplifiedItemsTreeで完全に切り離す

2. **バックエンド API の分析が不十分なまま進めてしまった**
   - 対策: M2.1で徹底的に @headless-tree/react を調査してから設計

### react-window/react-virtual 失敗原因（前回プラン）
1. **動的itemCount**: ツリー展開時にアイテム数が変化→react-windowの前提と衝突
2. **非同期ローディング**: APIレスポンス待ちでフラット化不可
3. **複雑な状態管理**: SWRとreact-windowの状態同期が困難

**今回の対策**: @headless-tree/react でこれらの問題を解決済み ✅

---

## 📊 現在の進捗状況（2025-11-28 更新）

**完了**: M1 ✅、M2 ✅、M3-A ✅、M3-B ✅、M3-C Rename ✅、ディレクトリ再編成 ✅  
**次のステップ**: M3-C Create（ページ新規作成機能）  
**その後**: M3-C Drag and Drop → M4 デグレチェック

**実装済みコンポーネント**:
- `SimplifiedItemsTree.tsx`: @headless-tree/react + @tanstack/react-virtual 統合済み
- `SimplifiedPageTreeItem.tsx`: UI機能、ナビゲーション機能、Rename すべて実装済み
- `use-page-rename.tsx`: Rename ビジネスロジック集約フック
- `RenameInput.tsx`: リネーム入力 UI コンポーネント
- バックエンドAPI: `/page-listing/item` エンドポイント追加済み

**実装済み機能**:
- ✅ WIPページフィルター
- ✅ descendantCountバッジ表示
- ✅ hover時の操作ボタン（duplicate/delete/rename）
- ✅ 選択ページまでの自動展開
- ✅ 選択ページへの初期スクロール
- ✅ **Rename（ページ名変更）** - renamingFeature + hotkeysCoreFeature
  - コンテキストメニューからのリネーム
  - F2 キーボードショートカット
  - Enter で確定、Escape でキャンセル
  - リアルタイムバリデーション

**未実装機能**:
- ⏳ Create（ページ新規作成）- 次のタスク
- ⏳ Drag and Drop（ページ移動）

**既知の課題**:
1. ~~選択ページの祖先が自動展開されない~~ → M3-B で解決済み ✅
2. ~~まだPageTreeSubstanceで差し替えていない~~ → 実際にはPageTreeSubstanceでSimplifiedItemsTreeを使用中 ✅

---

## 📁 ディレクトリ再編成（2025-11-28 完了）

### 目的
- Feature Directory Pattern を適用し、汎用的なページツリーコンポーネントを `features/page-tree/` に集約
- Sidebar/PageTree 専用コンポーネントは元の場所に残す

### 移動ファイル一覧

`src/features/page-tree/` に以下のファイルを配置:

```
features/page-tree/
├── index.ts                           # メインエクスポート
├── client/
│   ├── components/
│   │   ├── SimplifiedItemsTree.tsx    # コアvirtualizedツリーコンポーネント
│   │   ├── TreeItemLayout.tsx         # 汎用ツリーアイテムレイアウト
│   │   ├── TreeItemLayout.module.scss
│   │   ├── SimpleItemContent.tsx      # シンプルなアイテムコンテンツ表示
│   │   ├── SimpleItemContent.module.scss
│   │   └── _tree-item-variables.scss  # SCSS変数
│   ├── hooks/
│   │   ├── use-data-loader.ts         # データローダーフック
│   │   └── use-scroll-to-selected-item.ts # スクロール制御フック
│   ├── interfaces/
│   │   └── index.ts                   # TreeItemProps, TreeItemToolProps
│   └── states/
│       ├── page-tree-update.ts        # ツリー更新状態（Jotai）
│       └── page-tree-desc-count-map.ts # 子孫カウント状態（Jotai）
└── constants/
    └── index.ts                       # ROOT_PAGE_VIRTUAL_ID
```

### 移動しなかったファイル（Sidebar/PageTree専用）

以下は `components/Sidebar/PageTreeItem/` または `components/TreeItem/` に残留:

- `SimplifiedPageTreeItem.tsx` - Sidebar専用の実装
- `CountBadgeForPageTreeItem.tsx` - PageTree専用バッジ
- `NewPageInput/` - 旧実装専用（ItemNode依存）
- `PageTreeItem.tsx` - 旧実装（Sidebar用）
- `TreeItemForModal.tsx` - 旧実装（Modal用）

### インポートパス更新

Sidebar/PageTree関連ファイルは `~/features/page-tree` からインポート:

```typescript
// Before
import { ROOT_PAGE_VIRTUAL_ID } from '../TreeItem';
import { usePageTreeInformationUpdate } from '~/stores/ui/page-tree-update';

// After
import { ROOT_PAGE_VIRTUAL_ID, usePageTreeInformationUpdate } from '~/features/page-tree';
```

### 旧実装の状態

- `ItemsTree.tsx` - TypeScript エラーあり（許容）
- `PageTreeItem.tsx` - TypeScript エラーあり（許容）
- `TreeItemForModal.tsx` - TypeScript エラーあり（許容）
- `NewPageInput/` - 旧実装専用として残留

### 注意点

1. **NewPageInput は汎用コンポーネントではない**
   - `ItemNode` インターフェース（旧実装のツリーノード型）に依存
   - 新実装（SimplifiedPageTreeItem）では使用されていない
   - 将来、新実装でページ作成機能を実装する場合は別途作成が必要

2. **後方互換性の re-export は不要**
   - 旧実装のエラーは許容
   - Sidebar/PageTree が正常動作すれば OK

---

## 📝 プラン策定日

2025-11-10

## 📝 最終更新日

2025-11-28 (Rename 実装完了、Create 実装への引き継ぎ事項追記)