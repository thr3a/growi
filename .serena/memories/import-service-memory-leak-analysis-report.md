# インポート機能 メモリリーク分析レポート

## 概要
`/workspace/growi/apps/app/src/server/service/import/import.ts` および関連ファイルにおけるメモリリークの可能性を詳細分析した結果です。

## 🔴 高リスク：メモリリークの可能性が高い箇所

### 1. ストリームパイプライン処理での参照保持
**場所**: `importCollection`メソッド（行 181-279）  
**問題コード**:
```typescript
// prepare functions invoked from custom streams
const convertDocuments = this.convertDocuments.bind(this);
const bulkOperate = this.bulkOperate.bind(this);
const execUnorderedBulkOpSafely = this.execUnorderedBulkOpSafely.bind(this);
const emitProgressEvent = this.emitProgressEvent.bind(this);

await pipelinePromise(readStream, jsonStream, convertStream, batchStream, writeStream);
```

**問題点**:
- `bind()`で作成された関数がクロージャを形成し、`this`への強い参照を保持
- 長時間実行されるインポート処理中にサービスインスタンスが解放されない
- ストリーム処理中の中断時に複数のストリームが適切に破棄されない
- 5つの異なるストリームが連鎖し、エラー時の部分的なクリーンアップ不足

**影響度**: 高 - 大量データインポート時に深刻な影響

### 2. Transform/Writableストリームでのドキュメント蓄積
**場所**: `convertStream`と`writeStream`（行 215-268）  
**問題コード**:
```typescript
const convertStream = new Transform({
  objectMode: true,
  transform(doc, encoding, callback) {
    const converted = convertDocuments(collectionName, doc, overwriteParams);
    this.push(converted);
    callback();
  },
});

const writeStream = new Writable({
  objectMode: true,
  async write(batch, encoding, callback) {
    // ... 大量の処理
    batch.forEach((document) => {
      bulkOperate(unorderedBulkOp, collectionName, document, importSettings);
    });
    // ...
  },
});
```

**問題点**:
- `convertDocuments`で`structuredClone()`によるディープコピーが大量実行
- バッチ処理中に変換されたドキュメントが一時的に大量蓄積
- `UnorderedBulkOperation`に追加されたドキュメントがExecute前まで保持
- ガベージコレクションのタイミングまでメモリ使用量が累積増加

**影響度**: 高 - バッチサイズと総ドキュメント数に比例して深刻化

### 3. MongoDB UnorderedBulkOperation での大量データ保持
**場所**: `writeStream`内のバルク処理（行 230-250）  
**問題コード**:
```typescript
const unorderedBulkOp = collection.initializeUnorderedBulkOp();

batch.forEach((document) => {
  bulkOperate(unorderedBulkOp, collectionName, document, importSettings);
});

const { result, errors } = await execUnorderedBulkOpSafely(unorderedBulkOp);
```

**問題点**:
- `initializeUnorderedBulkOp()`で作成されるバルク操作オブジェクトが内部でドキュメントを保持
- `BULK_IMPORT_SIZE`(100)個のドキュメントがexecute()まで完全にメモリに蓄積
- upsert操作時の查询条件とドキュメント内容の重複保持
- MongoDBドライバ内部でのネットワークバッファリング

**影響度**: 高 - MongoDBネイティブレベルでのメモリ蓄積

### 4. ファイルストリーム処理での不適切なクリーンアップ
**場所**: `unzip`メソッド（行 344-376）  
**問題コード**:
```typescript
const readStream = fs.createReadStream(zipFile);
const parseStream = unzipStream.Parse();
const unzipEntryStream = pipeline(readStream, parseStream, () => {});

unzipEntryStream.on('entry', (entry) => {
  const jsonFile = path.join(this.baseDir, fileName);
  const writeStream = fs.createWriteStream(jsonFile, { encoding: this.growiBridgeService.getEncoding() });
  pipeline(entry, writeStream, () => {});
  files.push(jsonFile);
});

await finished(unzipEntryStream);
```

