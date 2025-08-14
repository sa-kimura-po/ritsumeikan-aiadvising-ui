class RAIChat {
    constructor() {
        this.currentChatId = null;
        this.chatHistory = [];
        this.currentMessages = [];
        this.isLoading = false;
        
        this.initializeElements();
        this.attachEventListeners();
        this.initializeAuth();
        this.loadChatHistory();
    }

    initializeElements() {
        // DOM要素の取得
        this.chatInput = document.getElementById('chatInput');
        this.chatSendBtn = document.getElementById('chatSendBtn');
        this.competencyBtn = document.getElementById('competencyBtn');
        this.newChatBtn = document.getElementById('newChatBtn');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.chatMessages = document.getElementById('chatMessages');
        this.historyList = document.getElementById('historyList');
        this.chatTitle = document.getElementById('chatTitle');
        this.charCount = document.getElementById('charCount');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.userInfo = document.getElementById('userInfo');
    }

    attachEventListeners() {
        // イベントリスナーの設定
        this.chatSendBtn.addEventListener('click', () => this.sendMessage(false));
        this.competencyBtn.addEventListener('click', () => this.sendMessage(true));
        this.newChatBtn.addEventListener('click', () => this.startNewChat());
        this.logoutBtn.addEventListener('click', () => this.logout());
        
        // 入力エリアのイベント
        this.chatInput.addEventListener('input', () => this.updateCharCounter());
        this.chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage(false);
            }
        });

        // リサイズイベント
        window.addEventListener('resize', () => this.handleResize());
    }

    initializeAuth() {
        // EntraID認証の初期化（モックアップ版）
        // 実際の実装ではMicrosoft Authentication Library (MSAL.js)を使用
        const user = localStorage.getItem('rai_user');
        if (user) {
            const userData = JSON.parse(user);
            this.userInfo.textContent = `${userData.name}さん`;
        } else {
            // 認証画面への遷移（モックアップでは仮のユーザーデータを設定）
            this.mockLogin();
        }
    }

    mockLogin() {
        // モックアップ用の認証
        const mockUser = {
            id: 'student001',
            name: '田中 太郎',
            email: 'tanaka@st.ritsumei.ac.jp',
            role: 'student'
        };
        
        localStorage.setItem('rai_user', JSON.stringify(mockUser));
        this.userInfo.textContent = `${mockUser.name}さん`;
    }

    logout() {
        // ログアウト処理
        localStorage.removeItem('rai_user');
        localStorage.removeItem('rai_chat_history');
        
        // 認証画面への遷移（モックアップでは再ログイン）
        if (confirm('ログアウトしますか？')) {
            location.reload();
        }
    }

    updateCharCounter() {
        const count = this.chatInput.value.length;
        this.charCount.textContent = count;
        
        // ボタンの有効/無効制御
        const hasText = count > 0 && this.chatInput.value.trim() !== '';
        this.chatSendBtn.disabled = !hasText || this.isLoading;
        this.competencyBtn.disabled = !hasText || this.isLoading;
    }

    startNewChat() {
        // 新しいチャットを開始
        this.currentChatId = this.generateChatId();
        this.currentMessages = [];
        this.chatTitle.textContent = '新しいチャット';
        
        // チャット表示をクリア
        this.chatMessages.innerHTML = `
            <div class="welcome-message">
                <div class="ai-message">
                    <div class="message-avatar">
                        <i class="fas fa-robot ai-icon"></i>
                    </div>
                    <div class="message-content">
                        <div class="message-text">
                            こんにちは！R-AIです。<br>
                            授業の感想や学んだことを入力して、コンピテンシー評価を受けることができます。<br>
                            何でもお気軽にお話しください。
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 履歴リストの選択状態をリセット
        document.querySelectorAll('.history-item').forEach(item => {
            item.classList.remove('active');
        });
    }

    async sendMessage(isCompetencyEvaluation = false) {
        const messageText = this.chatInput.value.trim();
        if (!messageText || this.isLoading) return;

        // ローディング状態に設定
        this.setLoading(true);
        
        // ユーザーメッセージを表示
        this.addMessage(messageText, 'user', isCompetencyEvaluation);
        
        // 入力欄をクリア
        this.chatInput.value = '';
        this.updateCharCounter();
        
        try {
            // APIに送信
            const response = await this.callAPI(messageText, isCompetencyEvaluation);
            
            // AIの応答を表示
            this.addMessage(response.message, 'ai', isCompetencyEvaluation);
            
            // チャット履歴を保存
            this.saveChatToHistory(messageText, response.message, isCompetencyEvaluation);
            
        } catch (error) {
            console.error('APIエラー:', error);
            this.addMessage(
                '申し訳ございません。システムエラーが発生しました。しばらく時間をおいてから再度お試しください。',
                'ai',
                false
            );
        } finally {
            this.setLoading(false);
        }
    }

    async callAPI(message, isCompetencyEvaluation) {
        // モックアップAPI呼び出し
        // 実際の実装ではPython backend APIを呼び出し
        
        await new Promise(resolve => setTimeout(resolve, 1500)); // 遅延をシミュレート
        
        if (isCompetencyEvaluation) {
            return {
                message: this.generateCompetencyResponse(message),
                isCompetency: true
            };
        } else {
            return {
                message: this.generateChatResponse(message),
                isCompetency: false
            };
        }
    }

    generateCompetencyResponse(message) {
        // コンピテンシー評価のモック応答
        const competencies = [
            { name: 'しなやかさ', score: Math.floor(Math.random() * 3) + 3 },
            { name: '自発性', score: Math.floor(Math.random() * 3) + 3 },
            { name: 'チームワーク', score: Math.floor(Math.random() * 3) + 3 },
            { name: '自己効力感', score: Math.floor(Math.random() * 3) + 3 },
            { name: '理解力', score: Math.floor(Math.random() * 3) + 3 },
            { name: 'マルチタスキング', score: Math.floor(Math.random() * 3) + 3 },
            { name: '共感力', score: Math.floor(Math.random() * 3) + 3 },
            { name: '変革力', score: Math.floor(Math.random() * 3) + 3 }
        ];

        const selectedCompetencies = competencies
            .sort(() => 0.5 - Math.random())
            .slice(0, 3);

        let response = `【コンピテンシー評価結果】\\n\\n`;
        response += `入力いただいた内容から、以下のコンピテンシーが特に発揮されていると評価されました：\\n\\n`;

        selectedCompetencies.forEach(comp => {
            const stars = '★'.repeat(comp.score) + '☆'.repeat(5 - comp.score);
            response += `◆ ${comp.name} ${stars} (${comp.score}/5)\\n`;
        });

        response += `\\n【総評】\\n`;
        response += `今回の授業での学びや気づきから、特に「${selectedCompetencies[0].name}」と「${selectedCompetencies[1].name}」が高く評価されます。`;
        response += `継続的な学習と振り返りにより、さらなるコンピテンシーの向上が期待されます。\\n\\n`;
        response += `次回も授業での学びを積極的に言語化し、自己成長につなげていきましょう。`;

        return response;
    }

    generateChatResponse(message) {
        // 通常チャットのモック応答
        const responses = [
            'そのような視点は非常に興味深いですね。もう少し詳しく教えていただけますか？',
            '授業での学びを深く考察されていますね。その気づきをどのように今後に活かしていこうと思いますか？',
            '素晴らしい観点です。他の授業や日常生活でも類似の経験はありましたか？',
            'その考えについて、もう少し具体的な例があれば教えてください。',
            '興味深い内容ですね。この学びから、どのような新しい疑問が生まれましたか？'
        ];

        return responses[Math.floor(Math.random() * responses.length)];
    }

    addMessage(text, sender, isCompetencyEvaluation = false) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message';
        
        const timestamp = new Date().toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit'
        });

        // 改行文字をHTMLの改行に変換
        const formattedText = text.replace(/\\n/g, '<br>').replace(/\n/g, '<br>');

        if (sender === 'user') {
            messageElement.classList.add('user-message');
            messageElement.innerHTML = `
                <div class="message-content">
                    ${isCompetencyEvaluation ? '<div class="competency-indicator"><i class="fas fa-chart-line"></i> コンピテンシー評価</div>' : ''}
                    <div class="message-text">${formattedText}</div>
                    <div class="message-time">${timestamp}</div>
                </div>
                <div class="message-avatar user-avatar">
                    <i class="fas fa-user user-icon"></i>
                </div>
            `;
        } else {
            messageElement.classList.add('ai-message');
            messageElement.innerHTML = `
                <div class="message-avatar">
                    <i class="fas fa-robot ai-icon"></i>
                </div>
                <div class="message-content">
                    ${isCompetencyEvaluation ? '<div class="competency-indicator"><i class="fas fa-chart-line"></i> コンピテンシー評価結果</div>' : ''}
                    <div class="message-text">${formattedText}</div>
                    <div class="message-time">${timestamp}</div>
                </div>
            `;
        }

        // ウェルカムメッセージがある場合は削除
        const welcomeMessage = this.chatMessages.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }

        this.chatMessages.appendChild(messageElement);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;

        // 現在のメッセージリストに追加
        this.currentMessages.push({
            text: text,
            sender: sender,
            timestamp: new Date().toISOString(),
            isCompetencyEvaluation: isCompetencyEvaluation
        });
    }

    saveChatToHistory(userMessage, aiMessage, isCompetencyEvaluation) {
        if (!this.currentChatId) {
            this.currentChatId = this.generateChatId();
        }

        const chatData = {
            id: this.currentChatId,
            title: userMessage.substring(0, 30) + (userMessage.length > 30 ? '...' : ''),
            lastMessage: aiMessage.substring(0, 50) + (aiMessage.length > 50 ? '...' : ''),
            timestamp: new Date().toISOString(),
            messages: this.currentMessages,
            hasCompetencyEvaluation: isCompetencyEvaluation || this.currentMessages.some(m => m.isCompetencyEvaluation)
        };

        // 既存の履歴を更新または新規追加
        const existingIndex = this.chatHistory.findIndex(chat => chat.id === this.currentChatId);
        if (existingIndex >= 0) {
            this.chatHistory[existingIndex] = chatData;
        } else {
            this.chatHistory.unshift(chatData);
        }

        // ローカルストレージに保存
        localStorage.setItem('rai_chat_history', JSON.stringify(this.chatHistory));
        
        // 履歴表示を更新
        this.updateHistoryDisplay();
        
        // チャットタイトルを更新
        this.chatTitle.textContent = chatData.title;
    }

    loadChatHistory() {
        const savedHistory = localStorage.getItem('rai_chat_history');
        if (savedHistory) {
            this.chatHistory = JSON.parse(savedHistory);
            this.updateHistoryDisplay();
        }
    }

    updateHistoryDisplay() {
        this.historyList.innerHTML = '';
        
        if (this.chatHistory.length === 0) {
            this.historyList.innerHTML = '<p style="color: #666; font-size: 14px; text-align: center; padding: 20px;">チャット履歴がありません</p>';
            return;
        }

        this.chatHistory.forEach(chat => {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            if (chat.id === this.currentChatId) {
                historyItem.classList.add('active');
            }
            
            const date = new Date(chat.timestamp).toLocaleDateString('ja-JP');
            const time = new Date(chat.timestamp).toLocaleTimeString('ja-JP', {
                hour: '2-digit',
                minute: '2-digit'
            });
            
            historyItem.innerHTML = `
                <div class="history-title">
                    ${chat.hasCompetencyEvaluation ? '<i class="fas fa-chart-line" style="color: var(--ritsumeikan-red); margin-right: 4px;"></i>' : ''}
                    ${chat.title}
                </div>
                <div class="history-time">${date} ${time}</div>
            `;
            
            historyItem.addEventListener('click', () => this.loadChat(chat));
            this.historyList.appendChild(historyItem);
        });
    }

    loadChat(chatData) {
        this.currentChatId = chatData.id;
        this.currentMessages = chatData.messages;
        this.chatTitle.textContent = chatData.title;
        
        // メッセージ表示をクリア
        this.chatMessages.innerHTML = '';
        
        // メッセージを再構築
        chatData.messages.forEach(message => {
            this.addMessageToDisplay(message);
        });
        
        // 履歴リストの選択状態を更新
        document.querySelectorAll('.history-item').forEach(item => {
            item.classList.remove('active');
        });
        event.currentTarget.classList.add('active');
    }

    addMessageToDisplay(message) {
        // 表示のみのメッセージ追加（currentMessagesには追加しない）
        const messageElement = document.createElement('div');
        messageElement.className = 'message';
        
        const timestamp = new Date(message.timestamp).toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit'
        });

        // 改行文字をHTMLの改行に変換
        const formattedText = message.text.replace(/\\n/g, '<br>').replace(/\n/g, '<br>');

        if (message.sender === 'user') {
            messageElement.classList.add('user-message');
            messageElement.innerHTML = `
                <div class="message-content">
                    ${message.isCompetencyEvaluation ? '<div class="competency-indicator"><i class="fas fa-chart-line"></i> コンピテンシー評価</div>' : ''}
                    <div class="message-text">${formattedText}</div>
                    <div class="message-time">${timestamp}</div>
                </div>
                <div class="message-avatar user-avatar">
                    <i class="fas fa-user user-icon"></i>
                </div>
            `;
        } else {
            messageElement.classList.add('ai-message');
            messageElement.innerHTML = `
                <div class="message-avatar">
                    <i class="fas fa-robot ai-icon"></i>
                </div>
                <div class="message-content">
                    ${message.isCompetencyEvaluation ? '<div class="competency-indicator"><i class="fas fa-chart-line"></i> コンピテンシー評価結果</div>' : ''}
                    <div class="message-text">${formattedText}</div>
                    <div class="message-time">${timestamp}</div>
                </div>
            `;
        }

        this.chatMessages.appendChild(messageElement);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    setLoading(isLoading) {
        this.isLoading = isLoading;
        this.loadingOverlay.style.display = isLoading ? 'flex' : 'none';
        this.updateCharCounter();
    }

    generateChatId() {
        return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    handleResize() {
        // レスポンシブ対応の処理
        if (window.innerWidth <= 600) {
            // モバイル対応
        }
    }
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
    new RAIChat();
});