class RAIAdminPanel {
    constructor() {
        this.currentUser = null;
        this.currentSection = 'dashboard';
        this.apiBaseUrl = 'http://localhost:5000/api';
        
        this.initializeElements();
        this.attachEventListeners();
        this.initializeAuth();
        this.loadDashboard();
    }

    initializeElements() {
        // DOM要素の取得
        this.userInfo = document.getElementById('userInfo');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.navLinks = document.querySelectorAll('.nav-link');
        this.contentSections = document.querySelectorAll('.content-section');
        
        // 統計表示要素
        this.totalMessages = document.getElementById('totalMessages');
        this.competencyEvaluations = document.getElementById('competencyEvaluations');
        this.activeUsers = document.getElementById('activeUsers');
        this.lastUpdated = document.getElementById('lastUpdated');
        
        // エクスポート関連
        this.startDate = document.getElementById('startDate');
        this.endDate = document.getElementById('endDate');
        this.exportBtn = document.getElementById('exportBtn');
        this.previewBtn = document.getElementById('previewBtn');
        this.downloadPreviewBtn = document.getElementById('downloadPreviewBtn');
        this.previewArea = document.getElementById('previewArea');
        this.previewTableBody = document.getElementById('previewTableBody');
        
        // 分析用要素
        this.avgEvaluationTime = document.getElementById('avgEvaluationTime');
        this.topCompetency = document.getElementById('topCompetency');
        this.avgMessageLength = document.getElementById('avgMessageLength');
        
        this.loadingOverlay = document.getElementById('loadingOverlay');
    }

