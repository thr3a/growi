# packages/editor への Jotai 導入検討レポート

**作成日**: 2025-10-06  
**作成者**: GitHub Copilot  
**関連**: `apps-app-jotai-migration-progress.md`

---

## 📊 現状分析

### ✅ 既存のJotai実装
`packages/editor`には**すでにJotaiが導入されており**、一部で活用されています：

#### 既存のJotai States
```
packages/editor/src/states/
├── modal/
│   ├── link-edit.ts          ✅ Jotai (Status/Actions分離)
│   ├── template.ts           ✅ Jotai (Status/Actions分離)
│   ├── drawio-for-editor.ts  ✅ Jotai (Status/Actions分離)
│   └── handsontable.ts       ✅ Jotai (Status/Actions分離)
└── ui/
    └── resolved-theme.ts      ✅ Jotai (シンプルパターン)
```

**特徴**:
- `apps/app`と同じアーキテクチャパターンを採用
- Status/Actions分離パターン（モーダル）
- シンプルなatom + getter/setter（テーマ）
- 命名規則も統一されている

### 🔴 SWR/useState依存の実装
`packages/editor/src/client/stores/` には未移行のフックが存在：

#### 1. **useCodeMirrorEditorIsolated** (codemirror-editor.ts)
- **現状**: `useSWRStatic` + `useRef`
- **使用箇所**: 20箇所以上（コンポーネント全体に浸透）
- **役割**: CodeMirrorインスタンスの分離された管理
- **複雑度**: 🟡 中 - deepEqualsによる更新判定

#### 2. **useSecondaryYdocs** (use-secondary-ydocs.ts)
- **現状**: `useSWRImmutable` + Y.Doc管理
- **使用箇所**: 2箇所（use-collaborative-editor-mode、use-unified-merge-view）
- **役割**: Collaborative Editingのための Primary/Secondary Y.Doc管理
- **複雑度**: 🔴 高 - Y.Docライフサイクル、メモリ管理

#### 3. **useCollaborativeEditorMode** (use-collaborative-editor-mode.ts)
- **現状**: `useState` + `useEffect` + SocketIOProvider
- **使用箇所**: 調査必要
- **役割**: リアルタイム共同編集モードの管理
- **複雑度**: 🔴 高 - WebSocket、Y.Doc、SocketIOProvider統合
- **依存**: `useSecondaryYdocs`に依存

#### 4. **useEditorSettings** (use-editor-settings.ts)
- **現状**: `useState` + 複数の`useEffect`
- **使用箇所**: 調査必要
- **役割**: エディタ設定（テーマ、キーマップ、スタイル等）の管理
- **複雑度**: 🟡 中 - 複数の拡張機能の動的ロード

#### 5. **useEditorShortcuts** (use-editor-shortcuts.ts)
- **現状**: `useEffect` - コマンド登録のみ
- **使用箇所**: useEditorSettingsから使用
- **役割**: エディタショートカットキーの登録
- **複雑度**: 🟢 低 - 副作用のみ

#### 6. **useDefaultExtensions** (use-default-extensions.ts)
- **現状**: 未確認（調査必要）
- **使用箇所**: 調査必要
- **役割**: デフォルトCodeMirror拡張機能
- **複雑度**: 調査必要

---

## 🎯 移行優先度評価（調査完了版）

### 移行対象フック一覧
| フック名 | 現状 | 使用箇所 | 複雑度 | 優先度 | 推奨 |
|---------|------|---------|--------|--------|------|
| useCodeMirrorEditorIsolated | useSWRStatic | 20+ | 🟡 中 | 🟡 中 | 段階的移行検討 |
| useEditorSettings | useState | 2 | 🟡 中 | 🟡 中 | 移行検討可能 |
| useCollaborativeEditorMode | useState | 1 | 🔴 高 | 🟡 中 | 移行検討可能 |
| useSecondaryYdocs | useSWRImmutable | 2 | 🔴 高 | 🔵 低 | **現状維持** |
| useEditorShortcuts | useEffect | 1 | 🟢 低 | ❌ なし | **現状維持** |
| useDefaultExtensions | useEffect | 2 | 🟢 低 | ❌ なし | **現状維持** |

---

### 🔵 優先度：低（当面移行不要）

#### **useSecondaryYdocs**
**理由**:
1. **高い複雑度**: Y.Docライフサイクル管理、メモリ管理
2. **SWRの適切な使用**: キャッシュとライフサイクル管理に適している
3. **限定的な使用**: 2箇所のみ、影響範囲小
4. **安定性**: 既存実装が安定稼働中
5. **Jotai化のメリット小**: キャッシュ機能がSWRで適切に実現されている

**現状維持を推奨**: SWRの特性（キャッシュ、Immutable）が適している

**使用箇所**:
- `use-collaborative-editor-mode.ts`
- `use-unified-merge-view.ts`

---

### 🟡 優先度：中（移行検討可能）

