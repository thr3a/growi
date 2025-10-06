# useSWRStatic / useStaticSWR 廃止計画 - 進捗レポート

**作成日**: 2025-10-06  
**最終更新**: 2025-10-06  
**作成者**: GitHub Copilot  
**目標**: `useSWRStatic`と`useStaticSWR`を完全廃止する

---

## 📊 進捗状況

### 全体進捗
- **完了**: 6/8 箇所 (75%) ✅
- **残り**: 2箇所
  - **apps/app**: 2箇所（usePersonalSettings, use-static-swr.ts）
  - **packages/editor**: 1箇所（useCodeMirrorEditorIsolated）
- **apps/app**: Socket関連すべて完了 ✅
- **packages/editor**: Playground完了、codemirror-editorのみ残存 ⏳

**注**: `stores/websocket.tsx` の useGlobalAdminSocket は実は存在せず、useAdminSocket の誤認識だったため、カウントから除外

---

## ✅ 完了した移行

### ステップ1-1: useIsMaintenanceMode 重複解消 ✅

**実施日**: 2025-10-06  
**工数**: 0.5日  
**優先度**: 🔴 最高

#### 実施内容

**問題**:
- `stores/maintenanceMode.tsx` - useStaticSWR使用（旧実装）
- `states/global/global.ts` - isMaintenanceModeAtom存在（Jotai）
- 同じ状態を2箇所で管理していた

**解決策**:
```
states/global/global.ts
├── isMaintenanceModeAtom (状態管理)
├── useIsMaintenanceMode() (読み取り)
└── _atomsForMaintenanceMode (特殊名export)

client/services/maintenance-mode.ts
└── useMaintenanceModeActions() (ビジネスロジック)
    ├── start()
    └── end()
```

**削除したファイル**:
- ✅ `stores/maintenanceMode.tsx`
- ✅ `states/system/` ディレクトリ全体

**更新したファイル**:
- ✅ `states/global/global.ts` - atom追加、`_atomsForMaintenanceMode` export
- ✅ `states/global/hydrate.ts` - hydration更新
- ✅ `client/services/maintenance-mode.ts` - 新規作成（actions）
- ✅ `client/components/Admin/App/MaintenanceMode.tsx` - import更新
- ✅ `client/components/Admin/App/AppSettingsPageContents.tsx` - import更新

**使用箇所**: 2箇所更新完了
- `Admin/App/MaintenanceMode.tsx`
- `Admin/App/AppSettingsPageContents.tsx`

**達成効果**:
- ✅ 重複コード削除
- ✅ 責務分離（states ↔ services）
- ✅ useSWRStatic使用箇所 -1
- ✅ 型エラー 0件

---

### ステップ1-2: useGlobalAdminSocket 削除(誤実装) ✅

**実施日**: 2025-10-06  
**工数**: 0.3日  
**優先度**: 🔴 緊急（バグ修正）

#### 実施内容

**問題発見**:
- `stores/websocket.tsx` の `useGlobalAdminSocket` は実は**存在しなかった**
- 実際には `states/system/socket.ts` の `useAdminSocket()` が既存のJotai実装
- 誤って `states/socket-io/admin-socket.ts` を作成してしまい、非機能的な実装となっていた
- Atomが初期化されず、常に `undefined` を返していた

**正しい状況の理解**:
```
既存の実装:
├── states/system/socket.ts
│   ├── useDefaultSocket() - Jotai + atomWithLazy
│   └── useAdminSocket() - Jotai + atomWithLazy ← 正解
└── stores/socket-io.ts
    ├── useDefaultSocket() - SWR (12箇所で使用中)
    └── useAdminSocket() - SWR (12箇所で使用中) ← 別途移行が必要
```

**解決策**:
```
V5PageMigration.tsx
└── useAdminSocket() from '~/features/admin/states/socket-io'
    └── atomWithLazy(() => socketFactory('/admin'))
        └── Socket instance (遅延作成)
```

**削除したファイル**:
- ✅ `states/socket-io/admin-socket.ts` - 誤実装を削除

**更新したファイル**:
- ✅ `states/socket-io/index.ts` - admin-socket export削除
- ✅ `client/components/Admin/App/V5PageMigration.tsx` - 正しいimportに修正

**使用箇所**: 1箇所更新完了
- `Admin/App/V5PageMigration.tsx` - `states/system/socket` の `useAdminSocket()` 使用