    attachEventListeners() {
        // ナビゲーション
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                this.navigateToSection(section);
            });
        });

        // ログアウト
        this.logoutBtn.addEventListener('click', () => this.logout());

        // エクスポート機能
        this.exportBtn.addEventListener('click', () => this.exportData());
        this.previewBtn.addEventListener('click', () => this.previewData());
        this.downloadPreviewBtn.addEventListener('click', () => this.downloadPreviewData());

        // 日付の初期値設定
        this.setDefaultDates();
    }

    setDefaultDates() {
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        this.startDate.value = this.formatDateTimeLocal(oneWeekAgo);
        this.endDate.value = this.formatDateTimeLocal(now);
    }

    formatDateTimeLocal(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    initializeAuth() {
        // 認証確認
        const token = localStorage.getItem('admin_token');
        if (!token) {
            this.redirectToLogin();
            return;
        }

        // モックアップ用教員ユーザー
        this.currentUser = {
            id: 'professor001',
            name: '中島 教授',
            email: 'professor@fc.ritsumei.ac.jp',
            role: 'faculty'
        };
        
        this.userInfo.textContent = `${this.currentUser.name}さん`;
    }

    redirectToLogin() {
        // 実際の実装では教員用ログイン画面へ遷移
        alert('教員権限でログインしてください');
        // モックアップでは仮の認証
        localStorage.setItem('admin_token', 'mock-faculty-token');
        location.reload();
    }

    logout() {
        if (confirm('ログアウトしますか？')) {
            localStorage.removeItem('admin_token');
            location.reload();
        }
    }

    navigateToSection(section) {
        // ナビゲーション状態更新
        this.navLinks.forEach(link => {
            link.parentElement.classList.remove('active');
        });
        
        document.querySelector(`[data-section="${section}"]`).parentElement.classList.add('active');
        
        // セクション表示更新
        this.contentSections.forEach(sec => {
            sec.classList.remove('active');
        });
        
        document.getElementById(section).classList.add('active');
        this.currentSection = section;

        // セクション固有の処理
        switch (section) {
            case 'dashboard':
                this.loadDashboard();
                break;
            case 'analytics':
                this.loadAnalytics();
                break;
        }
    }

    async loadDashboard() {
        try {
            this.setLoading(true);
            
            // モックデータ（実際の実装ではAPIから取得）
            const stats = await this.fetchUsageStatistics();
            
            this.updateStatistics(stats);
            
        } catch (error) {
            console.error('Dashboard load error:', error);
            this.showError('ダッシュボードの読み込みに失敗しました');
        } finally {
            this.setLoading(false);
        }
    }

    async fetchUsageStatistics() {
        // モックデータ
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        return {
            total_messages: 234,
            competency_evaluations: 87,
            active_users: 42,
            updated_at: new Date().toISOString()
        };
    }

    updateStatistics(stats) {
        this.totalMessages.textContent = stats.total_messages.toLocaleString();
        this.competencyEvaluations.textContent = stats.competency_evaluations.toLocaleString();
        this.activeUsers.textContent = stats.active_users.toLocaleString();
        
        const updateDate = new Date(stats.updated_at);
        this.lastUpdated.textContent = updateDate.toLocaleDateString('ja-JP');
    }

    async previewData() {
        try {
            this.setLoading(true);
            
            const startDate = this.startDate.value;
            const endDate = this.endDate.value;
            
            if (!startDate || !endDate) {
                alert('開始日時と終了日時を選択してください');
                return;
            }

            // モックデータ取得
            const data = await this.fetchCompetencyData(startDate, endDate);
            
            this.displayPreview(data);
            this.previewArea.style.display = 'block';
            
        } catch (error) {
            console.error('Preview error:', error);
            this.showError('データプレビューの取得に失敗しました');
        } finally {
            this.setLoading(false);
        }
    }

    async fetchCompetencyData(startDate, endDate) {
        // モックデータ
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        return [
            {
                timestamp: '2024-01-15T10:30:00Z',
                user_id: 'student001',
                chat_id: 'chat_001_abc123',
                user_message: 'ピアサポートの授業でグループワークを通じて、相手の話をじっくり聞くことの大切さを学びました。特に、相手の気持ちに寄り添うことで、より良いコミュニケーションができることを実感しました。',
                ai_response: '【コンピテンシー評価結果】\\n\\n◆ 共感力 ★★★★☆ (4/5)\\n◆ チームワーク ★★★★☆ (4/5)\\n\\n【総評】\\nグループワークでの傾聴体験から、相手理解の重要性を深く学ばれています。共感力とチームワークが特に高く評価されます。'
            },
            {
                timestamp: '2024-01-14T14:20:00Z',
                user_id: 'student002',
                chat_id: 'chat_002_def456',
                user_message: '今日のロールプレイで初めて相談者役をやってみて、話すことの難しさを感じました。でも、それと同時に話を聞いてもらえることの安心感も理解できました。',
                ai_response: '【コンピテンシー評価結果】\\n\\n◆ 自己効力感 ★★★☆☆ (3/5)\\n◆ 理解力 ★★★★☆ (4/5)\\n◆ しなやかさ ★★★★☆ (4/5)\\n\\n【総評】\\n新しい体験から多角的な学びを得られており、特に理解力としなやかさが発揮されています。'
            },
            {
                timestamp: '2024-01-13T16:45:00Z',
                user_id: 'student003',
                chat_id: 'chat_003_ghi789',
                user_message: 'グループディスカッションで他の人の異なる意見を聞いて、自分の考え方が狭かったことに気づきました。多様な視点を受け入れることの重要性を学びました。',
                ai_response: '【コンピテンシー評価結果】\\n\\n◆ 変革力 ★★★★★ (5/5)\\n◆ 共感力 ★★★★☆ (4/5)\\n\\n【総評】\\n多様な視点への開放性と自己省察力が優秀です。変革力が特に高く評価され、継続的な成長が期待されます。'
            }
        ];
    }

    displayPreview(data) {
        this.previewTableBody.innerHTML = '';
        
        data.forEach(record => {
            const row = document.createElement('tr');
            
            const formattedDate = new Date(record.timestamp).toLocaleString('ja-JP');
            const truncatedMessage = record.user_message.length > 50 
                ? record.user_message.substring(0, 50) + '...' 
                : record.user_message;
            const truncatedResponse = record.ai_response.length > 50 
                ? record.ai_response.substring(0, 50) + '...' 
                : record.ai_response;
            
            row.innerHTML = `
                <td>${formattedDate}</td>
                <td>${record.user_id}</td>
                <td>${record.chat_id}</td>
                <td title="${record.user_message}">${truncatedMessage}</td>
                <td title="${record.ai_response}">${truncatedResponse}</td>
            `;
            
            this.previewTableBody.appendChild(row);
        });
    }

    async exportData() {
        try {
            this.setLoading(true);
            
            const startDate = this.startDate.value;
            const endDate = this.endDate.value;
            
            if (!startDate || !endDate) {
                alert('開始日時と終了日時を選択してください');
                return;
            }

            const data = await this.fetchCompetencyData(startDate, endDate);
            this.downloadCSV(data);
            
        } catch (error) {
            console.error('Export error:', error);
            this.showError('データエクスポートに失敗しました');
        } finally {
            this.setLoading(false);
        }
    }

    downloadPreviewData() {
        const data = this.getCurrentPreviewData();
        this.downloadCSV(data);
    }

    getCurrentPreviewData() {
        // プレビューテーブルからデータを取得
        const rows = this.previewTableBody.querySelectorAll('tr');
        const data = [];
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            data.push({
                timestamp: cells[0].textContent,
                user_id: cells[1].textContent,
                chat_id: cells[2].textContent,
                user_message: cells[3].getAttribute('title') || cells[3].textContent,
                ai_response: cells[4].getAttribute('title') || cells[4].textContent
            });
        });
        
        return data;
    }

    downloadCSV(data) {
        const csvContent = this.generateCSV(data);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `competency_evaluation_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    generateCSV(data) {
        const headers = ['日時', '学生ID', 'ChatID', '入力内容', 'AI評価結果'];
        let csvContent = headers.join(',') + '\\n';
        
        data.forEach(record => {
            const row = [
                `"${record.timestamp}"`,
                `"${record.user_id}"`,
                `"${record.chat_id}"`,
                `"${record.user_message.replace(/"/g, '""')}"`,
                `"${record.ai_response.replace(/"/g, '""')}"`
            ];
            csvContent += row.join(',') + '\\n';
        });
        
        return '\\uFEFF' + csvContent; // BOM for Excel compatibility
    }

    async loadAnalytics() {
        try {
            this.setLoading(true);
            
            // モック分析データ
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            this.avgEvaluationTime.textContent = '2分15秒';
            this.topCompetency.textContent = '共感力';
            this.avgMessageLength.textContent = '186文字';
            
        } catch (error) {
            console.error('Analytics load error:', error);
            this.showError('分析データの読み込みに失敗しました');
        } finally {
            this.setLoading(false);
        }
    }

    setLoading(isLoading) {
        this.loadingOverlay.style.display = isLoading ? 'flex' : 'none';
        
        // ボタンの無効化
        const buttons = [this.exportBtn, this.previewBtn];
        buttons.forEach(btn => {
            if (btn) btn.disabled = isLoading;
        });
    }

    showError(message) {
        alert(`エラー: ${message}`);
    }

    showSuccess(message) {
        // 成功メッセージの表示（実装予定）
        console.log(`Success: ${message}`);
    }
}

// アプリケーション初期化
document.addEventListener('DOMContentLoaded', () => {
    new RAIAdminPanel();
});