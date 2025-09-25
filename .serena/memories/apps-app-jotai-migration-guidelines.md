# Jotai 移行技術ガイドライン

## 🎯 移行方針と基本原則

### 移行の背景
- `useSWRStatic` や `useContextSWR` による複雑な状態管理の課題解決
- パフォーマンス改善と責務の明確化

### 役割分担の明確化
- **SWR**: データフェッチング、サーバーキャッシュ管理に特化
- **Jotai**: クライアントサイドUI状態、同期的な状態管理に特化

## ⚠️ 移行作業フロー（必須手順）

### 基本手順（必ず順序通りに実行）
1. **新しいJotaiベースの実装を作成**
2. **使用箇所を新しい実装に置き換え**
3. **【必須】旧コードの削除** ← これを忘れずに！
4. **【必須】型チェックの実行** ← migration完了確認

```bash
# 型チェック実行（migration完了確認）
cd /workspace/growi-use-jotai/apps/app && pnpm run lint:typecheck
```

### ⚠️ 旧コード削除が必須な理由
- **Migration完了の確認**: 旧コードが残っていると、移行が不完全でもtypecheckがパスしてしまう
- **コンパイルエラーによる検証**: 旧コードを削除することで、移行漏れが確実に検出される
- **保守性の向上**: 重複コードがないことで、将来の変更時の混乱を防ぐ

## 🆕 **Derived Atom採用ガイドライン**

### 🎯 Derived Atom vs Direct Hook判定基準

#### **Derived Atom化すべき条件（優先度順）**
1. **複雑な計算ロジック**: 依存関係4個以上
2. **高頻度での使用**: レンダリング回数が多い箇所で使用
3. **複数コンポーネントでの共有**: 計算結果を複数箇所で使用
4. **パフォーマンス要求**: 計算コストが高い

#### **Direct Hook維持すべき条件**
1. **シンプルな計算**: 依存関係2-3個以下
2. **低頻度での使用**: 特定条件下でのみレンダリング
3. **単一コンポーネント使用**: 計算結果共有の必要なし
4. **パフォーマンス要求低**: 計算コストが軽微

### 🏗️ **Derived Atom実装パターン**

#### **特殊名Export方式（必須パターン）**
```typescript
// ~/states/page/internal-atoms.ts
export const _atomsForDerivedAbilities = {
  pageNotFoundAtom,
  currentPagePathAtom,
  isIdenticalPathAtom,
  // ... 必要な内部atom
} as const;

// ~/states/page/index.ts（公開API）
export { _atomsForDerivedAbilities } from './internal-atoms';
```

#### **Derived Atom + Hook実装**
```typescript
// Import internal atoms with special naming
import { _atomsForDerivedAbilities as pageAtoms } from '~/states/page';
import { _atomsForDerivedAbilities as editorAtoms } from '~/states/ui/editor';

// Derived atom（内部実装）
const isAbleToShowTagLabelAtom = atom((get) => {
  const isNotFound = get(pageAtoms.pageNotFoundAtom);
  const currentPagePath = get(pageAtoms.currentPagePathAtom);
  const isIdenticalPath = get(pageAtoms.isIdenticalPathAtom);
  const shareLinkId = get(pageAtoms.shareLinkIdAtom);
  const editorMode = get(editorAtoms.editorModeAtom);

  // undefined判定（必須）
  if ([currentPagePath, isIdenticalPath, isNotFound, editorMode].some(v => v === undefined)) {
    return false;
  }

  // ビジネスロジック
  const isViewMode = editorMode === EditorMode.View;
  return !isUsersTopPage(currentPagePath!) && !isTrashTopPage(currentPagePath!)
    && shareLinkId == null && !isIdenticalPath && !(isViewMode && isNotFound);
});

// Public hook（外部API）
export const useIsAbleToShowTagLabel = (): boolean => {
  return useAtomValue(isAbleToShowTagLabelAtom);
};
```

## 🎯 確立された実装パターン

### 1️⃣ **パフォーマンス最適化フック分離パターン**
```typescript
// 状態型定義
export type [Modal]Status = {
  isOpened: boolean;
  // その他のプロパティ
};

export type [Modal]Actions = {
  open: (...args) => void;
  close: () => void;
};

// Atom定義
const [modal]Atom = atom<[Modal]Status>({ isOpened: false });

// 読み取り専用フック（useAtomValue使用）
export const use[Modal]Status = (): [Modal]Status => {
  return useAtomValue([modal]Atom);
};

// アクション専用フック（useSetAtom + useCallback）
export const use[Modal]Actions = (): [Modal]Actions => {
  const setStatus = useSetAtom([modal]Atom);

  const open = useCallback((...args) => {
    setStatus({ isOpened: true, ...args });
  }, [setStatus]);

  const close = useCallback(() => {
    setStatus({ isOpened: false });
  }, [setStatus]);

  return { open, close };
};
```

