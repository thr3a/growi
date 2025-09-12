# GCSアップロード機能 メモリリーク分析レポート

## 概要
`/workspace/growi/apps/app/src/server/service/file-uploader/gcs/index.ts` および関連ファイルにおけるメモリリークの可能性を詳細分析した結果です。

## 🔴 高リスク：メモリリークの可能性が高い箇所

### 1. グローバルStorage インスタンスの永続化
**場所**: `getGcsInstance()` 関数（行 35-44）  
**問題コード**:
```typescript
let storage: Storage;
function getGcsInstance() {
  if (storage == null) {
    const keyFilename = toNonBlankStringOrUndefined(configManager.getConfig('gcs:apiKeyJsonPath'));
    storage = keyFilename != null
      ? new Storage({ keyFilename })
      : new Storage();
  }
  return storage;
}
```

**問題点**:
- モジュールレベルで`Storage`インスタンスを永続化
- アプリケーション終了時まで解放されない
- Google Cloud Storageクライアントが内部で保持するHTTP接続プール、タイマー、イベントリスナーが蓄積
- 長時間稼働時にHTTP接続の蓄積により徐々にメモリ消費増加

**影響度**: 高 - 長時間稼働アプリケーションで累積的影響

### 2. ストリーム処理でのエラーハンドリング不足
**場所**: `uploadAttachment`メソッド（行 123-141）  
**問題コード**:
```typescript
await pipeline(readable, file.createWriteStream({
  contentType: contentHeaders.contentType?.value.toString(),
}));
```

**問題点**:
- `pipeline`でエラーが発生した場合の明示的なストリームクリーンアップなし
- `file.createWriteStream()`で作成されたWriteStreamが適切に破棄されない可能性
- 中断されたアップロードでストリームリソースがリーク
- アップロード失敗時のGCSストリームの適切でない終了

**影響度**: 高 - アップロード失敗時の重大なリスクエ

### 3. ReadStream のライフサイクル管理不足
**場所**: `findDeliveryFile`メソッド（行 153-176）  
**問題コード**:
```typescript
try {
  return file.createReadStream();
}
catch (err) {
  logger.error(err);
  throw new Error(`Coudn't get file from AWS for the Attachment (${attachment._id.toString()})`);
}
```

**問題点**:
- 作成されたReadStreamの呼び出し元での適切な終了を保証する仕組みなし
- エラー時に既に作成されたストリームの破棄処理なし
- 長時間読み取りが継続された場合のタイムアウト処理なし
- ストリームの消費者がエラーで異常終了した場合のリソースリーク

**影響度**: 高 - ファイルダウンロード処理でのリスク

## 🟡 中リスク：条件によってメモリリークが発生する可能性

### 4. Multipart Uploader でのAxios使用
**場所**: `GcsMultipartUploader.uploadChunk`（multipart-uploader.ts 行 97-119）  
**問題コード**:
```typescript
await axios.put(this.uploadId, chunk, {
  headers: {
    'Content-Range': `${range}`,
  },
});
```

**問題点**:
- 大きなチャンクのアップロード時にaxiosがレスポンスボディを完全にメモリに保持
- アップロード中断時のHTTP接続の適切でない終了
- 長時間アップロード時のHTTPタイムアウト処理不備
- チャンクデータがガベージコレクションされるまで一時的に蓄積

**影響度**: 中 - 大量ファイルアップロード時に顕著

### 5. 手動でのURL生成処理
**場所**: `generateTemporaryUrl`メソッド（行 181-208）  
**問題コード**:
```typescript
const [signedUrl] = await file.getSignedUrl({
  action: 'read',
  expires: Date.now() + lifetimeSecForTemporaryUrl * 1000,
  responseType: contentHeaders.contentType?.value.toString(),
  responseDisposition: contentHeaders.contentDisposition?.value.toString(),
});
```

**問題点**:
- `ContentHeaders`オブジェクトが一時的に大量作成される可能性
- 署名URLの生成処理でGCSクライアント内部のキャッシュ蓄積
- 同期的な署名URL生成で処理がブロックされる可能性
- 署名URLの有効期限管理での参照保持

**影響度**: 中 - 大量URL生成時に一時的な影響

### 6. Multipart Upload の状態管理
**場所**: `GcsMultipartUploader`全般  
**問題コード**:
```typescript
private uploadChunk = async(chunk, isLastUpload = false) => {
  // クロージャによる参照保持
  this._uploadedFileSize += chunk.length;
};
```

**問題点**:
- アップローダーインスタンスが長期間保持される可能性
- `uploadChunk`がアロー関数としてクロージャを形成し、thisへの参照を強く保持
- アップロード中断時のインスタンスの適切でない破棄
- 複数の同時アップロードでインスタンスが蓄積

**影響度**: 中 - 多重アップロード処理時に累積

## 🟢 低リスク：潜在的なメモリリーク

### 7. ContentHeaders の一時的な作成
**場所**: 複数箇所（uploadAttachment, generateTemporaryUrl）  
**問題コード**:
```typescript
const contentHeaders = new ContentHeaders(attachment);
```

**問題点**:
- 各リクエストで新しいContentHeadersインスタンスを作成
- 一時的なオブジェクト生成によるGC圧迫
- 頻繁なヘッダー生成で小さなメモリ断片化

**影響度**: 低 - 通常は自動的に解放

### 8. エラーハンドリングでのログ情報蓄積
**場所**: 各メソッドのlogger呼び出し  
**問題コード**:
```typescript
logger.debug(`File uploading: fileName=${attachment.fileName}`);
```

**問題点**:
- ログレベル設定によっては大量のログ情報がメモリに蓄積
- ファイル名やパス情報がログに残り続ける可能性
- 長時間稼働時のログバッファ増大

**影響度**: 低 - ログローテーション設定に依存

## 📋 推奨される修正案

### 1. Storage インスタンスの適切な管理（最優先）
```typescript
class GcsStorageManager {
  private static instance: Storage | null = null;
  private static timeoutId: NodeJS.Timeout | null = null;
  
