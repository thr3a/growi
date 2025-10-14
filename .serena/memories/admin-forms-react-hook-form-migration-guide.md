# Admin フォーム - React Hook Form 移行ガイドライン

## プロジェクトコンテキスト

### 現状 (Before)
素の React + Unstated Container で書かれていた Admin フォーム。以下の問題がある：

1. **日本語 IME 入力の問題**: 制御されたコンポーネント（`value` プロパティ使用）により、1文字ずつ確定文字として入力されてしまい、漢字変換ができない
2. **空値更新の問題**: カスタムスクリプト/CSS フィールドなどを空白で更新できない
3. **レガシーライブラリ問題**: Unstated はメンテナンスされていないレガシーライブラリで、将来的に廃止したい

### 最終目標 (理想像)
- React Hook Form を利用
- Unstated を完全に廃止
- グローバルステートは Jotai で管理

### 現在の移行戦略 (中間地点)
**React Hook Form + Unstated Container のハイブリッド構成**

理由：
- 一度に全てを変更するのはリスクが高い
- フォームの問題（IME、空値）を先に解決する必要がある
- Container の段階的な移行が可能

この中間地点により：
1. ✅ IME 入力問題を解決（非制御コンポーネント化）
2. ✅ 空値更新問題を解決
3. ⏳ Container は残すが、将来的に Jotai への移行パスを確保

## 移行パターン

### 基本的なフォームセットアップ

```javascript
import { useForm } from 'react-hook-form';

const {
  register,
  handleSubmit,
  reset,
} = useForm();
```

**重要**: `defaultValues` は指定しない。`useEffect` で `reset()` を呼ぶため不要。

### フォーム値の復元

Container の state とフォームを同期するため、`useEffect` で `reset()` を使用：

```javascript
useEffect(() => {
  reset({
    fieldName: container.state.fieldName || '',
    // ... 他のフィールド
  });
}, [container.state.fieldName, reset]);
```

### Container を使ったフォーム送信

```javascript
const onSubmit = useCallback(async(data) => {
  try {
    // 重要: API 呼び出し前に setState の完了を待つ
    await Promise.all([
      container.changeField1(data.field1),
      container.changeField2(data.field2),
    ]);
    
    await container.updateHandler();
    toastSuccess('更新しました');
  }
  catch (err) {
    toastError(err);
  }
}, [container]);
```

## 重要な注意点

### ⚠️ 1. API 呼び出し前に Container の setState を await する（最重要！）

**問題**: Unstated Container の `setState` は非同期処理です。`change*()` メソッドの後に `await` せずに API ハンドラーを即座に呼ぶと、API リクエストは**古い/古びた値**で送信されます。

❌ **間違い:**
```javascript
container.changeSiteUrl(data.siteUrl);
updateHandler(); // 古い値が送信される！
```

✅ **正しい:**
```javascript
await container.changeSiteUrl(data.siteUrl);
await container.updateHandler(); // 新しい値が送信される
```

複数フィールドの場合は `Promise.all()` を使用：
```javascript
await Promise.all([
  container.changeTitle(data.title),
  container.changeConfidential(data.confidential),
]);
await container.updateHandler();
```

### 2. ラジオボタンの値の型の一致

**問題**: ラジオボタンは**文字列**の値を持ちますが、Container の state は boolean かもしれません。型が一致しないと、選択状態の復元ができません。

❌ **間違い:**
```javascript
// HTML: <input type="radio" value="true" />
reset({
  isEmailPublished: true, // boolean - 文字列 "true" とマッチしない
});
```

✅ **正しい:**
```javascript
reset({
  isEmailPublished: String(container.state.isEmailPublished ?? true),
});
```

### 3. チェックボックスの値の扱い

チェックボックスは boolean 値を直接使えます（変換不要）：
```javascript
reset({
  fileUpload: container.state.fileUpload ?? false,
});
```

### 4. リアルタイム Container 更新に watch() を使わない

**削除したパターン**: フォームの変更を `watch()` と `useEffect` でリアルタイムに Container に同期し戻すのは不要で、複雑さを増すだけです。

❌ **これはやらない:**
```javascript
const watchedValues = watch();
useEffect(() => {
  container.changeField(watchedValues.field);
}, [watchedValues]);
```

✅ **submit 時だけ更新:**
- Container の state は最終的な API リクエストにのみ使用される
- `onSubmit` で API ハンドラーを呼ぶ前に更新すればよい

### 5. フォームフィールドの disabled vs readOnly

**問題**: `disabled` フィールドはフォーム送信データから除外されます。

フィールドを編集不可にしたいが、フォームデータには含めたい場合：
- `disabled` の代わりに `readOnly` を使用
- または属性を削除して Container/API レイヤーで処理

### 6. defaultValues を指定しない

`useForm()` の引数に `defaultValues` を渡さないこと。

理由：
- `useEffect` で `reset()` を呼んでいるため、初期値はそちらで設定される
- コードの重複を避ける
- 他のファイルとパターンを統一

```javascript
// ❌ 冗長
const { register, reset } = useForm({
  defaultValues: { field: container.state.field }
});
useEffect(() => {
  reset({ field: container.state.field });
}, [container.state.field]);

// ✅ シンプル
const { register, reset } = useForm();
useEffect(() => {
  reset({ field: container.state.field });
}, [container.state.field]);
```

## 子コンポーネントのパターン

大きなフォームを子コンポーネントに分割する場合：

**親コンポーネント:**
```typescript
const { register, handleSubmit, reset } = useForm();
return <SmtpSetting register={register} />;
```

**子コンポーネント:**
```typescript
type Props = { register: UseFormRegister<any> };
export const SmtpSetting = ({ register }: Props) => {
  return <input {...register('smtpHost')} />;
};
```

子コンポーネントは `useForm` を使わず、親から `register` を受け取るだけです。

## テストチェックリスト

フォーム移行後に必ずテストすること：

1. ✅ **日本語 IME 入力と漢字変換** - 最も重要！
2. ✅ **ページリロード後にフォームの値が正しく復元される**
3. ✅ **空値を送信できる**（フィールドをクリアできる）
4. ✅ **フォーム送信で現在の入力値が送信される**（古い/古びた値ではない）
5. ✅ **ラジオボタンとチェックボックスが正しく復元される**

## 適用可能な範囲

このガイドラインは以下の Admin フォームに適用可能：

- Unstated Container でグローバルステートを管理しているフォーム
- `apps/app/src/client/services/Admin*Container.js` 配下の Container を使用しているフォーム
- `/admin` ルート配下のコンポーネント

## 将来の移行パス

現在の中間地点（React Hook Form + Unstated）から最終目標（React Hook Form + Jotai）への移行は：

1. まず全ての Admin フォームを React Hook Form に移行（このガイドライン）
2. Container の `change*()` メソッドを Jotai の setter に置き換え
3. Container の `update*Handler()` を直接 API 呼び出しに変更
4. Unstated Container を完全に削除

この段階的アプローチにより、各ステップでリグレッションを最小化できます。

## 関連ファイル

- Container 群: `apps/app/src/client/services/Admin*Container.js`
- ボタンコンポーネント: `apps/app/src/client/components/Admin/Common/AdminUpdateButtonRow.tsx`
- React Hook Form: package.json に v7.45.4 として既存
- Jotai: 将来的に導入予定