#### 1. **useCodeMirrorEditorIsolated** ⭐
**移行メリット**:
- 20箇所以上の使用箇所でパフォーマンス改善
- `useSWRStatic`の不適切な使用を排除
- `apps/app`の他の状態と統合しやすくなる
- 最も影響範囲が大きく、改善効果も大きい

**移行課題**:
- 使用箇所が多く、段階的移行が必要
- CodeMirrorインスタンスの分離管理ロジックの再設計
- deepEqualsベースの更新判定の再実装

**使用箇所**: 20+ 箇所
- Playground系: 3箇所
- Toolbar系: 9箇所
- Component系: 4箇所
- Controller系: 4箇所

**推奨アプローチ**:
```typescript
// 新実装案
// packages/editor/src/states/codemirror-editor.ts

type CodeMirrorEditorData = Map<string, UseCodeMirrorEditor>;

const codeMirrorEditorMapAtom = atom<CodeMirrorEditorData>(new Map());

// Derived atom for specific editor
const createEditorAtom = (key: string) => {
  return atom((get) => {
    const map = get(codeMirrorEditorMapAtom);
    return map.get(key) ?? null;
  });
};

// Hook pattern
export const useCodeMirrorEditor = (key: string | null) => {
  const setEditorMap = useSetAtom(codeMirrorEditorMapAtom);
  // ... implementation
};
```

#### 2. **useEditorSettings**
**移行メリット**:
- 複数のuseStateを統合してシンプルに
- 拡張機能の動的ロード状態を明確に管理
- 再レンダリング最適化
- コードの可読性向上

**移行課題**:
- 複数の拡張機能（theme、keymap等）の状態管理
- 動的import + キャッシングパターンの適用
- useEditorShortcutsとの統合検討

**使用箇所**: 2箇所
- `CodeMirrorEditor.tsx`
- `CodeMirrorEditorDiff.tsx`

**推奨アプローチ**:
```typescript
// packages/editor/src/states/editor-settings.ts

type EditorSettingsState = {
  styleActiveLine?: boolean;
  autoFormatMarkdownTable?: boolean;
  theme?: EditorTheme;
  keymapMode?: KeyMapMode;
};

const editorSettingsAtom = atom<EditorSettingsState>({});

// Individual derived atoms for each extension
const themeExtensionAtom = atom(async (get) => {
  const theme = get(editorSettingsAtom).theme;
  return theme ? await getEditorTheme(theme) : undefined;
});
```

#### 3. **useCollaborativeEditorMode**
**移行メリット**:
- WebSocket状態の明確な管理
- 複数のuseEffectをクリーンに整理
- 共同編集状態の可視化向上

**移行課題**:
- SocketIOProvider統合の複雑性
- useSecondaryYdocsへの依存（これはSWR維持推奨）
- WebSocketライフサイクル管理
- リアルタイム通信の状態管理

**使用箇所**: 1箇所のみ
- `CodeMirrorEditorMain.tsx`

**推奨**: `useSecondaryYdocs`との統合を考慮した設計が必要。  
影響範囲は小さいが、実装の複雑度は高い。

---

### 🟢 移行不要（現状維持推奨）

#### 1. **useEditorShortcuts**
**理由**:
- 状態を持たず、副作用のみ
- Jotai化してもしなくても影響は限定的
- カスタムフックのまま維持でも問題なし

**推奨**: 現状維持でOK（Jotai化の優先度低）

#### 2. **useDefaultExtensions**
**理由**:
- 状態を持たず、静的なExtension配列の適用のみ
- 使用箇所も2箇所のみ
- Jotai化する意味がない

**推奨**: 現状維持でOK（Jotai化不要）

---

## 📋 推奨移行戦略

### フェーズ1: 基盤整備（優先度：低）
1. ✅ 既存Jotai States（modal、ui）は完成済み
2. 📝 `packages/editor`固有のJotaiパターンドキュメント化
3. 📝 `apps/app`との統合ガイドライン策定

### フェーズ2: 段階的移行（優先度：中）
**実施条件**: リソースに余裕がある場合のみ

#### 推奨移行順序と工数見積もり

##### ステップ1: useEditorSettings（推定工数：2-3日）
- ✅ **影響範囲**: 小（2箇所のみ）
- ✅ **複雑度**: 中
- ✅ **リスク**: 低
- **作業内容**:
  - 複数のuseStateをJotai atomに統合
  - Dynamic Import + Cachingパターン適用
  - theme/keymap extensionの状態管理をatomに移行
- **期待効果**: コード整理、可読性向上

##### ステップ2: useCollaborativeEditorMode（推定工数：3-5日）
- ✅ **影響範囲**: 小（1箇所のみ）
- 🟡 **複雑度**: 高
- 🟡 **リスク**: 中
- **作業内容**:
  - WebSocket/SocketIOProvider状態のatom化
  - useSecondaryYdocs（SWR維持）との統合設計
  - リアルタイム編集状態の管理改善
- **期待効果**: 状態管理の明確化、デバッグ容易性向上

