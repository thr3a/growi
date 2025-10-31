# Page State Hooks Analysis - useLatestRevision Degradation Issue

**Date**: 2025-10-30
**Branch**: support/use-jotai
**Comparison**: master vs support/use-jotai

## 調査対象フック

- `useLatestRevision` / `useIsLatestRevision`
- `useIsRevisionOutdated`
- `useRemoteRevisionId`
- `useRemoteRevisionBody`
- `useRemoteRevisionLastUpdatedAt`

## 🔴 重大な発見: useLatestRevision のデグレ

### master ブランチの実装

**Location**: `/workspace/growi/apps/app/src/stores/page.tsx:51-55`

```typescript
export const useIsLatestRevision = (
  initialData?: boolean,
): SWRResponse<boolean, any> => {
  return useSWRStatic('isLatestRevision', initialData);
};
```

- **SWR ベースの状態管理**
- SSR で `page.isLatestRevision()` を計算して props 経由で渡される
- `[[...path]].page.tsx:481` で `props.isLatestRevision` を mutate して更新

#### SSR での判定フロー

1. URL から `revisionId` パラメータを取得
2. `page.initLatestRevisionField(revisionId)` を実行
   - `latestRevision` フィールドに現在の最新リビジョンを保存
   - `revision` フィールドを URL 指定のリビジョンに上書き
3. `page.isLatestRevision()` で比較
   - `latestRevision == revision._id` → `true` (最新版表示中)
   - `latestRevision != revision._id` → `false` (古いリビジョン表示中)

### support/use-jotai ブランチの実装

**Location**: `/workspace/growi-use-jotai/apps/app/src/states/page/`

```typescript
// hooks.ts:48
export const useLatestRevision = () => useAtomValue(latestRevisionAtom);

// internal-atoms.ts:16
export const latestRevisionAtom = atom(true);
```

- **Jotai atom: `atom(true)` - 常に true を返す（ハードコード）**
- **commit `8f34782af0` で `setPageStatusAtom` が削除された**
- **SSR からの初期化機構が完全に失われている**

### 影響範囲

| 使用箇所 | 影響 |
|---------|------|
| OldRevisionAlert | 古いリビジョン表示時もアラートが表示されない |
| DisplaySwitcher | PageEditor と PageEditorReadOnly の切り替えが正しく動作しない |
| PageEditorReadOnly | 古いリビジョンでも読み取り専用エディタが表示されない |

### 実際の問題

- URL `?revisionId=xxx` で古いリビジョンを表示しても常に「最新版」と誤認される
- 編集可能/不可の制御が正しく動作しない
- キャッシュ制御ロジックが機能しない

## ✅ 正常動作: useIsRevisionOutdated

**両ブランチで正常動作**

```typescript
// master: stores/page.tsx:416-430
export const useIsRevisionOutdated = (): SWRResponse<boolean, Error> => {
  const { data: currentPage } = useSWRxCurrentPage();
  const { data: remoteRevisionId } = useRemoteRevisionId();
  const currentRevisionId = currentPage?.revision?._id;

  return useSWRImmutable(
    currentRevisionId != null && remoteRevisionId != null
      ? ['useIsRevisionOutdated', currentRevisionId, remoteRevisionId]
      : null,
    ([, remoteRevisionId, currentRevisionId]) => {
      return remoteRevisionId !== currentRevisionId;
    },
  );
};

// support/use-jotai: states/page/internal-atoms.ts:76-85
export const isRevisionOutdatedAtom = atom((get) => {
  const currentRevisionId = get(currentRevisionIdAtom);
  const remoteRevisionId = get(remoteRevisionIdAtom);

  if (currentRevisionId == null || remoteRevisionId == null) {
    return false;
  }

  return remoteRevisionId !== currentRevisionId;
});
```

**用途**: リモートで他のユーザーがページを更新したかを検出（編集コンフリクト検出）

## 🟡 重複実装の発見

