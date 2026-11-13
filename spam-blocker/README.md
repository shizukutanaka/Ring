# Ring 迷惑電話ブロック（Spam Call Blocker）

Ring の新しいプロダクト方向として、2026-11-12 に所有者が決定した「携帯用迷惑電話ブロックアプリ」の実装です。
従来の WebRTC 通話録音（ルートの README 参照）は削除せず、本ディレクトリに新しい層を追加しています。

方針:

- **Android 先行**。Apple Developer Program には登録しない決定（2026-11-12）のため、iOS の実機向け配布は対象外です。
- 構成は2層です。**Web アプリ層**と**ネイティブ層**（Android の通話スクリーニング）の両方を実装済みです。ただし Android 側は APK ビルド（assembleDebug）と実機動作が未検証です（検証状況の正本は `android/README.md`）。

## Web アプリ層（実装済み）

`index.html` — ビルド不要・外部リソース読み込みゼロの単一 HTML アプリです。ブラウザで開くだけで動きます（PC / モバイル両対応、日英切替つき）。

機能:

- **番号の検索**: 入力した番号を正規化し、ブロックリスト・前方一致ルール・既知の迷惑番号データ・自分の通報履歴と照合して判定を表示
- **番号の正規化**: 日本の国内形式（0…）、国際形式（+81…、0081…、01081…）、その他の国際番号（+CC…）に対応。全角数字も受理。種別判定（フリーダイヤル / IP電話 / 携帯 / ナビダイヤル / 固定電話 / 国際）つき
- **ブロックリスト管理**: 完全一致リスト、前方一致ルール（例: `0800`、`0501234`、`+8190`）、許可リスト（ブロックより優先）
- **通報**: 種別（詐欺の疑い / 勧誘 / 営業 / ワン切り / アンケート / その他）を選んで端末内に記録。自分の通報は判定の通報数に合算される
- **判定順序**（固定）: 形式不正 → 許可リスト → 完全一致ブロック → 前方一致ブロック → 既知の迷惑番号（警告）→ 自分の通報（警告）→ 一致なし
- **書き出し / 読み込み**: ブロックリストを JSON スキーマ v1 で入出力（後述）。ネイティブ層との共通形式

### サンプルデータについて

同梱の迷惑番号データは **すべてテスト用のダミー** です。番号は形式例として成立する未割当ての 000 パターンで構成され、実在の加入者の番号ではありません。アプリ内でも「サンプル」と明示しています。実データへの差し替えは、出典と権利が確認できるデータセットが得られた時点で行います。

## プライバシー設計

- **通話履歴・連絡先には一切アクセスしません。** Web 層はブラウザの権限自体を持ちません。
- **データは端末内で完結します。** ブロックリストと通報は `localStorage` にのみ保存されます。
- **外部送信はゼロです。** `index.html` は外部リソース（CDN・フォント・画像）を読み込まず、ネットワークリクエストを発生させません。これはテストでも担保しています（外部 URL 参照が無いことを単体テストで検証）。
- 通報のメモ欄のような自由記述は設けていません（個人情報の混入を避けるため）。

## データ形式: ブロックリスト JSON スキーマ v1

Web 層とネイティブ層の共通契約です。判定ロジック（正規化・判定順序）は両層で同一でなければならず、適合性はこのスキーマと判定順序で担保します。

```json
{
  "version": 1,
  "allow": ["+81312345678"],
  "blockExact": ["+819012345678"],
  "prefixes": [{ "prefix": "0800", "scope": "national" }, { "prefix": "8190", "scope": "e164" }],
  "reports": [{ "number": "+815012345678", "category": "fraud", "note": "", "ts": 1762000000000 }]
}
```

- `allow` / `blockExact`: E.164 形式（`+` 始まり）の完全一致リスト
- `prefixes`: 前方一致ルール。`scope: "national"` は国内形式（0始まり）の先頭一致、`scope: "e164"` は国番号を含む数字列の先頭一致
- `reports`: 通報記録。`number` は E.164、`category` は `fraud | solicitation | sales | onering | survey | other`

