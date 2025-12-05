# PageTree D&D 実装計画

## 概要

headless-treeの`dragAndDropFeature`を使用し、ページのドラッグ&ドロップによる移動機能をオプションとして実装する。

## 決定事項

| 項目 | 決定 |
|------|------|
| 並び替え（Reorder） | 不要（子として追加のみ） |
| キーボードD&D | 不要 |
| 複数選択D&D | 対応（祖先-子孫関係がある場合はドラッグ禁止） |
| ドラッグプレビュー | デフォルト（ブラウザ標準） |
| ルートページへのドロップ | 許可 |
| エラーハンドリング | 旧実装と同様（`operation__blocked`と汎用エラーで異なるトースト） |
| ビジュアルフィードバック | 旧実装と同等（`drag-over`クラス） |

---

## 実装ステップ

### Step 1: `use-tree-features.ts`を拡張

**ファイル**: `features/page-tree/hooks/_inner/use-tree-features.ts`

```typescript
import {
  asyncDataLoaderFeature,
  checkboxesFeature,
  dragAndDropFeature,  // 追加
  hotkeysCoreFeature,
  renamingFeature,
  selectionFeature,
} from '@headless-tree/core';

export type UseTreeFeaturesOptions = {
  enableRenaming?: boolean;
  enableCheckboxes?: boolean;
  enableDragAndDrop?: boolean;  // 追加
};

export const useTreeFeatures = (options: UseTreeFeaturesOptions = {}) => {
  const { 
    enableRenaming = true, 
    enableCheckboxes = false,
    enableDragAndDrop = false,  // 追加
  } = options;

  return useMemo(() => {
    const features = [
      asyncDataLoaderFeature,
      selectionFeature,
      hotkeysCoreFeature,
    ];

    if (enableRenaming) {
      features.push(renamingFeature);
    }
    if (enableCheckboxes) {
      features.push(checkboxesFeature);
    }
    if (enableDragAndDrop) {
      features.push(dragAndDropFeature);  // 追加
    }

    return features;
  }, [enableRenaming, enableCheckboxes, enableDragAndDrop]);
};
```

---

### Step 2: `use-page-move.ts`フックを新規作成

**ファイル**: `features/page-tree/hooks/use-page-move.ts`

#### 主要ロジック

```typescript
import type { ItemInstance, DragTarget } from '@headless-tree/core';
import { pagePathUtils } from '@growi/core/dist/utils';
import nodePath from 'path';

import { apiv3Put } from '~/client/util/apiv3-client';
import { toastWarning, toastError } from '~/client/util/toastr';
import type { IPageForTreeItem } from '~/interfaces/page';
import { mutatePageTree } from '~/stores/page-listing';

// 移動後のパスを計算
const getNewPathAfterMoved = (fromPath: string, newParentPath: string): string => {
  const pageTitle = nodePath.basename(fromPath);
  return nodePath.join(newParentPath, pageTitle);
};

// 祖先-子孫関係をチェック（複数選択時の禁止条件）
const hasAncestorDescendantRelation = (items: ItemInstance<IPageForTreeItem>[]): boolean => {
  const paths = items.map(item => item.getItemData().path).filter(Boolean) as string[];
  
  for (let i = 0; i < paths.length; i++) {
    for (let j = 0; j < paths.length; j++) {
      if (i === j) continue;
      // paths[i]がpaths[j]の祖先かどうか
      if (paths[j].startsWith(paths[i] + '/')) {
        return true;
      }
    }
  }
  return false;
};

export const usePageMove = (t: TFunction) => {
  
  // ドラッグ可能かの判定
  const canDrag = useCallback((items: ItemInstance<IPageForTreeItem>[]): boolean => {
    // 祖先-子孫関係がある場合は禁止
    if (hasAncestorDescendantRelation(items)) {
      return false;
    }
    
    // 全アイテムがドラッグ可能かチェック
    return items.every(item => {
      const page = item.getItemData();
      if (page.path == null) return false;
      // 保護されたユーザーページはドラッグ不可
      return !pagePathUtils.isUsersProtectedPages(page.path);
    });
  }, []);

  // ドロップ可能かの判定
  const canDrop = useCallback((
    items: ItemInstance<IPageForTreeItem>[], 
    target: DragTarget<IPageForTreeItem>
  ): boolean => {
    const targetPage = target.item.getItemData();
    if (targetPage.path == null) return false;

    // ユーザートップページへのドロップは禁止
    if (pagePathUtils.isUsersTopPage(targetPage.path)) {
      return false;
    }

    // 全アイテムが移動可能かチェック
    return items.every(item => {
      const fromPage = item.getItemData();
      if (fromPage.path == null) return false;

      const newPathAfterMoved = getNewPathAfterMoved(fromPage.path, targetPage.path);
      return pagePathUtils.canMoveByPath(fromPage.path, newPathAfterMoved);
    });
  }, []);

  // ドロップ時のハンドラー
  const onDrop = useCallback(async (
    items: ItemInstance<IPageForTreeItem>[], 
    target: DragTarget<IPageForTreeItem>
  ): Promise<void> => {
    const targetPage = target.item.getItemData();
    if (targetPage.path == null) return;

    for (const item of items) {
      const fromPage = item.getItemData();
      if (fromPage.path == null) continue;

      const newPagePath = getNewPathAfterMoved(fromPage.path, targetPage.path);

      try {
        await apiv3Put('/pages/rename', {
          pageId: fromPage._id,
          revisionId: fromPage.revision,
          newPagePath,
          isRenameRedirect: false,
          updateMetadata: true,
        });
      } catch (err) {
        if (err.code === 'operation__blocked') {
          toastWarning(t('pagetree.you_cannot_move_this_page_now'));
        } else {
          toastError(t('pagetree.something_went_wrong_with_moving_page'));
        }
        // エラー時は残りのアイテムの処理を中断
        break;
      }
    }

    // ツリーを更新
    await mutatePageTree();
    
    // ドロップ先を展開
    target.item.expand();
  }, [t]);

  return { canDrag, canDrop, onDrop };
};
```