### 2️⃣ **デバイス状態パターン（Jotaiベース）**
```typescript
// 例: useDeviceLargerThanMd
export const isDeviceLargerThanMdAtom = atom(false);

export const useDeviceLargerThanMd = () => {
  const [isLargerThanMd, setIsLargerThanMd] = useAtom(isDeviceLargerThanMdAtom);

  useEffect(() => {
    if (isClient()) {
      const mdOrAboveHandler = function (this: MediaQueryList): void {
        setIsLargerThanMd(this.matches);
      };
      const mql = addBreakpointListener(Breakpoint.MD, mdOrAboveHandler);
      setIsLargerThanMd(mql.matches); // initialize
      return () => {
        cleanupBreakpointListener(mql, mdOrAboveHandler);
      };
    }
    return undefined;
  }, [setIsLargerThanMd]);

  return [isLargerThanMd, setIsLargerThanMd] as const;
};
```

### 3️⃣ **RefObjectパターン（DOM要素管理）**
```typescript
// Internal atom for RefObject storage
const tocNodeRefAtom = atom<RefObject<HtmlElementNode> | null>(null);

// Public derived atom for direct access
export const tocNodeAtom = atom((get) => {
  const tocNodeRef = get(tocNodeRefAtom);
  return tocNodeRef?.current ?? null;
});

// Hook for setting with RefObject wrapping
export const useSetTocNode = () => {
  const setTocNodeRef = useSetAtom(tocNodeRefAtom);

  const setTocNode = useCallback((newNode: HtmlElementNode) => {
    const nodeRef: RefObject<HtmlElementNode> = { current: newNode };
    setTocNodeRef(nodeRef);
  }, [setTocNodeRef]);

  return setTocNode;
};
```

### 4️⃣ **Dynamic Import + Cachingパターン**
```typescript
// Cache for dynamic import
let generateTocOptionsCache: typeof generateTocOptions | null = null;

export const useTocOptions = () => {
  // ... dependencies ...
  
  useEffect(() => {
    (async () => {
      try {
        if (!generateTocOptionsCache) {
          const { generateTocOptions } = await import('~/client/services/renderer/renderer');
          generateTocOptionsCache = generateTocOptions;
        }
        
        const data = generateTocOptionsCache(config, tocNode);
        setState({ data, isLoading: false, error: undefined });
      } catch (err) {
        setState({ data: undefined, isLoading: false, error: err instanceof Error ? err : new Error('Failed') });
      }
    })();
  }, [dependencies]);
};
```

### 5️⃣ **シンプルBoolean状態パターン**
```typescript
// Atom定義
const isUntitledPageAtom = atom<boolean>(false);

// 読み取り専用フック
export const useIsUntitledPage = (): boolean => {
  return useAtomValue(isUntitledPageAtom);
};

// セッター専用フック（シンプル）
export const useSetIsUntitledPage = () => {
  return useSetAtom(isUntitledPageAtom);
};
```

### 6️⃣ **server-configurations直接Atomパターン**
```typescript
// server-configurations/server-configurations.ts
export const auditLogEnabledAtom = atom<boolean>(false);
export const activityExpirationSecondsAtom = atom<number>(0);
export const auditLogAvailableActionsAtom = atom<SupportedActionType[]>([]);

// 使用側（hooksは不要）
import { auditLogEnabledAtom } from '~/states/server-configurations';
import { useAtomValue } from 'jotai';

const auditLogEnabled = useAtomValue(auditLogEnabledAtom);
```

### 7️⃣ **機能別専用statesパターン**
```typescript
// features/openai/client/states/unified-merge-view.ts
const isEnableUnifiedMergeViewAtom = atom<boolean>(false);

export const useIsEnableUnifiedMergeView = (): boolean => {
  return useAtomValue(isEnableUnifiedMergeViewAtom);
};

export const useUnifiedMergeViewActions = (): UnifiedMergeViewActions => {
  const setIsEnabled = useSetAtom(isEnableUnifiedMergeViewAtom);

  const enable = useCallback(() => {
    setIsEnabled(true);
  }, [setIsEnabled]);

  const disable = useCallback(() => {
    setIsEnabled(false);
  }, [setIsEnabled]);

  return { enable, disable };
};
```

### 8️⃣ **Derived Atomパターン（高パフォーマンス）**
```typescript
// Derived atom（計算結果の自動メモ化・共有）
const derivedCalculationAtom = atom((get) => {
  const dependency1 = get(atom1);
  const dependency2 = get(atom2);
  
  // undefined判定（必須）
  if ([dependency1, dependency2].some(v => v === undefined)) {
    return defaultValue;
  }
  
  // 複雑な計算ロジック
  return computeExpensiveCalculation(dependency1, dependency2);
});

// Public hook（シンプルな値取得のみ）
export const useDerivedCalculation = () => {
  return useAtomValue(derivedCalculationAtom);
};
```

