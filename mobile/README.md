# WebRTC Call Recorder - Mobile Client

React Native ベースのモバイルクライアント。iOS/Android 両対応。

**ステータス**: 開発中（0.1.0 Beta）

## 機能

- ✅ ユーザー認証（JWT）
- ✅ 通話履歴表示
- ✅ リアルタイム通話表示
- ✅ 録音同意管理
- ✅ 設定画面
- 🔄 WebRTC 通話機能（実装中）
- 🔄 実際の通話録音（実装中）

## 環境要件

- Node.js 16+
- npm 8+ または yarn 1.22+
- React Native 0.72+
- iOS 13+ または Android 8+
- Xcode 14+（iOS）
- Android SDK 31+（Android）

## インストール

### 1. 依存関係インストール

```bash
cd mobile
npm install
# または
yarn install
```

### 2. iOS セットアップ（macOS）

```bash
cd ios
pod install
cd ..
```

### 3. Android セットアップ

```bash
# Android SDK をインストール（Android Studio から）
# または gradle をセットアップ
```

## 実行

### iOS

```bash
npm run ios
# または
react-native run-ios --device
```

### Android

```bash
npm run android
# または
react-native run-android
```

### 開発サーバ起動

別のターミナルで：

```bash
npm start
```

## プロジェクト構成

```
mobile/
├── App.js                      # メインアプリケーション
├── src/
│   ├── screens/
│   │   ├── LoginScreen.js      # ログイン画面
│   │   ├── CallsScreen.js      # 通話履歴画面
│   │   ├── SettingsScreen.js   # 設定画面
│   │   └── CallInProgressScreen.js # 通話中画面
│   ├── services/
│   │   ├── api.js              # API クライアント
│   │   ├── webrtc.js           # WebRTC 管理
│   │   └── auth.js             # 認証管理
│   └── utils/
│       ├── crypto.js            # 暗号化ユーティリティ
│       └── storage.js            # ローカルストレージ
├── tests/
│   └── *.test.js
├── app.json                    # アプリ設定
└── package.json

```

## 設定

### API エンドポイント

デフォルト: `http://localhost:3000/api`

環境変数で変更：

```bash
REACT_APP_API_URL=https://api.example.com/api npm start
```

### 法規設定

`src/screens/SettingsScreen.js` で地域別設定を調整可能。

## ビルド

### iOS Release ビルド

```bash
react-native run-ios --configuration Release
# または Xcode から直接ビルド
```

### Android Release ビルド

```bash
cd android
./gradlew assembleRelease
# または APK をビルド
./gradlew assembleRelease
```

## テスト

```bash
npm test
# または watch mode
npm test -- --watch
```

## デバッグ

### Redux DevTools（状態管理のデバッグ）

```bash
npm install redux-devtools
```

### React Native Debugger

1. [React Native Debugger](https://github.com/jhen0409/react-native-debugger) をダウンロード
2. アプリで `Ctrl+M` / `Cmd+D` を長押し
3. "Debug JS Remotely" を選択

## トラブルシューティング

### Metro バンドラーエラー

```bash
npm start -- --reset-cache
```

### Pod インストール エラー（iOS）

```bash
cd ios
rm Podfile.lock
pod install
cd ..
```

### Android ビルドエラー

```bash
cd android
./gradlew clean
cd ..
npm start
npm run android
```

## セキュリティに関する注意

- API エンドポイントは本番環境で HTTPS を使用してください
- JWT トークンは `AsyncStorage` で暗号化保存されます
- 録音データはローカルで AES-256 で暗号化されます
- 定期的にセキュリティアップデートを確認してください

## 法的要件

このアプリケーションを使用する前に、`../docs/LEGAL.md` を参照し、利用地域の通話録音に関する法律を確認してください。

## 開発ガイドライン

- コードスタイル: ESLint（`.eslintrc.js`）
- フォーマッタ: Prettier（`.prettierrc`）
- テスト: Jest + React Testing Library

```bash
# Lint チェック
npm run lint

# Format
npx prettier --write src/
```

## Husky（Git Hooks）

プリコミット・プッシュ時に自動的にテストと Lint を実行：

```bash
npm install husky --save-dev
husky install
```

## パフォーマンス最適化

- 画像最適化: `react-native-fast-image`
- メモリ削減: `memo()` と `useCallback()`
- バンドルサイズ削減: 不要なライブラリ削除

## 次のステップ

- [ ] WebRTC 統合の完成
- [ ] ローカル通話録音機能
- [ ] バックグラウンド実行対応
- [ ] プッシュ通知機能
- [ ] ダークモード対応
- [ ] オフライン対応

## サポート

問題が発生した場合：

1. GitHub Issues で既知の問題を検索
2. `react-native-cli` 設定を確認
3. ログを確認：`react-native log-android` / `react-native log-ios`

## ライセンス

MIT - 詳細は [LICENSE](../LICENSE) を参照

---

**最後の更新**: 2025-11-17
**バージョン**: 0.1.0 Beta
