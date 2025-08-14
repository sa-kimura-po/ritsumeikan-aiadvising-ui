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
        // コンピテンシー評価のモック応答（新フォーマット）
        const competencies = [
            { code: 'R', name: 'Resilience（しなやかさ）', desc: '困ったことや失敗したことから学び立ち直る力' },
            { code: 'I', name: 'Initiative（自発性）', desc: '自分で自分の目標を決め、あきらめることなく取り組む' },
            { code: 'T', name: 'Teamwork（チームワーク）', desc: '目的を達成するために他の人と協力する' },
            { code: 'S', name: 'Self-efficacy（自己効力感）', desc: '自分ならどういうふうに問題解決し、自分を信じる感覚' },
            { code: 'U', name: 'Understanding（理解力）', desc: '科学的に物事を理解する' },
            { code: 'M', name: 'Multitasking（マルチタスキング）', desc: '複数の課題にバランスよく取り組む' },
            { code: 'E', name: 'Empathy（共感力）', desc: '他人の気持ちを想像して、その心に寄り添う' },
            { code: 'C', name: 'Innovation（変革力）', desc: '新しい考え方で、物事に変化を生み出す' }
        ];

        const selectedCompetencies = competencies
            .sort(() => 0.5 - Math.random())
            .slice(0, Math.floor(Math.random() * 2) + 3); // 3-4個選択

        const achievements = [
            '授業でのグループワークにおいて、チームメンバーとの協働を通じて課題解決に取り組んだこと',
            'ピアサポートの理論を学び、実際の支援場面で活用しようとする意識を持ったこと',
            '他者の意見を聞きながら、自分なりの考えを整理し表現できるようになったこと',
            '授業での学びを振り返り、今後の学習目標を明確に設定したこと',
            '困難な状況でも諦めずに解決策を模索する姿勢を示したこと'
        ];

        const turningPoints = [
            'グループディスカッションで多様な意見に触れたことが、自分の考えを深める契機となった',
            '授業での体験学習が、理論と実践の結びつきを理解する分岐点となった',
            '他の学生との意見交換が、新しい視点を獲得するきっかけとなった',
            '教員からのフィードバックが、自己省察を深める機会となった'
        ];

        const competencyDetails = {
            'R': ['困難な状況に直面しても諦めずに取り組む姿勢を示した', '挫折や失敗を学習の機会として捉える柔軟性を発揮した'],
            'I': ['自分なりの学習目標を明確に設定し、それに向けて積極的に取り組む意欲を示した', '授業の内容を受け身で聞くだけでなく、主体的に学習に参加する姿勢を見せた'],
            'T': ['グループワークや協働学習において、他のメンバーと効果的に連携した', 'チーム目標の達成に向けて、自分の役割を理解し責任を持って行動した'],
            'S': ['自分の能力や判断に対して適切な自信を持ち、積極的に学習に取り組んだ', '困難な課題に対しても「やればできる」という前向きな姿勢を示した'],
            'U': ['授業内容を論理的に整理し、体系的に理解しようとする姿勢を示した', '複雑な概念や理論を、具体例と関連付けて理解する能力を発揮した'],
            'M': ['複数の学習課題を同時に管理し、バランスよく取り組む能力を示した', '時間管理や優先順位付けを適切に行い、効率的な学習を実践した'],
            'E': ['他の学生や教員の気持ちや立場を理解し、適切に配慮した行動を取った', '相手の表情や言動から感情を読み取り、共感的な対応を示した'],
            'C': ['従来の考え方にとらわれず、新しい視点から物事を捉えようとした', '創意工夫を凝らし、独自の解決策やアプローチを提案した']
        };

        // 新フォーマットのレスポンス生成
        let response = 'コンピテンシー評価結果\\n\\n';
        
        // 【1】エピソード分析
        response += '【1】入力内容から以下のエピソードが分析されました。\\n';
        response += '● 成し遂げたこととその達成度\\n';
        const selectedAchievements = achievements.sort(() => 0.5 - Math.random()).slice(0, 2);
        selectedAchievements.forEach(achievement => {
            response += `- ${achievement}。\\n`;
        });

        response += '\\n● 成し遂げたことに至るための分岐点\\n';
        const selectedTurningPoints = turningPoints.sort(() => 0.5 - Math.random()).slice(0, 2);
        selectedTurningPoints.forEach(turningPoint => {
            response += `- ${turningPoint}。\\n`;
        });

        // 【2】コンピテンシー評価
        response += '\\n【2】入力内容から、以下のコンピテンシーが特に発揮されていると評価されました。\\n';
        
        selectedCompetencies.forEach((comp, index) => {
            response += `◆(${comp.code}): ${comp.name}\\n`;
            const details = competencyDetails[comp.code] || ['学習への積極的な取り組みを示した'];
            const selectedDetail = details[Math.floor(Math.random() * details.length)];
            response += `- ${selectedDetail}\\n\\n`;
        });

        // 総評
        response += '【総評】\\n';
        const adviceTopics = [
            ['継続的な学習の深化', '今回の学びをさらに深めるために、関連する文献や資料に積極的に触れることをおすすめします'],
            ['実践的な経験の積み重ね', '学んだ理論を実際の場面で活用する機会を積極的に作ることで、より深い理解につながります'],
            ['他者との協働スキル向上', 'グループワークや話し合いの場面で、より効果的なコミュニケーションを意識してみてください'],
            ['自己省察の習慣化', '定期的に自分の学習や成長を振り返る時間を設けることで、さらなる発展が期待されます']
        ];
        
        const selectedAdvice = adviceTopics[Math.floor(Math.random() * adviceTopics.length)];
        response += `■${selectedAdvice[0]}\\n`;
        response += `- ${selectedAdvice[1]}。`;

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