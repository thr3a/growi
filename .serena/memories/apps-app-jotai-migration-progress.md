# Jotai Migration Progress

## Completed Migrations (51 hooks total)

### 1. UI/Modal States (8 hooks) - ✅ COMPLETED
- useTemplateModalStatus/Actions (2)
- useLinkEditModalStatus/Actions (2) 
- useDrawioModalForEditorStatus/Actions (2)
- useHandsontableModalStatus/Actions (2)

### 2. Theme/UI States (2 hooks) - ✅ COMPLETED  
- useResolvedThemeStatus/Actions (2)

### 3. Sidebar States (6 hooks) - ✅ COMPLETED
- useSidebarCollapsedStatus/Actions (2)
- useSidebarClosedStatus/Actions (2)  
- useSidebarConfigStatus/Actions (2)

### 4. Page/Context States (8 hooks) - ✅ COMPLETED
- useCurrentUserStatus/Actions (2)
- useIsGuestUserStatus/Actions (2)
- useIsReadOnlyUserStatus/Actions (2)
- useCurrentPathnameStatus/Actions (2)

### 5. Editor States (12 hooks) - ✅ COMPLETED
- useEditorModeStatus/Actions (2)
- useEditingMarkdownStatus/Actions (2)
- useSelectedGrantStatus/Actions (2)
- useReservedNextCaretLineStatus/Actions (2)
- useSlackChannelsStatus/Actions (2)
- useIsSlackEnabledStatus/Actions (2)

### 6. Page States (9 hooks) - ✅ COMPLETED  
- useCurrentPageDataStatus/Actions (2)
- useCurrentPageIdStatus/Actions (2)
- useCurrentPagePathStatus/Actions (2)
- usePageNotFoundStatus/Actions (2)
- useIsUntitledPageStatus (1)

### 7. Editor State Management (6 hooks) - ✅ COMPLETED
- useWaitingSaveProcessingStatus/Actions (2)
- useCurrentIndentSizeStatus/Actions (2)  
- usePageTagsForEditorsStatus/Actions (2)

## Next Migration Candidates (12 hooks) - 技術的精査完了

### **優先度A++（最高）- Derived Atom Perfect Case** 🚀

#### 9. **useAcceptedUploadFileType** → `apps/app/src/states/server-configurations/upload-file-type.ts`
- **機能**: アップロード可能ファイル種別の計算（Derived Atom完璧事例）
- **現在の実装**: `useSWRImmutable` + 同期計算ロジック
- **データソース**: `isUploadEnabledAtom`, `isUploadAllFileAllowedAtom` 
- **移行理由**: 非同期通信なし、純粋な2-atom派生計算
- **実装パターン**: **Derived Atom** (ガイドライン8️⃣)
- **推定工数**: 低（シンプルな条件分岐計算）
- **技術評価**: ✅ Revalidation無意味、計算結果の自動メモ化でパフォーマンス向上

### **優先度A++（最高）- Features Modal系状態管理** 🚀

#### 1. **usePluginDeleteModal** → `features/growi-plugin/client/states/modal/plugin-delete.ts`
- **機能**: プラグイン削除確認モーダルの状態管理
- **現在の実装**: `useStaticSWR<PluginDeleteModalStatus, Error>('pluginDeleteModal'...)`
- **データ型**: `{ isOpen: boolean, id: string, name: string, url: string }`
- **使用箇所**: 2箇所 (PluginDeleteModal.tsx, PluginsExtensionPageContents.tsx)
- **移行理由**: 典型的なモーダル状態管理、既存Status/Actions分離パターンと同一
- **推定工数**: 低（既存パターン適用）

#### 2. **useSearchModal** → `features/search/client/states/modal/search.ts`
- **機能**: グローバル検索モーダルの状態管理
- **現在の実装**: `useStaticSWR<SearchModalStatus, Error>('SearchModal'...)`  
- **データ型**: `{ isOpened: boolean, searchKeyword?: string }`
- **使用箇所**: 8箇所（重要なUI機能：Navbar, Hotkeys, PageControls, SearchModal等）
- **移行理由**: 重要なグローバル検索機能のモーダル状態管理
- **推定工数**: 低-中（使用箇所多数だが単純なモーダル）

