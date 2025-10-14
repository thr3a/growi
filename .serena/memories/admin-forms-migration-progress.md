# Admin フォーム - React Hook Form 移行進捗

## 移行ステータス

### ✅ 完了したコンポーネント

#### AdminAppContainer 配下

1. **AppSetting.jsx** 
   - パス: `apps/app/src/client/components/Admin/App/AppSetting.jsx`
   - 担当フィールド: サイト名、confidential、言語、メール公開設定、ファイルアップロード
   - 特記事項: ラジオボタンの型変換（boolean → string）を実装
   - テスト状況: ✅ IME 入力、値復元、ラジオボタン復元 確認済み

2. **SiteUrlSetting.tsx**
   - パス: `apps/app/src/client/components/Admin/App/SiteUrlSetting.tsx`
   - 担当フィールド: サイト URL
   - 特記事項: 環境変数による上書き時は `readOnly` を使用
   - テスト状況: ✅ IME 入力、値復元 確認済み

3. **MailSetting.tsx**
   - パス: `apps/app/src/client/components/Admin/App/MailSetting.tsx`
   - 担当フィールド: メール送信元アドレス、送信方法（SMTP/SES）
   - 特記事項: 親フォームとして SmtpSetting/SesSetting を管理
   - テスト状況: ⏳ 未テスト

4. **SmtpSetting.tsx**
   - パス: `apps/app/src/client/components/Admin/App/SmtpSetting.tsx`
   - 担当フィールド: SMTP ホスト、ポート、ユーザー、パスワード
   - 特記事項: 子コンポーネントとして `register` を props で受け取る
   - テスト状況: ⏳ 未テスト

5. **SesSetting.tsx**
   - パス: `apps/app/src/client/components/Admin/App/SesSetting.tsx`
   - 担当フィールド: AWS SES アクセスキー、シークレットキー
   - 特記事項: 子コンポーネントとして `register` を props で受け取る
   - テスト状況: ⏳ 未テスト

#### AdminCustomizeContainer 配下

6. **CustomizeCssSetting.tsx** ✨
   - パス: `apps/app/src/client/components/Admin/Customize/CustomizeCssSetting.tsx`
   - 担当フィールド: カスタム CSS
   - 特記事項: textarea での大きなテキスト入力、空値更新が重要
   - テスト状況: ⏳ 未テスト（IME 入力、空値更新の確認が必要）

7. **CustomizeScriptSetting.tsx** ✨
   - パス: `apps/app/src/client/components/Admin/Customize/CustomizeScriptSetting.tsx`
   - 担当フィールド: カスタムスクリプト（JavaScript）
   - 特記事項: Google Tag Manager の例を含む、空値更新が重要
   - テスト状況: ⏳ 未テスト（IME 入力、空値更新の確認が必要）

8. **CustomizeNoscriptSetting.tsx** ✨
   - パス: `apps/app/src/client/components/Admin/Customize/CustomizeNoscriptSetting.tsx`
   - 担当フィールド: カスタム noscript タグ（HTML）
   - 特記事項: Google Tag Manager の iframe 例を含む、空値更新が重要
   - テスト状況: ⏳ 未テスト（IME 入力、空値更新の確認が必要）

#### SWR Store ベース

9. **CustomizeTitle.tsx** ✨ NEW
   - パス: `apps/app/src/client/components/Admin/Customize/CustomizeTitle.tsx`
   - 担当フィールド: カスタムタイトル（HTML title タグのテンプレート）
   - 特記事項: Unstated Container ではなく SWR の `useCustomizeTitle` を使用
   - テスト状況: ⏳ 未テスト（IME 入力の確認が必要）

### 🔄 移行対象候補（未着手）

#### AdminCustomizeContainer 配下

以下のコンポーネントは AdminCustomizeContainer を使用しているが、複雑な構造のため優先度低：

- `CustomizeFunctionSetting.tsx` - 機能設定（複数のチェックボックス/選択肢、テキスト入力なし）
- `CustomizePresentationSetting.tsx` - プレゼンテーション設定（チェックボックスのみ、テキスト入力なし）

#### 他の Admin Container 配下

以下は複雑で大規模なため、後回し：

- AdminSecurityContainer 配下のフォーム
  - `OidcSecuritySettingContents.jsx` - OIDC 設定（多数の input フィールド）
  - `SamlSecuritySettingContents.jsx` - SAML 設定（textarea あり、複雑）
  - `LdapSecuritySettingContents.jsx` - LDAP 設定（多数の input フィールド）
  - `GoogleSecuritySettingContents.jsx`
  - `GitHubSecuritySettingContents.jsx`
  - `LocalSecuritySettingContents.jsx`

- AdminMarkdownContainer 配下のフォーム
  - `XssForm.jsx` - XSS 設定（クラスコンポーネント、複雑）
  - `WhitelistInput.tsx` - ホワイトリスト入力（XssForm の子コンポーネント）
  - `LineBreakForm.jsx`

