# LLM App

LLMを使用したワークフローアプリケーション

## セットアップ

### 環境要件
- macOS
- Python 3.12以上
- pip
- Node.js 18以上
- npm

### システムの依存関係

PDFファイルの処理とOCR機能を使用する場合、以下のシステムライブラリが必要です：

```bash
# PDF処理用
brew install poppler

# OCR処理用
brew install tesseract tesseract-lang
```

### インストール手順

1. リポジトリをクローン
```bash
git clone git@github:kenyayasumura/llm_app.git
cd llm_app
```

2. バックエンドのセットアップ
```bash
# 仮想環境を作成して有効化
python -m venv venv
. venv/bin/activate

# 依存パッケージをインストール
pip install -r server/requirements.txt

# 環境変数の設定
cp .env.example .env  # もし.env.exampleがある場合
# .envファイルを編集して必要な環境変数を設定
```

必要な環境変数：
- `DATABASE_URL`: PostgreSQLの接続URL
- `OPENAI_SECRET`: OpenAI APIキー
- `DEBUG_MODE`: デバッグモードの有効/無効（true/false）

3. フロントエンドのセットアップ
```bash
cd client
npm install
```

### 開発サーバーの起動

1. バックエンドサーバー
```bash
cd server
uvicorn main:app --reload
```

2. フロントエンド開発サーバー
```bash
cd client
npm run dev
```

## API仕様

### エンドポイント

- `POST /workflows` - 新しいワークフローの作成
- `GET /workflows/{wf_id}` - ワークフローの詳細取得
- `POST /workflows/{wf_id}/nodes` - ノードの追加
- `PUT /workflows/{workflow_id}/nodes` - ノードの更新
- `POST /workflows/{wf_id}/run` - ワークフローの実行
- `GET /workflows/{wf_id}/run/stream` - ワークフローの実行状態のストリーミング
- `POST /workflows/{wf_id}/upload` - PDFファイルのアップロードとテキスト抽出

### ノードタイプ

- `extract_text`: PDFファイルからテキストを抽出
- `generative_ai`: OpenAI APIを使用したテキスト生成
- `formatter`: テキストの整形（大文字/小文字変換、全角/半角変換など）
- `agent`: 複数のステップを実行するエージェント