## ネイティブ層（Android・実装済み）

Android の `CallScreeningService` が本丸です。着信時に OS から番号を受け取り、上記スキーマ v1 のブロックリストで Web 層と **同じ判定順序** を適用し、ブロック対象は着信を拒否します。

実装は `android/` の Gradle プロジェクトです（本体は `android/app/src/main/java/app/ring/spamblocker/`）。以下は設計要点であり、実装はこの設計に沿っています。ビルド方法と検証状況は `android/README.md` を参照してください。

設計要点:

- ユーザーが設定でアプリを「発信者番号通知／迷惑電話対策アプリ」（`ROLE_CALL_SCREENING`）に指定することが前提。指定されない限りスクリーニングは動作しない
- `READ_CALL_LOG` / `READ_CONTACTS` は **要求しない**。スクリーニングサービスは着信番号だけを受け取るため、履歴・連絡先の権限は不要。これがプライバシー設計の核
- ブロックリストの供給: 当面は Web 層から書き出した JSON v1 をアプリへ読み込む方式。将来的な同期も、外部送信を伴う場合はオプトイン設計にする
- 判定が `block` の場合のみ `setDisallowCall(true)` + `setRejectCall(true)` で拒否。`warn` は OS 側で拒否せず、着信後にアプリ内通知で知らせる（CallScreeningService は着信中 UI を持たないため）

実装の抜粋（Kotlin、`android/app/src/main/java/app/ring/spamblocker/RingCallScreeningService.kt`）:

```kotlin
class RingCallScreeningService : CallScreeningService() {
    override fun onScreenCall(callDetails: Call.Details) {
        val raw = callDetails.handle?.schemeSpecificPart
        val lists = BlockListStore.load(this) // JSON schema v1, same file the Web layer exports
        val verdict = SpamJudge.check(raw, lists) // same order: allow > exact > prefix > known > reported
        val builder = CallResponse.Builder()
        if (verdict.action == VerdictAction.BLOCK) {
            builder.setDisallowCall(true)
            builder.setRejectCall(true)
            builder.setSkipCallLog(false) // keep the attempt visible in the system call log
            builder.setSkipNotification(true)
        }
        respondToCall(callDetails, builder.build())
    }
}
```

AndroidManifest への宣言（`android/app/src/main/AndroidManifest.xml`、抜粋）:

```xml
<service
    android:name=".RingCallScreeningService"
    android:exported="true"
    android:permission="android.permission.BIND_SCREENING_SERVICE">
    <intent-filter>
        <action android:name="android.telecom.CallScreeningService" />
    </intent-filter>
</service>
```

## テスト

判定ロジックと正規化は、単一 HTML 内のコア部分（`==CORE-START==` 〜 `==CORE-END==`）を Node テストが抽出して直接実行し、**出荷するコードそのもの** を検証します。

```sh
node tests/spam-blocker.test.js
```

42 件（正規化・整形・前方一致ルール・判定順序・サンプルデータ整合性・JSON スキーマ往復・外部リソース不使用とプライバシー文言の構造保証）。全通過を確認済み。

Android 側の判定エンジン（Android 非依存の純 Kotlin）も、Web 層と同一のテストベクタで検証しています（`android/run-tests.sh`、単体テスト 107 件全通過。詳細は `android/README.md`）。

## 既知の制限と次段階

- Web 層は着信そのものを止めることはできません（ブラウザの制約）。実際のブロックはネイティブ層が担います
- Android 側は判定エンジンの単体テスト（107 件）と android.jar（API 34）に対するコンパイル確認まで検証済みですが、**APK ビルド（assembleDebug）と実機動作は未検証**です（経緯と理由は `android/README.md` の「検証状況」参照）
- 迷惑番号データは現在サンプル（ダミー）のみ。実データの調達方法は未定
- 次段階: APK ビルドの実地確認、実機での役割取得・実着信ブロックの確認
