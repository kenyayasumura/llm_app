# LLM App

LLMを使用したワークフローアプリケーション

## セットアップ

### 環境要件
- Python 3.12以上
- pip

### インストール手順

1. リポジトリをクローン
```bash
git clone git@github:kenyayasumura/llm_app.git
cd llm_app
```

2. 仮想環境を作成して有効化
```bash
python -m venv venv
source venv/bin/activate  # Linuxの場合
# または
. venv/bin/activate  # macOSの場合
```

3. 依存パッケージをインストール
```bash
pip install -r server/requirements.txt
```

4. 環境変数の設定
`.env` ファイルを作成し、必要な環境変数を設定
```bash
cp .env.example .env  # もし.env.exampleがある場合
# .envファイルを編集して必要な環境変数を設定
```

### 開発サーバーの起動

```bash
cd server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## API仕様

### エンドポイント

- `POST /workflows` - 新しいワークフローの作成
- `GET /workflows/{wf_id}` - ワークフローの詳細取得
- `POST /workflows/{wf_id}/nodes` - ノードの追加
- `POST /workflows/{wf_id}/run` - ワークフローの実行

詳細なAPI仕様は [API仕様書](./docs/api.md) を参照してください。 