**達成効果**:
- ✅ 非機能的な実装削除
- ✅ 既存のJotai実装を活用
- ✅ `atomWithLazy` パターンの理解向上
- ✅ 型エラー 0件

**教訓**:
- 既存コードの完全な理解が重要
- 移行前に全ての関連実装を調査すべき
- `states/system/socket.ts` は既にベストプラクティス実装だった

---

## 🔴 apps/app での残り使用箇所（4箇所）

### 1. **stores/personal-settings.tsx** - usePersonalSettings
- **現状**: `useStaticSWR` 使用（DB同期用の中間キャッシュ）
- **使用箇所**: 12箇所（Me設定画面、DrawioModal、TemplateModal等）
- **役割**: `/personal-setting` API から取得したユーザー情報のキャッシュ管理
- **複雑度**: 🟡 中
- **推定工数**: 2-3日
- **優先度**: 🟡 中
- **ステータス**: ⏳ 未着手

**移行方針**:
```typescript
// states/user/personal-settings.ts
const personalSettingsAtom = atom<IUser | undefined>(undefined);

export const usePersonalSettings = () => useAtomValue(personalSettingsAtom);

export const usePersonalSettingsActions = () => {
  const setPersonalSettings = useSetAtom(personalSettingsAtom);
  const { mutate: revalidateDB } = useSWRxPersonalSettings();
  
  const sync = useCallback(async () => {
    const result = await revalidateDB();
    setPersonalSettings(result);
  }, [setPersonalSettings, revalidateDB]);
  
  return { sync, updateBasicInfo, /* ... */ };
};
```

---

### 2. **stores/socket-io.ts** - useAdminSocket (SWR版)
- **現状**: `useSWRImmutable` 使用（WebSocket管理）
- **使用箇所**: 12箇所（管理画面の複数コンポーネント）
- **役割**: Admin Socket の管理（SWR版）
- **複雑度**: � 中
- **推定工数**: 1-1.5日
- **優先度**: � 中
- **ステータス**: ⏳ 未着手

**注**: `states/system/socket.ts` に既にJotai版の `useAdminSocket()` が存在するため、12箇所の使用箇所を順次移行

**使用コンポーネント**:
- ElasticsearchManagement系: 2箇所
- ExportArchiveDataPage: 1箇所
- G2GDataTransfer: 1箇所
- ImportForm: 1箇所
- ExternalUserGroup/SyncExecution: 1箇所
- RebuildIndexControls: 1箇所
- その他: 5箇所

**移行方針**:
- `states/system/socket.ts` の `useAdminSocket()` を使用（既存のJotai実装）
- `{ data: socket }` → `socket` に修正（戻り値の型が異なる）

---

### 3. **stores-universal/use-context-swr.tsx** - useContextSWR
- **現状**: `useSWRStatic` 使用
- **使用箇所**: 0箇所（internal definition only）
- **役割**: Context用の SWR wrapper（mutate禁止）
- **複雑度**: 🟢 低
- **推定工数**: 0.1日
- **優先度**: 🟢 低
- **ステータス**: ⏳ 未着手

**移行方針**: 使用箇所がないため即座に削除可能

---

### 4. **stores/use-static-swr.ts**
- **現状**: `@deprecated` - `useSWRStatic` の再エクスポート
- **ステータス**: ⭐ **最終削除対象**（上記3つの完了後）
- **推定工数**: 0.1日

---

## 🔴 packages/editor での使用箇所（1箇所）

### 1. **stores/codemirror-editor.ts** - useCodeMirrorEditorIsolated
- **現状**: `useSWRStatic` + `useRef`
- **使用箇所**: 20+箇所（パッケージ全体に浸透）
- **役割**: CodeMirrorインスタンスの分離管理
- **複雑度**: 🟡 中
- **推定工数**: 5-7日
- **優先度**: 🔴 高
- **ステータス**: ⏳ 未着手
- **詳細**: `packages-editor-jotai-migration-plan.md` 参照

**影響範囲**:
- Playground系: 3箇所
- Toolbar系: 9箇所
- Component系: 4箇所
- Controller系: 4箇所

**移行方針**:
```typescript
// packages/editor/src/states/codemirror-editor.ts
type CodeMirrorEditorData = Map<string, UseCodeMirrorEditor>;
const codeMirrorEditorMapAtom = atom<CodeMirrorEditorData>(new Map());

export const useCodeMirrorEditor = (key: string | null) => {
  const editorMap = useAtomValue(codeMirrorEditorMapAtom);
  return key ? editorMap.get(key) ?? null : null;
};
```

