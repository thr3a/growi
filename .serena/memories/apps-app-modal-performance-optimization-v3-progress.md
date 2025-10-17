# モーダルV3動的ロード最適化 - 進捗管理

## 📊 進捗状況サマリー (2025-10-17更新)

**実装完了**: 25/46モーダル (54%) 🎉

**残り作業**: 
- PageAlerts最適化: 4個
- **合計目標**: 29/48 = **60%完了**（クラスコンポーネント2個、非モーダル、admin専用等を除く）

---

## 🔴 重要な学び: 正しい分類基準 (2025-10-17)

### ❌ 誤った判断基準
- "親ページがdynamic()でロードされている → 子モーダルの最適化不要"
- **問題点**: 親が遅延ロードされていても、モーダルは親と一緒にダウンロードされる

### ✅ 正しい判断基準
1. **モーダル自身の利用頻度**（親ページの頻度ではない）
2. **ファイルサイズ/複雑さ**（50行以上で効果的、100行以上で強く推奨）
3. **レンダリングコスト**

### ⚠️ 例外: 親ページ自体が低頻度の場合
- **Me画面**: 個人設定画面、低頻度利用 → 配下のモーダルは最適化不要
  - AssociateModal, DisassociateModal は除外
- **Admin画面**: 管理画面、低頻度利用 → 配下のモーダルは最適化不要
  - ImageCropModal, DeleteSlackBotSettingsModal, PluginDeleteModal は除外
- **理由**: 親ページ自体がdynamic()かつ低頻度なら、子モーダルの最適化効果は限定的

### 遅延ロードの階層構造

```
BasicLayout (常にレンダリング)
  ├─ HotkeysManager (dynamic()) ← 遅延ロード
  │    └─ ShowShortcutsModal ← ❌ 実体はモーダルではない（ホットキートリガーのみ）
  │
  ├─ SearchPage (dynamic()) ← 遅延ロード（中頻度）
  │    └─ SearchOptionModal (静的import) ← ✅ 最適化対象（低頻度モーダル）
  │
  ├─ Me/PersonalSettings (dynamic()) ← 遅延ロード（低頻度）
  │    ├─ AssociateModal ← ❌ 親自体が低頻度、最適化不要
  │    └─ DisassociateModal ← ❌ 親自体が低頻度、最適化不要
  │
  └─ Admin/* (dynamic()) ← 遅延ロード（低頻度）
       ├─ ImageCropModal ← ❌ 親自体が低頻度、最適化不要
       ├─ DeleteSlackBotSettingsModal ← ❌ 親自体が低頻度、最適化不要
       └─ PluginDeleteModal ← ❌ 親自体が低頻度、最適化不要
```

**結論**: 
- 親がdynamic()でも、子モーダルは親と一緒にダウンロードされる → モーダル自身の頻度で判断
- **ただし親自体が低頻度（Me画面、Admin画面など）なら、子の最適化は不要**

---

## ✅ 完了済みモーダル (25個)

### 高頻度モーダル (0/2 - 意図的にスキップ) ⏭️
- ⏭️ SearchModal (192行) - 検索機能、初期ロード維持
- ⏭️ PageCreateModal (319行) - ページ作成、初期ロード維持

### 中頻度モーダル (6/6 - 100%完了) ✅
- ✅ PageAccessoriesModal (2025-10-15) - ケースB
- ✅ ShortcutsModal (2025-10-15) - ケースC
- ✅ PageRenameModal (2025-10-16) - ケースC
- ✅ PageDuplicateModal (2025-10-16) - ケースC
- ✅ DescendantsPageListModal (2025-10-16) - ケースC
- ✅ PageDeleteModal (2025-10-16) - ケースA

### 低頻度モーダル (19/38完了)

**Session 1完了 (6個)** ✅:
- ✅ DrawioModal (2025-10-16) - ケースC
- ✅ HandsontableModal (2025-10-16) - ケースC + 複数ステータス対応
- ✅ TemplateModal (2025-10-16) - ケースC + @growi/editor state
- ✅ LinkEditModal (2025-10-16) - ケースC + @growi/editor state
- ✅ TagEditModal (2025-10-16) - ケースC
- ✅ ConflictDiffModal (2025-10-16) - ケースC

**Session 2完了 (11個)** ✅:
- ✅ DeleteBookmarkFolderModal (2025-10-17) - ケースC, BasicLayout
- ✅ PutbackPageModal (2025-10-17) - ケースC, JSX→TSX変換
- ✅ AiAssistantManagementModal (2025-10-17) - ケースC
- ✅ PageSelectModal (2025-10-17) - ケースC
- ✅ GrantedGroupsInheritanceSelectModal (2025-10-17) - ケースC
- ✅ DeleteAttachmentModal (2025-10-17) - ケースC
- ✅ PageBulkExportSelectModal (2025-10-17) - ケースC
- ✅ PagePresentationModal (2025-10-17) - ケースC
- ✅ EmptyTrashModal (2025-10-17) - ケースB
- ✅ CreateTemplateModal (2025-10-17) - ケースB
- ✅ DeleteCommentModal (2025-10-17) - ケースB

**Session 3完了 (2個)** ✅:
- ✅ SearchOptionModal (2025-10-17) - ケースA, SearchPage配下
- ✅ DeleteAiAssistantModal (2025-10-17) - ケースC, AiAssistantSidebar配下

---

## 🔄 残りの最適化対象

### 🔵 Session 4: PageAlerts最適化（4個）

