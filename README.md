# WebRTC Call Recorder - OSS

グローバル対応の VoIP 通話録音アプリケーション（オープンソース）

**現在：技術 PoC フェーズ**

## 概要

本プロジェクトは、WebRTC ベースの通話録音システムを、世界中で安全かつ合法的に利用できるように設計したオープンソース基盤です。

- **対象OS**: Android（サイドロード）、iOS（TestFlight/Enterprise）
- **基盤技術**: WebRTC（VoIP）+ Node.js サーバ + 法規自動判定エンジン
- **特徴**: 国・州レベルの法規自動判定、署名付き同意ログ、テレメトリ（オプトイン）

## 配布方針

- **Google Play**: 非対応（ポリシー制限のため）
- **App Store**: 非対応（予定）
- **配布方式**: GitHub OSS + サイドロード（Android）/ TestFlight（iOS）

## プロジェクト構成

```
webrtc-call-recorder/
├── server/                 # Node.js シグナリング・テレメトリサーバ
├── client/                 # Web ダッシュボード・管理UI
├── legaldb/                # 法規判定 DB（JSON）
├── docs/                   # ドキュメント・仕様
├── .github/workflows/      # GitHub Actions（CI/CD）
└── README.md
```

## 機能（計画）

### コア機能
- [x] WebRTC ベースの通話架橋
- [ ] サーバ側録音（mediasoup）
- [x] 法規自動判定エンジン（国・州）
- [x] 通話単位の同意管理
- [ ] RSA 署名 + RFC3161 タイムスタンプ
- [x] テレメトリ（オプトイン、匿名化）

### 管理・運用
- [x] 法規 DB 差分配信 API
- [x] ダッシュボード（リアルタイム）
- [ ] 負荷試験・性能評価
- [ ] 法務レビュー（主要国）

## クイックスタート

### 前提条件
- Node.js 18+
- PostgreSQL 12+
- npm 9+

### ローカル起動

```bash
# リポジトリクローン
git clone https://github.com/your-org/webrtc-call-recorder.git
cd webrtc-call-recorder

# サーバ初期化
cd server
npm install
cp .env.example .env
# .env に DATABASE_URL と JWT_SECRET を設定
npm start

# （別ターミナル）クライアント
cd client
python3 -m http.server 8080
# http://localhost:8080 でダッシュボード確認
```

## 法規要件と同意

**重要**: このアプリケーションを利用する際は、利用地域の通話録音に関する法律を遵守してください。

- 日本: 原則一方同意
- EU/UK: GDPR 準拠、通知・同意が必須
- 米国: 州ごとに異なる（片方同意/全員同意）

詳細は [docs/legal/](./docs/legal/) を参照してください。

## セキュリティと プライバシー

- 録音データはローカルで暗号化（AES-256）
- 同意ログは RSA 署名で改ざん防止
- テレメトリはユーザーオプトイン、完全匿名化
- データ保持期間: 90日（設定可能）

## 開発・寄稿

[CONTRIBUTING.md](./CONTRIBUTING.md) を参照してください。

## ライセンス

[LICENSE](./LICENSE) - MIT

## サポート・問題報告

GitHub Issues を利用してください。

---

**注意**: このプロジェクトは技術 PoC フェーズです。本番運用前に各国の弁護士レビューを取得してください。
