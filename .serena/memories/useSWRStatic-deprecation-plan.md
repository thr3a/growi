# useSWRStatic / useStaticSWR 廃止計画

**作成日**: 2025-10-06  
**作成者**: GitHub Copilot  
**目標**: `useSWRStatic`と`useStaticSWR`を完全廃止する

---

## 📊 現状分析

### useSWRStatic / useStaticSWR の使用箇所

#### 🔴 apps/app での使用（要対応：4箇所）

##### 1. **stores/maintenanceMode.tsx** - `useIsMaintenanceMode`
- **現状**: `useStaticSWR` を使用
- **状況**: ⚠️ **重複実装が存在** - `states/global/global.ts` にも `isMaintenanceModeAtom` が存在
- **使用箇所**: 調査必要
- **移行方法**: 既存の `states/global/global.ts` の atom を活用
- **優先度**: 🔴 **高** - 重複コード削除

##### 2. **stores/personal-settings.tsx** - `usePersonalSettings`
- **現状**: `useStaticSWR` を使用（DB同期用の中間キャッシュ）
- **使用箇所**: 12箇所（Me設定画面、DrawioModal、TemplateModal等）
- **役割**: `/personal-setting` API から取得したユーザー情報のキャッシュ管理
- **複雑度**: 🟡 中 - sync/update機能を含む
- **移行方法**: Jotai atom化 + `useSWRxPersonalSettings`との統合
- **優先度**: 🟡 **中**

##### 3. **stores/websocket.tsx** - `useGlobalAdminSocket`
- **現状**: `useSWRStatic` を使用（WebSocket管理）
- **使用箇所**: 1箇所（Admin/V5PageMigration.tsx）
- **役割**: Global Admin Socket の管理
- **複雑度**: 🟢 低
- **移行方法**: Jotai atom化（socket.io client state）
- **優先度**: 🟢 **低**

##### 4. **stores-universal/use-context-swr.tsx** - `useContextSWR`
- **現状**: `useSWRStatic` を使用
- **使用箇所**: 使用箇所なし（internal definition only）
- **役割**: Context用の SWR wrapper（mutate禁止）
- **複雑度**: 🟢 低
- **移行方法**: 使用箇所がないため削除可能
- **優先度**: 🟢 **低** - 使用箇所がない

##### 5. **stores/use-static-swr.ts**
- **現状**: `@deprecated` - `useSWRStatic` の再エクスポート
- **移行方法**: 上記1-4の移行完了後に削除
- **優先度**: ⭐ **最終削除対象**

---

#### 🔴 packages/editor での使用（要対応：2箇所）

##### 1. **stores/codemirror-editor.ts** - `useCodeMirrorEditorIsolated`
- **現状**: `useSWRStatic` + `useRef`
- **使用箇所**: 20+箇所（パッケージ全体に浸透）
- **役割**: CodeMirrorインスタンスの分離管理
- **複雑度**: 🟡 中
- **移行方法**: Map<string, UseCodeMirrorEditor> パターンで Jotai 化
- **優先度**: 🔴 **最高** - 影響範囲が最大
- **詳細**: `packages-editor-jotai-migration-plan.md` 参照

##### 2. **components-internal/playground/Playground.tsx**
- **現状**: `useSWRStatic(GLOBAL_SOCKET_KEY)` - mutate のみ使用
- **使用箇所**: 1箇所（Playgroundのみ）
- **役割**: Global Socket の mutate
- **複雑度**: 🟢 低
- **移行方法**: Jotai atom化またはprops経由
- **優先度**: 🟢 **低** - Playground専用

---

#### 🟢 packages/core での定義（変更不要）

##### packages/core/src/swr/use-swr-static.ts
- **役割**: `useSWRStatic` の実装定義
- **依存**: 
  - `packages/core/src/swr/use-global-socket.ts` → Jotai化必要
- **移行方法**: apps/app と packages/editor の移行完了後に削除を検討

---

## 🎯 廃止計画

### フェーズ1: apps/app の移行（優先度：高）

#### ステップ1-1: useIsMaintenanceMode 重複解消（推定工数：0.5日）⭐
**優先度：最高 - 重複コード削除**

**現状**:
- `stores/maintenanceMode.tsx` - `useStaticSWR` 使用
- `states/global/global.ts` - `isMaintenanceModeAtom` 既存（Jotai）

**問題**: 同じ状態を2箇所で管理している

**移行手順**:
1. `stores/maintenanceMode.tsx` の使用箇所を調査
2. `states/global/global.ts` に actions を追加
3. 使用箇所を新しい実装に置き換え
4. `stores/maintenanceMode.tsx` を削除