### 9️⃣ **複雑状態管理パターン（Map操作）**
```typescript
// Type definitions
export type UpdateDescCountData = Map<string, number>;

export type PageTreeDescCountMapGetter = {
  getDescCount: (pageId?: string) => number | null;
};

export type PageTreeDescCountMapActions = {
  update: (newData: UpdateDescCountData) => void;
};

// Atom definition
const pageTreeDescCountMapAtom = atom<UpdateDescCountData>(new Map());

// Read-only hook with getter function
export const usePageTreeDescCountMap = (): PageTreeDescCountMapGetter => {
  const data = useAtomValue(pageTreeDescCountMapAtom);

  const getDescCount = useCallback(
    (pageId?: string) => {
      return pageId != null ? (data.get(pageId) ?? null) : null;
    },
    [data],
  );

  return { getDescCount };
};

// Actions hook (write-only with callbacks)
export const usePageTreeDescCountMapAction = (): PageTreeDescCountMapActions => {
  const setDescCountMap = useSetAtom(pageTreeDescCountMapAtom);

  const update = useCallback(
    (newData: UpdateDescCountData) => {
      setDescCountMap((current) => {
        return new Map([...current, ...newData]);
      });
    },
    [setDescCountMap],
  );

  return { update };
};
```

### 🔟 **副作用統合パターン（Router Integration）**
```typescript
// Internal atoms
const commentEditorDirtyMapAtom = atom<CommentEditorDirtyMapData>(new Map());

// Derived atom for computed state
const isUnsavedWarningEnabledAtom = atom((get) => {
  const dirtyMap = get(commentEditorDirtyMapAtom);
  return dirtyMap.size > 0;
});

// Hook with side effects (Router integration)
export const useUnsavedWarning = () => {
  const router = useRouter();
  const isEnabled = useAtomValue(isUnsavedWarningEnabledAtom);
  const setDirtyMap = useSetAtom(commentEditorDirtyMapAtom);

  const reset = useCallback(() => {
    setDirtyMap(new Map());
  }, [setDirtyMap]);

  // Router event handling with cleanup
  useLayoutEffect(() => {
    router.events.on('routeChangeComplete', reset);
    return () => {
      router.events.off('routeChangeComplete', reset);
    };
  }, [reset, router.events]);

  return { isEnabled, reset };
};
```

## 📋 使用パターン早見表

| パターン | 適用条件 | 使用例 |
|---------|----------|--------|
| フック分離 | モーダル等の複数操作 | `use[Modal]Status()`, `use[Modal]Actions()` |
| デバイス状態 | MediaQuery監視 | `const [isLargerThanMd] = useDeviceLargerThanMd()` |
| RefObject | DOM要素管理 | `const tocNode = useTocNode()`, `const setTocNode = useSetTocNode()` |
| Dynamic Import | 重いライブラリ | `const { data, isLoading, error } = useTocOptions()` |
| シンプルBoolean | 単純状態 | `const isUntitled = useIsUntitledPage()` |
| server-configurations | サーバー設定 | `const data = useAtomValue(atomName)` |
| 機能別states | 特定機能専用 | `const isEnabled = useIsEnableUnifiedMergeView()` |
| Derived Atom | 高パフォーマンス計算 | `const result = useDerivedCalculation()` |
| 複雑状態管理 | Map、Set等 | `const { getDescCount } = usePageTreeDescCountMap()` |
| 副作用統合 | Router等の統合 | `const { isEnabled, reset } = useUnsavedWarning()` |

## 🎯 技術ベストプラクティス

### 重要原則
- **後方互換フックは不要**: 移行完了後は即座に削除
- **型の正しいインポート**: 元ファイルのimport文を参考にする
- **フック分離のメリット**: 不要なリレンダリング防止、参照安定化
- **特殊名Export**: `_atomsForDerivedAbilities`によるカプセル化維持
- **計算結果共有**: 複数コンポーネント間での効率的な状態共有
- **自動メモ化**: 依存atomが変わらない限り再計算されない

### パフォーマンス最適化のポイント
1. **自動メモ化**: 依存atomが変わらない限り再計算されない
2. **計算結果共有**: 複数コンポーネント間で効率的に共有
3. **最適化された更新**: Jotaiの依存関係追跡
4. **undefined判定**: 初期化前の状態を適切にハンドリング
5. **Callback最適化**: `useCallback`による関数参照安定化
6. **副作用管理**: 適切なcleanup実装

### 設計指針
- **server-configurations**: wrapper hook不要、直接atom使用を推奨
- **機能別states**: 特定機能専用（OpenAI等）のstatesディレクトリ分離
- **既存atom優先**: 新規実装より既存atomの活用を優先
- **不要コード削除**: deprecatedファイル・未使用フックの積極的削除
- **複雑状態（Map, Set等）**: Getter/Actions分離パターン採用
- **副作用統合**: 状態管理 + useEffect/useLayoutEffect組み合わせ