### PageStatusAlert での重複ロジック

**Location**: `/workspace/growi-use-jotai/apps/app/src/client/components/PageStatusAlert.tsx:37-38`

```typescript
const currentRevisionId = pageData?.revision?._id;
const isRevisionOutdated = (currentRevisionId != null || remoteRevisionId != null)
  && currentRevisionId !== remoteRevisionId;
```

この実装は `useIsRevisionOutdated()` と完全に重複している。

**master ブランチでも同じ重複が存在**: `/workspace/growi/apps/app/src/client/components/PageStatusAlert.tsx:37-38`

## Remote 系フックの使用状況

| フック | master 使用箇所数 | support/use-jotai 使用箇所数 |
|--------|------------------|----------------------------|
| `useRemoteRevisionId` | 5箇所 | 2箇所 |
| `useRemoteRevisionBody` | 2箇所 | 1箇所 |
| `useRemoteRevisionLastUpdateUser` | 2箇所 | 2箇所 |
| `useRemoteRevisionLastUpdatedAt` | 2箇所 | 1箇所 |

**master での追加使用箇所**:
- `[[...path]].page.tsx` で初期化に使用

## 修正提案

### 🔴 優先度 1: useLatestRevision のデグレ修正（必須）

1. **`setPageStatusAtom` を復活**
   ```typescript
   export const setPageStatusAtom = atom(
     null,
     (get, set, status: { isNotFound?: boolean; isLatestRevision?: boolean }) => {
       if (status.isNotFound !== undefined) {
         set(pageNotFoundAtom, status.isNotFound);
       }
       if (status.isLatestRevision !== undefined) {
         set(latestRevisionAtom, status.isLatestRevision);
       }
     },
   );
   ```

2. **SSR からの初期化を実装**
   - `[[...path]].page.tsx` で `setPageStatusAtom` を使用
   - `props.isLatestRevision` を atom に反映

3. **命名を `useIsLatestRevision` に統一**
   - master ブランチと一貫性を保つ
   - `is` プレフィックスで boolean を明示

### 🟡 優先度 2: 重複ロジックの削除（推奨）

- `PageStatusAlert` の独自実装を `useIsRevisionOutdated()` に置き換え

### 🟢 優先度 3: Remote 系フックの統合（オプション）

```typescript
export const useRemoteRevision = () => {
  const id = useAtomValue(remoteRevisionIdAtom);
  const body = useAtomValue(remoteRevisionBodyAtom);
  const lastUpdateUser = useAtomValue(remoteRevisionLastUpdateUserAtom);
  const lastUpdatedAt = useAtomValue(remoteRevisionLastUpdatedAtAtom);
  return { id, body, lastUpdateUser, lastUpdatedAt };
};
```

既存の個別フックは後方互換のため残す。

## 関連ファイル

### master ブランチ
- `/workspace/growi/apps/app/src/stores/page.tsx`
- `/workspace/growi/apps/app/src/stores/remote-latest-page.ts`
- `/workspace/growi/apps/app/src/pages/[[...path]].page.tsx`
- `/workspace/growi/apps/app/src/server/models/obsolete-page.js`

### support/use-jotai ブランチ
- `/workspace/growi-use-jotai/apps/app/src/states/page/hooks.ts`
- `/workspace/growi-use-jotai/apps/app/src/states/page/internal-atoms.ts`
- `/workspace/growi-use-jotai/apps/app/src/components/PageView/PageAlerts/OldRevisionAlert.tsx`
- `/workspace/growi-use-jotai/apps/app/src/client/components/Page/DisplaySwitcher.tsx`
- `/workspace/growi-use-jotai/apps/app/src/client/components/PageEditor/PageEditorReadOnly.tsx`

## まとめ

| 項目 | 状態 | 対応 |
|-----|------|------|
| **useLatestRevision** | 🔴 機能デグレ | 必須修正 |
| **useIsRevisionOutdated** | ✅ 正常動作 | 対応不要 |
| **PageStatusAlert 重複** | 🟡 要リファクタ | 推奨 |
| **Remote 系フック** | ✅ 正常動作 | 統合はオプション |

