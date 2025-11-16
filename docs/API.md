# WebRTC Call Recorder API ドキュメント

## 概要

WebRTC Call Recorder の REST API 及び WebSocket API 仕様です。

**ベース URL**: `http://localhost:3000/api`
**WebSocket URL**: `ws://localhost:8080`

---

## 認証

### JWT トークン

すべてのリクエストヘッダに以下を含めてください：

```
Authorization: Bearer <JWT_TOKEN>
```

JWT トークンは `/api/login` エンドポイントで取得します。

---

## REST API エンドポイント

### 1. ヘルスチェック

```
GET /health
```

サーバが起動しているか確認します。認証不要。

**レスポンス**:
```json
{
  "status": "ok",
  "timestamp": "2025-11-17T10:00:00Z"
}
```

---

### 2. ログイン

```
POST /api/login
```

ユーザーを認証し、JWT トークンを発行します。

**リクエストボディ**:
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**レスポンス（成功）**:
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

**レスポンス（失敗）**:
```json
{
  "error": "invalid_credentials"
}
```

---

### 3. テレメトリ送信

```
POST /api/collect
```

匿名化されたテレメトリデータを送信します。

**リクエストボディ**:
```json
[
  {
    "event": "call_started",
    "ts": "2025-11-17T10:00:00Z",
    "region_code": "JP",
    "app_version": "0.1.0",
    "os": "Android",
    "anon_user_hash": "sha256hash..."
  }
]
```

**レスポンス**:
```json
{
  "received": 1
}
```

---

### 4. 法規判定

#### 最新版確認

```
GET /api/legaldb/latest
```

最新の法規 DB バージョンと変更ハッシュを取得します。

**レスポンス**:
```json
{
  "version": "2025-11-17",
  "updated": "2025-11-17T00:00:00Z",
  "hash": "abc123def456...",
  "supported_countries": 25
}
```

#### 国・州別法規照会

```
GET /api/legaldb/lookup?country_code=JP&state_code=TX
```

指定した国・州の法規要件を取得します。

**クエリパラメータ**:
- `country_code` (必須): 国コード（例: `JP`, `US`, `GB`）
- `state_code` (オプション): 州コード（例: `CA`, `TX`）

**レスポンス**:
```json
{
  "type": "one_party",
  "note": "日本: 原則一方同意で録音可能。ただし利用目的と通知を明示すること。",
  "legal_basis": "個人情報保護法",
  "requires_disclosure": true
}
```

---

## WebSocket API

### 接続

```
ws://localhost:8080
```

WebSocket コネクションを確立します。サーバはイベント駆動型で、以下のメッセージを送受信します。

### イベント: 初期化

**サーバ→クライアント**

接続時、サーバは集計済みデータを送信します：

```json
{
  "type": "init",
  "data": [
    { "event_type": "call_started", "count": 42 },
    { "event_type": "recording_started", "count": 15 }
  ]
}
```

### イベント: リアルタイム更新

**サーバ→クライアント**

テレメトリイベント受信時、接続中のクライアント全体にブロードキャスト：

```json
{
  "type": "update",
  "data": {
    "event": "call_started",
    "region_code": "JP",
    "app_version": "0.1.0",
    "os": "iOS"
  },
  "timestamp": "2025-11-17T10:00:00Z"
}
```

---

## 通話管理 API（計画）

以下は今後実装予定のエンドポイントです。

### 通話開始

```
POST /api/calls/initiate
```

新しい通話を開始します。

**リクエストボディ**:
```json
{
  "initiator_id": "user-123",
  "recipient_id": "user-456",
  "call_type": "audio"
}
```

**レスポンス**:
```json
{
  "call_id": "uuid",
  "status": "pending",
  "created_at": "2025-11-17T10:00:00Z"
}
```

### 通話受け入れ

```
POST /api/calls/{call_id}/accept
```

通話を受け入れます。

### 録音同意

```
POST /api/calls/{call_id}/consent
```

通話録音に同意します。

**リクエストボディ**:
```json
{
  "user_id": "user-456",
  "consent_given": true,
  "region_code": "JP"
}
```

---

## エラーレスポンス

すべてのエラーレスポンスは以下の形式です：

```json
{
  "error": "error_code",
  "message": "Human-readable error message"
}
```

### 一般的なエラーコード

| コード | 説明 |
|-------|------|
| `invalid_credentials` | ログイン情報が無効 |
| `unauthorized` | トークンが無効または期限切れ |
| `bad_request` | リクエストパラメータが無効 |
| `not_found` | リソースが見つからない |
| `internal_server_error` | サーバー内部エラー |

---

## レート制限

- **テレメトリエンドポイント**: 1秒あたり 100 リクエスト
- **法規 DB**: 1分あたり 300 リクエスト
- **その他**: 1秒あたり 50 リクエスト

レート制限に達した場合、HTTP 429 (Too Many Requests) が返されます。

---

## キャッシング

### 法規 DB キャッシング

クライアント側で、`/api/legaldb/latest` でハッシュを確認し、変更があった場合のみ全データを再取得してください。

```javascript
// クライアント実装例
const lastHash = localStorage.getItem('legaldb_hash');
const latest = await fetch('/api/legaldb/latest');
const data = await latest.json();

if (data.hash !== lastHash) {
  // 差分取得または全体取得
  const db = await fetch('/api/legaldb/lookup?country_code=JP');
  localStorage.setItem('legaldb_hash', data.hash);
}
```

---

## リトライとタイムアウト

- **接続タイムアウト**: 10秒
- **読み取りタイムアウト**: 30秒
- **推奨リトライ戦略**: エクスポーネンシャルバックオフ（1秒、2秒、4秒、8秒、16秒）

---

## 例: 完全な通話フロー（想定）

```javascript
// 1. ログイン
const loginRes = await fetch('/api/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'user1', password: 'pass' })
});
const { token } = await loginRes.json();

// 2. 法規確認
const legalRes = await fetch('/api/legaldb/lookup?country_code=JP', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const legal = await legalRes.json();

// 3. テレメトリ送信
await fetch('/api/collect', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify([{
    event: 'call_started',
    region_code: 'JP',
    app_version: '0.1.0'
  }])
});

// 4. WebSocket 接続（リアルタイム更新）
const ws = new WebSocket('ws://localhost:8080');
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Update:', message);
};
```

---

## セキュリティに関する注意

1. **本番環境では HTTPS/WSS を使用してください**
2. **API キーまたはトークンを保存する際は暗号化を使用してください**
3. **CORS ヘッダを適切に設定してください**
4. **定期的にトークンを更新してください**

---

## OpenAPI 3.0 スペック

### Swagger UI

```
http://localhost:3000/api-docs
```

（今後実装予定）

---

最後の更新: 2025-11-17
