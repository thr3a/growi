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


### 3. 認証クレデンシャルの繰り返し作成
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

**対策**:
- singleton インスタンスを作成
- configManager.getConfig で取得する値に更新があればインスタンスを再作成

**影響度**: 中 - 認証処理の頻度に依存


---
**作成日**: 2025年9月12日  
**対象ファイル**: `/workspace/growi/apps/app/src/server/service/file-uploader/azure.ts`  
**分析者**: GitHub Copilot  
**重要度**: 高（Azureファイルアップロード機能の安定性に直結）