#### 3. **useAiAssistantManagementModal** → `features/openai/client/states/modal/ai-assistant-management.ts`
- **機能**: AI管理モーダルの状態管理
- **現在の実装**: `useSWRStatic<AiAssistantManagementModalStatus, Error>('AiAssistantManagementModal'...)`
- **データ型**: `{ isOpened: boolean, pageMode: enum, aiAssistantData?: object }`
- **使用箇所**: OpenAI feature内のコンポーネント群
- **移行理由**: モーダル状態管理、ページモード切り替え付き
- **推定工数**: 中（複雑なモーダル状態+enum管理）

#### 4. **useAiAssistantSidebar** → `features/openai/client/states/ui/ai-assistant-sidebar.ts`
- **機能**: AIアシスタントサイドバーの状態管理
- **現在の実装**: `useSWRStatic<AiAssistantSidebarStatus, Error>('AiAssistantSidebar'...)`
- **データ型**: `{ isOpened: boolean, isEditorAssistant?: boolean, aiAssistantData?: object, threadData?: object }`
- **使用箇所**: OpenAI feature内
- **移行理由**: サイドバーUI状態管理（複雑だがUI状態）
- **推定工数**: 中-高（複雑な状態+複数データ管理）

### **優先度A（高）- 基本状態管理** 🔥

#### 5. **useEditingClients** → `apps/app/src/states/ui/editing-clients.ts`
- **機能**: コラボレーション編集中ユーザー一覧の状態管理
- **現在の実装**: `useSWRStatic<EditingClient[], Error>('editingUsers', status, { fallbackData: [] })`
- **データ型**: `EditingClient[]` (配列)
- **使用箇所**: 2箇所 (EditorNavbar.tsx, PageEditor.tsx)
- **移行理由**: 純粋なUI状態管理、シンプルな配列データ
- **推定工数**: 低（シンプルな配列状態）

#### 6. **useIsSlackEnabled** → 既に移行済み状態に統合可能
- **機能**: Slack通知有効/無効フラグ
- **現在の実装**: `useSWRStatic<boolean, Error>('isSlackEnabled', undefined, { fallbackData: false })`
- **データ型**: `boolean`
- **使用箇所**: 複数箇所 (SavePageControls, CommentEditor等)
- **移行理由**: 純粋なUI状態、boolean値
- **推定工数**: 低（シンプルなboolean状態）

### **優先度B（中）- リソース管理系** ⚡

#### 7. **useSocket/useDefaultSocket/useAdminSocket** → `apps/app/src/states/system/socket.ts`
- **機能**: Socket接続のリソース管理
- **現在の実装**: `useSWRImmutable(namespace, null)` + `socketFactory(namespace)`
- **技術的評価**: ❌ Revalidation無意味（一度作成したSocket接続は再検証不要）
- **移行理由**: SWRオーバーヘッド無駄、`atomWithLazy`による適切なSocket管理
- **実装パターン**: `atomWithLazy((namespace: string) => socketFactory(namespace))`
- **推定工数**: 中（Socket管理の適切な実装）
- **使用箇所**: 9箇所（Admin系コンポーネント、Notification等）

#### 8. **useReservedNextCaretLine** → `apps/app/src/states/ui/reserved-next-caret-line.ts`
- **機能**: エディターのカーソル位置予約機能
- **現在の実装**: `useSWRStatic('saveNextCaretLine', initialData, { fallbackData: 0 })` + globalEmitter
- **データ型**: `number` + useEffect(globalEmitter連携)
- **使用箇所**: 2箇所 (PageEditor.tsx, DisplaySwitcher.tsx)
- **移行理由**: UI状態管理だがglobalEmitterとの副作用処理が必要
- **推定工数**: 中（globalEmitter連携の副作用処理）

### **優先度B+（中-高）- 複雑リソース管理** 🔧