---

## 📋 推奨実施順序

### Phase 1: apps/app の完了（残り工数: 3.2-4.7日）

**優先順位**:
1. ✅ **useIsMaintenanceMode** - 完了（0.5日）
2. ✅ **useGlobalAdminSocket 削除** - 完了（0.3日、バグ修正）
3. ⏳ **useContextSWR** - 次に実施、削除のみ（0.1日）
4. ⏳ **useAdminSocket (SWR版)** - 新規追加、12箇所移行（1-1.5日）
5. ⏳ **usePersonalSettings** - 最も複雑（2-3日）
6. ⏳ **use-static-swr.ts** - 最終削除（0.1日）

**Phase 1完了時**: `apps/app` での useSWRStatic **完全廃止** 🎉

---

### Phase 2: packages/editor の完了（残り工数: 5-7日）

**優先順位**:
1. ✅ **Playground Socket** - 完了（0.5日）
2. ⏳ **useCodeMirrorEditorIsolated** - 残り唯一のタスク（5-7日）

**Phase 2完了時**: `packages/editor` での useSWRStatic **完全廃止** 🎉

---

## 🎯 技術パターン（確立済み）

### パターン1: 状態とアクションの分離

```typescript
// states/global/global.ts (状態管理)
const fooAtom = atom<T>(initialValue);
export const useFoo = () => useAtomValue(fooAtom);
export const _atomsForFooActions = { fooAtom } as const;

// client/services/foo.ts (ビジネスロジック)
import { _atomsForFooActions } from '~/states/global';
const { fooAtom } = _atomsForFooActions;

export const useFooActions = () => {
  const setFoo = useSetAtom(fooAtom);
  
  const doSomething = useCallback(async () => {
    const result = await api();
    setFoo(result);
  }, [setFoo]);
  
  return { doSomething };
};
```

**適用例**: ✅ useIsMaintenanceMode / useMaintenanceModeActions

---

### パターン2: シンプルな状態管理

```typescript
// states/foo/bar.ts
const barAtom = atom<T | undefined>(undefined);

export const useBar = () => useAtomValue(barAtom);
export const useSetBar = () => useSetAtom(barAtom);
```

**適用予定**: useGlobalAdminSocket

---

### パターン3: SWRとJotaiの協調

```typescript
// SWR: DB通信・キャッシュ管理
export const useSWRxFoo = () => {
  return useSWR('/api/foo', fetcher);
};

// Jotai: クライアント状態管理
const fooAtom = atom<T | undefined>(undefined);

export const useFooActions = () => {
  const setFoo = useSetAtom(fooAtom);
  const { mutate: revalidateDB } = useSWRxFoo();
  
  const sync = useCallback(async () => {
    const result = await revalidateDB();
    setFoo(result);
  }, [setFoo, revalidateDB]);
  
  return { sync };
};
```

**適用予定**: usePersonalSettings

---

## 📊 統計情報

### コード削減
- **削除ファイル数**: 4個
  - apps/app: 3個（maintenanceMode.tsx, socket-io.ts, use-context-swr.tsx）
  - packages/core: 1個（use-global-socket.ts）
  - ディレクトリ: 1個（states/system/）
- **削除行数**: ~300行以上
  - maintenanceMode.tsx: ~32行
  - socket-io.ts: ~80行
  - use-context-swr.tsx: ~40行
  - use-global-socket.ts: ~60行
  - Playground.tsx: ~50行（Socket初期化コード）
  - その他: ~40行（重複コード）

### アーキテクチャ改善
- ✅ 状態管理の責務分離（states ↔ services）
- ✅ 重複コード削除（6箇所）
- ✅ Socket接続の統合（useDefaultSocket と useGlobalSocket を統一）
- ✅ パッケージ間の依存削減（@growi/core からSocket関連削除）
- ✅ 型安全性の向上

### パフォーマンス
- ✅ 不適切なSWR使用の排除（6箇所）
- ✅ 最適な再レンダリング制御
- ✅ Socket接続の重複削減（2接続 → 1接続）
- ✅ バンドルサイズ最適化（Dynamic Import活用）

---

## 🎉 マイルストーン