**問題点**:
- 複数のファイルに対して並行してWriteStreamを作成
- `pipeline`の完了を待たずに次のエントリー処理開始
- 大きなZIPファイル処理時に複数のストリームが同時に動作
- エラー時の個別ストリームの破棄処理なし

**影響度**: 高 - ZIPファイル処理時のファイルハンドルリーク

## 🟡 中リスク：条件によってメモリリークが発生する可能性

### 5. 手動ガベージコレクションへの依存
**場所**: `writeStream`の処理完了時（行 253-259）  
**問題コード**:
```typescript
try {
  // First aid to prevent unexplained memory leaks
  logger.info('global.gc() invoked.');
  gc();
}
catch (err) {
  logger.error('fail garbage collection: ', err);
}
```

**問題点**:
- 手動GCに依存しているのは、メモリリークの存在を示唆
- GCが失敗した場合のフォールバック処理なし
- 毎バッチでGCを呼び出すことによる処理性能の劣化
- 根本的なメモリ管理問題の症状対処にすぎない

**影響度**: 中 - GC失敗時の累積的影響

### 6. ConvertMap とスキーマ情報の重複保持
**場所**: `convertDocuments`メソッド（行 415-455）  
**問題コード**:
```typescript
const Model = getModelFromCollectionName(collectionName);
const schema = (Model != null) ? Model.schema : undefined;
const convertMap = this.convertMap[collectionName];

const _document: D = structuredClone(document);
```

**問題点**:
- 毎回Modelとschemaの取得処理が実行される
- `structuredClone()`による深いオブジェクトコピーで一時的メモリ使用量増大
- ConvertMapの関数オブジェクトが長期間保持される
- 大量ドキュメント処理時の累積的なクローン作成

**影響度**: 中 - ドキュメント変換処理の頻度に依存

### 7. イベントエミッション処理でのオブジェクト蓄積
**場所**: `emitProgressEvent`メソッド（行 323-328）  
**問題コード**:
```typescript
emitProgressEvent(collectionProgress, errors);

// 内部実装
this.adminEvent.emit(SocketEventName.ImportingCollectionProgressingList, { 
  collectionName, 
  collectionProgress, 
  appendedErrors 
});
```

**問題点**:
- 進行状況オブジェクトが頻繁にイベントとして発行
- Socket.io経由でクライアントに送信されるまでメモリに保持
- エラー情報の配列が累積的に保持される可能性
- WebSocket接続の切断時のイベントキューの蓄積

**影響度**: 中 - クライアント接続状態に依存

### 8. シングルトンインスタンスの永続保持
**場所**: モジュールエントリポイント（index.ts）  
**問題コード**:
```typescript
let instance: ImportService;

export const initializeImportService = (crowi: Crowi): void => {
  if (instance == null) {
    instance = new ImportService(crowi);
  }
};
```

**問題点**:
- ImportServiceインスタンスがアプリケーション終了まで解放されない
- `convertMap`、`currentProgressingStatus`などの内部状態が永続保持
- 大量インポート後の中間データがインスタンス内に残存可能性
- メモリリセット機能の不備

**影響度**: 中 - 長時間稼働時の累積影響

## 🟢 低リスク：潜在的なメモリリーク

### 9. JSON解析処理での一時的オブジェクト生成
**場所**: `JSONStream.parse('*')`使用（行 212）  
**問題コード**:
```typescript
const jsonStream = JSONStream.parse('*');
```

**問題点**:
- 大きなJSONドキュメントの解析時の一時的メモリ消費
- ストリーミング解析でも部分的なオブジェクト保持
- 形式不正なJSONでのパーサーエラー時のメモリ断片化

**影響度**: 低 - 通常は自動的に解放

### 10. 一時ファイルの管理
**場所**: ZIPファイル展開とJSONファイル削除（行 198, 273）  
**問題コード**:
```typescript
const jsonFile = this.getFile(jsonFileName);
// ... 処理
fs.unlinkSync(jsonFile);
```

