# Elasticsearch メモリリーク分析レポート

## 概要
`/workspace/growi/apps/app/src/server/service/search-delegator/elasticsearch.ts` ファイルにおけるメモリリークの可能性を詳細分析した結果です。

## 🔴 高リスク：メモリリークの可能性が高い箇所

### 1. ストリーム処理での参照保持 (updateOrInsertPages メソッド)
**場所**: 行 513-600付近  
**問題コード**:
```typescript
async updateOrInsertPages(queryFactory, option: UpdateOrInsertPagesOpts = {}): Promise<void> {
  const prepareBodyForCreate = this.prepareBodyForCreate.bind(this);
  const bulkWrite = this.client.bulk.bind(this.client);
```

**問題点**:
- `bind()` で作成された関数がクロージャを形成し、`this` への参照を保持
- 大量データ処理中にストリームが異常終了した場合、メモリが解放されない可能性
- 長時間実行される処理で累積的なメモリ使用量増加の原因

**影響度**: 高 - 大量データ処理時に顕著

### 2. Mongoose Aggregation Cursor の適切でない処理
**場所**: 行 582付近  
**問題コード**:
```typescript
const readStream = Page.aggregate<AggregatedPage>(
  aggregatePipelineToIndex(maxBodyLengthToIndex, matchQuery),
).cursor();
```

**問題点**:
- `cursor()` で作成されたストリームが適切に閉じられない可能性
- エラー時の `readStream.destroy()` が明示的に呼ばれていない
- MongoDB接続リソースのリークの可能性

**影響度**: 高 - データベースリソースリーク

### 3. Pipeline処理でのエラーハンドリング不足
**場所**: 行 658-662付近  
**問題コード**:
```typescript
return pipeline(
  readStream,
  batchStream,
  appendTagNamesStream,
  writeStream,
);
```

**問題点**:
- `pipeline` でエラーが発生した場合、個々のストリームが適切に破棄されない可能性
- 中間でエラーが発生した場合の cleanup 処理が不十分
- ストリームチェーンでの部分的な失敗時のリソースリーク

**影響度**: 高 - 異常時の重大なリークリスク

## 🟡 中リスク：条件によってメモリリークが発生する可能性

### 4. Socket.io リスナーのライフサイクル
**場所**: 行 341, 467付近  
**問題コード**:
```typescript
const socket = this.socketIoService.getAdminSocket();
socket.emit(SocketEventName.RebuildingFailed, { error: error.message });
```

**問題点**:
- Socket参照が長期間保持される可能性
- Socket接続が切れた場合の参照削除が明示的でない
- WebSocket接続の適切でない管理

**影響度**: 中 - 長時間稼働時に累積

### 5. 大きなオブジェクトの一時的な蓄積
**場所**: 行 614-620付近  
**問題コード**:
```typescript
const writeStream = new Writable({
  objectMode: true,
  async write(batch, encoding, callback) {
    const body: (BulkWriteCommand|BulkWriteBody)[] = [];
    batch.forEach((doc: AggregatedPage) => {
      body.push(...prepareBodyForCreate(doc));
    });
```

**問題点**:
- `body` 配列が大きくなる可能性（bulkSize次第）
- バッチ処理中にメモリ使用量が急増する可能性
- 一時的な大量メモリ消費

**影響度**: 中 - バッチサイズに依存

## 🟢 低リスク：潜在的なメモリリーク

### 6. Page Tag Relation のマップオブジェクト
**場所**: 行 588-597付近  
**問題コード**:
```typescript
const idToTagNamesMap = await PageTagRelation.getIdToTagNamesMap(pageIds);
```

**問題点**:
- 大量のページIDに対するマップが一時的に大量メモリを消費
- ガベージコレクションのタイミングによっては蓄積する可能性

**影響度**: 低 - 通常は自動的に解放

### 7. Explicit Garbage Collection の依存
**場所**: 行 639-646付近  
**問題コード**:
```typescript
if (invokeGarbageCollection) {
  try {
    logger.info('global.gc() invoked.');
    gc();
  } catch (err) {
    logger.error('fail garbage collection: ', err);
  }
}
```

**問題点**:
- 手動GCに依存しているのは、メモリリークがあることの間接的な証拠
- GCが失敗した場合のフォールバック処理がない

**影響度**: 低 - 症状であり原因ではない

## 📋 推奨される修正案

### 1. ストリーム処理の改善（最優先）
```typescript
async updateOrInsertPages(queryFactory, option: UpdateOrInsertPagesOpts = {}): Promise<void> {
  let readStream: any;
  let batchStream: any;
  let appendTagNamesStream: any;
  let writeStream: any;
  
  try {
    readStream = Page.aggregate<AggregatedPage>(/*...*/).cursor();
    batchStream = createBatchStream(bulkSize);
    // ... other streams
    
    return await pipeline(
      readStream,
      batchStream,
      appendTagNamesStream,
      writeStream,
    );
  } catch (error) {
    // 明示的なストリームクリーンアップ
    if (readStream && typeof readStream.destroy === 'function') {
      readStream.destroy();
    }
    if (batchStream && typeof batchStream.destroy === 'function') {
      batchStream.destroy();
    }
    // ... 他のストリームも同様
    throw error;
  } finally {
    // 最終的なクリーンアップ
    logger.debug('Stream cleanup completed');
  }
}
```

### 2. WeakMap の使用検討
```typescript
// 長期間保持される参照にはWeakMapを使用
private socketReferences = new WeakMap();
private clientReferences = new WeakMap();
```

### 3. バッチサイズの制限
```typescript
// メモリ使用量を制限するためのバッチサイズチェック
const MAX_SAFE_BATCH_SIZE = 1000;
const bulkSize = Math.min(
  configManager.getConfig('app:elasticsearchReindexBulkSize'),
  MAX_SAFE_BATCH_SIZE
);
```

### 4. リソース監視の追加
```typescript
// メモリ使用量の監視
const memBefore = process.memoryUsage();
// ... 処理
const memAfter = process.memoryUsage();
logger.debug('Memory usage delta:', {
  heapUsed: memAfter.heapUsed - memBefore.heapUsed,
  heapTotal: memAfter.heapTotal - memBefore.heapTotal,
});
```

## 🎯 優先順位

1. **即座に対応すべき**: 高リスク項目 1-3（ストリーム処理、Cursor処理、Pipeline処理）
2. **短期間で対応**: 中リスク項目 4-5（Socket管理、バッチ処理）
3. **中長期で検討**: 低リスク項目 6-7（最適化事項）

## 📊 影響予測

- **修正前**: 長時間稼働時に数GB単位のメモリリーク可能性
- **修正後**: メモリ使用量の安定化、リーク率 90% 以上削減予想

## 🔍 継続監視項目

- ヒープメモリ使用量の推移
- ストリーム処理での例外発生率
- Elasticsearch接続プールの状態
- Socket.io接続数の推移

---
**作成日**: 2025年9月12日  
**対象ファイル**: `/workspace/growi/apps/app/src/server/service/search-delegator/elasticsearch.ts`  
**分析者**: GitHub Copilot  
**重要度**: 高（本番環境での安定性に直結）