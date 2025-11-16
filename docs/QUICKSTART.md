# クイックスタートガイド

## 5分で始める WebRTC Call Recorder

### ステップ 1: 環境準備

必要なもの：
- Node.js 18+ ([https://nodejs.org/](https://nodejs.org/))
- PostgreSQL 12+ ([https://www.postgresql.org/](https://www.postgresql.org/))
- Git

### ステップ 2: リポジトリをクローン

```bash
git clone https://github.com/your-org/webrtc-call-recorder.git
cd webrtc-call-recorder
```

### ステップ 3: PostgreSQL データベース作成

```bash
# PostgreSQL に接続
psql -U postgres

# 以下を実行
CREATE DATABASE webrtc_recorder;
CREATE USER webrtc_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE webrtc_recorder TO webrtc_user;
\q
```

### ステップ 4: サーバを起動

```bash
cd server

# 依存関係をインストール
npm install

# .env ファイルを作成
cp .env.example .env

# .env を編集（以下の値を設定）
# DATABASE_URL=postgresql://webrtc_user:secure_password@localhost:5432/webrtc_recorder
# JWT_SECRET=your-secret-key-here

# データベーススキーマを初期化
psql -U webrtc_user -d webrtc_recorder -f init_db.sql

# サーバを起動
npm start
```

出力：
```
Express server listening on port 3000
WebSocket server listening on port 8080
Health check: http://localhost:3000/health
```

### ステップ 5: ダッシュボードを起動

別のターミナルで：

```bash
cd client
python3 -m http.server 8080
```

### ステップ 6: ダッシュボードにアクセス

ブラウザで以下にアクセス：
```
http://localhost:8080/dashboard.html
```

**ログイン情報:**
- Username: `admin`
- Password: `admin123`

---

## 動作確認

### Health Check

```bash
curl http://localhost:3000/health
```

### ログイン

```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

出力例：
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

### 法規 DB 照会

```bash
curl "http://localhost:3000/api/legaldb/lookup?country_code=JP"
```

出力例：
```json
{
  "type": "one_party",
  "note": "日本: 原則一方同意で録音可能。ただし利用目的と通知を明示すること。",
  "legal_basis": "個人情報保護法",
  "requires_disclosure": true
}
```

### テレメトリ送信

```bash
curl -X POST http://localhost:3000/api/collect \
  -H "Content-Type: application/json" \
  -d '[{
    "event":"call_started",
    "region_code":"JP",
    "app_version":"0.1.0",
    "os":"Android",
    "anon_user_hash":"sha256hash"
  }]'
```

---

## 次のステップ

1. **モバイルクライアント開発**: `docs/CLIENT_SETUP.md` を参照
2. **API 仕様**: `docs/API.md` を参照
3. **デプロイ**: `docs/INSTALLATION.md` の「本番環境へのデプロイ」を参照
4. **法規要件**: `docs/LEGAL.md` を参照してください

---

## トラブルシューティング

### PostgreSQL 接続エラー

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

解決方法：
```bash
# PostgreSQL が起動しているか確認
psql -U postgres -c "SELECT 1;"

# 起動していない場合（Linux/macOS）
brew services start postgresql

# または Windows の場合、Services で PostgreSQL を再起動
```

### Port がすでに使用中

```
listen EADDRINUSE :::3000
```

解決方法：
```bash
# 別のポートを使用する場合、.env で PORT を変更
PORT=3001
```

### npm install でエラー

```bash
# キャッシュをクリア
npm cache clean --force

# node_modules を削除して再インストール
rm -rf node_modules
npm install
```

---

## サポート

問題が発生した場合：

1. `docs/INSTALLATION.md` を確認
2. GitHub Issues で既知の問題を検索
3. セキュリティ脆弱性は `SECURITY.md` を参照

---

最後の更新: 2025-11-17
