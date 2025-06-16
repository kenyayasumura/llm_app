from typing import Dict, Any
# https://github.com/studio-ousia/mojimoji
import mojimoji

class FormatterService:
    async def format_text(self, text: str, config: Dict[str, Any]) -> str:
        """
        テキストを指定されたルールに従って整形します。
        
        Args:
            text: 整形対象のテキスト
            config: 整形ルールの設定
                - operation: "to_upper" | "to_lower" | "to_full_width" | "to_half_width"
                - kana: bool (文字幅変換時のカナ変換の有無)
                - digit: bool (文字幅変換時の数字変換の有無)
                - ascii: bool (文字幅変換時のASCII文字変換の有無)

        Returns:
            整形されたテキスト
        """
        operation = config.get("operation")

        if operation == "to_upper":
            return text.upper()
        elif operation == "to_lower":
            return text.lower()
        elif operation == "to_full_width":
            return mojimoji.han_to_zen(
                text,
                kana=config.get("kana", True),
                digit=config.get("digit", True),
                ascii=config.get("ascii", True)
            )
        elif operation == "to_half_width":
            return mojimoji.zen_to_han(
                text,
                kana=config.get("kana", True),
                digit=config.get("digit", True),
                ascii=config.get("ascii", True)
            )
        else:
            return text
        