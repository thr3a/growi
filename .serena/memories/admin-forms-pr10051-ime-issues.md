# PR #10051 で特定された IME 問題があるコンポーネント

## 概要
PR #10051 (`fix: Input values in the admin settings form are sometimes not reflected`) では、`defaultValue` から `value` への変更が行われました。これは IME 入力問題を引き起こす制御されたコンポーネントへの変更であり、これらのコンポーネントは **React Hook Form への移行が必要** です。

## ⚠️ **移行は 17/27 ファイル完了（63%）**

PR #10051 で変更された **27ファイル中17ファイル** を移行完了。**残り10ファイル（約48+ フィールド）が未移行** です。

## PR #10051 で変更されたファイルの完全リスト

### ✅ 移行完了（17ファイル、約33フィールド）

#### Apps/App 配下
1. **AppSetting.jsx** - `title`, `confidential` (2フィールド) ✅
2. **MailSetting.tsx** - `fromAddress` (1フィールド) ✅
3. **SiteUrlSetting.tsx** - `siteUrl` (1フィールド) ✅
4. **SmtpSetting.tsx** - `smtpHost`, `smtpPort`, `smtpUser`, `smtpPassword` (4フィールド) ✅
5. **SesSetting.tsx** - `sesAccessKeyId`, `sesSecretAccessKey` (2フィールド) ✅

#### Customize 配下
6. **CustomizeCssSetting.tsx** - `customizeCss` textarea (1フィールド) ✅
7. **CustomizeScriptSetting.tsx** - `customizeScript` textarea (1フィールド) ✅
8. **CustomizeNoscriptSetting.tsx** - `customizeNoscript` textarea (1フィールド) ✅
9. **CustomizeTitle.tsx** - `customizeTitle` (1フィールド) ✅

#### Apps/App 配下 - ファイルアップロード設定
10. **AwsSetting.tsx** - `s3Region`, `s3CustomEndpoint`, `s3Bucket`, `s3AccessKeyId` (4フィールド) ✅
11. **GcsSetting.tsx** - `gcsApiKeyJsonPath`, `gcsBucket`, `gcsUploadNamespace` (3フィールド) ✅
12. **AzureSetting.tsx** - `azureTenantId`, `azureClientId`, `azureClientSecret`, `azureStorageAccountName`, `azureStorageContainerName` (5フィールド) ✅
13. **MaskedInput.tsx** - 汎用マスク入力コンポーネント（デュアルモード対応） ✅

#### Security 配下
14. **GitHubSecuritySettingContents.jsx** - `githubClientId`, `githubClientSecret` (2フィールド) ✅
15. **GoogleSecuritySettingContents.jsx** - `googleClientId`, `googleClientSecret` (2フィールド) ✅

#### MarkdownSetting 配下
16. **WhitelistInput.tsx** - `tagWhitelist`, `attrWhitelist` (2 textareas) ✅

#### LegacySlackIntegration 配下
17. **SlackConfiguration.jsx** - `webhookUrl`, `slackToken` (2フィールド) ✅

---

### ❌ **未移行（10ファイル、約48+ フィールド）**

#### 🔴 HIGH PRIORITY: エンタープライズ認証設定（36フィールド）

18. **LdapSecuritySettingContents.jsx** ❌
    - **10フィールド**:
      - `serverUrl`
      - `ldapBindDN`
      - `ldapBindDNPassword`
      - `ldapSearchFilter`
      - `ldapAttrMapUsername`
      - `ldapAttrMapMail`
      - `ldapAttrMapName`
      - `ldapGroupSearchBase`
      - `ldapGroupSearchFilter`
      - `ldapGroupDnProperty`
    - 複雑度: **HIGH** (クラスコンポーネント、Container ベース)
    - 優先度: **HIGH** (企業ユーザーが使用、IME で日本語入力が必要な場合あり)

