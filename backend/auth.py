"""
認証管理モジュール
EntraID認証とJWTトークン管理
"""
import jwt
import hashlib
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional
import requests

from config import Config

logger = logging.getLogger(__name__)

class AuthManager:
    """認証管理クラス"""
    
    def __init__(self):
        self.config = Config()
        self.mock_users = self._initialize_mock_users()
    
    def _initialize_mock_users(self):
        """モックユーザーデータ初期化"""
        return {
            'student001@st.ritsumei.ac.jp': {
                'id': 'student001',
                'name': '田中 太郎',
                'email': 'student001@st.ritsumei.ac.jp',
                'role': 'student',
                'student_id': 'IS1234567',
                'faculty': '情報理工学部',
                'department': '情報理工学科',
                'year': 2,
                'password_hash': self._hash_password('password123')
            },
            'student002@st.ritsumei.ac.jp': {
                'id': 'student002',
                'name': '佐藤 花子',
                'email': 'student002@st.ritsumei.ac.jp',
                'role': 'student',
                'student_id': 'IS1234568',
                'faculty': '情報理工学部',
                'department': '情報理工学科',
                'year': 2,
                'password_hash': self._hash_password('password123')
            },
            'professor@fc.ritsumei.ac.jp': {
                'id': 'professor001',
                'name': '中島 教授',
                'email': 'professor@fc.ritsumei.ac.jp',
                'role': 'faculty',
                'employee_id': 'FC001',
                'faculty': '情報理工学部',
                'department': '情報理工学科',
                'position': '教授',
                'password_hash': self._hash_password('faculty123')
            }
        }
    
    def _hash_password(self, password: str) -> str:
        """パスワードハッシュ化"""
        return hashlib.sha256(password.encode()).hexdigest()
    
    def authenticate_mock(self, email: str, password: str) -> Optional[Dict]:
        """モック認証"""
        if not self.config.MOCK_MODE:
            raise ValueError("Mock authentication is only available in mock mode")
        
        user = self.mock_users.get(email)
        if user and user['password_hash'] == self._hash_password(password):
            # パスワードハッシュは返さない
            user_data = {k: v for k, v in user.items() if k != 'password_hash'}
            logger.info(f"Mock authentication successful for user: {email}")
            return user_data
        
        logger.warning(f"Mock authentication failed for user: {email}")
        return None
    
    def authenticate_entra_id(self, access_token: str) -> Optional[Dict]:
        """EntraID認証"""
        if self.config.MOCK_MODE:
            logger.warning("EntraID authentication called in mock mode")
            return None
            
        try:
            # Microsoft Graph APIでユーザー情報を取得
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            response = requests.get('https://graph.microsoft.com/v1.0/me', headers=headers)
            
            if response.status_code == 200:
                user_info = response.json()
                
                # 立命館大学ドメインの確認
                email = user_info.get('mail') or user_info.get('userPrincipalName', '')
                if not self._is_valid_ritsumeikan_email(email):
                    logger.warning(f"Invalid email domain for user: {email}")
                    return None
                
                # ユーザーデータ構築
                user_data = {
                    'id': user_info.get('id'),
                    'name': user_info.get('displayName'),
                    'email': email,
                    'role': self._determine_user_role(email),
                    'entra_id': user_info.get('id')
                }
                
                logger.info(f"EntraID authentication successful for user: {email}")
                return user_data
            
            else:
                logger.error(f"Microsoft Graph API error: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"EntraID authentication error: {str(e)}")
            return None
    
    def _is_valid_ritsumeikan_email(self, email: str) -> bool:
        """立命館大学メールドメインの確認"""
        valid_domains = [
            '@st.ritsumei.ac.jp',  # 学生
            '@fc.ritsumei.ac.jp',  # 教員
            '@staff.ritsumei.ac.jp'  # 職員
        ]
        return any(email.endswith(domain) for domain in valid_domains)
    
    def _determine_user_role(self, email: str) -> str:
        """メールアドレスからユーザーロールを判定"""
        if email.endswith('@st.ritsumei.ac.jp'):
            return 'student'
        elif email.endswith('@fc.ritsumei.ac.jp'):
            return 'faculty'
        elif email.endswith('@staff.ritsumei.ac.jp'):
            return 'staff'
        else:
            return 'guest'
    
    def generate_token(self, user_data: Dict) -> str:
        """JWTトークン生成"""
        try:
            payload = {
                'user_id': user_data['id'],
                'email': user_data['email'],
                'role': user_data['role'],
                'name': user_data['name'],
                'iat': datetime.now(timezone.utc),
                'exp': datetime.now(timezone.utc) + self.config.JWT_ACCESS_TOKEN_EXPIRES
            }
            
            token = jwt.encode(
                payload,
                self.config.JWT_SECRET_KEY,
                algorithm='HS256'
            )
            
            logger.info(f"JWT token generated for user: {user_data['email']}")
            return token
            
        except Exception as e:
            logger.error(f"Token generation error: {str(e)}")
            raise
    
    def verify_token(self, token: str) -> Optional[Dict]:
        """JWTトークン検証"""
        try:
            if not token:
                return None
                
            payload = jwt.decode(
                token,
                self.config.JWT_SECRET_KEY,
                algorithms=['HS256']
            )
            
            # トークン有効性チェック
            if datetime.now(timezone.utc) > datetime.fromisoformat(payload['exp'].replace('Z', '+00:00')):
                logger.warning("Token expired")
                return None
            
            user_data = {
                'id': payload['user_id'],
                'email': payload['email'],
                'role': payload['role'],
                'name': payload['name']
            }
            
            return user_data
            
        except jwt.ExpiredSignatureError:
            logger.warning("Token expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Token verification error: {str(e)}")
            return None
    
    def refresh_token(self, token: str) -> Optional[str]:
        """トークンリフレッシュ"""
        user_data = self.verify_token(token)
        if user_data:
            return self.generate_token(user_data)
        return None
    
    def check_permission(self, user_data: Dict, required_role: str) -> bool:
        """権限チェック"""
        user_role = user_data.get('role')
        
        role_hierarchy = {
            'student': 1,
            'staff': 2,
            'faculty': 3,
            'admin': 4
        }
        
        user_level = role_hierarchy.get(user_role, 0)
        required_level = role_hierarchy.get(required_role, 0)
        
        return user_level >= required_level
    
    def log_authentication_attempt(self, email: str, success: bool, ip_address: str = None):
        """認証試行ログ"""
        status = "SUCCESS" if success else "FAILURE"
        logger.info(f"Authentication {status} - Email: {email}, IP: {ip_address}")
        
        # 実際の実装では、認証ログをデータベースに保存
        # セキュリティ監視のため