---

### Step 3: `SimplifiedItemsTree.tsx`にD&D設定を統合

**ファイル**: `features/page-tree/client/components/SimplifiedItemsTree.tsx`

#### Props追加

```typescript
interface SimplifiedItemsTreeProps {
  // 既存props...
  enableDragAndDrop?: boolean;  // 追加
}
```

#### useTree設定

```typescript
const { canDrag, canDrop, onDrop } = usePageMove(t);

const tree = useTree<IPageForTreeItem>({
  rootItemId: ROOT_PAGE_VIRTUAL_ID,
  dataLoader,
  createLoadingItemData,
  features: useTreeFeatures({ 
    enableRenaming, 
    enableCheckboxes,
    enableDragAndDrop,  // 追加
  }),
  // D&D設定（enableDragAndDrop時のみ有効）
  ...(enableDragAndDrop && {
    canDrag,
    canDrop,
    onDrop,
    openOnDropDelay: 600,  // 旧実装と同じ
    canReorder: false,     // 並び替え無効
  }),
});
```

#### ドラッグライン要素追加

```tsx
return (
  <div {...tree.getContainerProps()} className="simplified-items-tree">
    {virtualItems.map((virtualItem) => (
      // 既存のアイテムレンダリング...
    ))}
    {/* ドラッグライン（D&D有効時のみ） */}
    {enableDragAndDrop && (
      <div 
        style={tree.getDragLineStyle()} 
        className="tree-drag-line" 
      />
    )}
  </div>
);
```

---

### Step 4: `TreeItemLayout.tsx`にドラッグ状態スタイリングを追加

**ファイル**: `features/page-tree/client/components/TreeItemLayout.tsx`

```tsx
const isDragOver = item.isDraggingOver();

const itemClassNames = [
  // 既存クラス...
  isDragOver ? 'drag-over' : '',
].filter(Boolean).join(' ');
```

#### SCSS（既存の`PageTreeItem.module.scss`を活用）

```scss
.drag-over {
  background-color: rgba(var(--bs-primary-rgb), 0.1);
  border: 1px dashed var(--bs-primary);
}

.tree-drag-line {
  height: 2px;
  margin-top: -1px;
  background-color: var(--bs-primary);
  pointer-events: none;
}
```

---

### Step 5: Sidebar用PageTreeで有効化

**ファイル**: PageTreeを使用しているSidebarコンポーネント

```tsx
<SimplifiedItemsTree
  targetPathOrId={targetPathOrId}
  scrollerElem={scrollerElem}
  CustomTreeItem={SimplifiedPageTreeItem}
  enableDragAndDrop={true}  // 追加
/>
```

---

## バリデーションロジック詳細

### canDrag チェック項目

1. **祖先-子孫関係チェック**: 選択されたアイテム間に祖先-子孫関係がある場合は`false`
2. **保護ページチェック**: `pagePathUtils.isUsersProtectedPages(path)`が`true`の場合は`false`
3. **パスnullチェック**: `page.path == null`の場合は`false`

### canDrop チェック項目

1. **ユーザートップページチェック**: `pagePathUtils.isUsersTopPage(targetPath)`が`true`の場合は`false`
2. **移動可否チェック**: `pagePathUtils.canMoveByPath(fromPath, newPath)`が`false`の場合は`false`
   - 自分自身への移動禁止
   - 自分の子孫への移動禁止
   - その他のパス制約

