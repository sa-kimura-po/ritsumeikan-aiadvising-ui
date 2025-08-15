class RAIChatStandalone {
    constructor() {
        this.currentChatId = null;
        this.chatHistory = [];
        this.currentMessages = [];
        this.isLoading = false;
        
        this.initializeElements();
        this.attachEventListeners();
        this.initializeUI();
        this.loadChatHistory();
    }

    initializeElements() {
        // DOM要素の取得
        this.chatInput = document.getElementById('chatInput');
        this.chatSendBtn = document.getElementById('chatSendBtn');
        this.competencyBtn = document.getElementById('competencyBtn');
        this.newChatBtn = document.getElementById('newChatBtn');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.clearAllBtn = document.getElementById('clearAllBtn');
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
        this.clearAllBtn.addEventListener('click', () => this.clearAllHistory());
        
        // 入力エリアのイベント
        this.chatInput.addEventListener('input', () => this.updateCharCounter());
        this.chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage(false);
            }
        });
    }

    initializeUI() {
        // 初期UI設定
        this.userInfo.textContent = 'スタンドアロンユーザー';
        this.startNewChat();
        this.updateCharCounter();
        
        // ローディングオーバーレイを非表示にする
        this.loadingOverlay.style.display = 'none';
    }

    logout() {
        if (confirm('リセットしますか？')) {
            localStorage.removeItem('rai_standalone_chat_history');
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
        
        // 文字色の変更（上限近く）
        if (count > 15000) {
            this.charCount.style.color = '#dc3545';
        } else if (count > 12000) {
            this.charCount.style.color = '#fd7e14';
        } else {
            this.charCount.style.color = '#6c757d';
        }
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
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="message-content">
                        <div class="message-text">
                            こんにちは！R-AIです。<br>
                            授業の感想や学んだことを入力して、コンピテンシー評価を受けることができます。<br>
                            何でもお気軽にお話しください。<br><br>
                            <strong style="color: var(--ritsumeikan-red);">※ スタンドアロン版：実際の入力内容に基づく改善されたコンピテンシー評価</strong>
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
            // 遅延をシミュレート
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            let response;
            if (isCompetencyEvaluation) {
                response = this.generateImprovedCompetencyResponse(messageText);
            } else {
                response = this.generateChatResponse(messageText);
            }
            
            // AIの応答を表示
            this.addMessage(response, 'ai', isCompetencyEvaluation);
            
            // チャット履歴を保存
            this.saveChatToHistory(messageText, response, isCompetencyEvaluation);
            
        } catch (error) {
            console.error('エラー:', error);
            this.addMessage(
                '申し訳ございません。システムエラーが発生しました。',
                'ai',
                false
            );
        } finally {
            this.setLoading(false);
        }
    }

    generateImprovedCompetencyResponse(userMessage) {
        // 改善されたコンピテンシー評価（実際の入力内容に基づく）
        const messageLower = userMessage.toLowerCase();
        
        // 発揮されているコンピテンシーを入力内容から判定
        const competencies = [];
        
        // しなやかさ（困難・不安・失敗への対応）
        if (this.containsWords(messageLower, ["不安", "困っ", "難し", "失敗", "うまくいかない", "ついていけない"])) {
            competencies.push({
                code: "R",
                name: "Resilience（しなやかさ）",
                desc: "困難な状況に向き合い、課題を認識する力を示しています"
            });
        }
        
        // 自己効力感（自分の状況を客観視）
        if (this.containsWords(messageLower, ["自分", "意見", "考え", "振り返り", "反省"])) {
            competencies.push({
                code: "S", 
                name: "Self-efficacy（自己効力感）",
                desc: "自分の現状を客観的に把握し、課題を認識する自己理解力を発揮しています"
            });
        }
        
        // チームワーク（グループワーク・ペアワーク参加）
        if (this.containsWords(messageLower, ["ペア", "グループ", "チーム", "授業", "参加", "一緒"])) {
            competencies.push({
                code: "T",
                name: "Teamwork（チームワーク）",
                desc: "授業でのペアワークに参加し、協働学習の場に身を置く姿勢を示しています"
            });
        }
        
        // 共感力（他者や環境への配慮・観察）
        if (this.containsWords(messageLower, ["エアコン", "寒い", "環境", "教室", "周り", "他の人"])) {
            competencies.push({
                code: "E",
                name: "Empathy（共感力）",
                desc: "学習環境や周囲の状況に対する気づきと配慮を示しています"
            });
        }
        
        // 理解力（学習・理解に関する内容）
        if (this.containsWords(messageLower, ["理解", "学ん", "勉強", "知識", "覚え"])) {
            competencies.push({
                code: "U",
                name: "Understanding（理解力）",
                desc: "新しい知識や概念を学習しようとする姿勢を示しています"
            });
        }
        
        // 自発性（積極的な取り組み）
        if (this.containsWords(messageLower, ["積極的", "頑張", "挑戦", "努力", "取り組"])) {
            competencies.push({
                code: "I",
                name: "Initiative（自発性）",
                desc: "学習に対する積極的な取り組み姿勢を示しています"
            });
        }
        
        // コンピテンシーが見つからない場合のデフォルト
        if (competencies.length === 0) {
            competencies.push(
                {
                    code: "R",
                    name: "Resilience（しなやかさ）",
                    desc: "現在の状況に向き合う姿勢を示しています"
                },
                {
                    code: "S",
                    name: "Self-efficacy（自己効力感）",
                    desc: "自己省察と課題認識を行う力を発揮しています"
                }
            );
        }
        
        // 最大3個まで選択
        const selected = competencies.slice(0, 3);
        
        // 入力内容に基づく現状分析
        const situationAnalysis = this.analyzeLearningsituation(userMessage);
        
        // レスポンス生成
        let response = "コンピテンシー評価結果\n\n";
        
        // 【1】エピソード分析
        response += "【1】入力内容から以下のエピソードが分析されました。\n";
        response += "● 成し遂げたこととその達成度\n";
        
        // 実際の入力内容に基づく成果の分析
        if (this.containsWords(userMessage.toLowerCase(), ["不安", "ついていけない", "困っ"])) {
            response += "- 現在の状況を正直に振り返り、課題を認識できたこと。\n";
            response += "- 困難な状況に向き合い、自分の感情を言語化できたこと。\n";
        } else if (this.containsWords(userMessage.toLowerCase(), ["ペア", "グループ", "意見", "話"])) {
            response += "- ペアワークの場に参加し、協働学習を体験したこと。\n";
            response += "- 自分のコミュニケーションの課題を客観視できたこと。\n";
        } else {
            response += "- 授業での体験を丁寧に振り返り、学習に取り組んだこと。\n";
            response += "- 自分なりの視点で状況を観察し、気づきを得たこと。\n";
        }
        
        response += "\n● 成し遂げたことに至るための分岐点\n";
        if (this.containsWords(userMessage.toLowerCase(), ["不安", "困っ"])) {
            response += "- 授業への参加自体が、新しい環境への適応の第一歩となった。\n";
            response += "- 自分の感情を受け入れ、成長の機会として捉えられた。\n";
        } else if (this.containsWords(userMessage.toLowerCase(), ["ペア", "グループ"])) {
            response += "- ペアワークでの経験が、コミュニケーションの重要性を実感する契機となった。\n";
            response += "- 他者との関わりを通じて、自分の特性を理解する機会となった。\n";
        } else {
            response += "- 授業での体験が、新しい学習の視点を獲得する契機となった。\n";
            response += "- 日常の観察から学習につながる気づきを得ることができた。\n";
        }
        
        // 【2】コンピテンシー評価
        response += "\n【2】入力内容から、以下のコンピテンシーが特に発揮されていると評価されました。\n";
        
        selected.forEach((comp, index) => {
            response += `◆(${comp.code}): ${comp.name}\n`;
            response += `- ${comp.desc}\n\n`;
        });
        
        // 総評
        response += "【総評】\n";
        response += `■${situationAnalysis.title || "学習への取り組み"}\n`;
        response += `- ${situationAnalysis.summary}`;
        
        return response;
    }

    containsWords(text, words) {
        return words.some(word => text.includes(word));
    }

    analyzeLearningsituation(userMessage) {
        const messageLower = userMessage.toLowerCase();
        
        // 不安・困難に関する内容
        if (this.containsWords(messageLower, ["不安", "ついていけない", "困っ"])) {
            return {
                title: "困難に向き合う姿勢",
                summary: "入学から間もない時期に感じる不安は自然なことです。現在の状況を正直に振り返り、課題を認識できていることは、今後の成長につながる重要な第一歩です。",
                advice: "・授業でわからないことは、遠慮せずに教員やクラスメートに質問してみましょう\n・ペアワークでは、まず相手の話をよく聞くことから始めてみてください\n・少しずつでも発言する機会を増やしていくことで、自信につながります"
            };
        }
        
        // コミュニケーション・発言に関する内容
        else if (this.containsWords(messageLower, ["意見", "言え", "話", "発言"])) {
            return {
                title: "コミュニケーション能力の向上",
                summary: "ペアワークで自分の意見を表現することの難しさを感じていらっしゃいますね。この気づき自体が、コミュニケーション能力向上への第一歩となります。",
                advice: "・相手の話に「うなずき」や「そうですね」といった相槌から始めてみましょう\n・「私はこう思うのですが、どうでしょうか？」と相手の意見も求める表現を使ってみてください\n・完璧な意見でなくても、自分なりの感想を伝えることから始めましょう"
            };
        }
        
        // 学習・理解に関する内容
        else if (this.containsWords(messageLower, ["学ん", "理解", "勉強", "知識"])) {
            return {
                title: "継続的な学習の深化",
                summary: "学習内容に対する積極的な取り組み姿勢が見られます。新しい知識を吸収し、自分なりに理解しようとする態度は素晴らしいものです。",
                advice: "・学んだ内容を日常生活の場面と関連付けて考えてみてください\n・疑問に思ったことは積極的に調べたり質問したりしましょう\n・他の学生との議論を通じて、理解をさらに深めることができます"
            };
        }
        
        // 一般的なケース
        else {
            return {
                title: "学習への取り組み",
                summary: "授業での体験を丁寧に振り返り、学習環境にも気を配る観察力を示されています。このような細やかな気づきは、今後の学習に活かせる貴重な資質です。",
                advice: "・今回の気づきを次回の授業で活かしてみてください\n・小さな変化や成長も大切にし、継続的な学習を心がけましょう\n・疑問や困ったことがあれば、積極的にサポートを求めることも重要です"
            };
        }
    }

    generateChatResponse(message) {
        // 通常チャットの応答
        const messageLower = message.toLowerCase();
        
        // キーワードベースの応答選択
        if (this.containsWords(messageLower, ["グループ", "チーム", "協力"])) {
            return "グループでの協働について言及されていますね。チームワークやコミュニケーションの観点で、どのような学びがありましたか？";
        } else if (this.containsWords(messageLower, ["聞く", "傾聴", "話"])) {
            return "傾聴やコミュニケーションに関する気づきですね。相手の立場に立って考えることで、どのような新しい発見がありましたか？";
        } else if (this.containsWords(messageLower, ["難しい", "困った", "課題"])) {
            return "困難な状況での学びは特に価値がありますね。その経験から、どのような対処方法や解決策を見つけることができましたか？";
        } else {
            const responses = [
                'そのような視点は非常に興味深いですね。もう少し詳しく教えていただけますか？',
                '授業での学びを深く考察されていますね。その気づきをどのように今後に活かしていこうと思いますか？',
                '素晴らしい観点です。他の授業や日常生活でも類似の経験はありましたか？',
                'その考えについて、もう少し具体的な例があれば教えてください。',
                '興味深い内容ですね。この学びから、どのような新しい疑問が生まれましたか？'
            ];
            return responses[Math.floor(Math.random() * responses.length)];
        }
    }

    addMessage(text, sender, isCompetencyEvaluation = false) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message';
        
        const timestamp = new Date().toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit'
        });

        // 改行文字をHTMLの改行に変換
        const formattedText = text.replace(/\n/g, '<br>');

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
        localStorage.setItem('rai_standalone_chat_history', JSON.stringify(this.chatHistory));
        
        // 履歴表示を更新
        this.updateHistoryDisplay();
        
        // チャットタイトルを更新
        this.chatTitle.textContent = chatData.title;
    }

    loadChatHistory() {
        const savedHistory = localStorage.getItem('rai_standalone_chat_history');
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
                <div class="history-content">
                    <div class="history-title">
                        ${chat.hasCompetencyEvaluation ? '<i class="fas fa-chart-line" style="color: var(--ritsumeikan-red); margin-right: 4px;"></i>' : ''}
                        ${chat.title}
                    </div>
                    <div class="history-time">${date} ${time}</div>
                </div>
                <button class="history-delete-btn" title="履歴を削除">
                    <i class="fas fa-times"></i>
                </button>
            `;
            
            // チャット読み込みイベント
            const historyContent = historyItem.querySelector('.history-content');
            historyContent.addEventListener('click', () => this.loadChat(chat));
            
            // 削除ボタンイベント
            const deleteBtn = historyItem.querySelector('.history-delete-btn');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteChatHistory(chat.id);
            });
            
            this.historyList.appendChild(historyItem);
        });
    }

    deleteChatHistory(chatId) {
        if (!confirm('この履歴を削除しますか？')) {
            return;
        }

        this.chatHistory = this.chatHistory.filter(chat => chat.id !== chatId);
        localStorage.setItem('rai_standalone_chat_history', JSON.stringify(this.chatHistory));
        this.updateHistoryDisplay();
        
        if (this.currentChatId === chatId) {
            this.startNewChat();
        }
    }

    clearAllHistory() {
        if (!confirm('すべてのチャット履歴を削除しますか？\nこの操作は元に戻せません。')) {
            return;
        }

        this.chatHistory = [];
        localStorage.removeItem('rai_standalone_chat_history');
        this.updateHistoryDisplay();
        this.startNewChat();
    }

    loadChat(chatData) {
        this.currentChatId = chatData.id;
        this.currentMessages = [...chatData.messages]; // 配列をコピー
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
        
        // 現在選択されたアイテムをアクティブにする
        const currentItem = Array.from(document.querySelectorAll('.history-item')).find(item => {
            return item.innerHTML.includes(chatData.title);
        });
        if (currentItem) {
            currentItem.classList.add('active');
        }
    }

    addMessageToDisplay(message) {
        const messageElement = document.createElement('div');
        messageElement.className = 'message';
        
        const timestamp = new Date(message.timestamp).toLocaleTimeString('ja-JP', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const formattedText = message.text.replace(/\n/g, '<br>');

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
        return 'standalone_chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
    try {
        new RAIChatStandalone();
    } catch (error) {
        console.error('アプリケーション初期化エラー:', error);
    }
});