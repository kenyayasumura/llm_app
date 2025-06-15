import os
from typing import Optional
from openai import OpenAI
from dotenv import load_dotenv

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
