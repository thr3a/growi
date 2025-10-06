# useSWRStatic / useStaticSWR 廃止計画 - 進捗レポート

**作成日**: 2025-10-06  
**最終更新**: 2025-10-06  
**作成者**: GitHub Copilot  
**目標**: `useSWRStatic`と`useStaticSWR`を完全廃止する

---

## 📊 進捗状況

### 全体進捗
- **完了**: 1/7 箇所 (14.3%) ✅
- **残り**: 6箇所
- **apps/app**: 1/5 完了
- **packages/editor**: 0/2 完了

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

### 2. **stores/websocket.tsx** - useGlobalAdminSocket
- **現状**: `useSWRStatic` 使用（WebSocket管理）
- **使用箇所**: 1箇所（Admin/V5PageMigration.tsx）
- **役割**: Global Admin Socket の管理
- **複雑度**: 🟢 低
- **推定工数**: 0.5日
- **優先度**: 🟢 低
- **ステータス**: ⏳ 未着手

**移行方針**:
```typescript
// states/socket-io/admin-socket.ts
const globalAdminSocketAtom = atom<Socket | undefined>(undefined);

export const useGlobalAdminSocket = () => useAtomValue(globalAdminSocketAtom);
export const useSetGlobalAdminSocket = () => useSetAtom(globalAdminSocketAtom);
```

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

## 🔴 packages/editor での使用箇所（2箇所）

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

### 2. **components-internal/playground/Playground.tsx**
- **現状**: `useSWRStatic(GLOBAL_SOCKET_KEY)` - mutate のみ使用
- **使用箇所**: 1箇所（Playgroundのみ）
- **役割**: Global Socket の mutate
- **複雑度**: 🟢 低
- **推定工数**: 0.5日
- **優先度**: 🟢 低
- **ステータス**: ⏳ 未着手

---

## 📋 推奨実施順序

### Phase 1: apps/app の完了（残り工数: 2.5-3.5日）

**優先順位**:
1. ✅ **useIsMaintenanceMode** - 完了（0.5日）
2. ⏳ **useGlobalAdminSocket** - 次に実施（0.5日）
3. ⏳ **useContextSWR** - 削除のみ（0.1日）
4. ⏳ **usePersonalSettings** - 最も複雑（2-3日）
5. ⏳ **use-static-swr.ts** - 最終削除（0.1日）

**Phase 1完了時**: `apps/app` での useSWRStatic **完全廃止** 🎉

---

### Phase 2: packages/editor の完了（残り工数: 5.5-7.5日）

**優先順位**:
1. ⏳ **useCodeMirrorEditorIsolated** - 最優先（5-7日）
2. ⏳ **Playground** - 最後（0.5日）

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
- **削除ファイル数**: 1個（+ディレクトリ1個）
- **削除行数**: ~32行（maintenanceMode.tsx）

### アーキテクチャ改善
- ✅ 状態管理の責務分離（states ↔ services）
- ✅ 重複コード削除
- ✅ 型安全性の向上

### パフォーマンス
- ✅ 不適切なSWR使用の排除
- ✅ 最適な再レンダリング制御

---

## 🎉 マイルストーン

### マイルストーン1: apps/app 完全移行
- **進捗**: 1/5 完了 (20%)
- **予想完了**: Phase 1 完了時
- **残り工数**: 2.5-3.5日

### マイルストーン2: packages/editor 完全移行
- **進捗**: 0/2 完了 (0%)
- **予想完了**: Phase 2 完了時
- **残り工数**: 5.5-7.5日

### マイルストーン3: useSWRStatic 完全廃止
- **進捗**: 1/7 完了 (14.3%)
- **予想完了**: Phase 1 + Phase 2 完了時
- **残り工数**: 8-11日

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

**次のアクション**: ステップ1-2 `useGlobalAdminSocket` の移行を開始 🚀
