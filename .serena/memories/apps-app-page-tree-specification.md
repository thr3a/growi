# PageTree 仕様書

## 概要

GROWIのPageTreeは、`@headless-tree/react` と `@tanstack/react-virtual` を使用したVirtualized Tree実装です。
5000件以上の兄弟ページでも快適に動作するよう設計されています。

---

## 1. アーキテクチャ

### 1.1 ディレクトリ構成

```
src/features/page-tree/
├── index.ts                           # メインエクスポート
├── client/
│   ├── components/
│   │   ├── SimplifiedItemsTree.tsx    # コアvirtualizedツリーコンポーネント
│   │   ├── TreeItemLayout.tsx         # 汎用ツリーアイテムレイアウト
│   │   ├── TreeItemLayout.module.scss
│   │   ├── SimpleItemContent.tsx      # シンプルなアイテムコンテンツ表示
│   │   ├── SimpleItemContent.module.scss
│   │   ├── RenameInput.tsx            # リネーム入力UIコンポーネント
│   │   ├── CreateInput.tsx            # 新規作成入力UIコンポーネント
│   │   ├── CreateInput.module.scss
│   │   └── _tree-item-variables.scss  # SCSS変数
│   ├── hooks/
│   │   ├── use-data-loader.ts         # データローダーフック
│   │   ├── use-scroll-to-selected-item.ts # スクロール制御フック
│   │   ├── use-page-rename.tsx        # Renameビジネスロジック
│   │   └── use-page-create.tsx        # Createビジネスロジック
│   ├── interfaces/
│   │   └── index.ts                   # TreeItemProps, TreeItemToolProps
│   └── states/
│       ├── page-tree-update.ts        # ツリー更新状態（Jotai）
│       ├── page-tree-desc-count-map.ts # 子孫カウント状態（Jotai）
│       └── page-tree-create.ts        # 作成中状態（Jotai）
└── constants/
    └── index.ts                       # ROOT_PAGE_VIRTUAL_ID
```

### 1.2 Sidebar専用コンポーネント（移動しなかったファイル）

以下は `components/Sidebar/PageTreeItem/` に残留：

- `SimplifiedPageTreeItem.tsx` - Sidebar専用の実装
- `CountBadgeForPageTreeItem.tsx` - PageTree専用バッジ
- `use-page-item-control.tsx` - コンテキストメニュー制御

---

## 2. 主要コンポーネント

### 2.1 SimplifiedItemsTree

**ファイル**: `features/page-tree/client/components/SimplifiedItemsTree.tsx`

Virtualizedツリーのコアコンポーネント。`@headless-tree/react` と `@tanstack/react-virtual` を統合。

#### Props

```typescript
interface SimplifiedItemsTreeProps {
  // 表示対象のターゲットパスまたはID
  targetPathOrId: string | null;
  // WIPページを表示するか
  isWipPageShown?: boolean;
  // 仮想スクロール用の親要素
  scrollerElem: HTMLElement | null;
  // カスタムTreeItemコンポーネント
  CustomTreeItem?: React.ComponentType<TreeItemProps<IPageForTreeItem>>;
  // チェックボックス機能
  enableCheckboxes?: boolean;
  initialCheckedItems?: string[];
  onCheckedItemsChange?: (checkedItems: IPageForTreeItem[]) => void;
}
```

#### 使用している @headless-tree/core Features

- `asyncDataLoaderFeature` - 非同期データローディング
- `selectionFeature` - 選択機能
- `renamingFeature` - リネーム機能
- `hotkeysCoreFeature` - キーボードショートカット
- `checkboxesFeature` - チェックボックス（オプション）

#### 重要な実装詳細

1. **データローダー**: `use-data-loader.ts` で既存API（`/page-listing/root`, `/page-listing/children`）を活用
2. **Virtualization**: `@tanstack/react-virtual` の `useVirtualizer` を使用、`overscan: 5` で最適化
3. **初期スクロール**: `scrollToIndex` で選択アイテムまでスクロール

### 2.2 TreeItemLayout

**ファイル**: `features/page-tree/client/components/TreeItemLayout.tsx`

汎用的なツリーアイテムレイアウト。展開/折りたたみ、アイコン、カスタムコンポーネントを配置。

#### Props