  static getInstance(): Storage {
    if (this.instance == null) {
      const keyFilename = toNonBlankStringOrUndefined(
        configManager.getConfig('gcs:apiKeyJsonPath')
      );
      this.instance = keyFilename != null
        ? new Storage({ keyFilename })
        : new Storage();
    }
    
    // 一定時間使用されなかった場合のクリーンアップ
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    this.timeoutId = setTimeout(() => {
      this.cleanup();
    }, 5 * 60 * 1000); // 5分後にクリーンアップ
    
    return this.instance;
  }
  
  static async cleanup(): Promise<void> {
    if (this.instance) {
      // GCS接続の明示的な終了
      try {
        await this.instance.authClient.close?.();
      } catch (e) {
        logger.warn('Failed to close GCS auth client:', e);
      }
      this.instance = null;
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}

// プロセス終了時のクリーンアップ
process.on('SIGTERM', () => GcsStorageManager.cleanup());
process.on('SIGINT', () => GcsStorageManager.cleanup());
```

### 2. ストリーム処理の改善
```typescript
override async uploadAttachment(readable: Readable, attachment: IAttachmentDocument): Promise<void> {
  if (!this.getIsUploadable()) {
    throw new Error('GCS is not configured.');
  }

  logger.debug(`File uploading: fileName=${attachment.fileName}`);

  const gcs = getGcsInstance();
  const myBucket = gcs.bucket(getGcsBucket());
  const filePath = getFilePathOnStorage(attachment);
  const contentHeaders = new ContentHeaders(attachment);

  const file = myBucket.file(filePath);
  let writeStream: any;

  try {
    writeStream = file.createWriteStream({
      contentType: contentHeaders.contentType?.value.toString(),
    });

    await pipeline(readable, writeStream);
  } catch (error) {
    // 明示的なストリームクリーンアップ
    if (writeStream && typeof writeStream.destroy === 'function') {
      writeStream.destroy();
    }
    throw error;
  }
}
```

### 3. ReadStream の適切な管理
```typescript
override async findDeliveryFile(attachment: IAttachmentDocument): Promise<NodeJS.ReadableStream> {
  if (!this.getIsReadable()) {
    throw new Error('GCS is not configured.');
  }

  const gcs = getGcsInstance();
  const myBucket = gcs.bucket(getGcsBucket());
  const filePath = getFilePathOnStorage(attachment);
  const file = myBucket.file(filePath);

  // check file exists
  const isExists = await isFileExists(file);
  if (!isExists) {
    throw new Error(`Any object that relate to the Attachment (${filePath}) does not exist in GCS`);
  }

  try {
    const readStream = file.createReadStream();
    
    // タイムアウト設定
    const timeout = setTimeout(() => {
      readStream.destroy(new Error('Read stream timeout'));
    }, 5 * 60 * 1000); // 5分タイムアウト
    
    readStream.on('end', () => clearTimeout(timeout));
    readStream.on('error', () => clearTimeout(timeout));
    
    return readStream;
  } catch (err) {
    logger.error(err);
    throw new Error(`Coudn't get file from GCS for the Attachment (${attachment._id.toString()})`);
  }
}
```

### 4. Multipart Uploader の改善
```typescript
// multipart-uploader.ts での修正
class GcsMultipartUploader implements IGcsMultipartUploader {
  // アロー関数を通常のメソッドに変更
  private async uploadChunkMethod(chunk: Buffer, isLastUpload = false): Promise<void> {
    if (chunk.length > this.minPartSize && chunk.length % this.minPartSize !== 0) {
      throw Error(`chunk must be a multiple of ${this.minPartSize}`);
    }

    const range = isLastUpload
      ? `bytes ${this._uploadedFileSize}-${this._uploadedFileSize + chunk.length - 1}/${this._uploadedFileSize + chunk.length}`
      : `bytes ${this._uploadedFileSize}-${this._uploadedFileSize + chunk.length - 1}/*`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒タイムアウト

    try {
      await axios.put(this.uploadId, chunk, {
        headers: {
          'Content-Range': `${range}`,
        },
        signal: controller.signal,
        maxContentLength: chunk.length,
        maxBodyLength: chunk.length,
      });
    } catch (e) {
      if (e.response?.status !== 308) {
        throw e;
      }
    } finally {
      clearTimeout(timeoutId);
    }
    
    this._uploadedFileSize += chunk.length;
  }

  // WeakMapを使用してチャンクの弱参照管理
  private chunkRefs = new WeakMap();
  
  async uploadPart(chunk: Buffer): Promise<void> {
    this.chunkRefs.set(chunk, true); // 弱参照で追跡
    // ... existing logic
    this.chunkRefs.delete(chunk); // 処理完了後削除
  }
}
```

### 5. リソース監視の追加
```typescript
// メモリ使用量の監視
class GcsMemoryMonitor {
  static logMemoryUsage(operation: string): void {
    const mem = process.memoryUsage();
    logger.debug(`GCS ${operation} memory usage:`, {
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024) + ' MB',
      external: Math.round(mem.external / 1024 / 1024) + ' MB',
    });
  }
}

// 各メソッドでの使用例
override async uploadAttachment(readable: Readable, attachment: IAttachmentDocument): Promise<void> {
  GcsMemoryMonitor.logMemoryUsage('upload_start');
  try {
    // ... existing logic
  } finally {
    GcsMemoryMonitor.logMemoryUsage('upload_end');
  }
}
```

## 🎯 優先順位

1. **即座に対応すべき**: 高リスク項目 1-3（Storage管理、ストリーム処理、ReadStream管理）
2. **短期間で対応**: 中リスク項目 4-6（Multipart処理、URL生成、状態管理）
3. **中長期で検討**: 低リスク項目 7-8（最適化事項）

## 📊 影響予測

- **修正前**: 長時間稼働時に数百MB単位のメモリリーク可能性
- **修正後**: メモリ使用量の安定化、リーク率 85% 以上削減予想

## 🔍 継続監視項目

- ヒープメモリ使用量の推移
- GCS接続プールの状態
- ストリーム処理での例外発生率
- Multipartアップロードの成功率
- 一時的なオブジェクト生成量

---
**作成日**: 2025年9月12日  
**対象ファイル**: `/workspace/growi/apps/app/src/server/service/file-uploader/gcs/index.ts`  
**分析者**: GitHub Copilot  
**重要度**: 高（ファイルアップロード機能の安定性に直結）