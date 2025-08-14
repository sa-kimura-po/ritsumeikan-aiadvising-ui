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
            {
                "code": "R",
                "name": "Resilience（しなやかさ）",
                "desc": "困ったことや失敗したことから学び立ち直る力"
            },
            {
                "code": "I", 
                "name": "Initiative（自発性）",
                "desc": "自分で自分の目標を決め、あきらめることなく取り組む"
            },
            {
                "code": "T",
                "name": "Teamwork（チームワーク）", 
                "desc": "目的を達成するために他の人と協力する"
            },
            {
                "code": "S",
                "name": "Self-efficacy（自己効力感）",
                "desc": "自分ならどういうふうに問題解決し、自分を信じる感覚"
            },
            {
                "code": "U",
                "name": "Understanding（理解力）",
                "desc": "科学的に物事を理解する"
            },
            {
                "code": "M",
                "name": "Multitasking（マルチタスキング）",
                "desc": "複数の課題にバランスよく取り組む"
            },
            {
                "code": "E",
                "name": "Empathy（共感力）", 
                "desc": "他人の気持ちを想像して、その心に寄り添う"
            },
            {
                "code": "C",
                "name": "Innovation（変革力）",
                "desc": "新しい考え方で、物事に変化を生み出す"
            }
        ]
        
        # ランダムに3-4個のコンピテンシーを選択
        selected = random.sample(competencies, random.randint(3, 4))
        
        # 成し遂げたことの例を生成
        achievements = [
            "授業でのグループワークにおいて、チームメンバーとの協働を通じて課題解決に取り組んだこと",
            "ピアサポートの理論を学び、実際の支援場面で活用しようとする意識を持ったこと", 
            "他者の意見を聞きながら、自分なりの考えを整理し表現できるようになったこと",
            "授業での学びを振り返り、今後の学習目標を明確に設定したこと",
            "困難な状況でも諦めずに解決策を模索する姿勢を示したこと"
        ]
        
        # 分岐点の例を生成
        turning_points = [
            "グループディスカッションで多様な意見に触れたことが、自分の考えを深める契機となった",
            "授業での体験学習が、理論と実践の結びつきを理解する分岐点となった",
            "他の学生との意見交換が、新しい視点を獲得するきっかけとなった",
            "教員からのフィードバックが、自己省察を深める機会となった"
        ]
        
        # アドバイスの例を生成
        advice_topics = [
            ("継続的な学習の深化", "今回の学びをさらに深めるために、関連する文献や資料に積極的に触れることをおすすめします"),
            ("実践的な経験の積み重ね", "学んだ理論を実際の場面で活用する機会を積極的に作ることで、より深い理解につながります"),
            ("他者との協働スキル向上", "グループワークや話し合いの場面で、より効果的なコミュニケーションを意識してみてください"),
            ("自己省察の習慣化", "定期的に自分の学習や成長を振り返る時間を設けることで、さらなる発展が期待されます")
        ]
        
        # レスポンス生成
        response = "【コンピテンシー評価結果】\n\n"
        
        # ①エピソード分析
        response += "①入力いただいた内容から以下のエピソードが分析されます。\n"
        response += "● 成し遂げたこととその達成度\n"
        selected_achievements = random.sample(achievements, 2)
        for achievement in selected_achievements:
            response += f"- {achievement}。\n"
        
        response += "\n● 成し遂げたことに至るための分岐点\n"
        selected_turning_points = random.sample(turning_points, 2)
        for turning_point in selected_turning_points:
            response += f"- {turning_point}。\n"
        
        # ②コンピテンシー評価
        response += "\n②入力いただいた内容から、以下のコンピテンシーが特に発揮されていると評価されました\n"
        
        for i, comp in enumerate(selected):
            prefix = f"{i+1}." if i == 0 else "◆"
            response += f"{prefix}({comp['code']}): {comp['name']}\n"
            response += f"- {self._generate_competency_detail(comp, user_message)}\n\n"
        
        # 総評
        response += "【総評】\n"
        selected_advice = random.choice(advice_topics)
        response += f"● {selected_advice[0]}\n"
        response += f"- {selected_advice[1]}。\n"
        response += "- また、学んだことを他の学生と共有することで、相互の学習効果を高めることができます。"
        
        return response
    
    def _generate_competency_detail(self, competency: dict, user_message: str) -> str:
        """コンピテンシー詳細説明を生成"""
        details = {
            "R": [
                "困難な状況に直面しても諦めずに取り組む姿勢を示した",
                "挫折や失敗を学習の機会として捉える柔軟性を発揮した",
                "新しい環境や課題に対して適応力を示した"
            ],
            "I": [
                "自分なりの学習目標を明確に設定し、それに向けて積極的に取り組む意欲を示した",
                "授業の内容を受け身で聞くだけでなく、主体的に学習に参加する姿勢を見せた",
                "自ら課題を見つけ、解決に向けて行動を起こす自発性を発揮した"
            ],
            "T": [
                "グループワークや協働学習において、他のメンバーと効果的に連携した",
                "チーム目標の達成に向けて、自分の役割を理解し責任を持って行動した",
                "他者の意見を尊重しながら、建設的な議論に参加した"
            ],
            "S": [
                "自分の能力や判断に対して適切な自信を持ち、積極的に学習に取り組んだ",
                "困難な課題に対しても「やればできる」という前向きな姿勢を示した",
                "自分なりの方法で問題解決に取り組む意欲を見せた"
            ],
            "U": [
                "授業内容を論理的に整理し、体系的に理解しようとする姿勢を示した",
                "複雑な概念や理論を、具体例と関連付けて理解する能力を発揮した",
                "学んだ内容を批判的に検討し、deeper understanding を目指した"
            ],
            "M": [
                "複数の学習課題を同時に管理し、バランスよく取り組む能力を示した",
                "時間管理や優先順位付けを適切に行い、効率的な学習を実践した",
                "異なる視点や課題を統合的に捉える能力を発揮した"
            ],
            "E": [
                "他の学生や教員の気持ちや立場を理解し、適切に配慮した行動を取った",
                "相手の表情や言動から感情を読み取り、共感的な対応を示した",
                "多様な価値観や考え方を受け入れる開放性を発揮した"
            ],
            "C": [
                "従来の考え方にとらわれず、新しい視点から物事を捉えようとした",
                "創意工夫を凝らし、独自の解決策やアプローチを提案した",
                "現状に満足せず、より良い方法や改善策を模索する姿勢を示した"
            ]
        }
        
        return random.choice(details.get(competency["code"], ["学習への積極的な取り組みを示した"]))
    
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