**新実装案**:
```typescript
// states/global/global.ts に追加

const isMaintenanceModeAtom = atom<boolean>(false); // 既存

export const useIsMaintenanceMode = () => useAtomValue(isMaintenanceModeAtom); // 既存

// Actions を追加
export const useMaintenanceModeActions = () => {
  const setIsMaintenanceMode = useSetAtom(isMaintenanceModeAtom);

  const start = useCallback(async () => {
    await apiv3Post('/app-settings/maintenance-mode', { flag: true });
    setIsMaintenanceMode(true);
  }, [setIsMaintenanceMode]);

  const end = useCallback(async () => {
    await apiv3Post('/app-settings/maintenance-mode', { flag: false });
    setIsMaintenanceMode(false);
  }, [setIsMaintenanceMode]);

  return { start, end };
};
```

**期待効果**: 
- 重複コード削除
- Jotai統一による保守性向上
- useSWRStatic使用箇所 -1

---

#### ステップ1-2: usePersonalSettings のJotai化（推定工数：2-3日）

**移行手順**:
1. `states/user/` ディレクトリ作成
2. Personal Settings 用の atom + actions 実装
3. `useSWRxPersonalSettings`（SWR）との連携設計
4. 12箇所の使用箇所を段階的に移行
5. `stores/personal-settings.tsx` 削除

**新実装案**:
```typescript
// states/user/personal-settings.ts

type PersonalSettingsData = IUser;

const personalSettingsAtom = atom<PersonalSettingsData | undefined>(undefined);

// Read-only hook
export const usePersonalSettings = () => {
  return useAtomValue(personalSettingsAtom);
};

// Actions hook
export const usePersonalSettingsActions = () => {
  const setPersonalSettings = useSetAtom(personalSettingsAtom);
  const { mutate: revalidateDB } = useSWRxPersonalSettings();

  const sync = useCallback(async () => {
    const result = await revalidateDB();
    setPersonalSettings(result);
  }, [setPersonalSettings, revalidateDB]);

  const updateBasicInfo = useCallback(async () => {
    // ... implementation
  }, [setPersonalSettings]);

  // ... other actions

  return { sync, updateBasicInfo, /* ... */ };
};
```

**期待効果**:
- SWR（DB通信）とJotai（クライアント状態）の責務分離
- useSWRStatic使用箇所 -1

---

#### ステップ1-3: useGlobalAdminSocket のJotai化（推定工数：0.5日）

**移行手順**:
1. `states/socket-io/admin-socket.ts` 作成
2. Admin Socket 用の atom 実装
3. 1箇所の使用箇所を更新
4. `stores/websocket.tsx` 削除

**新実装案**:
```typescript
// states/socket-io/admin-socket.ts

import type { Socket } from 'socket.io-client';

const globalAdminSocketAtom = atom<Socket | undefined>(undefined);

export const useGlobalAdminSocket = () => {
  return useAtomValue(globalAdminSocketAtom);
};

export const useSetGlobalAdminSocket = () => {
  return useSetAtom(globalAdminSocketAtom);
};
```

**期待効果**:
- Socket管理の Jotai 統一
- useSWRStatic使用箇所 -1

---

#### ステップ1-4: useContextSWR 削除（推定工数：0.1日）

**移行手順**:
1. 使用箇所がないことを確認
2. `stores-universal/use-context-swr.tsx` 削除

**期待効果**:
- 不要コード削除
- useSWRStatic使用箇所 -1

---

#### ステップ1-5: use-static-swr.ts 削除（推定工数：0.1日）

**移行手順**:
1. 上記4ステップ完了後
2. `stores/use-static-swr.ts` 削除

**期待効果**:
- deprecated ファイル削除
- `apps/app` での useSWRStatic 完全廃止 ✅

**apps/app 完了**: useSWRStatic 使用箇所 0 🎉

---

### フェーズ2: packages/editor の移行（優先度：中）

#### ステップ2-1: useCodeMirrorEditorIsolated のJotai化（推定工数：5-7日）⭐

**詳細**: `packages-editor-jotai-migration-plan.md` 参照

**移行手順**:
1. `states/codemirror-editor.ts` 作成
2. Map<string, UseCodeMirrorEditor> パターンで実装
3. 20+箇所を段階的に移行（後方互換フック提供）
4. `stores/codemirror-editor.ts` 削除

**期待効果**:
- パフォーマンス改善（最大）
- useSWRStatic使用箇所 -1

---

#### ステップ2-2: Playground の useSWRStatic 削除（推定工数：0.5日）

**移行手順**:
1. Global Socket を Jotai atom化（apps/app と統合）
2. Playground での使用を Jotai hook に置き換え
3. useSWRStatic import 削除

**期待効果**:
- useSWRStatic使用箇所 -1
- `packages/editor` での useSWRStatic 完全廃止 ✅

