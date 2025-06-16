import os
from typing import Optional, Dict, Any
from openai import OpenAI
from dotenv import load_dotenv
import json

load_dotenv()

class GenerativeAIService:
    """
    Generative AIサービス

    Args:
        prompt: 生成するテキストのプロンプト
        model: 使用するモデル
        temperature: 生成のランダム性
        max_tokens: 生成するテキストの最大トークン数
        **kwargs: 追加のパラメータ

    Returns:
        生成されたテキスト
    """

    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_SECRET"))
 
    def generate_text(
        self,
        prompt: str,
        model: str = "gpt-4o-mini",
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> str:
        response = self.client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature,
                max_tokens=max_tokens,
                **kwargs
            )

        return response.choices[0].message.content

    def generate_json(
        self,
        prompt: str,
        model: str = "gpt-4o-mini",
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        JSON形式のレスポンスを生成します。

        Args:
            prompt: 生成するテキストのプロンプト
            model: 使用するモデル
            temperature: 生成のランダム性
            max_tokens: 生成するテキストの最大トークン数
            **kwargs: 追加のパラメータ

        Returns:
            生成されたJSONオブジェクト
        """
        try:
            response = self.client.chat.completions.create(
                model=model,
                messages=[
                    {
                        "role": "system",
                        "content": "あなたは優秀なアシスタントです。JSON形式で日本語で返答してください。"
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=temperature,
                max_tokens=max_tokens,
                response_format={"type": "json_object"},
                **kwargs
            )

            return json.loads(response.choices[0].message.content)
        except json.JSONDecodeError as e:
            return {
                "error": "JSONの解析に失敗しました",
                "details": str(e),
                "raw_response": response.choices[0].message.content
            }
        except Exception as e:
            return {
                "error": "予期せぬエラーが発生しました",
                "details": str(e)
            }

    def web_search(self, query: str) -> str:
        """
        Web検索を実行します。

        Args:
            query: 検索クエリ

        Returns:
            検索結果のテキスト
        """
        try:
            response = self.client.responses.create(
                model="gpt-4.1",
                tools=[{"type": "web_search_preview"}],
                input=query
            )
            return response.output_text
        except Exception as e:
            return f"Web検索エラー: {str(e)}"