---

## ファイル一覧

| ファイル | 変更種別 |
|----------|----------|
| `features/page-tree/hooks/_inner/use-tree-features.ts` | 修正 |
| `features/page-tree/hooks/use-page-move.ts` | 新規作成 |
| `features/page-tree/hooks/use-page-move.test.ts` | 新規作成（単体テスト） |
| `features/page-tree/client/components/SimplifiedItemsTree.tsx` | 修正 |
| `features/page-tree/client/components/TreeItemLayout.tsx` | 修正 |
| `features/page-tree/index.ts` | 修正（export追加） |
| Sidebar PageTree使用箇所 | 修正 |

---

## Step 6: 単体テストの追加

**ファイル**: `features/page-tree/hooks/use-page-move.test.ts`

テストファイルは実装と同じディレクトリに配置する。vitestの設定については `vitest.workspace.mts` や `vitest.config.ts`、およびSerena memoriesを参照のこと。

### テスト対象

`use-page-move.ts` のユーティリティ関数をテストする。これらはビジネスロジックが集中しているためテスト優先度が高い。

### テストケース

```typescript
import { describe, it, expect } from 'vitest';

// ユーティリティ関数をexportしてテスト可能にする
import { getNewPathAfterMoved, hasAncestorDescendantRelation } from './use-page-move';

describe('getNewPathAfterMoved', () => {
  it('should return correct path when moving to root', () => {
    expect(getNewPathAfterMoved('/A/B', '/')).toBe('/B');
  });

  it('should return correct path when moving to nested parent', () => {
    expect(getNewPathAfterMoved('/A/B', '/C/D')).toBe('/C/D/B');
  });

  it('should handle page with special characters in name', () => {
    expect(getNewPathAfterMoved('/A/Page Name', '/B')).toBe('/B/Page Name');
  });

  it('should handle deeply nested paths', () => {
    expect(getNewPathAfterMoved('/A/B/C/D', '/X/Y')).toBe('/X/Y/D');
  });
});

describe('hasAncestorDescendantRelation', () => {
  // ItemInstance のモックを作成するヘルパー
  const createMockItem = (path: string) => ({
    getItemData: () => ({ path }),
  });

  it('should return true when parent and child are selected', () => {
    const items = [
      createMockItem('/A'),
      createMockItem('/A/B'),
    ];
    expect(hasAncestorDescendantRelation(items as any)).toBe(true);
  });

  it('should return true when grandparent and grandchild are selected', () => {
    const items = [
      createMockItem('/A'),
      createMockItem('/A/B/C'),
    ];
    expect(hasAncestorDescendantRelation(items as any)).toBe(true);
  });

  it('should return false when siblings are selected', () => {
    const items = [
      createMockItem('/A'),
      createMockItem('/B'),
    ];
    expect(hasAncestorDescendantRelation(items as any)).toBe(false);
  });

  it('should return false for single item', () => {
    const items = [createMockItem('/A')];
    expect(hasAncestorDescendantRelation(items as any)).toBe(false);
  });

  it('should return false for empty array', () => {
    expect(hasAncestorDescendantRelation([])).toBe(false);
  });

  it('should return false when paths are similar but not ancestor-descendant', () => {
    // /A と /AB は祖先-子孫関係ではない
    const items = [
      createMockItem('/A'),
      createMockItem('/AB'),
    ];
    expect(hasAncestorDescendantRelation(items as any)).toBe(false);
  });

  it('should handle items with null paths', () => {
    const items = [
      createMockItem('/A'),
      { getItemData: () => ({ path: null }) },
    ];
    expect(hasAncestorDescendantRelation(items as any)).toBe(false);
  });
});
```

### 実装時の注意

1. `getNewPathAfterMoved` と `hasAncestorDescendantRelation` はフック外で定義し、exportしてテスト可能にする
2. フック内の `canDrag`/`canDrop`/`onDrop` はReact hooks（useCallback）を使用するため、直接の単体テストは困難。代わりにロジックをユーティリティ関数に抽出する
3. `pagePathUtils.canMoveByPath` や `pagePathUtils.isUsersProtectedPages` は `@growi/core` で既にテストされているため、新規テストではモックまたは統合テストとして扱う

---

## 注意事項

1. **virtualizationとの互換性**: headless-treeのD&Dはvirtualizationと互換性あり
2. **複数ページ移動時のAPI呼び出し**: 順次実行（1ページずつ）、エラー時は中断
3. **サーバー側の子ページ移動**: 親ページ移動時に子も自動で移動される

---

## 更新履歴

- 2025-12-05: 初版作成
