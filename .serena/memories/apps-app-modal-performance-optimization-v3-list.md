# モーダル一覧 - V3動的ロード対象

## V3進捗状況

**実装完了**: 12/46モーダル (26%) (2025-10-16更新)

### 中頻度モーダル (6/6 - 100%完了) ✅
- ✅ PageAccessoriesModal (2025-10-15)
- ✅ ShortcutsModal (2025-10-15)
- ✅ PageRenameModal (2025-10-16) - ケースC
- ✅ PageDuplicateModal (2025-10-16) - ケースC
- ✅ DescendantsPageListModal (2025-10-16) - ケースC
- ✅ PageDeleteModal (2025-10-16) - ケースA

**時間**: 中頻度4モーダル完了に約20分
- 3つケースC (最短経路): 各5分程度
- 1つケースA: 約5分

### 低頻度モーダル (6/38 - 16%完了) 🔄
- ✅ DrawioModal (2025-10-16) - ケースC
- ✅ HandsontableModal (2025-10-16) - ケースC + 複数ステータス対応
- ✅ TemplateModal (2025-10-16) - ケースC + @growi/editor state
- ✅ LinkEditModal (2025-10-16) - ケースC + @growi/editor state
- ✅ TagEditModal (2025-10-16) - ケースC
- ✅ ConflictDiffModal (2025-10-16) - ケースC

**バグ修正 (2025-10-16)**:
- LinkEditModal: 誤ったstate importパス修正 (`~/states` → `@growi/editor/dist/states`)
- TemplateModal: 誤ったstate importパス修正 (`~/states` → `@growi/editor`)
- HandsontableModal: 複数ステータス対応 (`isOpened || isOpendInEditor`)

---

## V2完了モーダル (46個) - V3動的ロード候補

### 高頻度使用 - 動的ロード非推奨 (2個)
初期ロードを維持すべきモーダル:
1. SearchModal.tsx - 検索機能 (頻繁に使用)
2. PageCreateModal.tsx - ページ作成 (重要機能)

### 中頻度使用 - 動的ロード完了✅ (6個)
- ✅ PageAccessoriesModal.tsx
- ✅ ShortcutsModal.tsx
- ✅ PageDeleteModal.tsx
- ✅ PageRenameModal.tsx
- ✅ PageDuplicateModal.tsx
- ✅ DescendantsPageListModal.tsx

### 低頻度使用 - 動的ロード候補 (38個)

**完了 (6個)** ✅:
- ✅ LinkEditModal.tsx
- ✅ TagEditModal.tsx
- ✅ ConflictDiffModal.tsx
- ✅ HandsontableModal.tsx
- ✅ DrawioModal.tsx
- ✅ TemplateModal.tsx

**次の優先候補 (32個)** 🔜:
- PagePresentationModal.tsx
- PageBulkExportSelectModal.tsx
- CreateTemplateModal.tsx
- SearchOptionModal.tsx
- ImageCropModal.tsx
- DeleteCommentModal.tsx
- AssociateModal.tsx
- DisassociateModal.tsx
- EmptyTrashModal.tsx
- DeleteBookmarkFolderModal.tsx
- GrantedGroupsInheritanceSelectModal.tsx
- SelectUserGroupModal.tsx
- UserGroupModal.tsx
- DeleteAiAssistantModal.tsx
- ShareScopeWarningModal.tsx
- DeleteAttachmentModal.tsx
- PrivateLegacyPagesMigrationModal.tsx
- PluginDeleteModal.tsx
- PutbackPageModal.jsx
- DeleteSlackBotSettingsModal.tsx
- AiAssistantManagementModal.tsx
- PageSelectModal.tsx
- その他 (約10個)

---

## Container-Presentation構造 (V2成果)

多くのモーダルは以下の構造:
```
Modal/
  ├── Container (6-15行) - Modal wrapper
  └── Substance (全ロジック) - 動的ロード対象
```

**V3での利点**: Substanceのみ動的ロード可能

---

## 実装パターン

### ケースC (最短経路) ⭐
- 所要時間: 約5分/モーダル
- Container有`<Modal>` + Substance分離済み
- 作業: ディレクトリ化 + dynamic.tsx/index.ts追加 + named export化

### ケースA (シンプル)
- 所要時間: 約5-10分/モーダル
- Container-Presentation分離なし
- 作業: ディレクトリ化 + dynamic.tsx/index.ts追加 + named export化

---

## 重要な注意事項

### Cross-Package State Management
一部のモーダル（特にエディター関連）は`@growi/editor`パッケージでstateを管理:
- LinkEditModal: `@growi/editor/dist/states/modal/link-edit`
- TemplateModal: `@growi/editor`
- HandsontableModal (Editor用): `@growi/editor` (useHandsontableModalForEditorStatus)

**注意**: `~/states`からインポートできると仮定しないこと！

### 複数ステータス対応
一部のモーダルは複数のステータスプロパティを持つ:
- HandsontableModal: `isOpened || isOpendInEditor`
- dynamic.tsxで両方をチェックする必要あり