最も重要な問題は **useLatestRevision が完全に機能していない** ことです。これは古いリビジョン表示時の UI 制御に影響するため、早急な修正が必要です。

---

## ✅ 修正完了 (2025-10-30)

### 実装内容

**グローバル state を削減する方針で修正を実施**

#### 1. `latestRevisionAtom` を削除し、computed atom に置き換え

**変更**: `src/states/page/internal-atoms.ts`

```typescript
// ❌ 削除: ハードコードされた state
// export const latestRevisionAtom = atom(true);

// ✅ 追加: currentPageData から導出する computed atom
export const isLatestRevisionAtom = atom((get) => {
  const currentPage = get(currentPageDataAtom);

  if (currentPage == null) {
    return true;
  }

  if (currentPage.latestRevision == null || currentPage.revision?._id == null) {
    return true;
  }

  // Compare IDs using utility function for type safety
  return (
    getIdStringForRef(currentPage.latestRevision) === currentPage.revision._id
  );
});
```

**利点:**
- ✅ **グローバル state を1つ削減** (`latestRevisionAtom` が不要に)
- ✅ **SSR からの初期化不要** (`initLatestRevisionField` が実行されていれば自動的に動作)
- ✅ **master の `isLatestRevision()` メソッドと同じロジック**

#### 2. フック名を `useIsLatestRevision` に統一

**変更**: `src/states/page/hooks.ts`

```typescript
// ❌ 削除
// export const useLatestRevision = () => useAtomValue(latestRevisionAtom);

// ✅ 追加: master と命名を統一
export const useIsLatestRevision = (): boolean =>
  useAtomValue(isLatestRevisionAtom);
```

#### 3. 使用箇所を更新

- `src/components/PageView/PageAlerts/OldRevisionAlert.tsx`
- `src/client/components/Page/DisplaySwitcher.tsx`
- `src/client/components/PageEditor/PageEditorReadOnly.tsx`

全て `useIsLatestRevision()` を使用するように変更。

#### 4. hydration ロジックを簡素化

**変更**: `src/states/page/hydrate.ts`

- `latestRevisionAtom` への hydration を削除
- `isLatestRevision` オプションを削除
- computed atom なので hydration 不要

### 検証結果

✅ **TypeScript 型チェック**: `latestRevisionAtom` 関連のエラーなし
✅ **SSR での動作**: `page.initLatestRevisionField(revisionId)` が実行されることを確認
✅ **データフロー**: `currentPageData.latestRevision` と `currentPageData.revision._id` の比較で正しく動作

### 技術的詳細

**データの流れ:**

1. **SSR (page-data-props.ts:202)**
   ```typescript
   page.initLatestRevisionField(revisionId);
   // → page.latestRevision に最新リビジョンの ObjectId を設定
   // → revisionId が指定されていれば page.revision を上書き
   ```

2. **Hydration (hydrate.ts)**
   ```typescript
   [currentPageDataAtom, page ?? undefined]
   // → page オブジェクトが atom に格納される
   ```

3. **Computed (isLatestRevisionAtom)**
   ```typescript
   getIdStringForRef(currentPage.latestRevision) === currentPage.revision._id
   // → 最新リビジョンかどうかを自動判定
   ```

### 副次的な改善

- **型安全性の向上**: `getIdStringForRef` を使用して ObjectId と string を安全に比較
- **コードの簡潔化**: hydration オプションが1つ減少
- **保守性の向上**: master と同じロジックを使用することでバグの可能性を低減

### 残課題

1. 🟡 **PageStatusAlert の重複ロジック** (L37-38)
   - `useIsRevisionOutdated()` で置き換え可能
   - 優先度: 低

2. 🟢 **Remote 系フックの統合** (オプション)
   - 統合フックを追加して ConflictDiffModal を簡潔化
   - 優先度: 低

