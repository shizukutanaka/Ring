# 開発者ガイド

WebRTC Call Recorder の開発環境セットアップと開発ワークフロー。

## 📋 前提条件

- Node.js 18+
- npm 9+ または yarn 1.22+
- PostgreSQL 12+ (ローカル開発用)
- Git 2.30+
- Visual Studio Code（推奨）

## 🚀 初期セットアップ

### 1. リポジトリをクローン

```bash
git clone https://github.com/your-org/webrtc-call-recorder.git
cd webrtc-call-recorder
```

### 2. 依存関係をインストール

```bash
# サーバ
cd server
npm install

# モバイル
cd ../mobile
npm install

# ルートディレクトリに戻る
cd ..
```

### 3. 環境変数を設定

```bash
# サーバ開発環境
cp server/.env.example server/.env.development
```

`server/.env.development` の内容を確認・カスタマイズします：

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/webrtc_recorder
JWT_SECRET=dev-secret-key-minimum-32-chars
NODE_ENV=development
```

### 4. PostgreSQL をセットアップ

```bash
# PostgreSQL サーバを起動（macOS + Homebrew の場合）
brew services start postgresql

# または Docker
docker run -d \
  --name webrtc-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=webrtc_recorder \
  -p 5432:5432 \
  postgres:15

# スキーマを初期化
psql -U postgres -d webrtc_recorder -f server/init_db.sql
```

### 5. Git Hooks をセットアップ

```bash
# Husky を初期化
npm install husky --save-dev
npx husky install

# 実行権限を付与
chmod +x .husky/pre-commit
```

## 🔧 日常的な開発ワークフロー

### サーバ開発

```bash
# 開発サーバを起動（ホットリロード）
cd server
npm run dev

# テストを実行（watch mode）
npm test -- --watch

# コードをリント
npm run lint

# コードをフォーマット
npx prettier --write .
```

### モバイル開発

```bash
# 開発サーバを起動
cd mobile
npm start

# iOS でビルド＆実行（macOS）
npm run ios

# Android でビルド＆実行
npm run android
```

### ダッシュボード開発

```bash
# ローカルサーバを起動（ポート 8080）
cd client
python3 -m http.server 8080

# または Node.js
npx http-server . -p 8080
```

## 📊 ヘルスチェックと監視

### サーバのヘルスチェック

```bash
# 簡易チェック
curl http://localhost:3000/health

# 詳細チェック（スクリプト）
node scripts/health-check.js --verbose
```

### メトリクス確認

```bash
# JSON フォーマット
curl http://localhost:3000/metrics

# Prometheus フォーマット
curl http://localhost:3000/metrics/prometheus
```

## 🧪 テスト戦略

### ユニットテスト

```bash
# すべてのテストを実行
npm test

# 特定のテストファイルを実行
npm test signaling.test.js

# カバレッジを表示
npm test -- --coverage
```

### 統合テスト

```bash
# 統合テストを実行
npm test -- integration.test.js
```

### 負荷テスト

```bash
# サーバが起動している状態で実行
node tests/load-test.js --duration 60000 --rps 100

# レポート出力
cat load-test-report.json
```

## 📁 ファイル構造の理解

```
webrtc-call-recorder/
├── server/                 # Node.js バックエンド
│   ├── index.js           # メインサーバ
│   ├── signaling.js       # WebRTC シグナリング
│   ├── signing.js         # 署名・暗号化
│   ├── monitoring.js      # メトリクス収集
│   ├── package.json       # 依存関係
│   ├── jest.config.js     # テスト設定
│   └── tests/             # テストファイル
│
├── mobile/                # React Native
│   ├── App.js            # メインアプリ
│   ├── src/screens/      # 画面コンポーネント
│   └── package.json
│
├── client/               # Web ダッシュボード
│   └── dashboard.html
│
├── docs/                 # ドキュメント
├── scripts/              # ユーティリティスクリプト
└── tests/                # 統合・負荷テスト
```

## 🐛 デバッグのコツ

### Express サーバのデバッグ

```bash
# デバッグモードで起動
DEBUG=webrtc:* npm run dev

