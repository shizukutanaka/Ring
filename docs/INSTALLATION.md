# インストール・セットアップガイド

## 必要な環境

- Node.js 18+
- PostgreSQL 12+
- npm 9+
- Git

## ローカルセットアップ（開発環境）

### 1. リポジトリをクローン

```bash
git clone https://github.com/your-org/webrtc-call-recorder.git
cd webrtc-call-recorder
```

### 2. サーバの初期化

```bash
cd server

# 依存関係をインストール
npm install

# .env ファイルをコピー
cp .env.example .env
```

### 3. .env を編集

`server/.env` を開き、以下を設定します：

```env
PORT=3000
WS_PORT=8080

# PostgreSQL の接続情報
DATABASE_URL=postgresql://user:password@localhost:5432/webrtc_recorder

# JWT シークレット（32文字以上のランダムな値）
JWT_SECRET=your-long-random-secret-key-here-minimum-32-characters
JWT_EXPIRES_IN=1h

NODE_ENV=development
```

### 4. PostgreSQL データベースを作成

```bash
# PostgreSQL にログイン
psql -U postgres

# データベースを作成
CREATE DATABASE webrtc_recorder;

# ユーザーを作成
CREATE USER webrtc_user WITH PASSWORD 'secure_password';

# 権限を付与
GRANT ALL PRIVILEGES ON DATABASE webrtc_recorder TO webrtc_user;

# 終了
\q
```

### 5. スキーマを初期化

```bash
psql -U webrtc_user -d webrtc_recorder -f server/init_db.sql
```

### 6. サーバを起動

```bash
cd server
npm start
```

出力：
```
Express server listening on port 3000
WebSocket server listening on port 8080
Health check: http://localhost:3000/health
```

### 7. クライアント（ダッシュボード）を起動

別のターミナルで：

```bash
cd client
python3 -m http.server 8080
```

または Node.js:

```bash
npx http-server . -p 8080
```

### 8. ダッシュボードにアクセス

ブラウザで `http://localhost:8080/dashboard.html` を開きます。

**デフォルト認証情報:**
- Username: `admin`
- Password: `admin123`

---

## Docker を使用したセットアップ

### 1. Docker Compose ファイルを作成

`docker-compose.yml` を作成：

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: webrtc_user
      POSTGRES_PASSWORD: secure_password
      POSTGRES_DB: webrtc_recorder
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./server/init_db.sql:/docker-entrypoint-initdb.d/init.sql

  server:
    build:
      context: ./server
    environment:
      DATABASE_URL: postgresql://webrtc_user:secure_password@postgres:5432/webrtc_recorder
      JWT_SECRET: your-long-random-secret-key-here
      NODE_ENV: development
    ports:
      - "3000:3000"
      - "8080:8080"
    depends_on:
      - postgres
    volumes:
      - ./server:/app

volumes:
  postgres_data:
```

### 2. サービスを起動

```bash
docker-compose up -d
```

### 3. ログを確認

```bash
docker-compose logs -f server
```

---

## 本番環境へのデプロイ

### Kubernetes への デプロイ

`k8s/deployment.yaml` を参照してください。

```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

### セキュリティ設定

1. **TLS/SSL の有効化**: 本番環境では必ず HTTPS/WSS を使用
2. **環境変数の管理**: JWT_SECRET と DATABASE_URL は安全に管理
3. **ファイアウォール**: 必要なポート（3000, 8080）のみを開放

---

## トラブルシューティング

### PostgreSQL 接続エラー

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

→ PostgreSQL が起動していることを確認：
```bash
psql -U postgres -c "SELECT 1;"
```

### WebSocket エラー

```
WebSocket connection failed
```

→ ファイアウォール設定を確認し、ポート 8080 を開放

### npm インストールエラー

```bash
npm cache clean --force
rm -rf node_modules
npm install
```

---

## テスト API エンドポイント

### Health Check

```bash
curl http://localhost:3000/health
```

### Login

```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### Legal DB Lookup

```bash
curl "http://localhost:3000/api/legaldb/lookup?country_code=JP"
```

### テレメトリ送信

```bash
curl -X POST http://localhost:3000/api/collect \
  -H "Content-Type: application/json" \
  -d '[{"event":"test_event","region_code":"JP","app_version":"0.1.0"}]'
```