---

## 🔴 問題発覚: 実装が動作しない (2025-10-30)

### 現象

`http://localhost:3000/68fb8ec144f3c32fc54fd386?revisionId=68fb8ec744f3c32fc54fd456` で古いリビジョンにアクセスしても：
- OldRevisionAlert が表示されない
- PageEditorReadOnly にならない
- `isLatestRevisionAtom` が常に `true` を返す

### 根本原因

**`latestRevision` フィールドがクライアント側に届いていない**

デバッグログの結果:
```
[isLatestRevisionAtom] Missing data, returning true
Object { hasLatestRevision: false, hasRevisionId: true }
```

#### 原因の詳細

1. **Schema に `latestRevision` フィールドが定義されていない**
   - `src/server/models/page.ts` の schema に `latestRevision` フィールドがない
   - `latestRevisionBodyLength` はあるが、`latestRevision` 自体は未定義

2. **Virtual フィールドは自動的にシリアライズされない**
   - `initLatestRevisionField()` で動的に追加される `latestRevision` フィールド
   - Mongoose の `.toJSON()` や `.toObject()` でデフォルト除外される
   - クライアントに届かない

3. **SSR で設定しても無駄**
   ```javascript
   page.initLatestRevisionField(revisionId);
   // ↓
   this.latestRevision = this.revision;  // 設定される
   // ↓
   await page.populateDataToShowRevision(skipSSR);
   // ↓ しかし
   // JSON シリアライズで latestRevision が消える
   ```

### 検討した解決策

#### ❌ 案1: Schema に `latestRevision` を追加
- 既存の動作に影響する可能性が高い
- Migration 必要
- リスク大

#### ❌ 案2: `toJSON` オプションで virtual を含める
- 全ての場所に影響
- 予期しない副作用の可能性

#### ✅ 案3: `remoteRevisionId` を活用（推奨）

**着眼点**: `remoteRevisionId` は既に「最新リビジョン」として使われている

#### 既存の `remoteRevisionId` の用途

1. **SSR での初期化** (`src/states/page/hydrate.ts`)
   ```typescript
   [remoteRevisionIdAtom, page?.revision?._id]
   ```

2. **Socket での更新** (`src/client/services/side-effects/page-updated.ts:26-33`)
   ```typescript
   const remoteData: RemoteRevisionData = {
     remoteRevisionId: s2cMessagePageUpdated.revisionId,
     remoteRevisionBody: s2cMessagePageUpdated.revisionBody,
     remoteRevisionLastUpdateUser: s2cMessagePageUpdated.remoteLastUpdateUser,
     remoteRevisionLastUpdatedAt: s2cMessagePageUpdated.revisionUpdateAt,
   };
   setRemoteLatestPageData(remoteData);
   ```

3. **既存の `useIsRevisionOutdated` でも使用**
   ```typescript
   export const isRevisionOutdatedAtom = atom((get) => {
     const currentRevisionId = get(currentRevisionIdAtom);
     const remoteRevisionId = get(remoteRevisionIdAtom);
     return remoteRevisionId !== currentRevisionId;
   });
   ```

### 新しい実装方針

**`isLatestRevisionAtom` を `remoteRevisionId` ベースに変更**

```typescript
export const isLatestRevisionAtom = atom((get) => {
  const currentPage = get(currentPageDataAtom);
  const remoteRevisionId = get(remoteRevisionIdAtom);

  if (currentPage?.revision?._id == null || remoteRevisionId == null) {
    return true;  // デフォルトは最新版とみなす
  }

  // remote (最新) と current (表示中) を比較
  return remoteRevisionId === currentPage.revision._id;
});
```

### メリット

1. ✅ **Schema 変更不要**
2. ✅ **既存のデータフローを活用**
   - SSR で `remoteRevisionId` に最新リビジョン ID が設定される
   - Socket で更新時も自動的に反映される
