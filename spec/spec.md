Screen_UI.svgのワイヤーフレームからWebアプリを作成してください。

## 機能要件
すべてのデータをブラウザ内（Service Worker + OPFS）に保存し、外部バックエンドなしで完全に動作。

## ワイヤーフレーム補足
- Screen_UI.svgはDraw.IOによって作成したWebアプリのワイヤーフレーム画像である。  
- Screen_UI.svgは１つのWeb画面でタブ切り替えを行った時の内容が描かれている。
- なるべくScreen_UI.svgの内容を再現するのが目標である。
- Screen_UI.svgにはタブブラウザの部分も描かれているが、モックを作成する際はタブブラウザ部分を再現する必要はない。
- Screen_UI.svgの下部には各画面についての動作の補足説明が書かれているため、内容を確認して実装すること

## データ構造
- ER.mdは本Webアプリで扱うデータのデータ構造とリレーションを定義したものである。
- 本Webアプリで扱うデータ構造はER.mdに準ずること
- 作成/編集を行うデータはレコード単位でyaml形式ファイルでOPFSにストアする事とする、ファイル名はIDとしデータの種類ごとにフォルダが分かれているものとする。

## 技術スタック
- **Framework**: vuejs + pinia
- **Language**: TypeScript
- **Styling**: tailwindcss + postcss + autoprefixer

## 成果物
- コンポーネント一覧とコンポーネントの設計書
- 全体のソースコード
- 必要な設定ファイル (package.json 等)

## 完了条件
- `npm install`～`npm run build`まで成功し、`npm run dev`等で成果物をブラウザで確認できる状態になっていること。

