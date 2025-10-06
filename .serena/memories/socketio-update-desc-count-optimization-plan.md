# UpdateDescCount イベント最適化計画

## 📋 分析サマリー

### 現状の問題
- **UpdateDescCount** イベントが **全クライアントへブロードキャスト** されている
- 他のSocket.IOイベントはすべて適切にルーム機能を使用しているが、このイベントだけが取り残されている
- 一括マイグレーション時に数千回のイベントが短時間で発生し、パフォーマンス問題を引き起こす

### 他イベントとの比較

| イベント名 | 配信範囲 | 実装方法 | 適切性 |
|-----------|---------|---------|--------|
| **UpdateDescCount** | ❌ 全ユーザー | `socket.emit()` | ❌ 不適切 |
| **S2cMessagePageUpdated** | ✅ ページ閲覧者のみ | `.in(page:${pageId})` | ✅ 適切 |
| **notificationUpdated** | ✅ 特定ユーザーのみ | `.in(user:${userId})` | ✅ 適切 |
| **YjsAwarenessStateSizeUpdated** | ✅ ページ閲覧者のみ | `.in(page:${pageId})` | ✅ 適切 |
| **YjsHasYdocsNewerThanLatestRevisionUpdated** | ✅ ページ閲覧者のみ | `.in(page:${pageId})` | ✅ 適切 |

---

## 🎯 最適化方針

### 推奨アプローチ: ルーム機能の導入

影響を受ける祖先ページを閲覧しているユーザーにのみイベントを配信する。

---

## 🔧 実装計画

### Phase 1: ルーム機能の導入

#### 1. `emitUpdateDescCount` メソッドの修正

**ファイル**: `apps/app/src/server/service/page/index.ts`

**現在の実装** (L3482-3486):
```typescript
private emitUpdateDescCount(data: UpdateDescCountRawData): void {
  const socket = this.crowi.socketIoService.getDefaultSocket();

  socket.emit(SocketEventName.UpdateDescCount, data);
}
```

**修正後**:
```typescript
private emitUpdateDescCount(data: UpdateDescCountRawData): void {
  const socket = this.crowi.socketIoService.getDefaultSocket();
  
  // 各祖先ページを閲覧しているユーザーにのみ配信
  Object.entries(data).forEach(([pageId, count]) => {
    socket
      .in(getRoomNameWithId(RoomPrefix.PAGE, pageId))
      .emit(SocketEventName.UpdateDescCount, { [pageId]: count });
  });
}
```

**必要なインポート追加**:
```typescript
import { RoomPrefix, getRoomNameWithId } from '~/server/service/socket-io/helper';
```

#### 2. クライアント側の修正は不要

クライアント側 (`apps/app/src/client/components/ItemsTree/ItemsTree.tsx`) は、データ構造が変わらないため修正不要。

---

### Phase 2 (オプション): 一括処理時の最適化

一括マイグレーションなど、大量のページを処理する場合にイベント送信を抑制するオプションを追加。

#### `updateDescendantCountOfAncestors` メソッドの修正

**ファイル**: `apps/app/src/server/service/page/index.ts`

**修正後**:
```typescript
async updateDescendantCountOfAncestors(
  pageId: ObjectIdLike, 
  inc: number, 
  shouldIncludeTarget: boolean,
  suppressEmit: boolean = false  // 新規パラメータ
): Promise<void> {
  const Page = mongoose.model<IPage, PageModel>('Page');
  const ancestors = await Page.findAncestorsUsingParentRecursively(pageId, shouldIncludeTarget);
  const ancestorPageIds = ancestors.map(p => p._id);

  await Page.incrementDescendantCountOfPageIds(ancestorPageIds, inc);

  if (!suppressEmit) {
    const updateDescCountData: UpdateDescCountRawData = Object.fromEntries(ancestors.map(p => [p._id.toString(), p.descendantCount + inc]));
    this.emitUpdateDescCount(updateDescCountData);
  }
}
```

#### 一括処理での使用例

`normalizeParentRecursivelySubOperation` メソッド内で:
```typescript
await this.updateDescendantCountOfAncestors(page._id, inc, false, true); // suppressEmit: true
```

---

## 📊 期待される効果

### Phase 1 実装後

#### 通常操作の場合
- **Before**: 全クライアント（例: 100人）に配信 → 100回のクライアント処理
- **After**: 関連ページ閲覧者のみ（例: 3人）に配信 → 3回のクライアント処理
- **削減率**: 97%

#### 一括マイグレーション（5,000ページ）の場合
- **Before**: 5,000回 × 100クライアント = 500,000回のクライアント処理
- **After**: 5,000回 × 平均3クライアント = 15,000回のクライアント処理
- **削減率**: 97%

### Phase 2 実装後（一括処理時）

- **Before**: 5,000回のSocket.IO emit
- **After**: 0回のSocket.IO emit（suppressEmit: true）
- **削減率**: 100%

---

## ✅ テスト項目

### 機能テスト

1. **ページ作成**
   - [ ] 作成したページの祖先ページを閲覧しているユーザーにのみイベントが届く
   - [ ] 無関係なページを閲覧しているユーザーにはイベントが届かない
   - [ ] CountBadgeが正しく更新される

2. **ページ削除**
   - [ ] 削除したページの祖先ページを閲覧しているユーザーにのみイベントが届く
   - [ ] CountBadgeが正しく減少する

3. **ページ移動**
   - [ ] 移動元と移動先の祖先ページを閲覧しているユーザーにイベントが届く
   - [ ] 両方のCountBadgeが正しく更新される

4. **複数タブでの動作**
   - [ ] 同じページを複数タブで開いている場合、すべてのタブで更新される
   - [ ] 異なるページを開いているタブでは、関連するページのみ更新される

---

## 🎯 実装優先度

### 高優先度: Phase 1（ルーム機能の導入）

- **実装難易度**: 低
- **影響範囲**: 限定的
- **効果**: 大（97%削減）
- **リスク**: 低
- **推奨**: すぐに実装すべき

### 中優先度: Phase 2（一括処理時の最適化）

- **実装難易度**: 中
- **影響範囲**: 中（一括処理のみ）
- **効果**: 大（一括処理時のみ）
- **リスク**: 低（suppressEmitフラグで制御）
- **推奨**: Phase 1完了後、必要に応じて実装

---

## 📚 参考実装

### 正しいルーム使用の例

**S2cMessagePageUpdated** (`apps/app/src/server/service/system-events/sync-page-status.ts`):
```typescript
socketIoService.getDefaultSocket()
  .in(getRoomNameWithId(RoomPrefix.PAGE, page._id))
  .except(getRoomNameWithId(RoomPrefix.USER, user._id))
  .emit('page:update', { s2cMessagePageUpdated });
```

**notificationUpdated** (`apps/app/src/server/service/in-app-notification.ts`):
```typescript
this.socketIoService.getDefaultSocket()
  .in(getRoomNameWithId(RoomPrefix.USER, userId))
  .emit('notificationUpdated');
```

---

## 💡 まとめ

### 推奨アクション

1. **Phase 1を優先実装**
   - ルーム機能の導入により、97%のパフォーマンス改善が期待できる
   - リアルタイム性を維持
   - リスクが低い

2. **Phase 2は状況に応じて**
   - 一括マイグレーションが頻繁に発生する場合のみ実装
   - Phase 1で十分な効果が得られる可能性が高い

3. **他のイベントとの整合性**
   - UpdateDescCountを修正することで、すべてのSocket.IOイベントが適切にルーム機能を使用する統一された実装になる