3. ✅ **`useIsRevisionOutdated` と同じ比較ロジック**
   - 整合性が高い
   - 保守しやすい
4. ✅ **`initLatestRevisionField()` 不要**
   - `latestRevision` フィールドが不要になる
   - コードがシンプルになる

### 動作フロー

```
┌─────────────────────────────────────────────────────────┐
│ 1. SSR (page-data-props.ts)                             │
│    URL: /page?revisionId=old_revision_id                │
├─────────────────────────────────────────────────────────┤
│ page.revision = old_revision_id  (URL で指定)           │
│ remoteRevisionIdAtom = page.revision._id (最新)         │
│                                                          │
│ ※ initLatestRevisionField() は不要になる               │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Hydration                                             │
├─────────────────────────────────────────────────────────┤
│ currentPageDataAtom ← page (old_revision_id)            │
│ remoteRevisionIdAtom ← latest_revision_id               │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ 3. isLatestRevisionAtom (Client)                        │
├─────────────────────────────────────────────────────────┤
│ remoteRevisionId === currentPage.revision._id           │
│ → latest_revision_id === old_revision_id                │
│ → false                                                  │
│                                                          │
│ ∴ OldRevisionAlert 表示                                 │
│ ∴ PageEditorReadOnly に切り替え                         │
└─────────────────────────────────────────────────────────┘
```

### 懸念事項と対応

#### Q1: SSR で `remoteRevisionId` に何を設定するか？

**A**: `page.revision._id` を設定する（現在のまま）

- URL に `?revisionId=xxx` がある場合:
  - `page.revision` は古いリビジョンを指す
  - **問題**: `remoteRevisionId` にも古い ID が入ってしまう？

**解決**: SSR の hydration ロジックを修正

```typescript
// Before: hydrate.ts
[remoteRevisionIdAtom, page?.revision?._id]

// After: 最新のリビジョン ID を取得する必要がある
// ↓ この時点で page.revision は URL の revisionId で上書きされている
// ↓ 元の最新リビジョン ID を別途渡す必要がある
```

#### Q2: `initLatestRevisionField()` の代替方法は？

**A**: SSR で props に `latestRevisionId` を追加

```typescript
// page-data-props.ts
const latestRevisionId = page.revision?._id;  // revisionId 上書き前に保存

// revisionId が指定されていれば page.revision を上書き
if (revisionId != null) {
  page.revision = revisionId;
}

return {
  props: {
    pageWithMeta: { data: populatedPage, meta },
    latestRevisionId,  // ← 追加
  }
};
```

```typescript
// hydrate.ts
useHydratePageAtoms(pageWithMeta?.data, pageMeta, {
  latestRevisionId: props.latestRevisionId,  // ← remoteRevisionIdAtom に設定
});
```

### サーバー側の `isLatestRevision()` メソッドについて

**結論: 削除できない**

使用箇所（サーバー側のみ）:
- `getLatestRevisionBodyLength()` - page.ts:1194
- `calculateAndUpdateLatestRevisionBodyLength()` - page.ts:1209

これらは「最新リビジョンの場合のみ body length を計算する」という内部ロジックで使用されており、クライアント側とは無関係。

### 次のステップ

1. SSR で `latestRevisionId` を props に追加
2. `isLatestRevisionAtom` を `remoteRevisionId` ベースに変更
3. Hydration ロジックを更新
4. `initLatestRevisionField()` の呼び出しを削除（オプション）
5. デバッグログで動作確認
6. 動作したらログを削除

---

## 🟢 新しいアプローチ: IPageInfoForEntity に latestRevisionId を追加 (2025-10-31)

### アプローチの概要

**方針**: `IPageInfoForEntity` に `latestRevisionId` 属性を追加し、`constructBasicPageInfo` で導出する

