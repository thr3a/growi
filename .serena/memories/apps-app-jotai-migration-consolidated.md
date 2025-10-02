# GROWI Jotai移行 統合レポート (更新日: 2025-10-02)

## 📊 全体進捗: 61/63 フック (96.8%) ✅

---

## ✅ フェーズ3: 完了した移行 (4フック)

### 1. useIsSlackEnabled (優先度A - シンプル)
- **ステータス**: ✅ 完了
- **配置場所**: `states/ui/editor/is-slack-enabled.ts`
- **パターン**: シンプルなboolean atomと読み書きフック
- **フック構成**:
  - `useIsSlackEnabled()` - 読み取り専用、booleanを返す
  - `useSetIsSlackEnabled()` - 書き込み専用、setter関数を返す
- **更新ファイル数**: 3ファイル
  - `client/components/CommentEditor.tsx`
  - `client/components/SavePageControls.tsx`
  - 削除: `stores/editor.tsx` (useIsSlackEnabledを削除)
- **型チェック**: ✅ 通過

### 2. useReservedNextCaretLine (優先度A - シンプル)
- **ステータス**: ✅ 完了
- **配置場所**: `states/ui/editor/reserved-next-caret-line.ts`
- **パターン**: Number atomとglobalEmitter統合
- **フック構成**:
  - `useReservedNextCaretLine()` - 読み取りフック、globalEmitterのuseEffectを含む
  - `useSetReservedNextCaretLine()` - 書き込み専用
- **統合**: globalEmitterイベント (reserveCaretLineOfHackmd/reserveCaretLineOfHandsontable)
- **更新ファイル数**: 3ファイル
  - `features/page-editor/client/components/DisplaySwitcher/DisplaySwitcher.tsx`
  - `features/page-editor/client/components/PageEditor/PageEditor.tsx`
  - 削除: `stores/editor.tsx` (useReservedNextCaretLineを削除)
- **型チェック**: ✅ 通過

### 3. useAiAssistantSidebar (優先度B - 中複雑度)
- **ステータス**: ✅ 完了
- **配置場所**: `features/openai/client/states/ai-assistant-sidebar.ts`
- **パターン**: Status/Actions分離による最適な再レンダリング
- **フック構成**:
  - `useAiAssistantSidebarStatus()` - 読み取り専用、booleanフラグを返す (isOpened, isMinimized, isThreadListMinimized)
  - `useAiAssistantSidebarActions()` - 書き込み専用、アクションメソッドを返す (open, close, minimizeなど)
- **型定義**: `AiAssistantSidebarState` (Status + Subscriptionプロパティ)
- **更新ファイル数**: 11ファイル
  - `features/page-editor/client/components/OpenDefaultAiAssistantButton.tsx`
  - `features/openai/client/components/ThreadList/ThreadList.tsx` (2箇所)
  - `features/openai/client/components/AiAssistantModal/AiAssistantSubstance/AiAssistantSubstance.tsx`
  - `features/openai/client/components/AiAssistantManagementModal.tsx`
  - `features/openai/client/components/AiAssistantModal/AiAssistantModal.tsx`
  - `features/openai/client/components/knowledge-assistant.tsx`
  - `client/services/ai-assistant-manager.ts`
  - `features/openai/client/services/ai-assistant-floating-manager.ts`
  - `client/services/ai-thread-subscription-manager.ts`
  - `features/openai/client/services/open-ai-assistant-modal-by-command.ts`
  - 削除: `features/openai/client/stores/ai-assistant.tsx` (ファイル全体)
- **型チェック**: ✅ 通過

### 4. useKeywordManager (優先度B - 中複雑度) - ⭐ **リファクタリング済**
- **ステータス**: ✅ 完了 + アーキテクチャ改善
- **配置場所**: `states/search/keyword-manager.ts`
- **パターン**: **3フック構成による関心の分離**
- **アーキテクチャ決定**: 読み取り専用、副作用専用、書き込み専用に分割
- **フック構成**:
  - `useSearchKeyword()` - **読み取り専用**、現在のキーワードを返す (string)
  - `useKeywordManager()` - **副作用専用**、URL同期用 (戻り値void)
    - `SearchPageBase`でトップレベルで1回だけ呼ばれる
    - URL解析、ブラウザバック/フォワードナビゲーションを処理
    - 初期化ロジックを含む
    - cleanup関数でbeforePopStateを解除
  - `useSetSearchKeyword()` - **書き込み専用**、setter関数を返す
    - 素の関数を返す（pushStateオブジェクトではない）
    - キーワード更新が必要なコンポーネントで使用