**packages/editor 完了**: useSWRStatic 使用箇所 0 🎉

---

### フェーズ3: packages/core の整理（優先度：低）

#### ステップ3-1: use-global-socket.ts の更新（推定工数：0.5日）

**現状**: `useSWRStatic` に依存

**移行手順**:
1. apps/app での Global Socket の Jotai 実装を確認
2. `packages/core/src/swr/use-global-socket.ts` を更新または削除を検討

---

#### ステップ3-2: use-swr-static.ts の削除検討（推定工数：TBD）

**現状**: `useSWRStatic` の実装

**移行条件**: 
- apps/app での使用箇所 0 ✅
- packages/editor での使用箇所 0 ✅
- 他パッケージでの使用箇所調査

**移行手順**:
1. 全パッケージでの使用箇所を調査
2. 使用箇所がなければ削除
3. ある場合は個別に Jotai 化を検討

---

## 📊 総合工数見積もり

### フェーズ1: apps/app（必須）
| ステップ | 工数 | 優先度 | 廃止数 |
|---------|------|--------|--------|
| 1-1. useIsMaintenanceMode | 0.5日 | 🔴 最高 | -1 |
| 1-2. usePersonalSettings | 2-3日 | 🟡 中 | -1 |
| 1-3. useGlobalAdminSocket | 0.5日 | 🟢 低 | -1 |
| 1-4. useContextSWR | 0.1日 | 🟢 低 | -1 |
| 1-5. use-static-swr.ts | 0.1日 | ⭐ 最終 | -1 |
| **小計** | **3-4日** | | **-5箇所** |

### フェーズ2: packages/editor（推奨）
| ステップ | 工数 | 優先度 | 廃止数 |
|---------|------|--------|--------|
| 2-1. useCodeMirrorEditorIsolated | 5-7日 | 🔴 高 | -1 |
| 2-2. Playground | 0.5日 | 🟢 低 | -1 |
| **小計** | **5.5-7.5日** | | **-2箇所** |

### フェーズ3: packages/core（オプション）
| ステップ | 工数 | 優先度 | 廃止数 |
|---------|------|--------|--------|
| 3-1. use-global-socket.ts | 0.5日 | 🟢 低 | 調査次第 |
| 3-2. use-swr-static.ts | TBD | 🟢 低 | 調査次第 |
| **小計** | **TBD** | | **TBD** |

---

## 🎯 推奨実施順序

### 即座に実施すべき（最優先）
1. ✅ **ステップ1-1: useIsMaintenanceMode 重複解消** (0.5日)
   - 重複コード削除
   - 最も簡単で効果が大きい

### 短期で実施（1-2週間）
2. ✅ **ステップ1-2: usePersonalSettings** (2-3日)
3. ✅ **ステップ1-3: useGlobalAdminSocket** (0.5日)
4. ✅ **ステップ1-4: useContextSWR** (0.1日)
5. ✅ **ステップ1-5: use-static-swr.ts** (0.1日)

**完了時**: `apps/app` での useSWRStatic 完全廃止 🎉

### 中期で実施（1-2ヶ月）
6. ✅ **ステップ2-1: useCodeMirrorEditorIsolated** (5-7日)
7. ✅ **ステップ2-2: Playground** (0.5日)

**完了時**: `packages/editor` での useSWRStatic 完全廃止 🎉

### 長期で検討（3ヶ月+）
8. ⭐ **フェーズ3: packages/core の整理**

---

## 🎉 最終目標

### 完全廃止達成条件
- ✅ `apps/app` での useSWRStatic/useStaticSWR 使用箇所: **0**
- ✅ `packages/editor` での useSWRStatic 使用箇所: **0**
- ✅ `apps/app/src/stores/use-static-swr.ts` 削除
- ⭐ `packages/core/src/swr/use-swr-static.ts` 削除検討

### 期待効果
- 🎯 **アーキテクチャ統一**: SWR（通信）とJotai（状態）の明確な分離
- 🎯 **保守性向上**: 重複コード削除、責務の明確化
- 🎯 **パフォーマンス改善**: 不適切なSWR使用の排除
- 🎯 **コードベース品質**: 技術的負債の解消

---

## 📚 関連ドキュメント

- `apps-app-jotai-migration-progress.md` - apps/app Jotai移行完了レポート
- `apps-app-jotai-migration-guidelines.md` - 技術パターン
- `packages-editor-jotai-migration-plan.md` - packages/editor 移行計画

---

**結論**: useSWRStatic/useStaticSWR の完全廃止は実現可能。  
**推奨**: フェーズ1（apps/app）を優先実施し、早期に成果を得る。  
**総工数**: 8.5-11.5日（フェーズ1+2）で主要な廃止が完了。