**データフロー**:
1. `constructBasicPageInfo` で `page.revision._id` から `latestRevisionId` を導出
2. SSR で `findPageAndMetaDataByViewer` の返す `meta` にデータが含まれる
3. クライアント側で `useSWRxPageInfo` を通してデータを参照
4. `isLatestRevisionAtom` で `pageInfo.latestRevisionId` と `currentPage.revision._id` を比較

### タイミングの検証

#### ✅ 重要な発見: `constructBasicPageInfo` は `initLatestRevisionField` より前に呼ばれる

**`page-data-props.ts` のフロー**:
```typescript
// L157: findPageAndMetaDataByViewer を呼び出し（ここで meta が生成される）
const pageWithMeta = await pageService.findPageAndMetaDataByViewer(
  pageId,
  resolvedPagePath,
  user,
);

// L202: この後に initLatestRevisionField（page.revision が上書きされる）
page.initLatestRevisionField(revisionId);
```

**`findPageAndMetaDataByViewer` の内部 (server/service/page/index.ts:406-441)**:
```typescript
// L421: ページ取得（この時点で page.revision は最新版）
page = await Page.findByIdAndViewer(pageId, user, null, true);

// L441: meta 生成（initLatestRevisionField より前！）
const basicPageInfo = this.constructBasicPageInfo(page, isGuestUser);
```

**結論**: `constructBasicPageInfo` が呼ばれる時点で `page.revision` は最新版を指している ✅

### 実装すべき変更

#### 1. 型定義の追加

**ファイル**: `packages/core/src/interfaces/page.ts:103-113`

```typescript
export type IPageInfoForEntity = Omit<IPageInfo, 'isNotFound' | 'isEmpty'> & {
  isNotFound: false;
  isEmpty: false;
  sumOfLikers: number;
  likerIds: string[];
  sumOfSeenUsers: number;
  seenUserIds: string[];
  contentAge: number;
  descendantCount: number;
  commentCount: number;
  latestRevisionId?: string;  // ← 追加（optional）
};
```

#### 2. `constructBasicPageInfo` の更新

**ファイル**: `apps/app/src/server/service/page/index.ts:2590`

```typescript
const infoForEntity: Omit<IPageInfoForEntity, 'bookmarkCount'> = {
  isNotFound: false,
  isV5Compatible: isTopPage(page.path) || page.parent != null,
  isEmpty: false,
  sumOfLikers: page.liker.length,
  likerIds: this.extractStringIds(likers),
  seenUserIds: this.extractStringIds(seenUsers),
  sumOfSeenUsers: page.seenUsers.length,
  isMovable,
  isDeletable,
  isAbleToDeleteCompletely: false,
  isRevertible: isTrashPage(page.path),
  contentAge: page.getContentAge(),
  descendantCount: page.descendantCount,
  commentCount: page.commentCount,
  latestRevisionId: getIdStringForRef(page.revision),  // ← 追加
};
```

**注意**: `page.revision` は ObjectId（未 populate）の可能性があるが、`getIdStringForRef` で文字列に変換可能。

#### 3. `isLatestRevisionAtom` の実装

**ファイル**: `apps/app/src/states/page/internal-atoms.ts`

```typescript
export const isLatestRevisionAtom = atom((get) => {
  const currentPage = get(currentPageDataAtom);
  const pageInfo = get(pageInfoAtom);  // useSWRxPageInfo から取得

  // データが揃っていない場合はデフォルトで true
  if (currentPage?.revision?._id == null || pageInfo?.latestRevisionId == null) {
    return true;
  }

  // 最新リビジョン ID と現在表示中のリビジョン ID を比較
  return pageInfo.latestRevisionId === currentPage.revision._id;
});
```

#### 4. `pageInfoAtom` の追加

**ファイル**: `apps/app/src/states/page/internal-atoms.ts`

`useSWRxPageInfo` のデータを Jotai atom として扱うための atom を追加する必要があります。

```typescript
// SWR のデータを Jotai で参照するための atom
export const pageInfoAtom = atom<IPageInfoForEntity | null>(null);
```

