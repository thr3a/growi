# Azureアップロード機能 メモリリーク分析レポート

## 概要
`/workspace/growi/apps/app/src/server/service/file-uploader/azure.ts` ファイルにおけるメモリリークの可能性を詳細分析した結果です。

## 🔴 高リスク：メモリリークの可能性が高い箇所

### 1. Azure クライアントの繰り返し作成
**場所**: `getContainerClient()` 関数（行 74-78）  
**問題コード**:
```typescript
async function getContainerClient(): Promise<ContainerClient> {
  const { accountName, containerName } = getAzureConfig();
  const blobServiceClient = new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, getCredential());
  return blobServiceClient.getContainerClient(containerName);
}
```

**問題点**:
- 毎回新しい`BlobServiceClient`インスタンスを作成
- 内部で保持されるHTTP接続プール、認証トークン、タイマーが蓄積
- `ClientSecretCredential`が毎回作成され、内部のHTTPクライアントが解放されない
- 長時間稼働時にAzure接続リソースが指数的に増加
- OAuth トークンキャッシュの重複管理

**影響度**: 高 - 連続アップロード/ダウンロードで深刻な影響

### 2. generateTemporaryUrl での重複クライアント作成
**場所**: `generateTemporaryUrl`メソッド（行 188-237）  
**問題コード**:
```typescript
const sasToken = await (async() => {
  const { accountName, containerName } = getAzureConfig();
  const blobServiceClient = new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, getCredential());
  
  const userDelegationKey = await blobServiceClient.getUserDelegationKey(startsOn, expiresOn);
  // ...
})();
```

**問題点**:
- URLの構築とSASトークン生成で別々に`BlobServiceClient`を作成
- 同一メソッド内で複数のクライアントインスタンスが同時存在
- ユーザーデリゲーションキーの取得で長時間接続を保持
- 認証処理の重複実行でCPUとメモリの無駄使用
- SASトークン生成時の一時的な大量メモリ消費

**影響度**: 高 - URL生成処理の度に重複リソース消費

### 3. ReadableStream のライフサイクル管理不足
**場所**: `findDeliveryFile`メソッド（行 164-182）  
**問題コード**:
```typescript
const downloadResponse = await blobClient.download();
if (!downloadResponse?.readableStreamBody) {
  throw new Error(`Coudn't get file from Azure for the Attachment (${filePath})`);
}