#### 10. **useSecondaryYdocs** → `packages/editor/src/states/yjs/secondary-docs.ts`
- **機能**: Yjs Document(Y.Doc)の生成・管理・破棄
- **現在の実装**: `useSWRImmutable<StoredYDocs>(cacheKey, () => ({ primaryDoc: new Y.Doc(), ... }))`
- **技術的評価**: ❌ Revalidation完全に無意味（Y.Docは一度作成したら再検証不要）
- **移行理由**: Y.Docリソースの複雑なライフサイクル管理にSWRキャッシングは過剰、atom + useEffect による明示的な生成・破棄管理が自然
- **推定工数**: 中-高（Y.Doc複雑なライフサイクル+useEffect組み合わせ）
- **使用箇所**: packages/editor内

#### 11. **useKeywordManager** → `apps/app/src/states/ui/keyword-manager.ts`
- **機能**: 検索キーワード管理 + URL同期処理
- **現在の実装**: `useSWRImmutable<string>('searchKeyword', null, { fallbackData: initialKeyword })`
- **技術的再評価**: ❌ SWRは「URL同期」を提供せず、単純なstring値保存のみ
- **実態**: URL解析(`router.query.q`)、URL更新(`router.push()`)、履歴監視(`beforePopState()`)は全て手動実装
- **移行理由**: SWRオーバーヘッド不要、複雑なRouter連携は既に手動実装されておりJotaiでも同等可能
- **推定工数**: 中（Router連携の副作用処理、但しロジック移植）
- **使用箇所**: 6箇所（TagCloudBox, TagList, SearchPage等）

### **優先度C（低）- 複雑な状態管理** 🔧

#### 12. **useCurrentPageYjsData** → `apps/app/src/states/page/yjs-data.ts`
- **機能**: Yjs（リアルタイム協調編集）データ管理
- **現在の実装**: `useSWRStatic<CurrentPageYjsData, Error>(key, undefined)` + utils関数
- **データ型**: `CurrentPageYjsData` (複雑なオブジェクト) + カスタムutils
- **使用箇所**: 7箇所（多数のコンポーネント）
- **移行理由**: 複雑だがUI状態管理、ただしutils関数との組み合わせ
- **推定工数**: 高（複雑な状態+メソッド+多数の使用箇所）

## 技術的精査で判明した重要事項

### **SWR vs Jotai パフォーマンス軸評価完了**

#### **「データフェッチだからSWR」脱却**
- ✅ **Revalidationの必要性** が判定軸の核心
- ✅ **Socket管理**: 一度作成したら終わり → SWRオーバーヘッド無駄
- ✅ **Y.Doc管理**: リソース生成・破棄 → Revalidation概念が無意義  
- ✅ **URL同期**: 手動実装でSWRは関与せず → SWRオーバーヘッド無駄
- ✅ **Derived計算**: 同期計算にRevalidation不要 → Jotaiが最適

#### **useAtomEffect パフォーマンス考慮**
- ✅ **複雑な依存関係**(4+個atom): useAtomEffectが有効
- ❌ **シンプルな依存関係**(1-2個): 効果微細、従来useEffectで十分
- 📋 **採用基準**: パフォーマンスより**コード可読性**重視

## 推奨実装順序（技術的優先度）

### **Phase 1: Derived Atom（即効性）**
1. **useAcceptedUploadFileType** (最優先、Derived Atomの模範実装)

### **Phase 2: Features Modal系（既存パターン）**
2. **usePluginDeleteModal** (既存Modal パターン適用)
3. **useSearchModal** (重要なグローバル機能)
4. **useAiAssistantManagementModal** (中複雑度Modal)
5. **useAiAssistantSidebar** (複雑サイドバー)

### **Phase 3: 基本状態管理（容易）**
6. **useEditingClients** (シンプル配列)
7. **useIsSlackEnabled** (boolean、容易)

### **Phase 4: リソース管理系（中難度）**
8. **useSocket群** (Socket適切管理)
9. **useReservedNextCaretLine** (globalEmitter連携)

### **Phase 5: 複雑系（高難度）**
10. **useSecondaryYdocs** (Y.Doc複雑ライフサイクル)
11. **useKeywordManager** (Router連携複雑)
12. **useCurrentPageYjsData** (最後、複雑+多数使用箇所)

## 移行完了予定

現在: **51フック完了** → 目標: **63フック完了** (+12フック)

技術的精査により、「**State While Revalidate**」の適用妥当性を軸とした適切な判定を達成。全移行完了により、**inappropriate SWR usage の完全根絶**とJotai状態管理の最適化を実現予定。