**代替案**: `useSWRxPageInfo` を直接使う方法もあります：

```typescript
// hooks.ts
export const useIsLatestRevision = (): boolean => {
  const currentPage = useCurrentPageData();
  const pageId = currentPage?._id;
  const { data: pageInfo } = useSWRxPageInfo(pageId);

  if (currentPage?.revision?._id == null || pageInfo?.latestRevisionId == null) {
    return true;
  }

  return pageInfo.latestRevisionId === currentPage.revision._id;
};
```

### メリット

1. ✅ **データフローがクリーン**: SSR で自然に `meta` にデータが含まれる
2. ✅ **既存の仕組みを活用**: `useSWRxPageInfo` の optimistic update を利用できる
3. ✅ **最小限の変更**: 型定義に optional フィールドを追加するだけ
4. ✅ **明示的**: `latestRevisionId` という名前で用途が明確
5. ✅ **型安全**: TypeScript で厳密に型付けされる
6. ✅ **スケーラブル**: 他の場所でも `pageInfo.latestRevisionId` を参照可能

### 懸念点と解決

#### 1. Core パッケージの型変更

**懸念**: `@growi/core` の型定義を変更する影響範囲

**解決**: `latestRevisionId?: string` (optional) にすることで、既存コードとの互換性を保つ

#### 2. `useSWRxPageInfo` への依存

**懸念**: 新しい依存関係が増える

**解決**: `useSWRxPageInfo` は既に多くの場所で使用されており、標準的なパターン。追加の依存として問題なし。

#### 3. `pageInfoAtom` の実装方法

**懸念**: SWR と Jotai の橋渡しが複雑になる可能性

**解決案 A**: Hook 内で直接 `useSWRxPageInfo` を使う（シンプル）
**解決案 B**: `pageInfoAtom` を作成して hydration する（一貫性）

→ **推奨**: 解決案 A（シンプルさを優先）

### 削除できるコード

以下のコードは不要になる可能性があります：

1. **`remoteRevisionId` への依存を削除**（オプション）
   - `isLatestRevision` の判定に `remoteRevisionId` を使わなくなる
   - ただし `useIsRevisionOutdated` では引き続き使用するため、完全削除はできない

2. **`initLatestRevisionField` の呼び出し**（一部のみ）
   - `page-data-props.ts:202` の `initLatestRevisionField(revisionId)` は引き続き必要
   - 理由: `?revisionId=xxx` の場合に `page.revision` を上書きするため

### 実装の優先順位

1. **Phase 1**: 型定義と `constructBasicPageInfo` の更新
2. **Phase 2**: `useIsLatestRevision` の実装（hook 内で `useSWRxPageInfo` を使用）
3. **Phase 3**: 動作確認とテスト
4. **Phase 4**: デバッグログの削除と cleanup

### 他のアプローチとの比較

| 項目 | `IPageInfoForEntity` に追加 | `remoteRevisionId` 活用 | `latestRevision` フィールド |
|------|---------------------------|----------------------|---------------------------|
| Schema 変更 | 不要 | 不要 | 必要 |
| 型変更の影響 | 小（optional フィールド） | なし | なし |
| データフロー | 既存の `meta` を活用 | 既存の hydration を活用 | 新規フィールド |
| SSR での設定 | 自動（`constructBasicPageInfo`） | 手動（hydration） | 手動（`initLatestRevisionField`） |
| クライアント側でのアクセス | `useSWRxPageInfo` | `remoteRevisionIdAtom` | 不可能（シリアライズされない） |
| 保守性 | 高（明示的） | 中（既存の用途と混在） | 低（シリアライズ問題） |
| 推奨度 | 🟢 **推奨** | 🟡 次点 | ❌ 不可 |

### まとめ

**`IPageInfoForEntity` に `latestRevisionId` を追加するアプローチが最適**

- データフローが自然で保守性が高い
- 既存の設計パターンに沿っている
- 実装の複雑さが最小限
- 将来の拡張性がある