19. **OidcSecuritySettingContents.jsx** ❌
    - **16フィールド**:
      - `oidcProviderName`
      - `oidcIssuerHost`
      - `oidcClientId`
      - `oidcClientSecret`
      - `oidcAuthorizationEndpoint`
      - `oidcTokenEndpoint`
      - `oidcRevocationEndpoint`
      - `oidcIntrospectionEndpoint`
      - `oidcUserInfoEndpoint`
      - `oidcEndSessionEndpoint`
      - `oidcRegistrationEndpoint`
      - `oidcJWKSUri`
      - `oidcAttrMapId`
      - `oidcAttrMapUserName`
      - `oidcAttrMapName`
      - `oidcAttrMapEmail`
    - 複雑度: **VERY HIGH** (最多フィールド、クラスコンポーネント)
    - 優先度: **HIGH** (モダンな企業認証で使用頻度高)

20. **SamlSecuritySettingContents.jsx** ❌
    - **10フィールド**:
      - `envEntryPoint`
      - `envIssuer`
      - `envCert` (textarea)
      - `envAttrMapId`
      - `envAttrMapUsername`
      - `envAttrMapMail`
      - `envAttrMapFirstName`
      - `envAttrMapLastName`
      - `samlABLCRule`
      - `envABLCRule`
    - 複雑度: **HIGH** (クラスコンポーネント、環境変数との連携)
    - 優先度: **HIGH** (エンタープライズで広く使用)

#### 🟡 MEDIUM PRIORITY: その他のセキュリティ設定（2フィールド）

21. **SecuritySetting.jsx** ❌
    - **1フィールド**: `sessionMaxAge`
    - 複雑度: **LOW** (単一フィールド、Container ベース)
    - 優先度: **MEDIUM**

22. **LocalSecuritySettingContents.jsx** ❌
    - **1フィールド**: `registrationWhitelist` (textarea、配列を \n で join)
    - 複雑度: **MEDIUM** (クラスコンポーネント、配列のハンドリング)
    - 優先度: **MEDIUM**

#### 🟢 LOW PRIORITY: Slack 設定（すでに useState 使用、10+ フィールド）

23. **CustomBotWithProxySettings.jsx** ❌
    - **1フィールド**: `proxyServerUri`
    - 複雑度: **LOW** (すでに関数コンポーネント + useState)
    - 優先度: **LOW** (すでに IME 問題は発生しにくい実装)
    - 注: すでに `useState` を使用しているため、React Hook Form への移行は低優先度

24. **CustomBotWithoutProxySecretTokenSection.jsx** ❌
    - **2フィールド**: `inputSigningSecret`, `inputBotToken`
    - 複雑度: **LOW** (すでに関数コンポーネント + useState)
    - 優先度: **LOW** (すでに IME 問題は発生しにくい実装)
    - 注: すでに `useState` を使用しているため、React Hook Form への移行は低優先度

25. **ManageCommandsProcess.jsx** ❌
    - **複数の textarea フィールド** (コマンドごとに動的生成)
    - 複雑度: **HIGH** (動的フィールド生成、複雑なロジック)
    - 優先度: **LOW** (Slack コマンド管理、日本語入力は稀)
    - 注: value を使用しているが、複雑な権限設定システム

#### 📦 対象外
26. **index.js** - パッケージファイル
27. **config-definition.ts** - 設定ファイル

---

## 進捗サマリー

### 📊 完了率
- **ファイル**: 17/27 完了（**63%**）
- **フィールド数**: 約33/81+ 完了（**約41%**）
- **HIGH PRIORITY**: 0/3 完了（**0%**）- LDAP, OIDC, SAML が未完
- **MEDIUM PRIORITY**: 0/2 完了（**0%**）
- **LOW PRIORITY**: 0/3 完了（**0%**）

### 🎯 残作業の見積もり
1. **HIGH PRIORITY** (36フィールド):
   - LDAP: 10フィールド、約2-3時間
   - OIDC: 16フィールド、約3-4時間
   - SAML: 10フィールド、約2-3時間
   
