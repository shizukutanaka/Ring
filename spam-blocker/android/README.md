# Ring 迷惑電話ブロック — Android ネイティブ層

Web 層（`../index.html`）だけでは実際の着信を止められないため、Android の
`CallScreeningService` で着信そのものをスクリーニングするネイティブ層です。
設計の正本は `../README.md`（ネイティブ層の設計要点）で、本ディレクトリはその実装です。

## 動作の仕組み

1. ユーザーが本アプリを「発信者番号通知／迷惑電話対策アプリ」
   （`ROLE_CALL_SCREENING`）に設定する（アプリ内のボタンから役割リクエストを出します）
2. 着信時に OS が `RingCallScreeningService.onScreenCall` を呼び、着信番号だけが渡されます
3. アプリ内ストレージのブロックリスト（JSON スキーマ v1、Web 層が書き出したファイルを
   アプリ内から読み込めます）を `SpamJudge` が Web 層と**同一の判定順序**で判定します
4. 判定が `block` の場合のみ、着信を拒否します（`setDisallowCall(true)` +
   `setRejectCall(true)`）。`warn` は OS 側では拒否せず通過させます
   （CallScreeningService には着信中 UI がないため）

判定順序（固定）: 形式不正 → 許可リスト → 完全一致ブロック → 前方一致ブロック →
既知の迷惑番号（警告）→ 自分の通報（警告）→ 一致なし

## プライバシー

- **宣言する権限はゼロです**（`AndroidManifest.xml` に `uses-permission` はありません）。
  `READ_CALL_LOG` / `READ_CONTACTS` は要求しません。スクリーニングサービスは
  着信番号だけを受け取るため、履歴・連絡先は不要です。これが設計の核です
- ブロックリストは端末内のアプリ専用ストレージだけに保存され、外部送信はしません
- サードパーティ依存はゼロです（Android フレームワーク＋Kotlin 標準ライブラリのみ）

## 構成

```
settings.gradle.kts / build.gradle.kts / gradle.properties
gradle/wrapper/gradle-wrapper.properties   （バージョン固定のみ。下記の注意参照）
run-tests.sh                               （SDK なしで判定エンジンだけを検証するスクリプト）
app/
  build.gradle.kts                         （compileSdk 34 / minSdk 29 / targetSdk 34）
  src/main/AndroidManifest.xml             （CallScreeningService 宣言、権限ゼロ）
  src/main/java/app/ring/spamblocker/
    MainActivity.kt                        （役割リクエスト、JSON 読み込み、件数表示の最小 UI）
    RingCallScreeningService.kt            （着信スクリーニング本体）
    BlockListStore.kt                      （アプリ内ストレージへの JSON v1 保存/読込）
    core/                                  （Android 非依存の純 Kotlin。kotlinc 単体で検証可能）
      PhoneNumbers.kt                      （正規化・種別判定・整形。Web 層のコアの移植）
      SpamJudge.kt                         （判定エンジン＋サンプル迷惑番号 DB）
      BlockList.kt                         （スキーマ v1 のモデルと入出力、前方一致ルールの正規化）
      MiniJson.kt                          （外部依存なしの最小 JSON パーサ/ライタ）
  src/test/java/app/ring/spamblocker/core/
    SpamJudgeTest.kt                       （Web 層テストと同一ベクタのゴールデンテスト）
```

`applicationId` / 名前空間は `app.ring.spamblocker` です。

## 判定エンジンの検証（SDK 不要）

判定ロジックは Android に依存しない純 Kotlin なので、JDK と kotlinc だけで
Web 層と同じテストベクタで検証できます。

```sh
./run-tests.sh   # KOTLINC 環境変数で kotlinc の場所を指定可能
```

## APK のビルド

前提: JDK 17+、Android SDK（platform 34、build-tools 34.0.0）。

```sh
# Gradle 8.7+ が手元にある場合（そのままビルドできます）
gradle :app:assembleDebug

# もしくは Android Studio でこのフォルダを開く（wrapper が生成されます）
```

注意: `gradlew` / `gradle-wrapper.jar` は本コミットに含まれていません
（後述の環境制約で wrapper 生成まで到達できなかったため）。
`gradle/wrapper/gradle-wrapper.properties`（Gradle 8.7 固定）は配置済みなので、
手元の Gradle で一度 `gradle wrapper` を実行すれば `./gradlew` が使えるようになります。

## 検証状況（2026-11-12、正直な現状）

実施環境: 開発用 Linux VM（JDK は Temurin 21、Kotlin 2.0.21 を tarball 導入）。

- ✅ **判定エンジンの単体テスト: 107 件全通過**（`run-tests.sh`、kotlinc でコンパイル・実行。
  Web 層テスト 42 件と同一の入力ベクタで、正規化・判定順序・前方一致・許可リスト優先・
  JSON スキーマ v1 の往復とフィルタリングを検証）
- ✅ **全ソースが android.jar（API 34）に対してコンパイル通過**
  （core 4 ファイル＋Android 層 3 ファイル、kotlinc で型検査まで実施）
- ✅ Web 層の既存テスト 42 件も引き続き全通過（Web 層は無変更）
- ❌ **`assembleDebug`（APK ビルド）はこの環境では未検証**。試行内容と理由:
  1. `sdkmanager` はこの VM の egress プロキシ（認証付き CONNECT）を通せず失敗
     → SDK 本体（platform 34 / build-tools 34.0.0）は zip の直接ダウンロードで導入成功
  2. Gradle 8.7 のデーモンが切り離しプロセスとして起動すると、クライアントからの
     loopback 接続がデーモン側に届かず通信が成立しない（デーモン自体は正常起動・待機を
     ログで確認。同一プロセスツリー内の通常の loopback 通信は正常）。フォアグラウンド
     起動もレジストリ生成に至らず停滞したため、この環境での APK ビルドは打ち切りました。
     通常の開発機や Android Studio ではこの制約はありません
- ❌ **実機動作は未検証**（役割の取得、実着信でのブロック、JSON 読み込みの実地確認は
  実機またはエミュレータが必要です）

## 使い方（実機）

1. APK をビルドしてインストール
2. アプリを開き「迷惑電話対策アプリとして設定する」から役割を許可
3. Web 層で書き出したブロックリスト JSON を端末に置き、
   「ブロックリスト (JSON) を読み込む」から取り込む
4. 以後の着信は取り込んだリストでスクリーニングされます