- **統合**: Next.js RouterによるURL同期とブラウザ履歴管理
- **主要機能**:
  - URLクエリパラメータ同期 (`?q=keyword`)
  - `router.beforePopState`によるブラウザバック/フォワード処理
  - 最適な再レンダリング（各コンシューマは必要なものだけサブスクライブ）
  - cleanup関数によるメモリリーク防止
- **更新ファイル数**: 7ファイル
  - `features/search/client/components/SearchPage/SearchPageBase.tsx` - **useKeywordManager()をここで呼び出し**
  - `features/search/client/components/SearchPage/SearchPage.tsx` - useSearchKeyword + useSetSearchKeyword
  - `client/components/TagCloudBox.tsx` - useSetSearchKeyword
  - `client/components/TagList.tsx` - useSetSearchKeyword
  - `client/components/Sidebar/RecentChanges/RecentChangesSubstance.tsx` - useSetSearchKeyword
  - `client/components/PageTags/RenderTagLabels.tsx` - useSetSearchKeyword
  - `states/search/index.ts` - KeywordManagerActions型を削除、exportsを更新
  - 非推奨化: `client/services/search-operation.ts` (コメント付きで保持、削除はせず)
- **型チェック**: ✅ 通過
- **アーキテクチャのメリット**:
  - 関心の明確な分離 (読み取り/副作用/書き込み)
  - URL同期の単一責任点 (SearchPageBase)
  - 最適な再レンダリング (コンポーネントはキーワード変更時のみ再レンダリング、router変更では再レンダリングしない)
  - テスタビリティ (副作用が1つのフックに分離)
  - メモリ安全性 (cleanup関数による適切なリソース解放)

---

## 🎯 残りタスク: 2フック (3.2%)

### 優先度C - 高複雑度 (Yjs統合)

#### 1. useSecondaryYdocs
- **ステータス**: ⏳ 未着手
- **現在の場所**: `stores/yjs.ts`
- **パターン**: Y.Docライフサイクル管理
- **複雑度**: 高 - 複数のY.Docインスタンス、複雑な状態
- **依存関係**: Yjsライブラリ、WebSocket接続
- **見積もり工数**: 高

#### 2. useCurrentPageYjsData
- **ステータス**: ⏳ 未着手
- **現在の場所**: `stores/yjs.ts`
- **パターン**: 複雑なYjs状態 + ユーティリティ関数
- **複雑度**: 高 - Yjs統合、リアルタイムコラボレーション状態
- **依存関係**: Yjsライブラリ、複雑なデータ構造
- **見積もり工数**: 高

---

## 📋 使用した技術パターン

### 1. Status/Actions分離パターン ⭐
**使用タイミング**: 複数のアクションとbooleanフラグを持つ複雑な状態
**メリット**: 
- 最適な再レンダリング（コンポーネントはサブスクライブした値が変更された時のみ再レンダリング）
- 読み取りと書き込み操作の明確な分離
- テスタビリティの向上

**例**: useAiAssistantSidebar
```typescript
// Status (読み取り専用)
const { isOpened, isMinimized } = useAiAssistantSidebarStatus();

// Actions (書き込み専用)
const { open, close } = useAiAssistantSidebarActions();
```

### 2. 3フック分離パターン ⭐ **NEW**
**使用タイミング**: 副作用（URL同期など）を持つ状態 + 複数のコンシューマ
**メリット**:
- 超最適な再レンダリング（読み取り/副作用/書き込みが完全に分離）
- 副作用の単一責任点（トップレベルで1回だけ呼ばれる）
- コンシューマの最大限の柔軟性（必要に応じて読み取り専用または書き込み専用を選択）
- テスタビリティ（副作用が分離され、独立してテスト可能）
- メモリ安全性（cleanup関数による適切なリソース管理）

**例**: useKeywordManager
```typescript
// SearchPageBase内（トップレベル、1回だけ呼ぶ）
useKeywordManager(); // void - 全てのURL同期副作用を処理

// 子コンポーネント内（読み取り専用）
const keyword = useSearchKeyword(); // string

// アクションハンドラ内（書き込み専用）
const setKeyword = useSetSearchKeyword(); // (keyword: string) => void
setKeyword('新しい検索語');
```

