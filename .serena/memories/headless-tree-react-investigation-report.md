# @headless-tree/react 調査レポート

調査日: 2025-11-10

## 概要

@headless-tree/react は React 用の headless ツリーコンポーネントライブラリ。
100k+ アイテムの virtualization をサポートし、柔軟な状態管理と非同期データローディングを提供。

---

## 1. データ構造

### 基本的な構造
- **ID ベースの参照**: ツリーアイテムは文字列 ID で識別
- **フラット構造を推奨**: dataLoader で親子関係を定義
- **ジェネリック型対応**: `useTree<ItemPayload>` でカスタムペイロード型を指定可能

### データローダーの形式

```typescript
dataLoader: {
  getItem: (itemId: string) => ItemPayload,
  getChildren: (itemId: string) => string[], // 子の ID 配列
}

// または一括取得
dataLoader: {
  getItem: (itemId: string) => ItemPayload,
  getChildrenWithData: (itemId: string) => Array<{ id: string, data: ItemPayload }>
}
```

---

## 2. 同期 vs 非同期データローディング

### 同期データローダー (`syncDataLoaderFeature`)
- データが即座に利用可能な場合
- `getItem` と `getChildren` が同期的に値を返す

```typescript
import { syncDataLoaderFeature } from "@headless-tree/core";

const tree = useTree<ItemPayload>({
  rootItemId: "root",
  dataLoader: {
    getItem: (itemId) => myDataStructure[itemId],
    getChildren: (itemId) => myDataStructure[itemId].childrenIds,
  },
  features: [syncDataLoaderFeature],
});
```

### 非同期データローダー (`asyncDataLoaderFeature`)
- API からデータを取得する場合
- `getItem` と `getChildren` が Promise を返す
- **自動キャッシング機能あり**

```typescript
import { asyncDataLoaderFeature } from "@headless-tree/core";

const tree = useTree<ItemPayload>({
  rootItemId: "root",
  dataLoader: {
    getItem: async (itemId) => await api.fetchItem(itemId),
    getChildren: async (itemId) => await api.fetchChildren(itemId),
  },
  createLoadingItemData: () => "Loading...",
  features: [asyncDataLoaderFeature],
});
```

#### キャッシュの無効化
```typescript
const item = tree.getItemInstance("item1");
item.invalidateItemData();      // アイテムデータの再取得
item.invalidateChildrenIds();   // 子 ID リストの再取得
```

---

## 3. 展開/折りたたみ状態の管理

### 自動管理（デフォルト）
```typescript
const tree = useTree({
  initialState: { expandedItems: ["folder-1", "folder-2"] },
  // ...
});
```

### 手動管理
```typescript
const [expandedItems, setExpandedItems] = useState<string[]>([]);

const tree = useTree({
  state: { expandedItems },
  setExpandedItems,
  // ...
});
```

### プログラマティックな操作
```typescript
const item = tree.getItemInstance("item-id");
item.expand();
item.collapse();
item.isExpanded(); // boolean
```

---

## 4. Virtualization サポート

### 組み込みサポート
- **100k+ アイテムでテスト済み**
- `tree.getItems()` がフラット化されたツリーを返す
- 外部 virtualization ライブラリ（`@tanstack/react-virtual` など）との統合が推奨される

### react-virtual との統合例

```jsx
import { useVirtualizer } from '@tanstack/react-virtual';

const items = tree.getItems(); // フラット化されたアイテムリスト

const virtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => scrollElementRef.current,
  estimateSize: () => 32, // アイテムの高さ
});

return (
  <div ref={scrollElementRef} style={{ height: '400px', overflow: 'auto' }}>
    <div style={{ height: `${virtualizer.getTotalSize()}px` }}>
      {virtualizer.getVirtualItems().map((virtualItem) => {
        const item = items[virtualItem.index];
        const props = item.getProps();
        return (
          <button
            {...props}
            key={virtualItem.key}
            data-index={virtualItem.index}
            ref={(r) => {
              virtualizer.measureElement(r);
              props.ref(r);
            }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {item.getItemName()}
          </button>
        );
      })}
    </div>
  </div>
);
```

---

## 5. 基本的な使い方

### 最小限の実装

```typescript
import { useTree } from "@headless-tree/react";
import { syncDataLoaderFeature } from "@headless-tree/core";

const tree = useTree<string>({
  rootItemId: "root",
  getItemName: (item) => item.getItemData(),
  isItemFolder: (item) => !item.getItemData().endsWith("item"),
  dataLoader: {
    getItem: (itemId) => itemId,
    getChildren: (itemId) => [`${itemId}-child1`, `${itemId}-child2`],
  },
  features: [syncDataLoaderFeature],
});

return (
  <div {...tree.getContainerProps()}>
    {tree.getItems().map((item) => (
      <button
        {...item.getProps()}
        key={item.getId()}
        style={{ paddingLeft: `${item.getItemMeta().level * 20}px` }}
      >
        {item.getItemName()}
      </button>
    ))}
  </div>
);
```

---

## 6. 主要な API

### Tree インスタンス
- `tree.getItems()`: フラット化されたツリーアイテムのリストを取得
- `tree.getItemInstance(id)`: ID からアイテムインスタンスを取得
- `tree.getContainerProps()`: ツリーコンテナの props（ARIA 属性、イベントハンドラ）
- `tree.rebuildTree()`: ツリー構造を再構築（データ変更後）