```typescript
interface TreeItemLayoutProps {
  page: IPageForTreeItem;
  level: number;
  isOpen: boolean;
  isSelected: boolean;
  onToggle?: () => void;
  onClick?: () => void;
  // カスタムコンポーネント
  customEndComponents?: React.ReactNode[];
  customHoveredEndComponents?: React.ReactNode[];
  customAlternativeComponents?: React.ReactNode[];
  showAlternativeContent?: boolean;
}
```

#### 自動展開ロジック

```typescript
useEffect(() => {
  if (isExpanded) return;
  const isPathToTarget = page.path != null
    && targetPath.startsWith(addTrailingSlash(page.path))
    && targetPath !== page.path;
  if (isPathToTarget) onToggle?.();
}, [targetPath, page.path, isExpanded, onToggle]);
```

### 2.3 SimplifiedPageTreeItem

**ファイル**: `components/Sidebar/PageTreeItem/SimplifiedPageTreeItem.tsx`

Sidebar用のツリーアイテム実装。TreeItemLayoutを使用し、Rename/Create/Control機能を統合。

#### 機能

- WIPページフィルター
- descendantCountバッジ
- hover時の操作ボタン（duplicate/delete/rename/create）
- リネームモード表示
- 新規作成入力表示（子として）

---

## 3. 機能実装

### 3.1 Rename（ページ名変更）

**実装ファイル**:
- `features/page-tree/client/hooks/use-page-rename.tsx`
- `features/page-tree/client/components/RenameInput.tsx`

#### 使用方法

```typescript
const { rename, isRenaming, RenameAlternativeComponent } = usePageRename(item);

// TreeItemLayoutに渡す
<TreeItemLayout
  showAlternativeContent={isRenaming(item)}
  customAlternativeComponents={[RenameAlternativeComponent]}
/>
```

#### 操作方法

- **開始**: F2キー or コンテキストメニュー
- **確定**: Enter
- **キャンセル**: Escape

### 3.2 Create（ページ新規作成）

**実装ファイル**:
- `features/page-tree/client/hooks/use-page-create.tsx`
- `features/page-tree/client/components/CreateInput.tsx`
- `features/page-tree/client/states/page-tree-create.ts`

#### 状態管理（Jotai）

```typescript
// page-tree-create.ts
creatingParentIdAtom: 作成中の親ノードID
useCreatingParentId(): 現在の作成中親ID取得
useIsCreatingChild(parentId): 特定アイテムが作成中か判定
usePageTreeCreateActions(): startCreating, cancelCreating
```

#### 使用方法

```typescript
const { isCreatingChild, CreateInputComponent, startCreating } = usePageCreate(item);

// SimplifiedPageTreeItemで使用
{isCreatingChild() && <CreateInputComponent />}
```

#### 操作方法

- **開始**: コンテキストメニューから「作成」を選択
- **確定**: Enter → POST /page API → 新規ページに遷移
- **キャンセル**: Escape or ブラー

### 3.3 Checkboxes（AI Assistant用）

**使用箇所**: `AiAssistantManagementPageTreeSelection.tsx`

SimplifiedItemsTreeのcheckboxesオプションを使用。

#### Props

```typescript
<SimplifiedItemsTree
  enableCheckboxes={true}
  initialCheckedItems={['page-id-1', 'page-id-2']}
  onCheckedItemsChange={(checkedItems) => {
    // チェック変更時の処理
    // ページパスに `/*` を付加して保存
  }}
/>
```

#### 実装詳細

- `checkboxesFeature` を条件付きで追加
- `propagateCheckedState: false` で子への伝播を無効化
- `canCheckFolders: true` でフォルダもチェック可能

---

## 4. バックエンドAPI

### 4.1 使用エンドポイント

```
GET /page-listing/root
→ ルートページ "/" のデータ

GET /page-listing/children?id={pageId}
→ 指定ページの直下の子のみ

GET /page-listing/item?id={pageId}
→ 単一ページデータ（新規追加）
```

### 4.2 IPageForTreeItem インターフェース

```typescript
interface IPageForTreeItem {
  _id: string;
  path: string;
  parent?: string;
  descendantCount: number;
  revision?: string;
  grant: PageGrant;
  isEmpty: boolean;
  wip: boolean;
  processData?: IPageOperationProcessData;
}
```

---

## 5. @headless-tree/react 基礎知識

### 5.1 データ構造

- **IDベースの参照**: ツリーアイテムは文字列IDで識別
- **フラット構造を推奨**: dataLoaderで親子関係を定義
- **ジェネリック型対応**: `useTree<IPageForTreeItem>` でカスタム型を指定

### 5.2 非同期データローダー

```typescript
const tree = useTree<IPageForTreeItem>({
  rootItemId: "root",
  dataLoader: {
    getItem: async (itemId) => await api.fetchItem(itemId),
    getChildren: async (itemId) => await api.fetchChildren(itemId),
  },
  createLoadingItemData: () => ({ /* loading state */ }),
  features: [asyncDataLoaderFeature],
});
```

#### キャッシュの無効化

```typescript
const item = tree.getItemInstance("item1");
item.invalidateItemData();      // アイテムデータの再取得
item.invalidateChildrenIds();   // 子IDリストの再取得
```

### 5.3 Virtualization統合

```typescript
const items = tree.getItems(); // フラット化されたアイテムリスト