2. **MEDIUM PRIORITY** (2フィールド):
   - SecuritySetting: 1フィールド、約30分
   - LocalSecuritySettingContents: 1フィールド（配列）、約1時間
   
3. **LOW PRIORITY** (10+ フィールド):
   - Slack 関連3ファイル: 既に useState 使用、React Hook Form 移行は任意

**推定総時間**: 9-12時間（HIGH + MEDIUM のみ）

---

## 技術的な詳細

### 既に実装した移行パターン

#### パターン1: Container ベース（シンプル）
```typescript
const Component = (props) => {
  const { adminContainer } = props;
  const { register, handleSubmit, reset } = useForm();
  
  useEffect(() => {
    reset({ field: adminContainer.state.field });
  }, [reset, adminContainer.state.field]);
  
  const onSubmit = useCallback(async(data) => {
    await adminContainer.updateField(data.field);
  }, [adminContainer]);
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('field')} />
      <AdminUpdateButtonRow />
    </form>
  );
};
```

#### パターン2: クラス → 関数変換
```typescript
// Before: class component
class LegacyForm extends React.Component {
  async onClickSubmit() {
    await this.props.container.updateSetting();
  }
  
  render() {
    return <input value={this.props.container.state.field} onChange={...} />;
  }
}

// After: function component with useForm
const ModernForm = (props) => {
  const { container } = props;
  const { register, handleSubmit, reset } = useForm();
  
  useEffect(() => {
    reset({ field: container.state.field });
  }, [reset, container.state.field]);
  
  const onSubmit = useCallback(async(data) => {
    await container.changeField(data.field);
    await container.updateSetting();
  }, [container]);
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('field')} />
      <AdminUpdateButtonRow />
    </form>
  );
};
```

---

## 推奨される移行順序

### Phase 1: 単純なもの（ウォーミングアップ）
1. ✅ **SecuritySetting.jsx** - 1フィールドのみ、シンプル

### Phase 2: 中規模のエンタープライズ設定
2. ✅ **LdapSecuritySettingContents.jsx** - 10フィールド
3. ✅ **SamlSecuritySettingContents.jsx** - 10フィールド
4. ✅ **LocalSecuritySettingContents.jsx** - 配列ハンドリング

### Phase 3: 最大規模
5. ✅ **OidcSecuritySettingContents.jsx** - 16フィールド（最多）

### Phase 4: オプション（低優先度）
6. Slack 関連3ファイル - すでに useState 使用、必要に応じて

---

## 注意事項

### 🚨 重要な発見
- **誤認識**: 以前「PR #10051 完全解決」と報告していたのは誤りでした
- **実態**: 27ファイル中17ファイルのみ移行完了、残り10ファイル未移行
- **最大の課題**: LDAP, OIDC, SAML の3大エンタープライズ認証設定が未移行
  - これらは企業ユーザーにとって **クリティカル** な機能
  - IME 問題により日本語のコメントやラベルが入力できない可能性

### 💡 Slack 関連ファイルについて
- CustomBotWithProxySettings, CustomBotWithoutProxySecretTokenSection, ManageCommandsProcess
- これらは **すでに `useState` を使用** しているため、IME 問題は発生しにくい
- React Hook Form への移行は **任意**（統一性のため推奨はされるが、優先度は低い）

---

## 次のステップ

1. **Phase 1**: SecuritySetting.jsx（1フィールド、最もシンプル）
2. **Phase 2**: LdapSecuritySettingContents.jsx（10フィールド）
3. **Phase 3**: SamlSecuritySettingContents.jsx（10フィールド）
4. **Phase 4**: OidcSecuritySettingContents.jsx（16フィールド、最大規模）
5. **Phase 5**: LocalSecuritySettingContents.jsx（配列ハンドリング）
6. **オプション**: Slack 関連（低優先度）

エンタープライズ認証設定の移行が完了すれば、PR #10051 の IME 問題は **実質的に解決** と言えます。