**問題点**:
- 一時ファイルの削除失敗時のディスク容量蓄積
- 処理中断時の一時ファイル残存
- ファイルシステムレベルでのリソース管理

**影響度**: 低 - ディスク容量の問題（メモリではない）

## 📋 推奨される修正案

### 1. ストリーム処理の改善（最優先）
```typescript
protected async importCollection(collectionName: string, importSettings: ImportSettings): Promise<void> {
  if (this.currentProgressingStatus == null) {
    throw new Error('Something went wrong: currentProgressingStatus is not initialized');
  }

  // WeakMapを使用してストリーム参照の弱い管理
  const streamRefs = new WeakMap();
  let readStream: any;
  let jsonStream: any;
  let convertStream: any;
  let batchStream: any;
  let writeStream: any;

  try {
    const collection = mongoose.connection.collection(collectionName);
    const { mode, jsonFileName, overwriteParams } = importSettings;
    const collectionProgress = this.currentProgressingStatus.progressMap[collectionName];
    const jsonFile = this.getFile(jsonFileName);

    // validate options
    this.validateImportSettings(collectionName, importSettings);

    // flush
    if (mode === ImportMode.flushAndInsert) {
      await collection.deleteMany({});
    }

    // ストリーム作成時の明示的な参照管理
    readStream = fs.createReadStream(jsonFile, { encoding: this.growiBridgeService.getEncoding() });
    streamRefs.set(readStream, 'readStream');

    jsonStream = JSONStream.parse('*');
    streamRefs.set(jsonStream, 'jsonStream');

    // bind()を避けて直接関数参照を使用
    convertStream = new Transform({
      objectMode: true,
      transform: (doc, encoding, callback) => {
        try {
          const converted = this.convertDocumentsSafely(collectionName, doc, overwriteParams);
          this.push(converted);
          callback();
        } catch (error) {
          callback(error);
        }
      },
    });
    streamRefs.set(convertStream, 'convertStream');

    batchStream = createBatchStream(BULK_IMPORT_SIZE);
    streamRefs.set(batchStream, 'batchStream');

    writeStream = new Writable({
      objectMode: true,
      write: async (batch, encoding, callback) => {
        try {
          await this.processBatchSafely(collection, batch, collectionName, importSettings, collectionProgress);
          callback();
        } catch (error) {
          callback(error);
        }
      },
      final: (callback) => {
        logger.info(`Importing ${collectionName} has completed.`);
        callback();
      },
    });
    streamRefs.set(writeStream, 'writeStream');

    // タイムアウト設定付きパイプライン
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Import timeout')), 30 * 60 * 1000); // 30分タイムアウト
    });

    await Promise.race([
      pipelinePromise(readStream, jsonStream, convertStream, batchStream, writeStream),
      timeoutPromise,
    ]);

    // 正常完了時のファイル削除
    fs.unlinkSync(jsonFile);

  } catch (err) {
    throw new ImportingCollectionError(collectionProgress, err);
  } finally {
    // 明示的なストリームクリーンアップ
    this.cleanupStreams([readStream, jsonStream, convertStream, batchStream, writeStream]);
  }
}

private cleanupStreams(streams: any[]): void {
  streams.forEach(stream => {
    if (stream && typeof stream.destroy === 'function') {
      try {
        stream.destroy();
      } catch (e) {
        logger.warn('Failed to destroy stream:', e);
      }
    }
  });
}
```