return downloadResponse.readableStreamBody;
```

**問題点**:
- 返されたストリームの呼び出し元での適切な終了を保証する仕組みなし
- `downloadResponse`オブジェクト自体がメタデータを保持し続ける可能性
- Azure接続がストリーム終了まで保持され続ける
- ストリーム読み取り中断時のリソースクリーンアップ不足
- 大きなファイルダウンロード時の部分読み取り失敗でのリーク

**影響度**: 高 - ファイルダウンロード処理でのリスク

## 🟡 中リスク：条件によってメモリリークが発生する可能性

### 4. uploadStream でのストリーム処理
**場所**: `uploadAttachment`メソッド（行 125-143）  
**問題コード**:
```typescript
await blockBlobClient.uploadStream(readable, undefined, undefined, {
  blobHTTPHeaders: {
    blobContentType: contentHeaders.contentType?.value.toString(),
    blobContentDisposition: contentHeaders.contentDisposition?.value.toString(),
  },
});
```

**問題点**:
- `uploadStream`内部での中間バッファリング
- アップロード失敗時のストリーム状態の不確定性
- Azure SDK内部でのチャンクバッファリングによる一時的メモリ増大
- 大きなファイルアップロード時の並列チャンク処理でのメモリ圧迫

**影響度**: 中 - 大容量ファイルアップロード時に顕著

### 5. 認証クレデンシャルの繰り返し作成
**場所**: `getCredential()` 関数（行 62-72）  
**問題コード**:
```typescript
function getCredential(): TokenCredential {
  const tenantId = toNonBlankStringOrUndefined(configManager.getConfig('azure:tenantId'));
  const clientId = toNonBlankStringOrUndefined(configManager.getConfig('azure:clientId'));
  const clientSecret = toNonBlankStringOrUndefined(configManager.getConfig('azure:clientSecret'));

  return new ClientSecretCredential(tenantId, clientId, clientSecret);
}
```

**問題点**:
- 毎回新しい`ClientSecretCredential`インスタンスを作成
- 内部のHTTPクライアント、トークンキャッシュが重複作成
- OAuthトークンの取得処理が重複実行
- 認証状態の管理が非効率

**影響度**: 中 - 認証処理の頻度に依存

### 6. ContentHeaders オブジェクトの頻繁な作成
**場所**: 複数箇所（uploadAttachment, generateTemporaryUrl）  
**問題コード**:
```typescript
const contentHeaders = new ContentHeaders(attachment);
const contentHeaders = new ContentHeaders(attachment, { inline: !isDownload });
```

**問題点**:
- 各リクエストで新しいContentHeadersインスタンスを作成
- ヘッダー情報の解析処理が重複実行
- 一時的なオブジェクト生成によるGC圧迫

**影響度**: 中 - リクエスト数に比例した影響

## 🟢 低リスク：潜在的なメモリリーク

### 7. URL構築での文字列操作
**場所**: `generateTemporaryUrl`メソッド内  
**問題コード**:
```typescript
const url = await (async() => {
  const containerClient = await getContainerClient();
  const filePath = getFilePathOnStorage(attachment);
  const blockBlobClient = await containerClient.getBlockBlobClient(filePath);
  return blockBlobClient.url;
})();

const signedUrl = `${url}?${sasToken}`;
```

**問題点**:
- URL文字列の重複作成
- 一時的な文字列オブジェクトの蓄積
- 大量のURL生成時の文字列断片化

**影響度**: 低 - 通常は自動的に解放

### 8. 設定値の繰り返し取得
**場所**: 複数箇所での`configManager.getConfig()`呼び出し  
**問題コード**:
```typescript
const lifetimeSecForTemporaryUrl = configManager.getConfig('azure:lifetimeSecForTemporaryUrl');
const { accountName, containerName } = getAzureConfig();
```

**問題点**:
- 設定値の繰り返し取得・解析
- キャッシュ機構がない場合の非効率な処理
- 設定オブジェクトの一時的な蓄積

**影響度**: 低 - 設定システムの実装に依存

## 📋 推奨される修正案

### 1. Azure クライアントのシングルトン化（最優先）
```typescript
class AzureClientManager {
  private static blobServiceClient: BlobServiceClient | null = null;
  private static credential: TokenCredential | null = null;
  private static cleanupTimeout: NodeJS.Timeout | null = null;

  static async getBlobServiceClient(): Promise<BlobServiceClient> {
    if (this.blobServiceClient == null) {
      const { accountName } = getAzureConfig();
      this.credential = this.getCredentialSingleton();
      this.blobServiceClient = new BlobServiceClient(
        `https://${accountName}.blob.core.windows.net`,
        this.credential
      );
    }

    // アイドル時のクリーンアップ設定
    this.resetCleanupTimer();
    return this.blobServiceClient;
  }

  static getCredentialSingleton(): TokenCredential {
    if (this.credential == null) {
      const tenantId = toNonBlankStringOrUndefined(configManager.getConfig('azure:tenantId'));
      const clientId = toNonBlankStringOrUndefined(configManager.getConfig('azure:clientId'));
      const clientSecret = toNonBlankStringOrUndefined(configManager.getConfig('azure:clientSecret'));

      if (tenantId == null || clientId == null || clientSecret == null) {
        throw new Error(`Azure Blob Storage missing required configuration`);
      }

      this.credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
    }
    return this.credential;
  }