##### ステップ3: useCodeMirrorEditorIsolated（推定工数：5-7日）⭐
- 🔴 **影響範囲**: 大（20+箇所）
- 🟡 **複雑度**: 中
- 🔴 **リスク**: 中～高
- **作業内容**:
  - Map<string, UseCodeMirrorEditor>パターンでの実装
  - 段階的移行（後方互換フック提供）
  - 全使用箇所の更新（20+箇所）
  - 十分なテスト実施
- **期待効果**: パフォーマンス改善（最大）、useSWRStatic排除

**総工数見積もり**: 10-15日（フルタイム換算）

### フェーズ3: 維持（継続）
- **useSecondaryYdocs**: SWR維持（移行不要）
- **useEditorShortcuts**: 現状維持（移行不要）

---

## ✅ 追加調査完了

### 1. **useDefaultExtensions** ✅
- **実装**: 静的なExtension配列をappendExtensionsするだけ
- **状態**: なし（副作用のみ）
- **使用箇所**: 2箇所（CodeMirrorEditor.tsx、CodeMirrorEditorDiff.tsx）
- **複雑度**: 🟢 最低 - 設定適用のみ
- **Jotai化の必要性**: ❌ なし（状態を持たないため）
- **推奨**: 現状維持

### 2. **useCodeMirrorEditorIsolated** ✅
- **使用箇所**: 20箇所以上
  - Playground.tsx (2箇所)
  - CodeMirrorEditor.tsx (1箇所)
  - controller/* (4箇所)
  - Toolbar/* (9箇所)
  - CodeMirrorEditorMain.tsx (1箇所)
  - その他
- **影響範囲**: 🔴 大 - パッケージ全体に浸透
- **段階的移行**: 必須

### 3. **useCollaborativeEditorMode** ✅
- **使用箇所**: 1箇所のみ（CodeMirrorEditorMain.tsx）
- **影響範囲**: 🟢 小 - 限定的
- **依存**: useSecondaryYdocs（SWR維持推奨）
- **移行容易性**: 🟡 中 - 依存関係はシンプルだが、実装は複雑

### 4. **useEditorSettings** ✅
- **使用箇所**: 2箇所（CodeMirrorEditor.tsx、CodeMirrorEditorDiff.tsx）
- **影響範囲**: 🟢 小 - 限定的
- **移行容易性**: 🟡 中 - 複数のuseStateとuseEffectを整理
- **移行メリット**: 🟡 中 - コード整理とパフォーマンス改善

### 5. `packages/editor` ⇔ `apps/app` 連携 ✅
- **独立パッケージ**: `packages/editor`は独立したパッケージ
- **状態の分離**: `apps/app/src/states` と `packages/editor/src/states` は完全に分離
- **影響**: 移行は独立して実施可能、相互影響なし

---

## 🎯 結論と推奨事項

### 即座の移行は不要
- 既存のJotai実装（modal、ui）は完成しており、パターンも確立
- `stores/`配下のフックは複雑度が高く、SWRが適切に機能している箇所もある

### 段階的アプローチを推奨
1. **短期**: 現状維持、既存Jotai Statesの活用拡大
2. **中期**: useEditorSettings → useCodeMirrorEditorIsolated の順で移行検討
3. **長期**: useCollaborativeEditorModeの移行検討（useSecondaryYdocsはSWR維持）

### 移行判断の基準
- **パフォーマンス改善**: 再レンダリング最適化の効果が大きい
- **コード品質**: useSWRStatic等の不適切な使用を排除
- **保守性向上**: 状態管理の統一によるコードベースの一貫性
- **リソース**: 十分な開発リソースと検証期間の確保

### `apps/app` との関係
- `apps/app`のJotai移行は100%完了
- `packages/editor`は独立パッケージとして段階的に移行可能
- 両者のstatesディレクトリは明確に分離されており、影響は限定的

---

## 📚 参考情報

### 関連ドキュメント
- `apps-app-jotai-migration-progress.md` - apps/app移行完了レポート
- `apps-app-jotai-migration-guidelines.md` - 技術パターン・ベストプラクティス
- `apps-app-jotai-directory-structure.md` - ディレクトリ構造・命名規則
- `useSWRStatic-deprecation-plan.md` - useSWRStatic/useStaticSWR 廃止計画 ⭐ NEW

### 技術パターンの適用可能性
- ✅ Status/Actions分離パターン → 既に適用済み（modal）
- ✅ シンプルBooleanパターン → 既に適用済み（resolved-theme）
- 🟡 Dynamic Import + Cachingパターン → useEditorSettings に適用可能
- 🟡 Map操作パターン → useCodeMirrorEditorIsolated に適用可能
- 🔴 副作用統合パターン → useCollaborativeEditorMode に適用可能（高難度）

---

**結論**: `packages/editor`へのJotai導入は段階的に進めることを推奨。  
現時点では、既存のJotai実装（modal、ui）が安定しており、  
`stores/`配下の複雑なフックは**無理に移行する必要はない**。  
リソースと優先度に応じて、中期的に移行を検討する。