### Item インスタンス
- `item.getProps()`: アイテム要素の props（ARIA 属性、イベントハンドラ、ref）
- `item.getId()`: アイテム ID
- `item.getItemName()`: アイテム名
- `item.getItemData()`: カスタムペイロード
- `item.getItemMeta()`: メタデータ（level, index など）
- `item.isFolder()`: フォルダかどうか
- `item.isExpanded()`: 展開されているか
- `item.expand()` / `item.collapse()`: 展開/折りたたみ
- `item.getChildren()`: 子アイテムのリスト

---

## 7. 機能（Features）

### コア機能
- `syncDataLoaderFeature`: 同期データローダー
- `asyncDataLoaderFeature`: 非同期データローダー
- `selectionFeature`: 選択機能（単一/複数選択、Ctrl/Shift クリック）
- `dragAndDropFeature`: Drag & Drop
- `hotkeysCoreFeature`: キーボードショートカット
- `searchFeature`: 検索/タイプアヘッド
- `renameFeature`: アイテム名の編集
- `checkboxFeature`: チェックボックス選択

### 機能の追加方法
```typescript
const tree = useTree({
  features: [
    syncDataLoaderFeature,
    selectionFeature,
    hotkeysCoreFeature,
  ],
});
```

---

## 8. データ変更の反映

### 同期ツリー
```typescript
// データを変更
myData["item1"].children.push("item3");
myData["item3"] = { name: "Item 3", children: [] };

// ツリーを再構築
tree.rebuildTree();
```

### 非同期ツリー
```typescript
// データソースを変更
await api.updateItem(itemId, newData);

// キャッシュを更新
const item = tree.getItemInstance(itemId);
item.updateCachedChildrenIds(newChildren);
tree.rebuildTree();

// または無効化して再取得
item.invalidateItemData();
item.invalidateChildrenIds();
```

---

## 9. パフォーマンス特性

### 大量データ対応
- **100k+ アイテムでテスト済み**
- Virtualization との組み合わせで快適に動作
- `tree.getItems()` が O(n) でフラット化されたリストを返す

### 最適化ポイント
- **Virtualization の使用**: 表示されているアイテムのみレンダリング
- **メモ化**: `useMemo` や `React.memo` でレンダリングを最適化
- **非同期データローダーのキャッシング**: 不要な API リクエストを削減

---

## 10. GROWI への適用方針

### 現在の API との比較

#### 既存 API（`/page-listing/root`, `/page-listing/children?id={pageId}`）
- ルートと子要素を個別に取得
- 各 TreeItem が個別に SWR フックを呼び出し
- 階層的な展開時に API リクエストが発生

#### @headless-tree/react に最適な API
- **同じ API を活用できる**: 既存の API 構造は asyncDataLoaderFeature と互換性が高い
- `getItem`: `/page-listing/children?id={pageId}` でルート情報を取得
- `getChildren`: `/page-listing/children?id={pageId}` で子 ID リストを取得

### 推奨アプローチ

**既存 API をそのまま使用し、asyncDataLoaderFeature で統合する方針**

```typescript
const tree = useTree<IPageForTreeItem>({
  rootItemId: "/",
  getItemName: (item) => item.getItemData().path,
  isItemFolder: (item) => item.getItemData().descendantCount > 0,
  createLoadingItemData: () => ({
    _id: "",
    path: "Loading...",
    parent: "",
    descendantCount: 0,
    revision: "",
    grant: 1,
    isEmpty: false,
    wip: false,
  }),
  dataLoader: {
    getItem: async (itemId) => {
      const { data } = await apiv3Get<IPageForTreeItem>(
        `/page-listing/children?id=${itemId}`
      );
      return data.page;
    },
    getChildren: async (itemId) => {
      const { data } = await apiv3Get<{ children: IPageForTreeItem[] }>(
        `/page-listing/children?id=${itemId}`
      );
      return data.children.map(child => child._id);
    },
  },
  features: [asyncDataLoaderFeature, selectionFeature],
});
```

### 利点
1. **バックエンド変更不要**: 既存 API をそのまま使用
2. **自動キャッシング**: asyncDataLoaderFeature が API レスポンスをキャッシュ
3. **簡潔な実装**: ライブラリが状態管理を担当
4. **Virtualization 対応**: `tree.getItems()` でフラット化されたリストを取得し、`@tanstack/react-virtual` と統合

---

## 11. 次のステップ（M2.2 以降）

### M2.2: バックエンド API 設計
**結論: 既存 API で十分、新規 API 不要**

### M2.3: バックエンド API 実装
**スキップ: 既存 API を使用**

### M2.4: @headless-tree/react 統合
1. `@headless-tree/core` と `@headless-tree/react` をインストール
2. SimplifiedItemsTree を更新:
   - `useTree` フックで既存 API と連携
   - `asyncDataLoaderFeature` を使用
   - ツリー構造の表示（展開/折りたたみ）

### M2.5: Virtualization 実装
1. `@tanstack/react-virtual` をインストール
2. `useVirtualizer` と `tree.getItems()` を統合
3. スクロールパフォーマンスの最適化

### M2.6: 5000 件での動作確認
- 大量データでのスムーズなスクロール
- API リクエスト数の確認
- メモリ使用量のチェック

---

## 参考リンク

- 公式ドキュメント: https://headless-tree.lukasbach.com/
- GitHub: https://github.com/lukasbach/headless-tree
- Context7 Library ID: `/lukasbach/headless-tree`