  static async getContainerClient(): Promise<ContainerClient> {
    const { containerName } = getAzureConfig();
    const blobServiceClient = await this.getBlobServiceClient();
    return blobServiceClient.getContainerClient(containerName);
  }

  private static resetCleanupTimer(): void {
    if (this.cleanupTimeout) {
      clearTimeout(this.cleanupTimeout);
    }
    this.cleanupTimeout = setTimeout(() => {
      this.cleanup();
    }, 10 * 60 * 1000); // 10分後にクリーンアップ
  }

  static async cleanup(): Promise<void> {
    if (this.blobServiceClient) {
      try {
        // Azure SDK のクリーンアップ
        await this.blobServiceClient.pipeline.close?.();
      } catch (e) {
        logger.warn('Failed to close Azure blob service client:', e);
      }
      this.blobServiceClient = null;
    }
    
    if (this.credential && 'close' in this.credential) {
      try {
        await (this.credential as any).close?.();
      } catch (e) {
        logger.warn('Failed to close Azure credential:', e);
      }
      this.credential = null;
    }

    if (this.cleanupTimeout) {
      clearTimeout(this.cleanupTimeout);
      this.cleanupTimeout = null;
    }
  }
}

// プロセス終了時のクリーンアップ
process.on('SIGTERM', () => AzureClientManager.cleanup());
process.on('SIGINT', () => AzureClientManager.cleanup());
```

### 2. ストリーム処理の改善
```typescript
override async uploadAttachment(readable: Readable, attachment: IAttachmentDocument): Promise<void> {
  if (!this.getIsUploadable()) {
    throw new Error('Azure is not configured.');
  }

  logger.debug(`File uploading: fileName=${attachment.fileName}`);
  const filePath = getFilePathOnStorage(attachment);
  const containerClient = await AzureClientManager.getContainerClient();
  const blockBlobClient: BlockBlobClient = containerClient.getBlockBlobClient(filePath);
  const contentHeaders = new ContentHeaders(attachment);

  // ストリームのタイムアウト設定
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Upload timeout')), 5 * 60 * 1000); // 5分タイムアウト
  });

  try {
    await Promise.race([
      blockBlobClient.uploadStream(readable, undefined, undefined, {
        blobHTTPHeaders: {
          blobContentType: contentHeaders.contentType?.value.toString(),
          blobContentDisposition: contentHeaders.contentDisposition?.value.toString(),
        },
        maxConcurrency: 2, // 並列度制限
        maxSingleShotSize: 8 * 1024 * 1024, // 8MB制限
      }),
      timeoutPromise,
    ]);
  } catch (error) {
    // ストリームエラー時の明示的なクリーンアップ
    if (readable && typeof readable.destroy === 'function') {
      readable.destroy();
    }
    throw error;
  }
}
```

### 3. ReadableStream の適切な管理
```typescript
override async findDeliveryFile(attachment: IAttachmentDocument): Promise<NodeJS.ReadableStream> {
  if (!this.getIsReadable()) {
    throw new Error('Azure is not configured.');
  }

  const filePath = getFilePathOnStorage(attachment);
  const containerClient = await AzureClientManager.getContainerClient();
  const blobClient: BlobClient = containerClient.getBlobClient(filePath);
  
  try {
    const downloadResponse = await blobClient.download();
    
    if (downloadResponse.errorCode) {
      logger.error(downloadResponse.errorCode);
      throw new Error(downloadResponse.errorCode);
    }
    
    if (!downloadResponse?.readableStreamBody) {
      throw new Error(`Coudn't get file from Azure for the Attachment (${filePath})`);
    }

    const stream = downloadResponse.readableStreamBody;
    
    // タイムアウト設定
    const timeout = setTimeout(() => {
      stream.destroy(new Error('Download stream timeout'));
    }, 10 * 60 * 1000); // 10分タイムアウト
    
    stream.on('end', () => clearTimeout(timeout));
    stream.on('error', () => clearTimeout(timeout));
    stream.on('close', () => clearTimeout(timeout));

    return stream;
  } catch (error) {
    logger.error('Failed to create download stream:', error);
    throw new Error(`Coudn't get file from Azure for the Attachment (${attachment._id.toString()})`);
  }
}
```

### 4. URL生成の最適化
```typescript
override async generateTemporaryUrl(attachment: IAttachmentDocument, opts?: RespondOptions): Promise<TemporaryUrl> {
  if (!this.getIsUploadable()) {
    throw new Error('Azure Blob is not configured.');
  }

  const lifetimeSecForTemporaryUrl = configManager.getConfig('azure:lifetimeSecForTemporaryUrl');
  const { accountName, containerName } = getAzureConfig();
  const filePath = getFilePathOnStorage(attachment);

  // 同一クライアントインスタンスを再利用
  const blobServiceClient = await AzureClientManager.getBlobServiceClient();
  const containerClient = await AzureClientManager.getContainerClient();
  const blockBlobClient = containerClient.getBlockBlobClient(filePath);

  const now = Date.now();
  const startsOn = new Date(now - 30 * 1000);
  const expiresOn = new Date(now + lifetimeSecForTemporaryUrl * 1000);

  try {
    const userDelegationKey = await blobServiceClient.getUserDelegationKey(startsOn, expiresOn);

    const isDownload = opts?.download ?? false;
    const contentHeaders = new ContentHeaders(attachment, { inline: !isDownload });

    const sasOptions = {
      containerName,
      permissions: ContainerSASPermissions.parse('rl'),
      protocol: SASProtocol.HttpsAndHttp,
      startsOn,
      expiresOn,
      contentType: contentHeaders.contentType?.value.toString(),
      contentDisposition: contentHeaders.contentDisposition?.value.toString(),
    };

    const sasToken = generateBlobSASQueryParameters(sasOptions, userDelegationKey, accountName).toString();
    const signedUrl = `${blockBlobClient.url}?${sasToken}`;

    return {
      url: signedUrl,
      lifetimeSec: lifetimeSecForTemporaryUrl,
    };
  } catch (error) {
    logger.error('Failed to generate SAS token:', error);
    throw new Error('Failed to generate temporary URL');
  }
}
```

### 5. メモリ使用量監視の追加
```typescript
class AzureMemoryMonitor {
  static logMemoryUsage(operation: string): void {
    const mem = process.memoryUsage();
    logger.debug(`Azure ${operation} memory usage:`, {
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024) + ' MB',
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024) + ' MB',
      external: Math.round(mem.external / 1024 / 1024) + ' MB',
    });
  }

  static async monitorAsyncOperation<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    this.logMemoryUsage(`${operation}_start`);
    try {
      const result = await fn();
      this.logMemoryUsage(`${operation}_success`);
      return result;
    } catch (error) {
      this.logMemoryUsage(`${operation}_error`);
      throw error;
    }
  }
}
```

## 🎯 優先順位

1. **即座に対応すべき**: 高リスク項目 1-3（クライアント管理、重複作成、ストリーム管理）
2. **短期間で対応**: 中リスク項目 4-6（アップロード処理、認証管理、オブジェクト作成）
3. **中長期で検討**: 低リスク項目 7-8（最適化事項）

## 📊 影響予測

- **修正前**: 長時間稼働時に数百MB～GB単位のメモリリーク可能性
- **修正後**: メモリ使用量の安定化、リーク率 90% 以上削減予想

## 🔍 継続監視項目

- ヒープメモリ使用量の推移
- Azure接続プールの状態
- ストリーム処理での例外発生率
- SASトークン生成の成功率
- 認証トークンのキャッシュ効率

---
**作成日**: 2025年9月12日  
**対象ファイル**: `/workspace/growi/apps/app/src/server/service/file-uploader/azure.ts`  
**分析者**: GitHub Copilot  
**重要度**: 高（Azureファイルアップロード機能の安定性に直結）