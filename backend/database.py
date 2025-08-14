"""
データベース管理モジュール
CosmosDBとSharePointの両方に対応
"""
import json
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
import uuid
from abc import ABC, abstractmethod

from config import Config

logger = logging.getLogger(__name__)

class DatabaseInterface(ABC):
    """データベースインターフェース"""
    
    @abstractmethod
    def save_chat_message(self, message_data: Dict) -> bool:
        pass
    
    @abstractmethod
    def get_chat_history(self, user_id: str, limit: int = 50, offset: int = 0) -> List[Dict]:
        pass
    
    @abstractmethod
    def get_competency_evaluations(self, start_date: datetime = None, end_date: datetime = None) -> List[Dict]:
        pass
    
    @abstractmethod
    def get_usage_statistics(self) -> Dict:
        pass

class CosmosDBManager(DatabaseInterface):
    """CosmosDB管理クラス"""
    
    def __init__(self, config: Config):
        self.config = config
        self.client = None
        self.database = None
        self.chat_container = None
        self.user_container = None
        
        if not config.MOCK_MODE:
            self._initialize_client()
    
    def _initialize_client(self):
        """CosmosDBクライアント初期化"""
        try:
            from azure.cosmos import CosmosClient, PartitionKey
            
            self.client = CosmosClient(
                self.config.COSMOS_ENDPOINT,
                self.config.COSMOS_KEY
            )
            
            # データベース作成/取得
            self.database = self.client.create_database_if_not_exists(
                id=self.config.COSMOS_DATABASE
            )
            
            # コンテナ作成/取得
            self.chat_container = self.database.create_container_if_not_exists(
                id=self.config.COSMOS_CONTAINER_CHATS,
                partition_key=PartitionKey(path="/user_id"),
                offer_throughput=400
            )
            
            self.user_container = self.database.create_container_if_not_exists(
                id=self.config.COSMOS_CONTAINER_USERS,
                partition_key=PartitionKey(path="/id"),
                offer_throughput=400
            )
            
            logger.info("CosmosDB client initialized successfully")
            
        except Exception as e:
            logger.error(f"CosmosDB initialization error: {str(e)}")
            raise
    
    def save_chat_message(self, message_data: Dict) -> bool:
        """チャットメッセージ保存"""
        try:
            if self.config.MOCK_MODE:
                logger.info(f"[MOCK] Saving chat message: {message_data['chat_id']}")
                return True
            
            # ドキュメント構造
            document = {
                'id': str(uuid.uuid4()),
                'chat_id': message_data['chat_id'],
                'user_id': message_data['user_id'],
                'user_message': message_data['user_message'],
                'ai_response': message_data['ai_response'],
                'is_competency_evaluation': message_data['is_competency_evaluation'],
                'timestamp': message_data['timestamp'],
                'session_info': message_data.get('session_info', {}),
                'created_at': datetime.now(timezone.utc).isoformat(),
                'ttl': None  # TTL設定（必要に応じて）
            }
            
            self.chat_container.create_item(body=document)
            logger.info(f"Chat message saved: {document['id']}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving chat message: {str(e)}")
            return False
    
    def get_chat_history(self, user_id: str, limit: int = 50, offset: int = 0) -> List[Dict]:
        """チャット履歴取得"""
        try:
            if self.config.MOCK_MODE:
                return self._get_mock_chat_history(user_id, limit, offset)
            
            query = """
                SELECT c.chat_id, c.user_message, c.ai_response, c.is_competency_evaluation, c.timestamp
                FROM c 
                WHERE c.user_id = @user_id
                ORDER BY c.timestamp DESC
                OFFSET @offset LIMIT @limit
            """
            
            parameters = [
                {"name": "@user_id", "value": user_id},
                {"name": "@offset", "value": offset},
                {"name": "@limit", "value": limit}
            ]
            
            results = list(self.chat_container.query_items(
                query=query,
                parameters=parameters,
                enable_cross_partition_query=True
            ))
            
            return results
            
        except Exception as e:
            logger.error(f"Error getting chat history: {str(e)}")
            return []
    
    def get_competency_evaluations(self, start_date: datetime = None, end_date: datetime = None) -> List[Dict]:
        """コンピテンシー評価データ取得"""
        try:
            if self.config.MOCK_MODE:
                return self._get_mock_competency_evaluations(start_date, end_date)
            
            query = "SELECT * FROM c WHERE c.is_competency_evaluation = true"
            parameters = []
            
            if start_date:
                query += " AND c.timestamp >= @start_date"
                parameters.append({"name": "@start_date", "value": start_date.isoformat()})
            
            if end_date:
                query += " AND c.timestamp <= @end_date"
                parameters.append({"name": "@end_date", "value": end_date.isoformat()})
            
            query += " ORDER BY c.timestamp DESC"
            
            results = list(self.chat_container.query_items(
                query=query,
                parameters=parameters,
                enable_cross_partition_query=True
            ))
            
            return results
            
        except Exception as e:
            logger.error(f"Error getting competency evaluations: {str(e)}")
            return []
    
    def get_usage_statistics(self) -> Dict:
        """使用統計取得"""
        try:
            if self.config.MOCK_MODE:
                return self._get_mock_usage_statistics()
            
            # 総メッセージ数
            total_messages_query = "SELECT VALUE COUNT(1) FROM c"
            total_messages = list(self.chat_container.query_items(
                query=total_messages_query,
                enable_cross_partition_query=True
            ))[0]
            
            # コンピテンシー評価数
            competency_query = "SELECT VALUE COUNT(1) FROM c WHERE c.is_competency_evaluation = true"
            competency_count = list(self.chat_container.query_items(
                query=competency_query,
                enable_cross_partition_query=True
            ))[0]
            
            # アクティブユーザー数
            active_users_query = "SELECT VALUE COUNT(DISTINCT c.user_id) FROM c"
            active_users = list(self.chat_container.query_items(
                query=active_users_query,
                enable_cross_partition_query=True
            ))[0]
            
            return {
                'total_messages': total_messages,
                'competency_evaluations': competency_count,
                'active_users': active_users,
                'updated_at': datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting usage statistics: {str(e)}")
            return {}
    
    def _get_mock_chat_history(self, user_id: str, limit: int, offset: int) -> List[Dict]:
        """モックチャット履歴"""
        mock_history = [
            {
                'chat_id': 'chat_001',
                'user_message': 'ピアサポートの授業でグループワークを通じて、相手の話をじっくり聞くことの大切さを学びました。',
                'ai_response': '【コンピテンシー評価結果】\n\n◆ 共感力 ★★★★☆ (4/5)\n◆ 傾聴スキル ★★★★☆ (4/5)\n\n【総評】\nグループワークでの傾聴体験から、相手理解の重要性を深く学ばれています。',
                'is_competency_evaluation': True,
                'timestamp': '2024-01-15T10:30:00Z'
            },
            {
                'chat_id': 'chat_002',
                'user_message': '今日のロールプレイで初めて相談者役をやってみて、話すことの難しさを感じました。',
                'ai_response': 'ロールプレイでの新しい視点は、支援者としての成長につながる重要な学びですね。どのような点が特に難しく感じられましたか？',
                'is_competency_evaluation': False,
                'timestamp': '2024-01-14T14:20:00Z'
            }
        ]
        
        return mock_history[offset:offset + limit]
    
    def _get_mock_competency_evaluations(self, start_date: datetime, end_date: datetime) -> List[Dict]:
        """モックコンピテンシー評価データ"""
        return [
            {
                'timestamp': '2024-01-15T10:30:00Z',
                'user_id': 'student001',
                'chat_id': 'chat_001',
                'user_message': 'ピアサポートの授業でグループワークを通じて、相手の話をじっくり聞くことの大切さを学びました。',
                'ai_response': '【コンピテンシー評価結果】\n\n◆ 共感力 ★★★★☆ (4/5)\n◆ 傾聴スキル ★★★★☆ (4/5)'
            }
        ]
    
    def _get_mock_usage_statistics(self) -> Dict:
        """モック使用統計"""
        return {
            'total_messages': 156,
            'competency_evaluations': 45,
            'active_users': 23,
            'updated_at': datetime.now(timezone.utc).isoformat()
        }

class SharePointManager(DatabaseInterface):
    """SharePoint管理クラス"""
    
    def __init__(self, config: Config):
        self.config = config
        self.client = None
        
        if not config.MOCK_MODE:
            self._initialize_client()
    
    def _initialize_client(self):
        """SharePointクライアント初期化"""
        try:
            from office365.runtime.auth.authentication_context import AuthenticationContext
            from office365.sharepoint.client_context import ClientContext
            
            auth_context = AuthenticationContext(url=self.config.SHAREPOINT_SITE_URL)
            auth_context.acquire_token_for_app(
                client_id=self.config.SHAREPOINT_CLIENT_ID,
                client_secret=self.config.SHAREPOINT_CLIENT_SECRET
            )
            
            self.client = ClientContext(self.config.SHAREPOINT_SITE_URL, auth_context)
            logger.info("SharePoint client initialized successfully")
            
        except Exception as e:
            logger.error(f"SharePoint initialization error: {str(e)}")
            raise
    
    def save_chat_message(self, message_data: Dict) -> bool:
        """SharePointリストにチャットメッセージ保存"""
        try:
            if self.config.MOCK_MODE:
                logger.info(f"[MOCK] Saving chat message to SharePoint: {message_data['chat_id']}")
                return True
            
            list_item = {
                'Title': message_data['chat_id'],
                'ChatId': message_data['chat_id'],
                'UserId': message_data['user_id'],
                'UserMessage': message_data['user_message'],
                'AIResponse': message_data['ai_response'],
                'IsCompetencyEvaluation': message_data['is_competency_evaluation'],
                'Timestamp': message_data['timestamp'],
                'SessionInfo': json.dumps(message_data.get('session_info', {}))
            }
            
            target_list = self.client.web.lists.get_by_title(self.config.SHAREPOINT_LIST_CHATS)
            target_list.add_item(list_item).execute_query()
            
            logger.info(f"Chat message saved to SharePoint: {message_data['chat_id']}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving to SharePoint: {str(e)}")
            return False
    
    def get_chat_history(self, user_id: str, limit: int = 50, offset: int = 0) -> List[Dict]:
        """SharePointからチャット履歴取得"""
        try:
            if self.config.MOCK_MODE:
                return self._get_mock_chat_history(user_id, limit, offset)
            
            target_list = self.client.web.lists.get_by_title(self.config.SHAREPOINT_LIST_CHATS)
            items = target_list.items.filter(f"UserId eq '{user_id}'").order_by("Timestamp desc").top(limit).execute_query()
            
            results = []
            for item in items:
                results.append({
                    'chat_id': item.properties.get('ChatId'),
                    'user_message': item.properties.get('UserMessage'),
                    'ai_response': item.properties.get('AIResponse'),
                    'is_competency_evaluation': item.properties.get('IsCompetencyEvaluation', False),
                    'timestamp': item.properties.get('Timestamp')
                })
            
            return results
            
        except Exception as e:
            logger.error(f"Error getting chat history from SharePoint: {str(e)}")
            return []
    
    # 他のメソッドは省略（CosmosDBManagerと同様の実装）
    
    def get_competency_evaluations(self, start_date: datetime = None, end_date: datetime = None) -> List[Dict]:
        # SharePoint実装
        if self.config.MOCK_MODE:
            return self._get_mock_competency_evaluations(start_date, end_date)
        # 実装省略
        return []
    
    def get_usage_statistics(self) -> Dict:
        # SharePoint実装
        if self.config.MOCK_MODE:
            return self._get_mock_usage_statistics()
        # 実装省略
        return {}

class DatabaseManager:
    """データベース管理ファクトリクラス"""
    
    def __init__(self):
        self.config = Config()
        
        if self.config.DATABASE_TYPE.lower() == 'sharepoint':
            self.db = SharePointManager(self.config)
        else:
            self.db = CosmosDBManager(self.config)
    
    def save_chat_message(self, message_data: Dict) -> bool:
        return self.db.save_chat_message(message_data)
    
    def get_chat_history(self, user_id: str, limit: int = 50, offset: int = 0) -> List[Dict]:
        return self.db.get_chat_history(user_id, limit, offset)
    
    def get_competency_evaluations(self, start_date: datetime = None, end_date: datetime = None) -> List[Dict]:
        return self.db.get_competency_evaluations(start_date, end_date)
    
    def get_usage_statistics(self) -> Dict:
        return self.db.get_usage_statistics()