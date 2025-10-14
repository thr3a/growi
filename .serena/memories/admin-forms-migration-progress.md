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

6. **CustomizeCssSetting.tsx** ✨ NEW
   - パス: `apps/app/src/client/components/Admin/Customize/CustomizeCssSetting.tsx`
   - 担当フィールド: カスタム CSS
   - 特記事項: textarea での大きなテキスト入力、空値更新が重要
   - テスト状況: ⏳ 未テスト（IME 入力、空値更新の確認が必要）

7. **CustomizeScriptSetting.tsx** ✨ NEW
   - パス: `apps/app/src/client/components/Admin/Customize/CustomizeScriptSetting.tsx`
   - 担当フィールド: カスタムスクリプト（JavaScript）
   - 特記事項: Google Tag Manager の例を含む、空値更新が重要
   - テスト状況: ⏳ 未テスト（IME 入力、空値更新の確認が必要）

8. **CustomizeNoscriptSetting.tsx** ✨ NEW
   - パス: `apps/app/src/client/components/Admin/Customize/CustomizeNoscriptSetting.tsx`
   - 担当フィールド: カスタム noscript タグ（HTML）
   - 特記事項: Google Tag Manager の iframe 例を含む、空値更新が重要
   - テスト状況: ⏳ 未テスト（IME 入力、空値更新の確認が必要）

### 🔄 移行対象候補（未着手）

#### AdminCustomizeContainer 配下

以下のコンポーネントは AdminCustomizeContainer を使用しているが、フォームの構造が異なる可能性があるため要調査：

- `CustomizeFunctionSetting.tsx` - 機能設定（複数のチェックボックス/選択肢）
- `CustomizePresentationSetting.tsx` - プレゼンテーション設定
- その他の Customize 配下のコンポーネント

#### 他の Admin Container 配下

- AdminSecurityContainer 配下のフォーム
  - `OidcSecuritySetting.jsx` とその Contents
  - `SamlSecuritySetting.jsx` とその Contents
  - `LdapSecuritySetting.jsx` とその Contents
  - `GoogleSecuritySetting.jsx` とその Contents
  - `GitHubSecuritySetting.jsx` とその Contents
  - `LocalSecuritySetting.jsx` とその Contents
- AdminMarkdownContainer 配下のフォーム
  - `XssForm.jsx`
  - `LineBreakForm.jsx`
  - その他の MarkdownSetting 配下のコンポーネント
- AdminImportContainer 配下のフォーム
- AdminExternalAccountsContainer 配下のフォーム
- その他の Admin*Container 配下のフォーム

### 📋 次のステップ

1. **今回移行したコンポーネントのテスト**
   - CustomizeCssSetting の IME 入力テスト
   - CustomizeScriptSetting の IME 入力テスト
   - CustomizeNoscriptSetting の IME 入力テスト
   - 空値更新のテスト（これらのフィールドは空にできることが重要）

2. **CustomizeFunctionSetting の調査と移行**
   - より複雑なフォーム構造の可能性がある
   - チェックボックスや選択肢の扱いを確認

3. **Security 関連フォームの優先順位決定**
   - よく使われる認証方式から優先的に移行
   - LDAP, OIDC, SAML などは企業での利用が多い

4. **Markdown 関連フォームの調査**
   - XssForm.jsx と LineBreakForm.jsx を確認

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

以下のパターンが確立されました：

### 単一 textarea フィールドのパターン

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

このパターンは以下に適用可能：
- CustomizeCssSetting (CSS)
- CustomizeScriptSetting (JavaScript)
- CustomizeNoscriptSetting (HTML/noscript)

## 削除したファイル

- ❌ `apps/app/src/client/hooks/use-text-input-with-ime.ts` - カスタムフックアプローチを廃止

## 修正したファイル

- ✅ `apps/app/src/client/components/Admin/Common/AdminUpdateButtonRow.tsx` - `type` prop を追加（submit/button/reset）

## ブランチ情報

- 作業ブランチ: `imprv/admin-form`
- ベースブランチ: `master`

## 参考リンク

- React Hook Form 公式: https://react-hook-form.com/
- Unstated 公式: https://github.com/jamiebuilds/unstated (deprecated)
- Jotai 公式: https://jotai.org/ (将来的に導入予定)
