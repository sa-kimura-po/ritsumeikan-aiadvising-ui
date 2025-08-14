"""
AIサービスモジュール
Azure OpenAI連携とコンピテンシー評価
"""
import json
import logging
import random
import time
from typing import Dict, List, Optional
from datetime import datetime

from config import Config

logger = logging.getLogger(__name__)

class AIService:
    """AIサービスクラス"""
    
    def __init__(self):
        self.config = Config()
        self.prompts = self._load_prompts()
        
        if not self.config.MOCK_MODE:
            self._initialize_openai_client()
    
    def _load_prompts(self) -> Dict:
        """プロンプト設定読み込み"""
        try:
            with open('../prompts.json', 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            logger.warning("Prompts file not found, using default prompts")
            return self._get_default_prompts()
        except Exception as e:
            logger.error(f"Error loading prompts: {str(e)}")
            return self._get_default_prompts()
    
    def _get_default_prompts(self) -> Dict:
        """デフォルトプロンプト"""
        return {
            "competency_evaluation_prompt": {
                "system_role": "あなたは立命館大学の学習支援AIアシスタント「R-AI」です。",
                "competency_definitions": {
                    "competencies": [
                        {"japanese": "しなやかさ", "description": "困ったことや失敗したことから学び立ち直る力"},
                        {"japanese": "自発性", "description": "自分で自分の目標を決め、あきらめることなく取り組む"},
                        {"japanese": "チームワーク", "description": "目的を達成するために他の人と協力する"},
                        {"japanese": "自己効力感", "description": "自分ならどういうふうに問題解決し、自分を信じる感覚"},
                        {"japanese": "理解力", "description": "科学的に物事を理解する"},
                        {"japanese": "マルチタスキング", "description": "複数の課題にバランスよく取り組む"},
                        {"japanese": "共感力", "description": "他人の気持ちを想像して、その心に寄り添う"},
                        {"japanese": "変革力", "description": "新しい考え方で、物事に変化を生み出す"}
                    ]
                }
            },
            "general_chat_prompt": {
                "system_role": "あなたは立命館大学の学習支援AIアシスタント「R-AI」です。"
            }
        }
    
    def _initialize_openai_client(self):
        """Azure OpenAIクライアント初期化"""
        try:
            import openai
            
            openai.api_type = "azure"
            openai.api_base = self.config.AZURE_OPENAI_ENDPOINT
            openai.api_version = self.config.AZURE_OPENAI_VERSION
            openai.api_key = self.config.AZURE_OPENAI_KEY
            
            logger.info("Azure OpenAI client initialized")
            
        except Exception as e:
            logger.error(f"Azure OpenAI initialization error: {str(e)}")
            raise
    
    def get_competency_evaluation(self, user_message: str) -> str:
        """コンピテンシー評価実行"""
        try:
            if self.config.MOCK_MODE:
                # モック応答
                time.sleep(self.config.MOCK_AI_DELAY)
                return self._generate_mock_competency_response(user_message)
            
            # Azure OpenAI呼び出し
            system_prompt = self._build_competency_system_prompt()
            user_prompt = self._build_competency_user_prompt(user_message)
            
            response = self._call_azure_openai(system_prompt, user_prompt)
            
            logger.info(f"Competency evaluation completed for message length: {len(user_message)}")
            return response
            
        except Exception as e:
            logger.error(f"Competency evaluation error: {str(e)}")
            return "申し訳ございません。コンピテンシー評価中にエラーが発生しました。しばらく時間をおいてから再度お試しください。"
    
    def get_general_response(self, user_message: str) -> str:
        """一般チャット応答"""
        try:
            if self.config.MOCK_MODE:
                time.sleep(self.config.MOCK_AI_DELAY)
                return self._generate_mock_general_response(user_message)
            
            # Azure OpenAI呼び出し
            system_prompt = self._build_general_system_prompt()
            user_prompt = user_message
            
            response = self._call_azure_openai(system_prompt, user_prompt)
            
            logger.info(f"General response completed for message length: {len(user_message)}")
            return response
            
        except Exception as e:
            logger.error(f"General response error: {str(e)}")
            return "申し訳ございません。システムエラーが発生しました。しばらく時間をおいてから再度お試しください。"
    
    def _call_azure_openai(self, system_prompt: str, user_prompt: str) -> str:
        """Azure OpenAI API呼び出し"""
        try:
            import openai
            
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
            
            response = openai.ChatCompletion.create(
                engine=self.config.AZURE_OPENAI_DEPLOYMENT,
                messages=messages,
                temperature=0.7,
                max_tokens=1500,
                top_p=0.95,
                frequency_penalty=0,
                presence_penalty=0
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            logger.error(f"Azure OpenAI API error: {str(e)}")
            raise
    
    def _build_competency_system_prompt(self) -> str:
        """コンピテンシー評価用システムプロンプト構築"""
        prompt_config = self.prompts["competency_evaluation_prompt"]
        
        system_prompt = f"""
{prompt_config["system_role"]}

## コンピテンシー定義
立命館大学では以下のコンピテンシーを重視しています：

"""
        
        competencies = prompt_config["competency_definitions"]["competencies"]
        for comp in competencies:
            system_prompt += f"・{comp['japanese']}: {comp['description']}\n"
        
        system_prompt += """
## 授業コンテキスト
- 科目名: ピアサポート論
- 学習方法: グループディスカッション、ペアワーク、体験学習、振り返り活動
- 重要概念: ピアサポート、カウンセリングマインド、傾聴、共感、自己開示

## 評価指針
1. 学生の入力内容から特に発揮されているコンピテンシー2-3個を特定
2. 5段階評価（1:発揮されていない〜5:優秀）で評価
3. 建設的で具体的なフィードバックを提供
4. 次の学習につながる示唆を含める

## 回答フォーマット
【コンピテンシー評価結果】

◆ [コンピテンシー名] ★★★★☆ ([点数]/5)
◆ [コンピテンシー名] ★★★★☆ ([点数]/5)

【総評】
[全体的な評価と成長のポイント]

【今後の学習へのアドバイス】
[具体的な提案]
"""
        return system_prompt
    
    def _build_competency_user_prompt(self, user_message: str) -> str:
        """コンピテンシー評価用ユーザープロンプト構築"""
        return f"""
以下は学生がピアサポート論の授業で体験した内容や学びについて記述したものです。
この内容からコンピテンシーを評価してください。

【学生の入力】
{user_message}

上記の内容から、特に発揮されているコンピテンシーを評価し、建設的なフィードバックをお願いします。
"""
    
    def _build_general_system_prompt(self) -> str:
        """一般チャット用システムプロンプト構築"""
        prompt_config = self.prompts["general_chat_prompt"]
        
        return f"""
{prompt_config["system_role"]}

あなたは学生の学習をサポートし、授業に関連した質問や相談に適切な支援を提供します。

## 対応範囲
- ピアサポート論の授業内容に関する質問
- カウンセリング基礎知識
- コミュニケーション技法
- グループワークに関する相談
- 一般的な学習相談

## 対応しない内容
- リアルタイム情報（天気、最新ニュースなど）
- 個人の成績や評価
- 他の学生の個人情報
- 大学の内部機密情報

温かく支援的な態度で、学生の学習意欲を高める前向きな回答を心がけてください。
"""
    
    def _generate_mock_competency_response(self, user_message: str) -> str:
        """モックコンピテンシー評価応答生成"""
        competencies = [
            {"name": "しなやかさ", "desc": "困難に対する対処力"},
            {"name": "自発性", "desc": "主体的な学習姿勢"},
            {"name": "チームワーク", "desc": "協働する力"},
            {"name": "自己効力感", "desc": "自分への信頼"},
            {"name": "理解力", "desc": "論理的思考力"},
            {"name": "マルチタスキング", "desc": "複数課題への対応"},
            {"name": "共感力", "desc": "他者理解の力"},
            {"name": "変革力", "desc": "新しい視点の創出"}
        ]
        
        # ランダムに2-3個のコンピテンシーを選択
        selected = random.sample(competencies, random.randint(2, 3))
        
        response = "【コンピテンシー評価結果】\n\n"
        response += "入力いただいた内容から、以下のコンピテンシーが特に発揮されていると評価されました：\n\n"
        
        for comp in selected:
            score = random.randint(3, 5)  # 3-5点でランダム
            stars = "★" * score + "☆" * (5 - score)
            response += f"◆ {comp['name']} {stars} ({score}/5)\n"
        
        response += f"\n【総評】\n"
        response += f"今回の授業での学びや気づきから、特に「{selected[0]['name']}」が高く評価されます。"
        response += "継続的な学習と振り返りにより、さらなるコンピテンシーの向上が期待されます。\n\n"
        
        response += "【今後の学習へのアドバイス】\n"
        response += "次回も授業での学びを積極的に言語化し、自己成長につなげていきましょう。"
        response += "特に他者との対話を通じて、新たな気づきを得ることを意識してみてください。"
        
        return response
    
    def _generate_mock_general_response(self, user_message: str) -> str:
        """モック一般チャット応答生成"""
        responses = [
            "そのような視点は非常に興味深いですね。もう少し詳しく教えていただけますか？",
            "授業での学びを深く考察されていますね。その気づきをどのように今後に活かしていこうと思いますか？",
            "素晴らしい観点です。他の授業や日常生活でも類似の経験はありましたか？",
            "その考えについて、もう少し具体的な例があれば教えてください。",
            "興味深い内容ですね。この学びから、どのような新しい疑問が生まれましたか？",
            "ピアサポートの観点から考えると、今回の体験はどのような意味を持つと思いますか？",
            "他の参加者との相互作用について、どのような印象を持たれましたか？",
            "今回の学習内容で、特に印象に残った部分はありますか？"
        ]
        
        # キーワードベースの応答選択
        if any(word in user_message for word in ["グループ", "チーム", "協力"]):
            return "グループでの協働について言及されていますね。チームワークやコミュニケーションの観点で、どのような学びがありましたか？"
        elif any(word in user_message for word in ["聞く", "傾聴", "話"]):
            return "傾聴やコミュニケーションに関する気づきですね。相手の立場に立って考えることで、どのような新しい発見がありましたか？"
        elif any(word in user_message for word in ["難しい", "困った", "課題"]):
            return "困難な状況での学びは特に価値がありますね。その経験から、どのような対処方法や解決策を見つけることができましたか？"
        else:
            return random.choice(responses)
    
    def validate_message_length(self, message: str) -> bool:
        """メッセージ長の検証"""
        return len(message) <= self.config.MAX_MESSAGE_LENGTH
    
    def get_competency_list(self) -> List[Dict]:
        """コンピテンシー一覧取得"""
        return self.prompts["competency_evaluation_prompt"]["competency_definitions"]["competencies"]