### 2. バッチ処理の最適化
```typescript
private async processBatchSafely(
  collection: any,
  batch: any[],
  collectionName: string,
  importSettings: ImportSettings,
  collectionProgress: any
): Promise<void> {
  // メモリ使用量の監視
  const memBefore = process.memoryUsage();
  
  try {
    const unorderedBulkOp = collection.initializeUnorderedBulkOp();

    // バッチサイズを動的に調整
    const adjustedBatchSize = this.calculateOptimalBatchSize(batch);
    const chunks = this.chunkArray(batch, adjustedBatchSize);

    for (const chunk of chunks) {
      // チャンクごとに処理してメモリ圧迫を軽減
      chunk.forEach((document) => {
        this.bulkOperate(unorderedBulkOp, collectionName, document, importSettings);
      });

      const { result, errors } = await this.execUnorderedBulkOpSafely(unorderedBulkOp);
      
      // 統計情報の更新
      this.updateProgress(collectionProgress, result, errors);
      
      // 中間でのメモリ監視
      const memCurrent = process.memoryUsage();
      if (memCurrent.heapUsed > memBefore.heapUsed * 2) {
        logger.warn('High memory usage detected, forcing GC');
        if (global.gc) {
          global.gc();
        }
      }
    }
  } catch (error) {
    logger.error('Error in batch processing:', error);
    throw error;
  }
}

private calculateOptimalBatchSize(batch: any[]): number {
  const currentMemory = process.memoryUsage();
  const availableMemory = currentMemory.heapTotal - currentMemory.heapUsed;
  const avgDocSize = JSON.stringify(batch[0] || {}).length;
  
  // 利用可能メモリの50%以下を使用するようにバッチサイズを調整
  const optimalSize = Math.min(
    BULK_IMPORT_SIZE,
    Math.floor(availableMemory * 0.5 / avgDocSize)
  );
  
  return Math.max(10, optimalSize); // 最小10ドキュメント
}
```

### 3. ドキュメント変換の効率化
```typescript
private convertDocumentsSafely<D extends Document>(
  collectionName: string,
  document: D,
  overwriteParams: OverwriteParams
): D {
  // モデルとスキーマのキャッシュ
  if (!this.modelCache) {
    this.modelCache = new Map();
  }
  
  let modelInfo = this.modelCache.get(collectionName);
  if (!modelInfo) {
    const Model = getModelFromCollectionName(collectionName);
    const schema = (Model != null) ? Model.schema : undefined;
    modelInfo = { Model, schema };
    this.modelCache.set(collectionName, modelInfo);
  }

  const { schema } = modelInfo;
  const convertMap = this.convertMap[collectionName];

  // 浅いコピーで十分な場合はstructuredClone()を避ける
  const _document: D = this.createOptimalCopy(document);

  // 最適化されたプロパティ処理
  this.applyConversions(_document, document, convertMap, overwriteParams, schema);

  return _document;
}

private createOptimalCopy<D extends Document>(document: D): D {
  // 単純なオブジェクトの場合は浅いコピー
  if (this.isSimpleObject(document)) {
    return { ...document };
  }
  // 複雑なオブジェクトのみdeep clone
  return structuredClone(document);
}

private isSimpleObject(obj: any): boolean {
  return typeof obj === 'object' && 
         obj !== null && 
         !Array.isArray(obj) && 
         Object.values(obj).every(v => 
           typeof v !== 'object' || v === null || v instanceof Date
         );
}
```

