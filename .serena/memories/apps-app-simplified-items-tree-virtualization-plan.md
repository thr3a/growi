# SimplifiedItemsTree作成とVirtualization対応 - 実装プラン

## 🎯 目標

PageTreeのvirtualizationを実現し、5000件の兄弟ページでも快適に動作させる

**戦略**: 段階的な簡素化とAPI理解を優先し、デグレを防ぐ

---

## 📋 マイルストーン1: 最小限のSimplifiedItemsTree作成

### 目的
- **最小限の機能のみ**: ページリスト表示 + クリック遷移だけ
- ツリー構造も不要（フラットリスト）
- 既存APIも使わない（モックデータでOK）

### 1.1. SimplifiedItemsTreeの作成

**新規作成ファイル**:
```
src/client/components/SimplifiedItemsTree/
├── SimplifiedItemsTree.tsx          # 50行程度
├── SimplifiedTreeItem.tsx           # 30行程度
├── SimplifiedItemsTree.module.scss  # 最小限
└── index.ts
```

**SimplifiedItemsTreeの仕様**（超シンプル版）:
- **機能**:
  - ✅ ページのフラットリスト表示（階層なし）
  - ✅ クリックでページ遷移
  - ✅ 選択状態の表示（aria-current）
  - ❌ 展開/折りたたみ（階層構造なし）
  - ❌ Drag & Drop（M3で追加）
  - ❌ Rename/Duplicate/Delete（M3で追加）
  - ❌ WIPフィルター（M3で追加）
  - ❌ descendantCountバッジ（M3で追加）

**データ取得**: モックデータで動作確認（100件程度）

### 1.2. PageTreeSubstanceでの差し替え

**変更ファイル**:
- `src/client/components/Sidebar/PageTree/PageTreeSubstance.tsx`
  - `ItemsTree` → `SimplifiedItemsTree`に置き換え
  - propsも最小限に（targetPathOrIdのみ）

### 1.3. 動作確認

**確認項目**:
- [ ] ページリストが表示される
- [ ] クリックでページ遷移できる
- [ ] 選択状態が表示される
- [ ] **それ以外の機能は動かなくてOK**

**工数**: 0.5日

---

## 📋 マイルストーン2: @headless-tree/react分析とAPI設計・Virtualization実装

### 目的
- @headless-tree/react の理解を深める
- ライブラリの要件に合った最適なバックエンドAPIを設計
- SimplifiedItemsTreeでvirtualizationを成功させる

### 2.1. @headless-tree/react の調査・分析

**調査項目**:
- [ ] 公式ドキュメントの熟読（https://headless-tree.lukasbach.com/）
- [ ] データ構造の要件理解
  - ツリーデータの形式は？（flat vs nested）
  - IDベースの参照か、オブジェクト参照か
  - 展開/折りたたみ状態の管理方法
- [ ] 非同期データローディングの仕組み
  - `dataLoader` の実装パターン
  - `asyncDataLoaderFeature` の使い方
  - キャッシュ戦略
- [ ] Virtualizationとの統合
  - `@headless-tree/react` が提供するvirtualization機能
  - または別途 `@tanstack/react-virtual` との統合方法
- [ ] パフォーマンス特性
  - 大量データ（5000件）での動作
  - 展開/折りたたみのパフォーマンス

**成果物**:
- 調査レポート（.serena/memories/ に記録）
- サンプルコード（動作検証用の小さな実装）

**工数**: 1日

### 2.2. バックエンドAPI設計

**設計方針**:
- 2.1の調査結果に基づいて、@headless-tree/reactに最適なAPI設計を行う
- 既存API（`/page-listing/root`, `/page-listing/children`）との比較検討
- 新APIが必要か、既存APIで十分かを判断

**検討事項**:
- エンドポイント設計（新規 or 既存活用）
- レスポンス形式（flat配列 vs nested構造）
- ページネーション・オフセット戦略
- 展開状態の扱い（フロント管理 vs バックエンド管理）

**成果物**:
- API設計書（OpenAPIスキーマ案）
- バックエンド実装方針

**工数**: 1日

### 2.3. バックエンドAPI実装

**実装ファイル**:
- `src/server/routes/apiv3/page-listing.ts`: エンドポイント追加
- `src/server/service/page-listing/page-listing.ts`: ビジネスロジック追加
- `src/server/models/openapi/page-listing.ts`: スキーマ定義（必要に応じて）

**実装内容**: 2.2の設計に基づく

**工数**: 1.5日

### 2.4. フロントエンド: @headless-tree/react統合

