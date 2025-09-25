# Jotai 移行完了アーカイブ

## ✅ 完了済み移行の詳細記録

### 🎉 モーダル状態移行完了（個別ファイル方式）

#### 第1バッチ（2025-09-05完了）
- ✅ **`useEmptyTrashModal`**: ゴミ箱空モーダル
- ✅ **`useDeleteAttachmentModal`**: 添付ファイル削除モーダル
- ✅ **`useDeleteBookmarkFolderModal`**: ブックマークフォルダ削除モーダル
- ✅ **`useUpdateUserGroupConfirmModal`**: ユーザーグループ更新確認モーダル

#### 第2バッチ（2025-09-05完了）
- ✅ **`usePageSelectModal`**: ページ選択モーダル
- ✅ **`usePagePresentationModal`**: プレゼンテーションモーダル
- ✅ **`usePutBackPageModal`**: ページ復元モーダル

#### 第3バッチ（2025-09-05完了）
- ✅ **`useGrantedGroupsInheritanceSelectModal`**: 権限グループ継承選択モーダル
- ✅ **`useDrawioModal`**: Draw.ioモーダル
- ✅ **`useHandsontableModal`**: Handsontableモーダル

#### 第4バッチ（2025-09-05完了）
- ✅ **`usePrivateLegacyPagesMigrationModal`**: プライベートレガシーページ移行モーダル
- ✅ **`useDescendantsPageListModal`**: 子孫ページリストモーダル
- ✅ **`useConflictDiffModal`**: 競合差分モーダル

#### 第5バッチ（2025-09-05完了）
- ✅ **`usePageBulkExportSelectModal`**: ページ一括エクスポート選択モーダル
- ✅ **`useDrawioModalForEditor`**: エディタ用Draw.ioモーダル
- ✅ **`useLinkEditModal`**: リンク編集モーダル
- ✅ **`useTemplateModal`**: テンプレートモーダル

#### 🔥 実装の特徴
- **型安全性**: `@growi/core` からの正しい型インポート
- **パフォーマンス最適化**: `useAtomValue` + `useSetAtom` フック分離による最適化
- **使用箇所完全移行**: 全ての使用箇所を新しいフックに移行済み
- **旧コード削除**: `stores/modal.tsx` からの旧実装削除完了
- **型チェック成功**: `pnpm run lint:typecheck` 通過確認済み
- **統一されたパターン**: 全モーダルで一貫したJotaiパターン適用

### 🆕 デバイス状態移行完了（2025-09-11完了）

#### ✅ Phase 1: デバイス幅関連フック4個一括移行完了
- ✅ **`useIsDeviceLargerThanMd`**: MD以上のデバイス幅判定
  - 使用箇所：8個のコンポーネント完全移行
- ✅ **`useIsDeviceLargerThanLg`**: LG以上のデバイス幅判定
  - 使用箇所：3個のコンポーネント完全移行
- ✅ **`useIsMobile`**: モバイルデバイス判定
  - 使用箇所：1個のコンポーネント完全移行

#### 🚀 移行の成果
- **統一パターン**: 既存の `useDeviceLargerThanXl` パターンに合わせて実装
- **MediaQuery対応**: ブレークポイント監視による動的な状態更新
- **モバイル検出**: タッチスクリーン・UserAgent による高精度判定
- **テスト修正**: モックファイルの更新完了
- **旧コード削除**: `stores/ui.tsx` から3つのフック削除完了

#### 📊 移行詳細
**移行されたファイル数**: 11個
- PageControls.tsx, AccessTokenScopeList.tsx, PageEditorModeManager.tsx
- GrowiContextualSubNavigation.tsx, SavePageControls.tsx, OptionsSelector.tsx
- Sidebar.tsx, PageListItemL.tsx, DescendantsPageListModal.tsx
- PageAccessoriesModal.tsx, PrimaryItem.tsx

**テストファイル修正**: 1個
- DescendantsPageListModal.spec.tsx: モック戻り値を `{ data: boolean }` → `[boolean]` に変更

### 🆕 TOC状態移行完了（2025-09-11完了）

#### ✅ TOC関連フック完全移行完了
- ✅ **`useTocNode`**: TOCノード取得（新API）
- ✅ **`useSetTocNode`**: TOCノード設定（新API）  
- ✅ **`useTocOptions`**: TOCオプション生成（SWRからJotai + Dynamic Import）
- ✅ **`useTocOptionsReady`**: TOCオプション準備完了判定

#### 🚀 移行の成果と技術的特徴

**1. API整理とクリーンアップ**
- **統合**: TOC関連処理を `states/ui/toc.ts` に集約
- **削除**: deprecated API（`useCurrentPageTocNode`, `useSetCurrentPageTocNode`）完全削除
- **リファクタ**: `states/ui/page.ts` からTOC関連re-export削除
- **責務分離**: PageControls関連とTOC関連の完全分離

**2. RefObjectパターンによる型安全なDOM管理**
```typescript
// Internal RefObject storage (hidden from external API)
const tocNodeRefAtom = atom<RefObject<HtmlElementNode> | null>(null);

// Public derived atom for direct access
export const tocNodeAtom = atom((get) => {
  const tocNodeRef = get(tocNodeRefAtom);
  return tocNodeRef?.current ?? null;
});
```