const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => scrollElementRef.current,
  estimateSize: () => 32,
  overscan: 5,
});
```

### 5.4 主要API

#### Tree インスタンス
- `tree.getItems()`: フラット化されたツリーアイテムのリスト
- `tree.getItemInstance(id)`: IDからアイテムインスタンスを取得
- `tree.getContainerProps()`: ツリーコンテナのprops（ホットキー有効化に必須）
- `tree.rebuildTree()`: ツリー構造を再構築

#### Item インスタンス
- `item.getProps()`: アイテム要素のprops
- `item.getId()`: アイテムID
- `item.getItemData()`: カスタムペイロード（IPageForTreeItem）
- `item.getItemMeta()`: メタデータ（level, indexなど）
- `item.isFolder()`: フォルダかどうか
- `item.isExpanded()`: 展開されているか
- `item.expand()` / `item.collapse()`: 展開/折りたたみ
- `item.startRenaming()`: リネームモード開始
- `item.isRenaming()`: リネーム中か判定

---

## 6. パフォーマンス最適化

### 6.1 Virtualization

- **100k+アイテムでテスト済み**
- `overscan: 5` で表示範囲外の先読み
- `estimateSize: 32` でアイテム高さを推定

### 6.2 非同期データローダーのキャッシング

- asyncDataLoaderFeatureが自動キャッシング
- 展開済みアイテムは再取得なし
- `invalidateChildrenIds()` で明示的に無効化可能

### 6.3 ツリー更新

```typescript
// Jotai atomでツリー更新を通知
const { notifyUpdateItems } = usePageTreeInformationUpdate();
notifyUpdateItems(updatedPages);

// SWRでページデータを再取得
const { mutate: mutatePageTree } = useSWRxPageTree();
await mutatePageTree();
```

---

## 7. 実装済み機能

- ✅ Virtualizedツリー表示
- ✅ 展開/折りたたみ
- ✅ ページ遷移（クリック）
- ✅ 選択状態表示
- ✅ WIPページフィルター
- ✅ descendantCountバッジ
- ✅ hover時の操作ボタン
- ✅ 選択ページまでの自動展開
- ✅ 選択ページへの初期スクロール
- ✅ Rename（F2、コンテキストメニュー）
- ✅ Create（コンテキストメニュー）
- ✅ Duplicate（hover時ボタン）
- ✅ Delete（hover時ボタン）
- ✅ Checkboxes（AI Assistant用）

---

## 8. 未実装機能

- ⏳ Drag and Drop（ページ移動）
- ⏳ リアルタイム更新（Socket.io統合）

---

## 9. 参考リンク

- @headless-tree/react 公式ドキュメント: https://headless-tree.lukasbach.com/
- GitHub: https://github.com/lukasbach/headless-tree
- @tanstack/react-virtual: https://tanstack.com/virtual/latest

---

## 10. 改修時の注意点

### 10.1 ホットキーサポート

`hotkeysCoreFeature` と `getContainerProps()` の組み合わせが必須。
`getContainerProps()` がないとホットキーが動作しない。

### 10.2 ツリー更新の通知

操作完了後は以下を呼び出す：
1. `mutatePageTree()` - SWRでデータ再取得
2. `notifyUpdateItems()` - Jotai atomで更新通知

### 10.3 旧実装について

以下のファイルはTypeScriptエラーあり（許容）：
- `ItemsTree.tsx` - 旧実装
- `PageTreeItem.tsx` - 旧Sidebar用
- `TreeItemForModal.tsx` - 旧Modal用

---

## 更新履歴

- 2025-11-10: 初版作成（Virtualization計画）
- 2025-11-28: Rename/Create実装完了、ディレクトリ再編成
- 2025-12-05: 仕様書として統合