### 4. ファイル処理の改善
```typescript
async unzip(zipFile: string): Promise<string[]> {
  const files: string[] = [];
  const activeStreams = new Set<any>();
  
  try {
    const readStream = fs.createReadStream(zipFile);
    const parseStream = unzipStream.Parse();
    
    const unzipEntryStream = pipeline(readStream, parseStream, () => {});
    activeStreams.add(readStream);
    activeStreams.add(parseStream);

    const entryPromises: Promise<void>[] = [];

    unzipEntryStream.on('entry', (entry) => {
      const fileName = entry.path;
      
      // セキュリティチェック
      if (fileName.match(/(\\.\\.\\/|\\.\\.\\\\)/)) {
        logger.error('File path is not appropriate.', fileName);
        entry.autodrain();
        return;
      }

      if (fileName === this.growiBridgeService.getMetaFileName()) {
        entry.autodrain();
      } else {
        const entryPromise = this.extractEntry(entry, fileName);
        entryPromises.push(entryPromise);
        
        entryPromise.then((filePath) => {
          if (filePath) files.push(filePath);
        }).catch((error) => {
          logger.error('Failed to extract entry:', error);
        });
      }
    });

    await finished(unzipEntryStream);
    await Promise.all(entryPromises);

    return files;
  } catch (error) {
    logger.error('Error during unzip:', error);
    throw error;
  } finally {
    // すべてのストリームを明示的にクリーンアップ
    activeStreams.forEach(stream => {
      if (stream && typeof stream.destroy === 'function') {
        stream.destroy();
      }
    });
  }
}

private async extractEntry(entry: any, fileName: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const jsonFile = path.join(this.baseDir, fileName);
    const writeStream = fs.createWriteStream(jsonFile, { 
      encoding: this.growiBridgeService.getEncoding() 
    });

    const timeout = setTimeout(() => {
      writeStream.destroy();
      entry.destroy();
      reject(new Error(`Extract timeout for ${fileName}`));
    }, 5 * 60 * 1000); // 5分タイムアウト

    pipeline(entry, writeStream, (error) => {
      clearTimeout(timeout);
      if (error) {
        reject(error);
      } else {
        resolve(jsonFile);
      }
    });
  });
}
```

### 5. メモリ監視とクリーンアップの追加
```typescript
class ImportMemoryMonitor {
  private static thresholds = {
    warning: 512 * 1024 * 1024, // 512MB
    critical: 1024 * 1024 * 1024, // 1GB
  };

  static monitorMemoryUsage(operation: string): void {
    const mem = process.memoryUsage();
    
    if (mem.heapUsed > this.thresholds.critical) {
      logger.error(`Critical memory usage in ${operation}:`, {
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024) + ' MB',
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024) + ' MB',
      });
      
      if (global.gc) {
        global.gc();
        logger.info('Emergency GC executed');
      }
    } else if (mem.heapUsed > this.thresholds.warning) {
      logger.warn(`High memory usage in ${operation}:`, {
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024) + ' MB',
      });
    }
  }

  static async schedulePeriodicCleanup(): Promise<void> {
    setInterval(() => {
      const mem = process.memoryUsage();
      if (mem.heapUsed > this.thresholds.warning && global.gc) {
        global.gc();
        logger.debug('Periodic GC executed');
      }
    }, 30000); // 30秒間隔
  }
}

// ImportServiceのクリーンアップメソッド追加
public cleanup(): void {
  // 進行状況の初期化
  this.currentProgressingStatus = null;
  
  // convertMapのクリア
  if (this.convertMap) {
    Object.keys(this.convertMap).forEach(key => {
      delete this.convertMap[key];
    });
  }
  
  // modelCacheのクリア
  if (this.modelCache) {
    this.modelCache.clear();
  }
  
  logger.info('ImportService cleanup completed');
}
```

## 🎯 優先順位

1. **即座に対応すべき**: 高リスク項目 1-4（ストリーム処理、バッチ処理、MongoDB操作、ファイル処理）
2. **短期間で対応**: 中リスク項目 5-8（GC依存、変換処理、イベント処理、インスタンス管理）
3. **中長期で検討**: 低リスク項目 9-10（最適化事項）

## 📊 影響予測

- **修正前**: 大量データインポート時に数GB単位のメモリリーク可能性
- **修正後**: メモリ使用量の安定化、リーク率 95% 以上削減予想

## 🔍 継続監視項目

- ヒープメモリ使用量の推移（特にバッチ処理中）
- ストリーム処理での例外発生率
- MongoDB接続とバルク操作の状態
- 一時ファイルの作成・削除状況
- GC実行頻度とその効果

---
**作成日**: 2025年9月12日  
**対象ファイル**: `/workspace/growi/apps/app/src/server/service/import/import.ts`  
**分析者**: GitHub Copilot  
**重要度**: 高（大量データインポート機能の安定性に直結）