### マイルストーン1: apps/app 完全移行
- **進捗**: 5/6 完了 (83%) ✅
- **予想完了**: Phase 1 完了時
- **残り工数**: 2-3日（usePersonalSettings + use-static-swr.ts）

### マイルストーン2: packages/editor 完全移行
- **進捗**: 1/2 完了 (50%) ✅
- **予想完了**: Phase 2 完了時
- **残り工数**: 5-7日（useCodeMirrorEditorIsolated のみ）

### マイルストーン3: useSWRStatic 完全廃止
- **進捗**: 6/8 完了 (75%) ✅
- **予想完了**: Phase 1 + Phase 2 完了時
- **残り工数**: 7-10日

---

## 📚 関連ドキュメント

- `apps-app-jotai-migration-progress.md` - apps/app Jotai移行完了レポート
- `apps-app-jotai-migration-guidelines.md` - 技術パターン・ベストプラクティス
- `packages-editor-jotai-migration-plan.md` - packages/editor 移行計画

---

## 📝 学んだこと

### アーキテクチャ設計
1. **状態とロジックの分離**: `states/` は純粋な状態管理、`services/` はビジネスロジック
2. **特殊名export**: `_atomsForFooActions` パターンで内部atomを安全に公開
3. **責務の明確化**: SWR（通信）vs Jotai（状態）の役割分担

### 移行のベストプラクティス
1. **重複コード検出**: 新旧実装の共存を見逃さない
2. **段階的移行**: 影響範囲の小さいものから順に実施
3. **型チェック**: 各ステップで型エラー0を確認

---

**次のアクション**: 
- **Phase 1**: `usePersonalSettings` の移行（apps/app で最後の大きなタスク）
- **Phase 2**: `useCodeMirrorEditorIsolated` の移行（packages/editor で唯一の残タスク）

---

### ステップ1-3 & 1-4: socket-io.ts と use-context-swr.tsx 廃止 ✅

**実施日**: 2025-10-06  
**工数**: 1日  
**優先度**: 🟡 中

#### ステップ1-3: useAdminSocket / useDefaultSocket (SWR版) 廃止 ✅

**問題**:
- `stores/socket-io.ts` で SWR ベースの `useAdminSocket()` と `useDefaultSocket()` を実装
- 8ファイルで使用（useAdminSocket: 6箇所、useDefaultSocket: 2箇所）
- `states/system/socket.ts` に既にJotai実装が存在（`atomWithLazy`）

**解決策**:
- すべての使用箇所を `states/system/socket` に移行
- `{ data: socket }` → `socket` に変更（SWRレスポンス構造不要）

**削除したファイル**:
- ✅ `stores/socket-io.ts`

**更新したファイル**:
- ✅ `client/components/Admin/G2GDataTransfer.tsx`
- ✅ `client/components/Admin/ExportArchiveDataPage.tsx`
- ✅ `client/components/Admin/ElasticsearchManagement/ElasticsearchManagement.tsx`
- ✅ `client/components/Admin/ElasticsearchManagement/RebuildIndexControls.jsx`
- ✅ `client/components/Admin/ImportData/GrowiArchive/ImportForm.jsx`
- ✅ `features/external-user-group/client/components/ExternalUserGroup/SyncExecution.tsx`
- ✅ `client/components/InAppNotification/InAppNotificationDropdown.tsx`
- ✅ `client/components/Sidebar/InAppNotification/PrimaryItemForNotification.tsx`

**達成効果**:
- ✅ SWR ベースのSocket管理を完全廃止
- ✅ `atomWithLazy` パターンの活用（遅延初期化）
- ✅ コード統一（すべて `states/system/socket` から取得）
- ✅ 型エラー 0件

#### ステップ1-4: useContextSWR 削除 ✅

**問題**:
- 使用箇所が0箇所（定義のみ存在）

**解決策**:
- ファイルごと削除（既に削除済み）

**削除したファイル**:
- ✅ `stores-universal/use-context-swr.tsx`

**達成効果**:
- ✅ 不要コード削除

---

### ステップ2-1: Playground Socket 廃止 ✅

**実施日**: 2025-10-06  
**工数**: 0.5日  
**優先度**: 🟢 低

#### 実施内容

**問題**:
- `packages/editor/src/client/components-internal/playground/Playground.tsx` で `useSWRStatic(GLOBAL_SOCKET_KEY)` を使用
- Socket 初期化のために 50行以上のコードが重複
- `mutate` 経由で Socket インスタンスを管理していた