# Node Inspector を有効化
node --inspect-brk server/index.js

# Chrome DevTools で接続
# chrome://inspect
```

### React Native のデバッグ

```bash
# React Native Debugger をインストール
# https://github.com/jhen0409/react-native-debugger

# アプリで Ctrl+M / Cmd+D を長押し
# "Debug JS Remotely" を選択
```

## 📝 コード規約

### JavaScript/Node.js

- **ファイルサイズ**: 最大 300 行を推奨
- **関数長**: 最大 50 行を推奨
- **インデント**: 2 スペース
- **命名規則**:
  - 変数・関数: camelCase
  - クラス・型: PascalCase
  - 定数: UPPER_SNAKE_CASE

### コメント

```javascript
/**
 * 関数の説明（JSDoc）
 *
 * @param {string} param1 - パラメータの説明
 * @returns {Promise<object>} 戻り値の説明
 */
async function myFunction(param1) {
  // 複雑なロジックにはインラインコメント
  // TODO: 改善が必要な部分
  // FIXME: バグが存在する部分
}
```

### エラーハンドリング

```javascript
try {
  // 何かの処理
} catch (error) {
  logger.error('Processing failed', {
    message: error.message,
    stack: error.stack,
    context: { /* 関連情報 */ }
  });
  throw error; // または適切に処理
}
```

## 🔐 セキュリティ開発ガイドライン

### 禁止事項

- ❌ コード内にシークレット（パスワード、API キー）を埋め込まない
- ❌ 動的な SQL クエリを直接実行しない（必ずパラメータ化）
- ❌ ユーザー入力を検証なしで使用しない
- ❌ 外部 API の応答を無検証で信頼しない

### 推奨事項

- ✅ すべての入力を検証
- ✅ 適切なエラーメッセージを返す（内部詳細を隠す）
- ✅ ログには個人情報を含めない
- ✅ 定期的にセキュリティアップデートを確認

## 📦 依存関係の管理

### 新しい依存関係を追加

```bash
# 本番環境用
npm install package-name

# 開発環境用
npm install --save-dev package-name

# 依存関係を更新
npm update

# セキュリティ脆弱性をチェック
npm audit
npm audit fix
```

## 🚀 変更をコミット

### コミット前チェック（自動実行）

Husky が以下を自動実行します：

1. シークレットスキャン
2. ESLint
3. Prettier フォーマッティング
4. ユニットテスト

### コミットメッセージ規約

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: 新機能
- `fix`: バグ修正
- `docs`: ドキュメント更新
- `style`: コード整形（機能変更なし）
- `refactor`: リファクタリング
- `test`: テスト追加・修正
- `chore`: 設定・ビルド等

**例:**

```
feat(signaling): Add call rejection functionality

- Implement rejectCall() method
- Add UI for rejection
- Update database schema

Closes #123
```

## 📚 さらに詳しく

- [API ドキュメント](./API.md)
- [デプロイメントガイド](./DEPLOYMENT.md)
- [セキュリティポリシー](../SECURITY.md)
- [法規要件](./LEGAL.md)

## 🤝 問題が発生した場合

1. [GitHub Issues](https://github.com/your-org/webrtc-call-recorder/issues) を検索
2. [Discord](https://discord.gg/example) で質問（あれば）
3. [Discussions](https://github.com/your-org/webrtc-call-recorder/discussions) で提案

## 📋 チェックリスト：PR を提出する前に

- [ ] コードをリント・フォーマット
- [ ] テストを実行してパス
- [ ] ドキュメントを更新
- [ ] コミットメッセージは規約に従っている
- [ ] 新しい依存関係を追加していない（必要な場合は理由を説明）
- [ ] シークレットがコードに含まれていない
- [ ] エラーケースをテストしている

---

**最後の更新**: 2025-11-17