### 3. globalEmitter統合パターン
**使用タイミング**: レガシーイベントシステムと同期する状態
**実装方法**: 読み取りフック内でuseEffectを使ってglobalEmitterイベントをリッスン

**例**: useReservedNextCaretLine
```typescript
useEffect(() => {
  const handler = (line: number) => setReservedLine(line);
  globalEmitter.on('reserveCaretLineOfHackmd', handler);
  return () => globalEmitter.off('reserveCaretLineOfHackmd', handler);
}, [setReservedLine]);
```

### 4. Router統合パターン
**使用タイミング**: URLとブラウザ履歴と同期する状態
**実装方法**: URL解析用useEffect + ブラウザバック/フォワード用router.beforePopState + cleanup関数

**例**: useKeywordManager（副作用専用フック）
```typescript
// URL解析
useEffect(() => {
  const initialKeyword = (Array.isArray(queries) ? queries.join(' ') : queries) ?? '';
  setKeyword(initialKeyword);
}, [setKeyword, initialKeyword]);

// ブラウザバック/フォワード + cleanup
useEffect(() => {
  routerRef.current.beforePopState(({ url }) => {
    const newUrl = new URL(url, 'https://exmple.com');
    const newKeyword = newUrl.searchParams.get('q');
    if (newKeyword != null) {
      setKeyword(newKeyword);
    }
    return true;
  });

  return () => {
    routerRef.current.beforePopState(() => true);
  };
}, [setKeyword]);
```

---

## 🔧 実装ガイドライン

### ファイル構成
- シンプルなUI状態: `states/ui/[feature]/[hook-name].ts`
- 機能固有の状態: `features/[feature]/client/states/[hook-name].ts`
- 検索関連の状態: `states/search/[hook-name].ts`

### フック命名規則
- 読み取り専用: `use[Feature]()` または `use[Feature]Status()`
- 書き込み専用: `useSet[Feature]()` または `use[Feature]Actions()`
- 副作用専用: `use[Feature]Manager()`
- 組み合わせ（可能な限り避ける）: `use[Feature]()` で `{value, setValue}` を返す

### 移行チェックリスト
1. ✅ 適切なパターンで新しいJotai atomファイルを作成
2. ✅ 旧フックの全ての使用箇所を検索
3. ✅ 全ファイルでimportとフック呼び出しを更新
4. ✅ 旧実装を削除または非推奨化
5. ✅ 型チェック実行: `pnpm run lint:typecheck`
6. ✅ 統合メモリを更新

### パフォーマンス考慮事項
- 複雑な状態にはStatus/Actionsまたは3フック分離を使用
- 関数で十分な場合はオブジェクトを返さない
- 副作用専用フックはトップレベルで呼ぶ（ページごとに1回）
- アクション作成にはメモ化（useCallback）を使用
- cleanup関数で適切にリソースを解放

---

## 🎉 達成事項

- ✅ 61/63 フック移行完了 (96.8%)
- ✅ 4つの移行で22ファイル更新
- ✅ 3つの旧実装ファイル削除
- ✅ 1ファイルを移行コメント付きで非推奨化
- ✅ 全ての型チェック通過（既存のaxiosエラーを除く）
- ✅ 4つの技術パターンを文書化（新しい3フック分離を含む）
- ✅ アーキテクチャ改善適用（useKeywordManagerリファクタリング）
- ✅ メモリリーク防止のためのcleanup関数追加

---

## 📝 注意事項

- `utils/axios/index.ts`の既存のaxios型エラーは移行作業の範囲外
- 旧実装は移行後すぐに削除して型エラーを早期に検出
- 不適切なSWR使用（useSWRStatic、useSWRImmutable）からJotaiへの移行完了
- **NEW**: 3フック分離パターン（読み取り/副作用/書き込み）をuseKeywordManagerに実装・文書化
- **アーキテクチャ決定**: 最終的な複雑なフックに進む前に、useKeywordManagerの関心の分離を改善

---

## 🚀 次のステップ

1. **残りの複雑なフック**（2フック）:
   - useSecondaryYdocs
   - useCurrentPageYjsData
   
2. **移行後の作業**:
   - 全ての移行済みフックの包括的なテスト
   - パフォーマンスベンチマーク
   - メインコードベースのドキュメント更新
   - 必要に応じて他の適切なフックへの3フック分離パターン適用を検討

---

最終更新日: 2025-10-02
更新者: GitHub Copilot (Jotai移行フェーズ3 + useKeywordManagerアーキテクチャ改善)