**解決策**:
```
packages/editor/src/client/states/socket.ts (新規作成)
├── playgroundSocketAtom (Jotai atom)
├── usePlaygroundSocket() (Socket取得)
└── useSetupPlaygroundSocket() (初期化)
```

**作成したファイル**:
- ✅ `packages/editor/src/client/states/socket.ts`

**更新したファイル**:
- ✅ `packages/editor/src/client/components-internal/playground/Playground.tsx`

**削除されたコード**:
- ✅ `useSWRStatic` import と使用
- ✅ `GLOBAL_SOCKET_NS` と `GLOBAL_SOCKET_KEY` の定数定義（states/socket.ts に移動）
- ✅ 手動 Socket 初期化の useEffect（50行以上）

**達成効果**:
- ✅ packages/editor で useSWRStatic 使用箇所 -1
- ✅ apps/app と同じパターンで統一（Dynamic Import + Jotai）
- ✅ コード削減（50行以上の初期化コードが不要に）
- ✅ 型エラー 0件

---


## 📋 更新された実施順序

### Phase 1: apps/app の完了（残り工数: 2-3日）

**完了済み**:
1. ✅ **useIsMaintenanceMode** - 完了（0.5日）
2. ✅ **useGlobalAdminSocket 削除** - 完了（0.3日、バグ修正）
3. ✅ **useAdminSocket/useDefaultSocket (SWR版)** - 完了（1日）
4. ✅ **useContextSWR** - 完了（0.1日）
5. ✅ **useGlobalSocket (SWR版)** - 完了（0.5日）
6. ✅ **Socket統合整理** - 完了（0.3日）

**残りタスク**:
7. ⏳ **usePersonalSettings** - 次に実施、最も複雑（2-3日）
8. ⏳ **use-static-swr.ts** - 最終削除（0.1日）

**Phase 1完了時**: `apps/app` での useSWRStatic **完全廃止** 🎉

---

### Phase 2: packages/editor の移行（残り工数: 5-7日）

**完了済み**:
1. ✅ **Playground Socket** - 完了（0.5日）

**残りタスク**:
2. ⏳ **useCodeMirrorEditorIsolated** - 次に実施、最も複雑（5-7日）

**Phase 2完了時**: `packages/editor` での useSWRStatic **完全廃止** 🎉

詳細は `packages-editor-jotai-migration-plan.md` 参照。


---

### ステップ1-5: useGlobalSocket (SWR版) 廃止 ✅

**実施日**: 2025-10-06  
**工数**: 0.5日  
**優先度**: 🟡 中

#### 実施内容

**問題**:
- `packages/core/src/swr/use-global-socket.ts` で SWR ベースの `useGlobalSocket()` を実装
- 6ファイルで使用（ページ閲覧時のリアルタイム機能用）
- `states/socket-io/socket-io.ts` に既にJotai実装が存在

**解決策**:
- すべての使用箇所を `states/socket-io` の Jotai実装に移行
- `{ data: socket }` → `socket` に変更（SWRレスポンス構造不要）
- `GLOBAL_SOCKET_NS` と `GLOBAL_SOCKET_KEY` を `states/socket-io/socket-io.ts` に移動

**非推奨化したファイル**:
- ⚠️ `packages/core/src/swr/use-global-socket.ts` (@deprecated 追加)

**更新したファイル**:
- ✅ `client/services/side-effects/page-updated.ts`
- ✅ `client/components/PageEditor/conflict.tsx`
- ✅ `client/components/ItemsTree/ItemsTree.tsx`
- ✅ `features/collaborative-editor/side-effects/index.ts` (2箇所)
- ✅ `features/search/client/components/PrivateLegacyPages.tsx`
- ✅ `states/socket-io/socket-io.ts` (定数追加)

**達成効果**:
- ✅ SWR ベースのGlobalSocket管理を完全廃止
- ✅ Dynamic Import + Jotai パターンの活用
- ✅ ページルーム管理機能を維持（JoinPage/LeavePage）
- ✅ 型エラー 0件

---

## 🎉 Socket関連の整理完了

### 現在のSocket実装状況

