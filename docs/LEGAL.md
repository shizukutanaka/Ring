# 法的要件と各国対応

## 概要

本アプリケーションを利用する際は、利用地域の通話録音に関する法律を **必ず遵守** してください。

本文書は情報提供のみを目的としており、法的助言ではありません。各自の地域における法律については、弁護士に相談してください。

---

## 米国

### 概要

米国では「片方同意（One-Party）」と「全員同意（All-Party / Two-Party）」の 2 つのルールがあります。

**州が定める法律により異なるため、発信者の州を特定して処理する必要があります。**

### One-Party Rule（片方同意）

以下の州では、通話録音に際して自分と相手の一方の同意があれば可能です：

- テキサス
- ニューヨーク
- フロリダ
- アラバマ
- アラスカ
- アリゾナ
- アーカンソー
- コロラド
- コネチカット
- デラウェア
- ハワイ
- アイダホ
- イリノイ
- インディアナ
- アイオワ
- カンザス
- ケンタッキー
- ルイジアナ
- メイン
- メリーランド
- マサチューセッツ
- ミシガン
- ミネソタ
- ミシシッピ
- ミズーリ
- モンタナ
- ネブラスカ
- ネバダ
- ニュー・ハンプシャー
- ニュー・ジャージー
- ニュー・メキシコ
- ノースカロライナ
- ノース・ダコタ
- オハイオ
- オクラホマ
- ペンシルバニア
- ロード・アイランド
- サウス・カロライナ
- サウス・ダコタ
- テネシー
- ユタ
- バーモント
- バージニア
- ワシントン
- ウエスト・バージニア
- ウィスコンシン
- ワイオミング
- コロンビア特別区

### All-Party Rule（全員同意）

以下の州では、通話に参加しているすべての者の同意が必要です：

- **カリフォルニア**
- **イリノイ** （注: 上記で一方同意と記載されていますが、イリノイは争点があります。法務確認推奨）
- **フロリダ** （注: 一部事例では全員同意と解釈）

**重要**: カリフォルニア、フロリダ、イリノイでの録音は特に注意が必要です。弁護士の確認を推奨します。

### アプリ実装上の対応

```javascript
const ALL_PARTY_STATES = ['CA', 'IL', 'FL'];
const region = getRegionCode(); // 'US-CA' 等

if (ALL_PARTY_STATES.includes(region.split('-')[1])) {
  showDialog('All parties must consent to recording');
  requireBothPartyConsent = true;
} else {
  showDialog('This call will be recorded');
  requireBothPartyConsent = false;
}
```

---

## EU（GDPR）/ UK

### 法律

- **EU**: GDPR (Regulation EU 2016/679)
- **UK**: UK GDPR + Data Protection Act 2018

### 要件

#### 1. 処理根拠（Legal Basis）

録音は個人データ処理となるため、以下のいずれかの処理根拠が必要：

- **同意**: ユーザーが通話録音に対して明示的に同意した場合
- **契約**: 通話サービス提供に必要である場合
- **法的義務**: 法律により記録が義務付けられている場合

アプリケーション側では **同意** を推奨します。

#### 2. 通知義務

ユーザーに以下を明示する必要があります：

- 組織の名前
- 処理目的（品質管理、記録保存など）
- 処理根拠
- 保持期間
- データ主体の権利（アクセス、訂正、削除）

#### 3. 保存制限

データは以下の期間を超えて保存してはいけません：

- 生ログ: 90日
- 集計済みデータ: 3年（法的必要性による）
- 同意ログ: 最低1年

#### 4. セキュリティ

- データは暗号化する
- アクセスは認可されたユーザーのみ
- 定期的なセキュリティ監査

### DPA（Data Processing Agreement）が必要な場合

クラウドストレージサービス等の第三者にデータを処理させる場合は、DPA を締結する必要があります。

### アプリ実装上の対応

```javascript
// GDPR 準拠の同意テンプレート
const consentText = `
本通話は品質向上と記録保存を目的として録音されます。
当機関はあなたのデータを GDPR に基づいて処理します。

あなたは以下の権利を有します：
- データアクセス権
- 訂正権
- 削除権（忘れられる権利）
- データ携行権
- 処理への異議権

同意されますか？
`;

showConsentDialog(consentText);
```

---

## 日本

### 法律

- **個人情報保護法（APPI）**

### 要件

#### 1. 利用目的の明示

録音の利用目的を明確に示す必要があります：

- 品質管理
- 記録保存
- トレーニング
- その他

#### 2. 本人の同意

通話録音に際して本人から同意を取得する必要があります。

#### 3. セキュリティ対策

個人情報として適切に暗号化・保管する必要があります。

#### 4. データ保持期間

不必要に長く保持すべきではありません。

### アプリ実装上の対応

```javascript
const consentText = `
本通話は品質向上のために録音されます。
録音に同意されますか？
`;

// 同意を取得後、タイムスタンプ付きでログに記録
recordConsent({
  timestamp: new Date().toISOString(),
  user_consent: true,
  purpose: 'quality_improvement'
});
```

---

## その他の地域

| 国 | 法律 | 一方同意 / 全員同意 | 備考 |
|----|------|-----------------|------|
| カナダ | Criminal Code | 全員同意 | 州により異なる可能性あり |
| オーストラリア | Surveillance Devices Act | 州による | 州別に確認必須 |
| ニュージーランド | Crimes Act 1961 | 一方同意 | 許容される |
| インド | Telegraph Act | 要確認 | 規制が不明確 |
| ブラジル | LGPD | 一方同意 | GDPR 類似規制あり |
| 中国 | Cybersecurity Law | 制限あり | 現地法務必須 |

---

## ベストプラクティス

### 1. ユーザーの地域を判定

```javascript
async function checkRecordingRules(userLocation) {
  const rules = await fetch(`/api/legaldb/lookup?country_code=${userLocation}`);
  return rules.json();
}
```

### 2. 明示的な同意を取得

```javascript
showConsentDialog({
  title: 'Recording Notice',
  message: 'This call will be recorded. Do you consent?',
  requiredAction: 'accept_or_decline'
});
```

### 3. 相手方にも通知

```javascript
// 通話相手にも同意を求める（All-Party ルール対応）
notifyRemoteParty('Recording consent request');
playAudioNotification('This call is being recorded');
```

### 4. 同意ログを署名付きで保存

```javascript
const consentLog = {
  call_id: uuid(),
  timestamp: new Date().toISOString(),
  region_code: 'US-CA',
  consent: true,
  signature: rsaSign(jsonData, privateKey)
};
saveToDatabase(consentLog);
```

### 5. ユーザーに削除権を提供

```javascript
// ユーザーが自分の録音を削除できるようにする
deleteRecording(recordingId);
```

---

## 法的責任の免責

本アプリケーションの開発者および配布者は、利用者による本アプリケーションの使用に関連して生じたいかなる法的責任も負いません。

利用者は自らの責任において、利用地域の法律を遵守してください。

---

## 相談先

- 各国の弁護士
- 個人情報保護委員会（日本）
- ICO（Information Commissioner's Office, UK）
- CNIL（Commission Nationale de l'Informatique et des Libertés, France）

---

最後の更新: 2025-11-17
