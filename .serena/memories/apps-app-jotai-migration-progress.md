# Jotai 移行進捗管理

## 📊 現在の進捗サマリー

### 🎯 **移行完了ステータス**
- **総移行完了数**: **45個のフック・状態**
- **完了カテゴリ**: 6つの主要カテゴリ完全移行済み

| カテゴリ | 完了数 | ステータス |
|---------|--------|-----------|
| モーダル状態 | 17個 | ✅ 100%完了 |
| デバイス状態 | 4個 | ✅ Phase 1完了 |
| TOC状態 | 4個 | ✅ 完全完了 |
| 無題ページ状態 | 2個 | ✅ 完全完了 |
| ページ権限判定状態 | 5個 | ✅ 完全完了（Derived Atom 3個 + Direct Hook 2個） |
| useContextSWR系・機能別states | 9個 | ✅ 完全完了 |
| 基本Jotai状態管理 | 4個 | ✅ 完全完了 |

### 🏆 **主要な技術成果**
1. **パフォーマンス向上**: Derived Atom、Bundle Splitting、自動メモ化
2. **統一されたAPIパターン**: 10種類の実装パターン確立
3. **型安全性**: TypeScript完全対応、全型チェック成功
4. **責務分離**: 機能別statesディレクトリ、server-configurations直接化
5. **複雑状態管理**: Map・Set等の効率的なJotai管理パターン確立

## 🔮 今後の発展可能性

### 次のフェーズ候補（Phase 4）
1. **残存SWRフック検討**: `stores/editor.tsx`等の残存SWR使用箇所調査
   - `useCurrentIndentSize`, `useEditorSettings`, `usePageTagsForEditors` 等
2. **AI機能のモーダル**: OpenAI関連の追加モーダル状態の統合検討
3. **エディタパッケージ統合**: `@growi/editor`内のモーダル状態の統合
4. **他モジュールへのDerived Atom適用**: 複雑な計算ロジックを持つ他のフックの調査・移行
5. **レガシーSWRクリーンアップ**: データフェッチ系以外のSWR使用箇所の整理

### クリーンアップ候補
- **完了済み**: `stores/modal.tsx`、`stores/ui.tsx`、`stores-universal/context.tsx`（一部）、`stores/use-static-swr.ts` 完全削除済み
- **残存調査対象**: `stores/editor.tsx`, `stores/user.tsx`, `stores/page.tsx`, `stores/comment.tsx`等

## 🔄 最新の更新履歴

### 2025-09-25: 🎉 **基本Jotai状態管理移行完全完了！**
- useUnsavedWarning, useCommentEditorsDirtyMap 移行完了（副作用統合パターン）
- usePageTreeDescCountMap, usePageTreeDescCountMapAction 移行完了（複雑状態管理パターン）
- Map操作最適化、useCallback参照安定化、Router event integration確立

### 2025-09-25: 🎉 **useContextSWR系・機能別states移行完全完了！**
- OpenAI専用states作成（features/openai/client/states/）
- useIsEnableUnifiedMergeView のJotai移行＋Actions Pattern確立
- server-configurations直接Atom化（wrapper hook削除、一貫性向上）
- 不要フック・ファイル削除（useIsBlinkedHeaderAtBoot, useCustomizeTitle, use-static-swr.ts）

### 2025-09-25: 🎉 **ページ権限判定状態移行完全完了！**
- 高パフォーマンスDerived Atom移行3フック + Direct Hook維持2フック
- 特殊名Export方式（`_atomsForDerivedAbilities`）の確立
- Derived Atom採用ガイドライン策定
- stores/ui.tsx 完全削除完了

### 2025-09-11: **TOC状態・無題ページ状態移行完了**
- RefObjectパターン、Dynamic Import、シンプルBoolean状態パターン確立

### 2025-09-05: **モーダル移行プロジェクト100%完了**
- 全17個のモーダルがJotaiベースに統一
- パフォーマンス最適化パターン全適用完了

## 🎯 確立された技術ベストプラクティス

### 最重要パターン
1. **特殊名Export方式 + Derived Atom採用判断**: 複雑度・使用頻度による最適化戦略
2. **機能別states分離 + server-configurations直接化**: 責務明確化と軽量化
3. **複雑状態管理 + 副作用統合パターン**: Map・Set管理とRouter integration

### 移行判断基準
- **高複雑度・高使用頻度**: Derived Atom化（⭐⭐⭐）
- **中複雑度・中使用頻度**: Derived Atom化（⭐⭐）
- **低複雑度・低使用頻度**: Direct Hook維持（⭐）
- **データフェッチ系**: SWR維持
- **サーバー設定系**: 直接atom使用
- **機能専用**: 専用statesディレクトリ作成

## 📋 次回移行時の準備事項

### 事前調査項目
1. **SWR使用箇所の分類**: データフェッチ vs 状態管理
2. **複雑度評価**: 依存関係の数・計算コスト
3. **使用頻度調査**: レンダリング回数・共有度
4. **既存atom確認**: 新規実装 vs 既存atom活用

### 移行優先順位
1. **useContextSWR系** → server-configurations直接化
2. **useSWRStatic系** → Jotaiベース状態管理
3. **複雑計算フック** → Derived Atom化
4. **機能専用状態** → 専用statesディレクトリ