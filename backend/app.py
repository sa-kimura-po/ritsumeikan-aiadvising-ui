"""
立命館大学AIアドバイジングシステム - バックエンドAPI
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import logging
from datetime import datetime, timezone
import uuid
import os
from typing import Dict, List, Optional
import time
import csv
from io import StringIO

# 設定
from config import Config
from auth import AuthManager
from database import DatabaseManager
from ai_service import AIService

app = Flask(__name__)
app.config.from_object(Config)
CORS(app, origins=["http://localhost:3000", "http://localhost:8000"])

# ロギング設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# サービス初期化
auth_manager = AuthManager()
db_manager = DatabaseManager()
ai_service = AIService()

@app.route('/health', methods=['GET'])
def health_check():
    """ヘルスチェック"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'version': '1.0.0'
    })

@app.route('/api/auth/login', methods=['POST'])
def login():
    """EntraID認証（モックアップ版）"""
    try:
        data = request.get_json()
        
        # 実際の実装ではEntraID認証を行う
        # モックアップでは簡単な認証シミュレーション
        user_data = auth_manager.authenticate_mock(data.get('email'), data.get('password'))
        
        if user_data:
            token = auth_manager.generate_token(user_data)
            return jsonify({
                'success': True,
                'user': user_data,
                'token': token
            })
        else:
            return jsonify({
                'success': False,
                'message': '認証に失敗しました'
            }), 401
            
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/auth/verify', methods=['POST'])
def verify_token():
    """トークン検証"""
    try:
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        user_data = auth_manager.verify_token(token)
        
        if user_data:
            return jsonify({
                'valid': True,
                'user': user_data
            })
        else:
            return jsonify({'valid': False}), 401
            
    except Exception as e:
        logger.error(f"Token verification error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/chat/send', methods=['POST'])
def send_message():
    """チャットメッセージ送信"""
    try:
        # 認証確認
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        user_data = auth_manager.verify_token(token)
        if not user_data:
            return jsonify({'error': 'Unauthorized'}), 401
            
        data = request.get_json()
        message = data.get('message', '').strip()
        is_competency = data.get('is_competency_evaluation', False)
        chat_id = data.get('chat_id')
        
        if not message:
            return jsonify({'error': 'Message is required'}), 400
            
        # チャットIDが無い場合は新規作成
        if not chat_id:
            chat_id = str(uuid.uuid4())
            
        # AIサービスを呼び出し
        if is_competency:
            ai_response = ai_service.get_competency_evaluation(message)
        else:
            ai_response = ai_service.get_general_response(message)
            
        # データベースに保存
        message_data = {
            'chat_id': chat_id,
            'user_id': user_data['id'],
            'user_message': message,
            'ai_response': ai_response,
            'is_competency_evaluation': is_competency,
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'session_info': {
                'user_agent': request.headers.get('User-Agent'),
                'ip_address': request.remote_addr
            }
        }
        
        db_manager.save_chat_message(message_data)
        
        return jsonify({
            'success': True,
            'chat_id': chat_id,
            'message': ai_response,
            'timestamp': message_data['timestamp']
        })
        
    except Exception as e:
        logger.error(f"Chat send error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/chat/history/<user_id>', methods=['GET'])
def get_chat_history(user_id):
    """チャット履歴取得"""
    try:
        # 認証確認
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        user_data = auth_manager.verify_token(token)
        if not user_data or user_data['id'] != user_id:
            return jsonify({'error': 'Unauthorized'}), 401
            
        # クエリパラメータ
        limit = min(int(request.args.get('limit', 50)), 100)
        offset = int(request.args.get('offset', 0))
        
        # 履歴取得
        history = db_manager.get_chat_history(user_id, limit, offset)
        
        return jsonify({
            'success': True,
            'history': history,
            'count': len(history)
        })
        
    except Exception as e:
        logger.error(f"Chat history error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/api/admin/export', methods=['POST'])
def export_competency_data():
    """教員向けコンピテンシー評価データCSV出力"""
    try:
        # 認証確認（教員権限）
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        user_data = auth_manager.verify_token(token)
        if not user_data or user_data.get('role') != 'faculty':
            return jsonify({'error': 'Unauthorized - Faculty access required'}), 401
            
        data = request.get_json()
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        # 日付検証
        try:
            if start_date:
                start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            if end_date:
                end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        except ValueError:
            return jsonify({'error': 'Invalid date format'}), 400
            
        # コンピテンシー評価データ取得
        competency_data = db_manager.get_competency_evaluations(start_date, end_date)
        
        # CSV生成
        csv_content = generate_csv(competency_data)
        
        return jsonify({
            'success': True,
            'csv_data': csv_content,
            'record_count': len(competency_data),
            'export_timestamp': datetime.now(timezone.utc).isoformat()
        })
        
    except Exception as e:
        logger.error(f"Export error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

def generate_csv(data: List[Dict]) -> str:
    """CSV形式のデータ生成"""
    output = StringIO()
    writer = csv.writer(output)
    
    # ヘッダー
    writer.writerow([
        '日時',
        '学生ID', 
        'ChatID',
        '入力内容',
        'AI評価結果'
    ])
    
    # データ
    for record in data:
        writer.writerow([
            record.get('timestamp', ''),
            record.get('user_id', ''),
            record.get('chat_id', ''),
            record.get('user_message', ''),
            record.get('ai_response', '')
        ])
    
    return output.getvalue()

@app.route('/api/admin/stats', methods=['GET'])
def get_admin_stats():
    """管理画面用統計データ"""
    try:
        # 認証確認（教員権限）
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        user_data = auth_manager.verify_token(token)
        if not user_data or user_data.get('role') != 'faculty':
            return jsonify({'error': 'Unauthorized - Faculty access required'}), 401
            
        stats = db_manager.get_usage_statistics()
        
        return jsonify({
            'success': True,
            'stats': stats
        })
        
    except Exception as e:
        logger.error(f"Stats error: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    # 開発環境での起動
    app.run(debug=True, host='0.0.0.0', port=5000)