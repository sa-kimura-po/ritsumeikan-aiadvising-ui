# R-AI - 立命館大学AIアドバイジングシステム

立命館大学のピアサポート論授業で使用するAIアドバイジングシステムです。学生の授業感想や学びに基づいてコンピテンシー評価を行い、教員が学習状況を確認できます。

## システム概要

### 主要機能
- **学生向けチャットUI**: 授業感想・学びの入力とAIとの対話
- **コンピテンシー評価**: AIによる8つのコンピテンシーの自動評価
- **教員向け管理画面**: 評価結果のCSV出力と利用統計の確認
- **EntraID認証**: 立命館大学のIDシステムとの連携

### 対象コンピテンシー
1. **しなやかさ** - 困ったことや失敗したことから学び立ち直る力
2. **自発性** - 自分で自分の目標を決め、あきらめることなく取り組む
3. **チームワーク** - 目的を達成するために他の人と協力する
4. **自己効力感** - 自分ならどういうふうに問題解決し、自分を信じる感覚
5. **理解力** - 科学的に物事を理解する
6. **マルチタスキング** - 複数の課題にバランスよく取り組む
7. **共感力** - 他人の気持ちを想像して、その心に寄り添う
8. **変革力** - 新しい考え方で、物事に変化を生み出す

## 技術構成

### フロントエンド
- **HTML5** / **CSS3** / **JavaScript**
- **Font Awesome** (アイコン)
- **Axios** (HTTP通信)

### バックエンド
- **Python 3.8+**
- **Flask** (Webフレームワーク)
- **Azure OpenAI** (AI処理)
- **Azure Cosmos DB** / **SharePoint** (データストレージ)
- **EntraID** (認証)

### カラーテーマ
- 立命館大学のえんじ色 (#8B0000) をベースとしたデザイン

## セットアップ手順

### 1. 環境準備

```bash
# リポジトリのクローン
git clone <repository-url>
cd ritsumeikan-aiadvising-ui

# Pythonの仮想環境作成（推奨）
python -m venv venv

# 仮想環境の有効化
# Windows:
venv\\Scripts\\activate
# macOS/Linux:
source venv/bin/activate

# 依存関係のインストール
pip install -r backend/requirements.txt
```

### 2. 環境変数の設定

`backend/.env`ファイルを作成し、以下の環境変数を設定：

```env
# Flask設定
SECRET_KEY=your-secret-key
FLASK_ENV=development

# Azure OpenAI設定
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_KEY=your-api-key
AZURE_OPENAI_VERSION=2024-02-01
AZURE_OPENAI_DEPLOYMENT=gpt-4

# EntraID認証設定
ENTRA_CLIENT_ID=your-client-id
ENTRA_CLIENT_SECRET=your-client-secret
ENTRA_TENANT_ID=your-tenant-id

# データベース設定
DATABASE_TYPE=cosmosdb
COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_KEY=your-cosmos-key
COSMOS_DATABASE=rai_advising

# モックモード（開発・テスト用）
MOCK_MODE=true
```

### 3. アプリケーションの起動

```bash
# バックエンドの起動
cd backend
python app.py

# フロントエンドの起動（別ターミナル）
cd ..
# 簡易HTTPサーバーで起動
python -m http.server 8000
# または
npx serve .
```

### 4. アクセス方法

- **学生画面**: http://localhost:8000/index.html
- **教員管理画面**: http://localhost:8000/admin.html
- **API**: http://localhost:5000/api/

## 使用方法

### 学生の使用手順

1. **ログイン**: EntraIDで認証（モックモードでは仮認証）
2. **新規チャット開始**: 左サイドバーの「新しく会話をはじめる」ボタンをクリック
3. **感想・学びの入力**: テキストエリアに授業の感想や学んだことを入力（100-400文字推奨）
4. **評価の実行**:
   - **コンピテンシー評価ボタン**: AIがコンピテンシー評価を実行
   - **送信ボタン**: 通常のチャット（評価対象外）
5. **履歴の確認**: 左サイドバーで過去のチャット履歴を確認

### 教員の使用手順

1. **管理画面アクセス**: admin.htmlにアクセスして教員権限でログイン
2. **ダッシュボード確認**: 全体的な利用状況を確認
3. **データエクスポート**:
   - 期間を指定
   - プレビューで内容を確認
   - CSV形式でダウンロード
4. **利用統計確認**: システムの利用傾向を分析

## API仕様

### 認証
```
POST /api/auth/login
POST /api/auth/verify
```

### チャット
```
POST /api/chat/send
GET /api/chat/history/{user_id}
```

### 管理機能
```
POST /api/admin/export
GET /api/admin/stats
```

## モックモード

開発・テスト用のモックモードが利用可能です：

### モックユーザー
- **学生**: student001@st.ritsumei.ac.jp / password123
- **教員**: professor@fc.ritsumei.ac.jp / faculty123

### モック機能
- AI応答のシミュレーション
- 仮想的なデータベース
- 認証の簡易化

## ファイル構成

```
ritsumeikan-aiadvising-ui/
├── index.html              # 学生向けメイン画面
├── admin.html              # 教員向け管理画面
├── styles.css              # 学生画面スタイル
├── admin-styles.css        # 管理画面スタイル
├── app.js                  # 学生画面JavaScript
├── admin-app.js           # 管理画面JavaScript
├── prompts.json           # システムプロンプト設定
├── backend/               # バックエンド
│   ├── app.py            # メインAPIアプリケーション
│   ├── config.py         # 設定管理
│   ├── auth.py           # 認証管理
│   ├── database.py       # データベース管理
│   ├── ai_service.py     # AI サービス
│   └── requirements.txt  # Python依存関係
└── README.md             # このファイル
```

## セキュリティ考慮事項

- EntraID認証による適切なアクセス制御
- 学生データのプライバシー保護
- コンピテンシー評価結果のみの教員公開
- HTTPS通信の使用（本番環境）
- APIレート制限
- ログの適切な管理

## 本番環境への展開

### Azure App Service
```bash
# Azure CLI でデプロイ
az webapp up --name rai-advising --resource-group your-rg
```

### 環境変数の設定
- Azure App Serviceの環境変数として設定
- Key Vaultの使用を推奨

### データベース設定
- Cosmos DB インスタンスの作成
- 適切なスループット設定
- バックアップポリシーの設定

## トラブルシューティング

### よくある問題

1. **認証エラー**: EntraIDの設定確認
2. **AI応答なし**: Azure OpenAIの接続確認
3. **データ保存エラー**: データベース接続確認

### ログ確認
```bash
# バックエンドログ
tail -f backend/rai_advising.log
```

## 開発・カスタマイズ

### コンピテンシー定義の変更
`prompts.json`ファイルでコンピテンシー定義をカスタマイズ可能

### UI カスタマイズ
CSSファイルでスタイルをカスタマイズ可能

### AI プロンプトの調整
`prompts.json`でシステムプロンプトを調整可能

## サポート・お問い合わせ

システムに関するお問い合わせは、立命館大学情報基盤センターまでご連絡ください。

## ライセンス

このシステムは立命館大学の内部利用を目的として開発されています。

---

© 2024 立命館大学 - R-AI システム