**実装内容**:
- `@headless-tree/react` のインストール
- SimplifiedItemsTreeでの統合
- 新バックエンドAPIとの接続
- 展開/折りたたみ機能の実装

**変更ファイル**:
- `src/client/components/SimplifiedItemsTree/SimplifiedItemsTree.tsx`
- `src/stores/page-listing.tsx`: 新API用のSWRフック追加

**工数**: 1.5日

### 2.5. Virtualization実装

**実装内容**:
- @headless-tree/reactのvirtualization機能を利用
- または @tanstack/react-virtual との統合（2.1の調査結果に基づく）
- スクロールパフォーマンスの最適化

**工数**: 1日

### 2.6. 動作確認

**確認項目**:
- [ ] ツリー構造が表示される
- [ ] 展開/折りたたみが動作する
- [ ] クリックでページ遷移できる
- [ ] **5000件でもスムーズにスクロールできる** 🎯
- [ ] 選択状態が表示される

**工数**: 0.5日

**M2合計工数**: 6.5日

---

## 📋 マイルストーン3: 機能の段階的追加

### 目的
- M1, M2で削ぎ落とした機能を段階的に復活させる
- 元の実装から必要な部分だけを移植

### 3.1. 追加する機能（優先順）

**Phase 3-1: 基本機能**
1. WIPページフィルター: isWipPageShown propsと表示制御
2. descendantCountバッジ: CountBadgeForPageTreeItem移植
3. 初期スクロール: usePageTreeScroll実装

**Phase 3-2: 操作機能**
4. Drag & Drop: react-dndの統合
5. Rename: RenameInput移植
6. Duplicate: Modal連携
7. Delete: Modal連携

**Phase 3-3: リアルタイム更新**
8. Socket.io統合: descendantCount更新
9. Mutation連携: 各操作後のデータ更新

### 3.2. 実装方針

- 既存実装からコピー&ペースト
- SimplifiedItemsTreeの構造に合わせて調整
- 1機能ずつ追加 → 動作確認 → 次の機能

**工数**: 3日

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

| マイルストーン | 新規 | 変更 | 合計工数 |
|-------------|-----|------|---------|
| **M1** 最小SimplifiedItemsTree | 4ファイル | 1ファイル | 0.5日 |
| **M2** 調査+API+Virtualization | 0-3ファイル | 3-4ファイル | 6.5日 |
| **M3** 機能追加 | 0ファイル | 2ファイル | 3日 |
| **M4** デグレチェック | 0ファイル | 0ファイル | 1日 |

**合計**: 工数11日

---

## 🔍 既存実装の分析結果

### 現在のAPI構造（page-listing.ts:36-81）

**エンドポイント**:
1. `GET /page-listing/root` → ルートページ "/" のデータ
2. `GET /page-listing/children?id={pageId}` → 直下の子のみ

**IPageForTreeItem の構造**（最適化済み）:
```typescript
{
  _id: string
  path: string
  parent: string
  descendantCount: number
  revision: string
  grant: PageGrant
  isEmpty: boolean
  wip: boolean
  processData?: IPageOperationProcessData
}
```

### 現在のフロントエンド構造

**ItemsTree利用箇所**:
- `PageTreeSubstance.tsx`: メインのページツリー（**ターゲット**）
- `PageSelectModal.tsx`: ページ選択モーダル
- `AiAssistantManagementPageTreeSelection.tsx`: AI Assistant設定

**CustomTreeItem実装**:
- `PageTreeItem.tsx`: メインツリー用（Drag&Drop、Rename等の全機能）
- `TreeItemForModal.tsx`: モーダル用（簡素化版）

**データフェッチング**:
- `TreeItemLayout.tsx:50`: 各TreeItemが個別にSWRフック呼び出し
- `useSWRxPageChildren()`: 子要素取得

---

## ✅ このプランの利点

1. **M1が超高速**: 0.5日でPageTreeSubstanceの差し替え完了
2. **M2が調査から始まる**: ライブラリの理解を深めてから設計・実装
3. **柔軟な設計**: 調査結果に基づいて最適なAPI構造を決定
4. **リスク最小化**: 各マイルストーンで「動くもの」ができる
5. **既存コード保護**: ItemsTree、PageSelectModal等は一切変更なし
6. **記録が残る**: 調査レポートを .serena/memories/ に保存

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

**今回の対策**: @headless-tree/react でこれらの問題が解決できるか調査する（M2.1）

---

## 📝 プラン策定日

2025-11-10

## 📝 最終更新日

2025-11-10