- 画像アップロード関連（React Hook Form に不適）
  - `CustomizeLogoSetting.tsx` - ロゴ画像のアップロードと切り抜き

### 📋 次のステップ

1. **今回移行したコンポーネントのテスト**
   - CustomizeCssSetting の IME 入力テスト
   - CustomizeScriptSetting の IME 入力テスト
   - CustomizeNoscriptSetting の IME 入力テスト
   - CustomizeTitle の IME 入力テスト
   - 空値更新のテスト（これらのフィールドは空にできることが重要）

2. **他のシンプルなテキスト入力フォームを探す**
   - Admin 配下で単純な input/textarea を持つコンポーネントを特定
   - 優先順位: シンプル > デグレリスクが低い > 使用頻度が高い

3. **複雑なフォームは後回し**
   - Security 関連の大規模フォーム
   - クラスコンポーネント
   - 画像アップロード関連

## 発見した問題と解決策

### 問題1: フォーム送信時に古い値が送信される
- **原因**: Container の `setState` が非同期なのに `await` していなかった
- **解決**: すべての `change*()` メソッドに `await` を追加、`Promise.all()` で並列実行

### 問題2: ラジオボタンの選択状態が復元されない
- **原因**: ラジオボタンの value は文字列だが、reset に boolean を渡していた
- **解決**: `String()` で明示的に型変換

### 問題3: defaultValues の重複
- **原因**: `useForm({ defaultValues })` と `useEffect` での `reset()` で二重定義
- **解決**: `defaultValues` を削除し、`reset()` のみで管理

### 問題4: textarea での IME 入力問題
- **原因**: 制御されたコンポーネント（`value` + `onChange`）を使用していた
- **解決**: React Hook Form の `register` を使用して非制御コンポーネント化

## 移行パターンの確立

### パターン1: Container ベースの単一 textarea フィールド

```typescript
const {
  register,
  handleSubmit,
  reset,
} = useForm();

useEffect(() => {
  reset({
    fieldName: container.state.currentFieldName || '',
  });
}, [container.state.currentFieldName, reset]);

const onSubmit = useCallback(async(data) => {
  try {
    await container.changeFieldName(data.fieldName);
    await container.updateFieldName();
    toastSuccess('...');
  }
  catch (err) {
    toastError(err);
  }
}, [container]);

return (
  <form onSubmit={handleSubmit(onSubmit)}>
    <textarea {...register('fieldName')} />
    <AdminUpdateButtonRow type="submit" />
  </form>
);
```

適用済み:
- CustomizeCssSetting
- CustomizeScriptSetting
- CustomizeNoscriptSetting

### パターン2: SWR Store ベースの単一 input フィールド

```typescript
const { data: storeData } = useStoreHook();

const {
  register,
  handleSubmit,
  reset,
} = useForm();

useEffect(() => {
  reset({
    fieldName: storeData ?? '',
  });
}, [storeData, reset]);

const onSubmit = useCallback(async(data) => {
  try {
    await apiv3Put('/api/endpoint', {
      fieldName: data.fieldName,
    });
    toastSuccess('...');
  }
  catch (err) {
    toastError(err);
  }
}, []);

return (
  <form onSubmit={handleSubmit(onSubmit)}>
    <input {...register('fieldName')} />
    <AdminUpdateButtonRow type="submit" />
  </form>
);
```

適用済み:
- CustomizeTitle

## 削除したファイル

- ❌ `apps/app/src/client/hooks/use-text-input-with-ime.ts` - カスタムフックアプローチを廃止

## 修正したファイル

- ✅ `apps/app/src/client/components/Admin/Common/AdminUpdateButtonRow.tsx` - `type` prop を追加（submit/button/reset）

## 移行対象外（理由付き）

### 複雑すぎるもの
- **OidcSecuritySettingContents.jsx** - 10+ の input フィールド、条件付きレンダリング
- **SamlSecuritySettingContents.jsx** - textarea + 多数の input、複雑なテーブルレイアウト
- **LdapSecuritySettingContents.jsx** - 10+ の input フィールド、ドロップダウン、条件付きレンダリング
- **XssForm.jsx** - クラスコンポーネント、ラジオボタン、子コンポーネント、条件付きレンダリング

### React Hook Form に不適
- **CustomizeLogoSetting.tsx** - 画像ファイルアップロード、画像切り抜き機能

### テキスト入力がない
- **CustomizeFunctionSetting.tsx** - チェックボックスとドロップダウンのみ
- **CustomizePresentationSetting.tsx** - チェックボックスのみ

## ブランチ情報

- 作業ブランチ: `imprv/admin-form`
- ベースブランチ: `master`

## 参考リンク

- React Hook Form 公式: https://react-hook-form.com/
- Unstated 公式: https://github.com/jamiebuilds/unstated (deprecated)
- Jotai 公式: https://jotai.org/ (将来的に導入予定)
