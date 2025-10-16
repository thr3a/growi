# モーダル一覧 - V3動的ロード対象

## V3進捗状況

**実装完了**: 2/46モーダル (2025-10-15)
- ✅ PageAccessoriesModal
- ✅ ShortcutsModal

---

## V2完了モーダル (46個) - V3動的ロード候補

### 高頻度使用 - 動的ロード非推奨 (2個)
初期ロードを維持すべきモーダル:
1. SearchModal.tsx - 検索機能 (頻繁に使用)
2. PageCreateModal.tsx - ページ作成 (重要機能)

### 中頻度使用 - 動的ロードを検討 (6個)
- ✅ PageAccessoriesModal.tsx
- ✅ ShortcutsModal.tsx
- [ ] PageDeleteModal.tsx
- [ ] PageRenameModal.tsx
- [ ] PageDuplicateModal.tsx
- [ ] DescendantsPageListModal.tsx

### 低頻度使用 - 動的ロード確定 (38個)
- PageBulkExportSelectModal.tsx
- LinkEditModal.tsx
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
- TagEditModal.tsx
- UserGroupModal.tsx
- PagePresentationModal.tsx - プレゼンテーション
- ConflictDiffModal.tsx - 競合解決
- HandsontableModal.tsx - 表編集
- DrawioModal.tsx - Drawio編集
- TemplateModal.tsx
- DeleteAiAssistantModal.tsx
- ShareScopeWarningModal.tsx
- DeleteAttachmentModal.tsx
- PrivateLegacyPagesMigrationModal.tsx
- PluginDeleteModal.tsx
- PutbackPageModal.jsx
- DeleteSlackBotSettingsModal.tsx
- AiAssistantManagementModal.tsx
- PageSelectModal.tsx
- その他9個

---

## Container-Presentation構造 (V2成果)

多くのモーダルは以下の構造:
```
Modal/
  ├── Container (6-15行) - Modal wrapper
  └── Substance (全ロジック) - 動的ロード対象
```

**V3での利点**: Substanceのみ動的ロード可能
