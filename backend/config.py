"""
設定管理
"""
import os
from datetime import timedelta

class Config:
    """アプリケーション設定"""
    
    # Flask設定
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    
    # Azure OpenAI設定
    AZURE_OPENAI_ENDPOINT = os.environ.get('AZURE_OPENAI_ENDPOINT', 'https://your-resource.openai.azure.com/')
    AZURE_OPENAI_KEY = os.environ.get('AZURE_OPENAI_KEY', 'your-api-key')
    AZURE_OPENAI_VERSION = os.environ.get('AZURE_OPENAI_VERSION', '2024-02-01')
    AZURE_OPENAI_DEPLOYMENT = os.environ.get('AZURE_OPENAI_DEPLOYMENT', 'gpt-4')
    
    # EntraID認証設定
    ENTRA_CLIENT_ID = os.environ.get('ENTRA_CLIENT_ID', 'your-client-id')
    ENTRA_CLIENT_SECRET = os.environ.get('ENTRA_CLIENT_SECRET', 'your-client-secret')
    ENTRA_TENANT_ID = os.environ.get('ENTRA_TENANT_ID', 'your-tenant-id')
    ENTRA_AUTHORITY = f"https://login.microsoftonline.com/{ENTRA_TENANT_ID or 'common'}"
    
    # JWT設定
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', SECRET_KEY)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)  # 8時間で期限切れ
    
    # データベース設定
    DATABASE_TYPE = os.environ.get('DATABASE_TYPE', 'cosmosdb')  # 'cosmosdb' or 'sharepoint'
    
    # CosmosDB設定
    COSMOS_ENDPOINT = os.environ.get('COSMOS_ENDPOINT', 'https://your-account.documents.azure.com:443/')
    COSMOS_KEY = os.environ.get('COSMOS_KEY', 'your-cosmos-key')
    COSMOS_DATABASE = os.environ.get('COSMOS_DATABASE', 'rai_advising')
    COSMOS_CONTAINER_CHATS = os.environ.get('COSMOS_CONTAINER_CHATS', 'chats')
    COSMOS_CONTAINER_USERS = os.environ.get('COSMOS_CONTAINER_USERS', 'users')
    
    # SharePoint設定
    SHAREPOINT_SITE_URL = os.environ.get('SHAREPOINT_SITE_URL', 'https://ritsumeikan.sharepoint.com/sites/your-site')
    SHAREPOINT_CLIENT_ID = os.environ.get('SHAREPOINT_CLIENT_ID', 'your-sharepoint-client-id')
    SHAREPOINT_CLIENT_SECRET = os.environ.get('SHAREPOINT_CLIENT_SECRET', 'your-sharepoint-secret')
    SHAREPOINT_LIST_CHATS = os.environ.get('SHAREPOINT_LIST_CHATS', 'RAI_Chats')
    SHAREPOINT_LIST_USERS = os.environ.get('SHAREPOINT_LIST_USERS', 'RAI_Users')
    
    # ログ設定
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    LOG_FILE = os.environ.get('LOG_FILE', 'rai_advising.log')
    
    # セキュリティ設定
    RATE_LIMIT = os.environ.get('RATE_LIMIT', '100 per hour')  # レート制限
    MAX_MESSAGE_LENGTH = int(os.environ.get('MAX_MESSAGE_LENGTH', '16000'))  # 最大メッセージ長
    
    # 立命館大学固有設定
    UNIVERSITY_NAME = "立命館大学"
    SYSTEM_NAME = "R-AI"
    COURSE_NAME = "ピアサポート論"
    
    # モックモード設定（開発・テスト用）
    MOCK_MODE = os.environ.get('MOCK_MODE', 'true').lower() == 'true'
    MOCK_AI_DELAY = float(os.environ.get('MOCK_AI_DELAY', '1.5'))  # AI応答の遅延シミュレーション（秒）
    
    @staticmethod
    def init_app(app):
        """アプリケーション初期化時の設定"""
        pass

class DevelopmentConfig(Config):
    """開発環境設定"""
    DEBUG = True
    MOCK_MODE = True

class ProductionConfig(Config):
    """本番環境設定"""
    DEBUG = False
    MOCK_MODE = False

class TestConfig(Config):
    """テスト環境設定"""
    TESTING = True
    MOCK_MODE = True
    DATABASE_TYPE = 'memory'  # インメモリDB使用

# 環境別設定マッピング
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestConfig,
    'default': DevelopmentConfig
}