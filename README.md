# WebRTC Call Recorder - OSS

> **新しい方向（2026-11-12 決定）**: Ring は「携帯用迷惑電話ブロックアプリ」として開発を続けます（Android 先行、Apple Developer 登録なし）。Web アプリ層は [spam-blocker/](spam-blocker/) に実装済みです。本 README の通話録音システムも削除せず残しています。

グローバル対応の VoIP 通話録音アプリケーション（オープンソース）

**ステータス**: v0.2.0 Beta (Phase 3 完了 - Production Ready)

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

## 機能（完了）

### Phase 1-2: コア機能
- [x] WebRTC ベースの通話架橋
- [x] 法規自動判定エンジン（国・州、25ヶ国対応）
- [x] 通話単位の同意管理（署名付きログ）
- [x] RSA-2048 署名 + RFC3161 タイムスタンプ
- [x] テレメトリ（オプトイン、匿名化）
- [x] React Native モバイルクライアント（iOS/Android）
- [x] Web ダッシュボード（リアルタイム監視）

### Phase 3: 本番対応
- [x] ヘルスチェック・検証スクリプト
- [x] メトリクス収集・監視（Prometheus 対応）
- [x] 環境別設定（開発・本番）
- [x] 統合テストフレームワーク（92.5% カバレッジ）
- [x] Pre-commit hooks（Husky）
- [x] 開発ガイド・ドキュメント

### Phase 4: 今後予定
- [ ] 法務レビュー（主要国弁護士による）
- [ ] セキュリティ監査（第三者による）
- [ ] サーバ側録音（mediasoup SFU）
- [ ] ビデオ通話対応
- [ ] 負荷試験（5000+ RPS）

## クイックスタート

### 📖 はじめてご利用の方へ

**→ [GETTING_STARTED.md](GETTING_STARTED.md) から始めてください**

このドキュメントで以下が選べます：
- 🚀 **QUICKSTART**: 5分で試す
- 📖 **INSTALLATION**: 詳細なセットアップ手順
- 🏗️ **ARCHITECTURE**: システム設計の理解
- 🔧 **TROUBLESHOOTING**: 問題解決

### 前提条件
- Node.js 18+
- PostgreSQL 12+
- npm 9+

### 5分でローカル起動

```bash
# リポジトリクローン
git clone https://github.com/shizukutanaka/Ring.git
cd Ring

# サーバ起動
cd server
npm install
npm run dev

# （別ターミナル）モバイル開発
cd mobile
npm install
npm start

# （別ターミナル）ダッシュボード
cd client
npx http-server . -p 8080
# http://localhost:8080 で確認
```

詳細は [QUICKSTART.md](QUICKSTART.md) を参照

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

## ドキュメント

| ドキュメント | 説明 |
|-----------|------|
| [GETTING_STARTED.md](./GETTING_STARTED.md) | 📖 ナビゲーションハブ（最初はここから） |
| [QUICKSTART.md](./QUICKSTART.md) | 🚀 5分でセットアップ |
| [INSTALLATION.md](./INSTALLATION.md) | 📋 詳細なインストール手順 |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 🏗️ システム設計・アーキテクチャ |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) | 🔧 よくある問題と解決方法 |
| [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) | 👨‍💻 開発者ガイド |
| [docs/API.md](./docs/API.md) | 📡 API リファレンス |
| [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) | ☁️ デプロイメントガイド |
| [docs/LEGAL.md](./docs/LEGAL.md) | ⚖️ 法規要件・対応国 |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | 🤝 寄稿ガイドライン |

## 開発・寄稿

[CONTRIBUTING.md](./CONTRIBUTING.md) を参照してください。

## セキュリティ

セキュリティ脆弱性報告は [SECURITY.md](./SECURITY.md) を参照してください。

## ライセンス

[LICENSE](./LICENSE) - MIT

## サポート・問題報告

- **バグ報告**: [GitHub Issues](https://github.com/shizukutanaka/Ring/issues)
- **機能リクエスト**: [GitHub Discussions](https://github.com/shizukutanaka/Ring/discussions)
- **セキュリティ**: [SECURITY.md](./SECURITY.md)

---

## 重要な注意

**本番運用前に必ず以下を実施してください:**
1. 利用地域の弁護士による法規レビュー（docs/LEGAL.md 参照）
2. セキュリティ監査（第三者推奨）
3. 大規模負荷テスト
4. ディザスタリカバリプラン確立

詳細は [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) を参照してください。
