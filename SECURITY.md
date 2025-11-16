# セキュリティと プライバシーポリシー

## セキュリティ脆弱性の報告

セキュリティ脆弱性を発見した場合は、GitHub Issue ではなく以下の方法で報告してください：

1. GitHub Security Advisory を使用
2. メール: security@example.com

報告には以下を含めてください：
- 脆弱性の詳細な説明
- 再現ステップ
- 潜在的な影響
- 推奨される修正方法

---

## データセキュリティ

### 暗号化

- **保存中**: 録音データは AES-256-CBC で暗号化
- **転送中**: すべての通信は HTTPS/WSS を使用（本番環境）
- **キー管理**: 暗号化キーは端末固有キー（Android Keystore / iOS Keychain）で保護

### 同意ログと署名

- 通話ごとの同意ログを保存
- RSA-2048 による署名で改ざん防止
- RFC3161 タイムスタンプで法的証拠性を確保

### データ保持

- 生ログ: 90日（設定可能）
- 集計データ: 3年
- 同意ログ: 法的要件による（最低1年）

---

## プライバシー要件（地域別）

### 日本

- **法律**: 個人情報保護法（APPI）
- **要件**: 利用目的の明示、本人の同意
- **削除権**: 本人はいつでもデータ削除を要求可能

### EU / UK

- **法律**: GDPR / UK GDPR
- **要件**: 適切な処理根拠、通知、保存制限、DPA（必要に応じ）
- **権利**: アクセス権、訂正権、削除権、移植性、異議権

### 米国

- **法律**: 州別（CCPA, VCCPA 等）
- **要件**: 明確な同意、プライバシーポリシー公開
- **削除権**: カリフォルニア（CCPA）等で要求可能

### その他の地域

各国の個人情報保護法・プライバシー法に準拠してください。

---

## テレメトリとアナリティクス

### 収集ポリシー

- **完全オプトイン**: ユーザーが明示的に同意した場合のみ収集
- **最小データ**: 個人識別情報は収集しない
- **匿名化**: すべてのユーザー識別子は HMAC でハッシュ化

### 収集項目（例）

```json
{
  "event": "call_started",
  "ts": "2025-11-17T10:00:00Z",
  "region_code": "JP",
  "app_version": "0.1.0",
  "os": "Android-14",
  "anon_user_hash": "sha256(...)"
}
```

### 保持期間

- 生ログ: 90日（その後削除またはアーカイブ）
- 集計済みデータ: 3年

### オプトアウト

ユーザーはいつでもテレメトリを無効化可能：

```
Settings → Privacy → Analytics → Disable
```

---

## ネットワークセキュリティ

### TLS/SSL

本番環境では必ず以下を実装：

```
server {
  listen 443 ssl;
  ssl_certificate /path/to/cert.pem;
  ssl_certificate_key /path/to/key.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;
}
```

### CORS

CORS は適切に制限：

```javascript
const cors = require('cors');
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
```

### CSRF Protection

フォーム送信は CSRF トークン付きで実装（必要な場合）。

---

## 認証とアクセス制御

### JWT トークン

- 有効期限: 1時間（設定可能）
- 署名アルゴリズム: HS256（HMAC-SHA256）
- リフレッシュトークン: 別途実装推奨（本PoC未実装）

### ロールベースアクセス制御（RBAC）

```
- admin: 全機能へのアクセス
- user: テレメトリ・ダッシュボード表示のみ
- guest: ヘルスチェック・公開 API のみ
```

---

## コードセキュリティ

### 実装ルール

1. **入力検証**: すべてのユーザー入力を検証・サニタイズ
2. **SQL インジェクション防止**: パラメータ化クエリを使用
3. **XSS 防止**: HTML エスケープ、Content Security Policy
4. **OWASP Top 10**: 定期的に監査

### npm セキュリティ

```bash
# 脆弱性をチェック
npm audit

# 自動修正
npm audit fix
```

---

## ログと監査

### 監査ログ

以下を記録：
- ログイン試行（成功・失敗）
- データアクセス
- データ変更・削除
- 同意ログの生成・署名

### ログの保持と管理

- 保持期間: 1年（法的要件による）
- 暗号化: ログをディスク上で暗号化保存
- アクセス制限: admin のみ

---

## 定期的なセキュリティレビュー

- **月次**: npm audit, 依存関係更新確認
- **四半期**: コードレビュー, SAST/DAST 実施
- **年次**: ペネトレーションテスト, 法務監査

---

## 報告義務

データ漏洩が発生した場合：

1. **直ちに影響を受けたユーザーに通知**（GDPR では 72 時間以内）
2. **規制当局へ報告**（GDPR では必須）
3. **事件報告書を作成・保管**

---

## 参考資料

- [OWASP Top 10](https://owasp.org/Top10/)
- [GDPR Official Text](https://gdpr-info.eu/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CWE/SANS Top 25](https://cwe.mitre.org/top25/)

---

最後の更新: 2025-11-17