**3. Dynamic Import + Cachingによるパフォーマンス最適化**
```typescript
// Heavy renderer dependencies are lazy-loaded
let generateTocOptionsCache: typeof generateTocOptions | null = null;

if (!generateTocOptionsCache) {
  const { generateTocOptions } = await import('~/client/services/renderer/renderer');
  generateTocOptionsCache = generateTocOptions;
}
```

**4. SWRからJotai完全移行**
- **Before**: SWR-based `useTocOptions` with server-side dependency
- **After**: Pure Jotai state management with optimized caching
- **Code Size**: 50%削減（54行 → 27行）

#### 🎯 パフォーマンス向上効果
1. **Bundle Splitting**: renderer.tsx（20+ dependencies）の遅延ロード
2. **Code Splitting**: KaTeX, Mermaid, PlantUML等の重いライブラリ分離
3. **Caching**: 一度ロード後の同期実行
4. **First Contentful Paint**: 初期バンドルサイズ削減

#### 📊 移行影響範囲
- **更新ファイル**: `states/ui/toc.ts`, `states/ui/page.ts`, `stores/renderer.tsx`
- **使用箇所**: `TableOfContents.tsx`（既に新API対応済み）
- **削除コード**: deprecated hooks, re-exports, 冗長なコメント

### 🆕 無題ページ状態移行完了（2025-09-11完了）

#### ✅ 無題ページ関連フック完全移行完了
- ✅ **`useIsUntitledPage`**: 無題ページ状態取得（シンプルなboolean）
- ✅ **`useSetIsUntitledPage`**: 無題ページ状態設定（直接的なsetter）

#### 🚀 移行の成果と技術的特徴

**1. シンプルなBoolean状態パターン確立**
```typescript
// Atom定義（シンプル）
const isUntitledPageAtom = atom<boolean>(false);

// 読み取り専用フック
export const useIsUntitledPage = (): boolean => {
  return useAtomValue(isUntitledPageAtom);
};

// セッター専用フック（useSetAtom直接使用）
export const useSetIsUntitledPage = () => {
  return useSetAtom(isUntitledPageAtom);
};
```

**2. SWR後方互換性の完全排除**
- **Before**: SWR response形式（`{ data: boolean, mutate: function }`）
- **After**: 直接的なboolean値とsetter関数
- **メリット**: シンプルで理解しやすい、不要な複雑性の排除

**3. 使用箇所の完全移行**
- **読み取り**: `const { data: isUntitled } = useIsUntitledPage()` → `const isUntitled = useIsUntitledPage()`
- **変更**: `const { mutate } = useIsUntitledPage()` → `const setIsUntitled = useSetIsUntitledPage()`
- **直接呼び出し**: `mutate(value)` → `setIsUntitled(value)`

#### 📊 移行影響範囲
- **新ファイル**: `states/ui/untitled-page.ts`（シンプルな実装）
- **移行箇所**: 5個のファイル（PageTitleHeader.tsx, PageEditor.tsx, page-path-rename-utils.ts, use-create-page.tsx, use-update-page.tsx）
- **テスト修正**: PageTitleHeader.spec.tsx（モック戻り値を `{ data: boolean }` → `boolean` に変更）
- **旧コード削除**: `stores/ui.tsx` からの `useIsUntitledPage` 削除完了

#### 🎯 設計原則の明確化
- **SWR後方互換性不要時**: 直接的なgetter/setterパターンを採用
- **パフォーマンス優先**: `useAtomValue` + `useSetAtom` の分離により最適化
- **複雑性排除**: 不要なwrapper関数やcallback不要
- **型安全性**: TypeScriptによる完全な型チェック

## 📈 効率化された移行パターンの成功事例
- **バッチ処理**: 3-4個のモーダルを同時移行
- **所要時間**: 各バッチ約1時間で完了
- **品質確認**: 型チェック成功、全使用箇所移行済み
- **統一された実装**: 全17個のモーダルで一貫したパターン

## 🚀 累積的な成果とメリット
1. **パフォーマンス向上**: 不要なリレンダリングの削減、Bundle Splitting、自動メモ化
2. **開発体験向上**: 統一されたAPIパターン、型安全性、デバッグ性向上
3. **保守性向上**: 個別ファイル化による責務明確化、API整理、計算結果共有
4. **型安全性**: Jotaiによる強固な型システム
5. **レスポンシブ対応**: 正確なデバイス幅・モバイル判定
6. **DOM管理**: RefObjectパターンによる安全なDOM要素管理
7. **シンプル性**: 不要な複雑性の排除、直接的なAPI設計

## 🗂️ 削除完了済みファイル
- ✅ `stores/modal.tsx` （完全削除）
- ✅ `stores/ui.tsx` （完全削除）
- ✅ `stores/use-static-swr.ts` （完全削除）
- ✅ `stores-universal/context.tsx` （部分削除：useContextSWR系フック削除済み）