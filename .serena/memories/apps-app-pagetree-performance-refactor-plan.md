# PageTree パフォーマンス改善リファクタ計画

## 🎯 目標
現在のパフォーマンス問題を解決：
- **問題**: 5000件の兄弟ページで初期レンダリングが重い
- **目標**: 表示速度を10-20倍改善、UX維持

## 🚀 実装戦略: 2本立て

### 戦略1: レンダリング最適化（react-window + SpeedTree）

#### 現状分析
- **ファイル**: `src/client/components/TreeItem/TreeItemLayout.tsx`
- **問題**: 階層すべてを一度にレンダリング（5000項目 × DOM要素）
- **影響**: メモリ/CPU消費が深刻

#### 実装計画 - 既存ファイル活用方式
**新規ファイル乱造を避け、既存構造を最大限活用**

##### 主要変更ファイル:

1. **ItemsTree.tsx** - react-window統合
   ```typescript
   // Before: 再帰的レンダリング
   const renderTreeItems = () => currentNodes.map(...);
   
   // After: react-window統合
   import { FixedSizeList } from 'react-window';
   import { flattenTree } from './utils/flatten-tree';
   
   const flattenedItems = useMemo(() => 
     flattenTree(rootNodes, expandedStates), [rootNodes, expandedStates]
   );
   
   return (
     <FixedSizeList
       itemCount={flattenedItems.length}
       itemSize={40}
       itemData={{ items: flattenedItems, ...otherProps }}
     >
       {renderTreeItem}
     </FixedSizeList>
   );
   ```

2. **TreeItemLayout.tsx** - 子要素レンダリング部分修正
   ```typescript
   // Before: 再帰的な子要素レンダリング
   { isOpen && (
     <div className="tree-item-layout-children">
       { hasChildren() && currentChildren.map((node) => {
         return <ItemClassFixed key={node.page._id} {...itemProps} />; // ← 削除
       })}
     </div>
   )}
   
   // After: 子要素は上位で管理（react-windowが担当）
   { isOpen && hasChildren() && (
     <div className="tree-item-layout-children">
       {children} {/* ← react-windowから渡される */}
     </div>
   )}
   ```

3. **utils/flatten-tree.ts** - 新規作成（唯一の新規ファイル）
   ```typescript
   export const flattenTree = (nodes: ItemNode[], expandedStates: Record<string, boolean>) => {
     const result = [];
     // SpeedTreeのロジック適用 (参考: https://codesandbox.io/p/sandbox/8psp0)
     return result;
   };
   ```

##### TreeItemRenderer実装
**既存コンポーネントをそのまま活用**:
```typescript
// react-windowのitemRenderer
const renderTreeItem = ({ index, style, data }) => {
  const { items, ...props } = data;
  const item = items[index];
  
  return (
    <div style={style}>
      <PageTreeItem  // ← 既存コンポーネントをそのまま使用
        {...props}
        itemNode={item.node}
        itemLevel={item.level}
      />
    </div>
  );
};
```

##### 期待効果
- **レンダリング項目**: 5000 → 表示される10-20項目のみ
- **初期表示速度**: 10-20倍改善
- **メモリ使用量**: 99%削減

---

### 戦略2: API軽量化

#### 現状分析
- **ファイル**: `src/server/service/page/index.ts:findChildrenByParentPathOrIdAndViewer`
- **問題**: PageDocument全フィールドを返送（~500バイト/ページ）
- **影響**: 5000ページ × 500バイト = 2.5MB転送

#### 実装計画

1. **必要最小限フィールドの特定**
   ```typescript
   // 現在: 全フィールド返送
   // 変更後: ツリー表示に必要な最小限のみ
   .select('_id path parent descendantCount grant isEmpty createdAt updatedAt')
   ```

2. **対象ファイル**
   - `src/server/service/page/index.ts` - selectクエリ追加
   - `src/interfaces/page-listing-results.ts` - 型定義更新

#### 期待効果
- **データサイズ**: 500バイト → 100バイト（5倍軽量化）
- **ネットワーク転送**: 2.5MB → 500KB

---

## 📁 最終的なファイル変更まとめ

| ファイル | 変更内容 | 理由 |
|---------|---------|------|
| **ItemsTree.tsx** | react-window統合 | ツリー全体の管理箇所 |
| **TreeItemLayout.tsx** | 子要素レンダリング部分修正 | 既存ロジック活用 |
| **utils/flatten-tree.ts** | 新規作成 | フラット化ロジック分離 |
| **src/server/service/page/index.ts** | selectクエリ追加 | API軽量化 |
| **src/interfaces/page-listing-results.ts** | 型定義更新 | API軽量化対応 |

**新規ファイル**: 1個のみ（ユーティリティ関数）  
**既存ファイル活用**: 最大限活用

---

## 🎯 実装優先順位

**Phase 1**: API軽量化（低リスク・即効性）
- **工数**: 1-2日
- **リスク**: 低（表示に影響なし）

**Phase 2**: react-window実装（高効果）  
- **工数**: 3-5日
- **リスク**: 中（UI構造の大幅変更）

**合計効果**: 初期表示速度 50-100倍改善予想

---

## 技術的参考資料
- **SpeedTree参考実装**: https://codesandbox.io/p/sandbox/8psp0
- **react-window**: FixedSizeListを使用
- **フラット化アプローチ**: 展開状態に応じて動的配列変換