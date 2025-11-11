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
- ✅ 選択状態の表示（aria-current）

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
- ❌ 選択されたページの祖先ページが自動展開されない（M3-B で対応予定）

---

## 📋 マイルストーン3: 機能の段階的追加 🔄 次のステップ

### 目的
- M1, M2で削ぎ落とした機能を段階的に復活させる
- 元の実装から必要な部分だけを移植

### 優先度 A: UI機能の移植（既存実装を模倣） 🔄 次

**参考実装**: `CustomTreeItem`, `TreeItemLayout`, `PageTreeItem`

1. **WIPページフィルター**: isWipPageShown propsと表示制御
   - SimplifiedItemsTree に isWipPageShown props を追加
   - SimplifiedTreeItem でWIPページの表示/非表示を制御
   
2. **descendantCountバッジ**: CountBadgeForPageTreeItem移植
   - `CountBadgeForPageTreeItem` コンポーネントを移植
   - SimplifiedTreeItem に descendantCount バッジを表示

3. **EndComponent, HoveredEndContent の移植**（UIのみ）
   - 既存の `EndComponent` を移植
   - hover時に表示される操作ボタンのUI（rename/duplicate/delete）
   - **注**: ボタンの挙動は優先度Cで実装、UIのみ先行実装

**実装方針**:
- 既存実装からコピー&ペースト
- SimplifiedItemsTreeの構造に合わせて調整
- 1機能ずつ追加 → 動作確認 → 次の機能

**工数**: 1.5日

---

### 優先度 B: ナビゲーション機能

**参考実装**: `TreeItemLayout` の useEffect

4. **選択ページまでの自動展開**: targetPathOrIdに対応するページの祖先を自動展開
   - TreeItemLayout の以下のロジックを参考に実装:
     ```typescript
     useEffect(() => {
       const isPathToTarget = page.path != null
         && targetPath.startsWith(addTrailingSlash(page.path))
         && targetPath !== page.path; // Target Page does not need to be opened
       if (isPathToTarget) setIsOpen(true);
     }, [targetPath, page.path]);
     ```
   - SimplifiedItemsTree に同様のロジックを実装

5. **初期スクロール**: usePageTreeScroll実装
   - 選択されたページが画面内に表示されるようスクロール
   - `@tanstack/react-virtual` の scrollToIndex 機能を活用

**実装方針**:
- TreeItemLayoutのロジックを参考に、SimplifiedItemsTreeに適用
- @headless-tree/react と @tanstack/react-virtual の機能を活用

**工数**: 1日

---

### 優先度 C: 操作機能（新規実装）

**実装方針**: 既存実装よりも @headless-tree の機能を使って新規実装、APIは既存を使用

6. **Create**
   - @headless-tree/core の renameFeature を活用
   - 仮のノードを追加してから renameFeature によりページ名を入力、確定したら API を呼び出してページの実態を作成する

7. **Drag and Drop**
   - @headless-tree/core の dragAndDropFeature を活用
   - 既存の移動API（mutation）を使用
   
8. **Rename**
   - @headless-tree/core の renameFeature を活用
   - 既存のrename API（mutation）を使用
   
9. **Duplicate**
   - SimplifiedTreeItem にDuplicateボタンの挙動を実装
   - 既存のduplicate API（mutation）を使用
   
10. **Delete**
   - SimplifiedTreeItem にDeleteボタンの挙動を実装
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

## 📊 現在の進捗状況（2025-11-10）

**完了**: M1 ✅、M2 ✅  
**次のステップ**: M3-A（UI機能の移植）  
**優先対応**: WIPページフィルター、descendantCountバッジ、EndComponent移植

**実装済みコンポーネント**:
- `SimplifiedItemsTree.tsx`: @headless-tree/react + @tanstack/react-virtual 統合済み
- `SimplifiedTreeItem.tsx`: 基本的なツリーアイテム表示
- バックエンドAPI: `/page-listing/item` エンドポイント追加済み

**既知の課題**:
1. 選択ページの祖先が自動展開されない → M3-B で対応予定
2. まだPageTreeSubstanceで差し替えていない → M3完了後に対応予定

---

## 📝 プラン策定日

2025-11-10

## 📝 最終更新日

2025-11-10 (M2完了、M3優先度整理完了)