#### `states/system/socket.ts` (管理機能用)
- ✅ `useAdminSocket()` - Admin名前空間 (`/admin`)
- ✅ `useDefaultSocket()` - Default名前空間 (`/`)
- ✅ `useSocket(namespace)` - カスタム名前空間
- ✅ **実装**: `atomWithLazy` (遅延初期化)
- ✅ **特徴**: 同期的、シンプル

#### `states/socket-io/socket-io.ts` (ページリアルタイム用)
- ✅ `useGlobalSocket()` - Global Socket取得
- ✅ `useSetupGlobalSocket()` - 初期化
- ✅ `useSetupGlobalSocketForPage()` - ページルーム管理
- ✅ **実装**: Dynamic Import + Jotai
- ✅ **特徴**: バンドルサイズ最適化、ページ管理機能

### 廃止されたSWR実装
- ❌ `stores/socket-io.ts` - 削除済み
- ⚠️ `packages/core/src/swr/use-global-socket.ts` - @deprecated


---

## 🗑️ 完全削除されたファイル

### packages/core/src/swr/use-global-socket.ts ✅

**実施日**: 2025-10-06

#### 削除内容
- ❌ `useGlobalSocket()` - SWR版のフック（完全削除）
- ❌ `GLOBAL_SOCKET_NS` - 定数（各パッケージに移動）
- ❌ `GLOBAL_SOCKET_KEY` - 定数（各パッケージに移動）

#### 移動先
- ✅ `apps/app/src/states/socket-io/socket-io.ts` - Jotai実装 + 定数
- ✅ `packages/editor/src/client/components-internal/playground/Playground.tsx` - 定数のみローカル定義

#### 更新したファイル
- ✅ `packages/core/src/swr/index.ts` - export削除
- ✅ `packages/editor/src/client/components-internal/playground/Playground.tsx` - 定数をローカル定義

**達成効果**:
- ✅ `@growi/core` からSocket関連コードを完全削除
- ✅ パッケージごとに独立した実装を保持
- ✅ 循環依存を回避


---

## 🔄 Socket実装の統合・整理 ✅

**実施日**: 2025-10-06

### 問題
`useDefaultSocket` と `useGlobalSocket` が同じ `/` 名前空間に重複して接続していた:
- ❌ **重複接続**: 2つの独立したSocket接続が存在
- ❌ **役割不明確**: どちらを使うべきか曖昧
- ❌ **非効率**: 同じ名前空間に2つのコネクション

### 実施内容

#### 1. `useDefaultSocket` を `useGlobalSocket` に統一

**削除した実装**:
- ❌ `states/system/socket.ts` の `useDefaultSocket()` と `defaultSocketAtom`

**移行したファイル**:
- ✅ `client/components/InAppNotification/InAppNotificationDropdown.tsx`
- ✅ `client/components/Sidebar/InAppNotification/PrimaryItemForNotification.tsx`

#### 2. ファイルリネーム（役割明確化）
- 📝 `states/socket-io/socket-io.ts` → `states/socket-io/global-socket.ts`

### 最終的なSocket構成

#### `states/system/socket.ts` (管理機能専用)
```typescript
useAdminSocket()     // /admin 名前空間
useSocket(namespace) // カスタム名前空間
```
- **用途**: 管理画面のSocket通信
- **特徴**: atomWithLazy、同期的初期化

#### `states/socket-io/global-socket.ts` (ページ機能専用)
```typescript
useGlobalSocket()              // / 名前空間 (8箇所で使用)
useSetupGlobalSocket()         // 初期化
useSetupGlobalSocketForPage()  // ページルーム管理
```
- **用途**: ページ閲覧時のリアルタイム機能
- **特徴**: Dynamic Import、ページルーム管理

### 使用箇所（全8箇所）

**通知系 (2箇所):**
1. `InAppNotificationDropdown.tsx` - 通知更新イベント
2. `PrimaryItemForNotification.tsx` - 通知バッジ更新

**ページ系 (6箇所):**
3. `page-updated.ts` - ページ更新検知
4. `conflict.tsx` - 編集競合検知
5. `ItemsTree.tsx` - ページツリー更新
6. `PrivateLegacyPages.tsx` - ページ移行進捗
7-8. `collaborative-editor/side-effects` - YJS同期（2箇所）

### 達成効果
- ✅ Socket接続の重複を解消（2接続 → 1接続）
- ✅ 役割を明確化（管理機能 vs ページ機能）
- ✅ 効率化（同じ名前空間への無駄な接続を削減）
- ✅ 型エラー 0件