PageAlertsは`BasicLayout → PageView → PageAlerts`経由で全ページ常時レンダリング。
既にNext.js `dynamic()`使用だが、getLayoutパターンでは初期ロードされる問題。

1. **TrashPageAlert**
   - **表示条件**: `useIsTrashPage()` hook
   - **頻度**: ゴミ箱ページのみ（極めて低頻度）
   - **最適化**: `useLazyLoader('trash-page-alert', ..., isTrashPage)`

2. **FixPageGrantAlert** ⭐ 最重要
   - **サイズ**: 412行（大規模）
   - **特徴**: 内部にModalコンポーネント含む
   - **表示条件**: 権限修正が必要な時（低頻度）
   - **効果**: 大きなバンドル削減

3. **PageRedirectedAlert**
   - **表示条件**: `useRedirectFrom() != null`
   - **頻度**: リダイレクト時のみ（低頻度）

4. **FullTextSearchNotCoverAlert**
   - **表示条件**: `markdownLength > elasticsearchMaxBodyLengthToIndex`
   - **頻度**: 非常に長いページのみ（低頻度）

**予想時間**: 約40-60分

---

## ⏭️ 最適化不要/スキップ（21個）

### 非モーダルコンポーネント（1個）
- ❌ **ShowShortcutsModal** (35行) - 実体はモーダルではなくホットキートリガーのみ

### 親ページ低頻度 - Me画面（2個）
- ⏸️ **AssociateModal** (142行) - Me画面（低頻度）内のモーダル
- ⏸️ **DisassociateModal** (94行) - Me画面（低頻度）内のモーダル

### 親ページ低頻度 - Admin画面（3個）
- ⏸️ **ImageCropModal** (194行) - Admin/Customize（低頻度）内のモーダル
- ⏸️ **DeleteSlackBotSettingsModal** (103行) - Admin/SlackIntegration（低頻度）内のモーダル
- ⏸️ **PluginDeleteModal** (103行) - Admin/Plugins（低頻度）内のモーダル

### 低優先スキップ（1個）
- ⏸️ **PrivateLegacyPagesMigrationModal** (133行) - ユーザー指示によりスキップ

### クラスコンポーネント（2個）
- ❌ **UserInviteModal** (299行) - .jsx、対象外
- ❌ **GridEditModal** (263行) - .jsx、対象外

### 管理画面専用・低頻度（12個）

管理画面自体が遅延ロードされており、使用頻度が極めて低いため最適化不要:

- SelectCollectionsModal (222行) - ExportArchiveData
- ImportCollectionConfigurationModal (228行) - ImportData
- NotificationDeleteModal (53行) - Notification
- DeleteAllShareLinksModal (61行) - Security
- LdapAuthTestModal (72行) - Security
- ConfirmBotChangeModal (58行) - SlackIntegration
- UpdateParentConfirmModal (93行) - UserGroupDetail
- UserGroupUserModal (110行) - UserGroupDetail
- UserGroupDeleteModal (208行) - UserGroup
- UserGroupModal (138行) - ExternalUserGroupManagement
- PasswordResetModal (228行) - Users
- ConfirmModal (74行) - App

---

## 📈 最適化進捗チャート

```
完了済み: ██████████████████████████████████████████████████████  25/46 (54%)
残り:     
スキップ:  ████████                                                8/46 (17%)
対象外:   ██                                                      2/46 (4%)
不要:     ███████████                                            11/46 (24%)
```

**次のマイルストーン**:
- PageAlerts完了後: 25モーダル + 4 PageAlerts = **29/48 (60%)**

---

## 🎯 次のアクション

### 即座に開始可能: Session 4 (PageAlerts最適化)

**対象**:
1. TrashPageAlert - ゴミ箱ページ専用
2. FixPageGrantAlert - 412行、最重要
3. PageRedirectedAlert - リダイレクト時のみ
4. FullTextSearchNotCoverAlert - 長文ページのみ

**所要時間**: 約40-60分

**完了後の効果**:
- 全ページの初期ロード時の不要なレンダリング削減
- 特にFixPageGrantAlertの大規模バンドル削減
- 進捗: 25 → 29/48 (60%)

**次のステップ**: V3最適化完了 🎉

---

## 📝 再評価の記録 (2025-10-17)

### 除外判断
1. **ShowShortcutsModal**: 実体はモーダルコンポーネントではなく、ホットキートリガーのみ（36行、空のJSX返す）
2. **AssociateModal, DisassociateModal**: Me画面（低頻度利用）内のモーダルのため、最適化効果限定的
3. **ImageCropModal, DeleteSlackBotSettingsModal, PluginDeleteModal**: Admin画面（低頻度利用）内のモーダルのため、最適化効果限定的

### 判断基準の明確化
- **親ページ自体が低頻度**（Me画面、Admin画面など） → 子モーダルの最適化不要
  - 例: Me/PersonalSettings（低頻度） → AssociateModal/DisassociateModal（最適化不要）
  - 例: Admin/Customize（低頻度） → ImageCropModal（最適化不要）
- **親ページが中頻度以上** → 子モーダルの頻度で判断
  - 例: SearchPage（中頻度） → SearchOptionModal（低頻度、最適化**必要**）
- **親ページがBasicLayout直下のdynamic()** → 親の頻度次第
  - 例: AiAssistantSidebar（BasicLayoutから直接） → DeleteAiAssistantModal（最適化必要）

---

## 📝 セッション完了時の更新手順

各セッション完了時に以下を更新:
1. ✅ 完了済みリストに追加
2. 🔄 残りリストから削除
3. 📊 進捗チャート更新
4. 🎯 次のアクション更新
