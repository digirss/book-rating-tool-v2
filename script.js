// V2 主程式：整合 Tavily 真實搜尋 + Gemini AI 分析
class BookRatingV2 {
    constructor() {
        this.tavilyAPI = null;
        this.geminiAnalyzer = null;
        this.openaiAnalyzer = null;
        this.isInitialized = false;
        
        this.init();
    }

    async init() {
        console.log('🚀 初始化 V2 應用程式...');
        
        try {
            this.loadSettings();
            this.bindEvents();
            this.updateUIState();
            
            console.log('✅ V2 應用程式初始化完成');
            this.isInitialized = true;
        } catch (error) {
            console.error('❌ 初始化失敗:', error);
            this.showError('應用程式初始化失敗', error.message);
        }
    }

    bindEvents() {
        const searchBtn = document.getElementById('searchBtn');
        const bookTitle = document.getElementById('bookTitle');
        const bookAuthor = document.getElementById('bookAuthor');

        // 搜尋按鈕事件
        if (searchBtn) {
            searchBtn.addEventListener('click', () => this.searchBook());
        }

        // Enter 鍵搜尋
        [bookTitle, bookAuthor].forEach(input => {
            if (input) {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.searchBook();
                    }
                });
            }
        });
    }

    loadSettings() {
        const tavilyKey = localStorage.getItem(CONFIG.storage.tavilyApiKey);
        const geminiKey = localStorage.getItem(CONFIG.storage.geminiApiKey);
        const openaiKey = localStorage.getItem(CONFIG.storage.openaiApiKey);
        const savedProvider = localStorage.getItem('bookRatingV2_aiProvider') || 'gemini';

        if (tavilyKey) {
            document.getElementById('tavilyApiKey').value = tavilyKey;
            apiKeys.tavily = tavilyKey;
        }

        if (geminiKey) {
            document.getElementById('geminiApiKey').value = geminiKey;
            apiKeys.gemini = geminiKey;
        }

        if (openaiKey) {
            document.getElementById('openaiApiKey').value = openaiKey;
            apiKeys.openai = openaiKey;
        }

        // 設定 AI 提供者選擇
        const geminiRadio = document.getElementById('gemini-radio');
        const openaiRadio = document.getElementById('openai-radio');
        
        if (geminiRadio && openaiRadio) {
            if (savedProvider === 'gemini') {
                geminiRadio.checked = true;
                openaiRadio.checked = false;
            } else {
                geminiRadio.checked = false;
                openaiRadio.checked = true;
            }
        }
        searchState.selectedAI = savedProvider;
        
        // 顯示對應的 API 金鑰輸入框
        setTimeout(() => {
            this.toggleAIProvider();
            this.updateAPIInstances();
        }, 100);
    }

    updateAPIInstances() {
        try {
            if (apiKeys.tavily) {
                this.tavilyAPI = createTavilyAPI(apiKeys.tavily);
            }
            if (apiKeys.gemini) {
                this.geminiAnalyzer = createGeminiAnalyzer(apiKeys.gemini);
            }
            if (apiKeys.openai) {
                this.openaiAnalyzer = createOpenAIAnalyzer(apiKeys.openai);
            }
        } catch (error) {
            console.warn('⚠️ API 實例創建警告:', error.message);
        }
    }

    toggleAIProvider() {
        const provider = document.getElementById('aiProvider').value;
        const geminiGroup = document.getElementById('geminiKeyGroup');
        const openaiGroup = document.getElementById('openaiKeyGroup');
        
        if (provider === 'gemini') {
            geminiGroup.style.display = 'block';
            openaiGroup.style.display = 'none';
        } else {
            geminiGroup.style.display = 'none';
            openaiGroup.style.display = 'block';
        }
        
        searchState.selectedAI = provider;
    }

    updateUIState() {
        const selectedAI = searchState.selectedAI;
        const hasValidKeys = apiKeys.tavily && (
            (selectedAI === 'gemini' && apiKeys.gemini) ||
            (selectedAI === 'openai' && apiKeys.openai)
        );
        const searchBtn = document.getElementById('searchBtn');
        
        if (searchBtn) {
            searchBtn.style.display = 'block';
            searchBtn.disabled = !hasValidKeys;
            const aiName = selectedAI === 'gemini' ? 'Gemini 1.5 Flash' : 'GPT-4o-mini';
            searchBtn.innerHTML = `🔍 搜尋真實評分 (${aiName})`;
            searchBtn.onclick = () => this.searchBook();
        }
    }

    async searchBook() {
        const bookTitle = document.getElementById('bookTitle').value.trim();
        const bookAuthor = document.getElementById('bookAuthor').value.trim();

        if (!bookTitle) {
            this.showError('輸入錯誤', '請輸入書名');
            return;
        }

        const selectedAI = searchState.selectedAI;
        const aiAnalyzer = selectedAI === 'gemini' ? this.geminiAnalyzer : this.openaiAnalyzer;
        
        if (!this.tavilyAPI || !aiAnalyzer) {
            const aiName = selectedAI === 'gemini' ? 'Gemini' : 'OpenAI';
            this.showError('設定錯誤', `請先正確設定 Tavily 和 ${aiName} API 金鑰`);
            return;
        }

        searchState.isSearching = true;
        searchState.currentStep = 0;
        searchState.bookData = null;

        try {
            this.showLoading();
            
            // 步驟 1: Tavily 搜尋豆瓣
            this.updateLoadingStep(1, '正在搜尋豆瓣真實資料...');
            console.log('🔍 開始搜尋:', { bookTitle, bookAuthor });
            
            const tavilyResults = await this.tavilyAPI.searchDoubanBook(bookTitle, bookAuthor);
            
            if (!tavilyResults.results || tavilyResults.results.length === 0) {
                throw new Error('在豆瓣找不到相關書籍資料');
            }

            // 步驟 2: AI 分析
            const aiName = selectedAI === 'gemini' ? 'Gemini' : 'GPT-4o-mini';
            this.updateLoadingStep(2, `正在進行 ${aiName} 智能分析...`);
            
            const analysisResult = await aiAnalyzer.analyzeBookData(tavilyResults, bookTitle, bookAuthor);
            
            // 步驟 3: 整理顯示
            this.updateLoadingStep(3, '正在整理結果...');
            
            await DataUtils.delay(500); // 讓用戶看到完成狀態
            
            searchState.bookData = analysisResult;
            this.displayResults(analysisResult);
            
            console.log('✅ 搜尋完成:', analysisResult);

        } catch (error) {
            console.error('❌ 搜尋失敗:', error);
            this.showError('搜尋失敗', error.message);
        } finally {
            searchState.isSearching = false;
            this.hideLoading();
        }
    }

    showLoading() {
        document.getElementById('loadingSection').style.display = 'block';
        document.getElementById('resultsSection').style.display = 'none';
        document.getElementById('errorSection').style.display = 'none';
        
        // 重置步驟指示器
        const steps = document.querySelectorAll('.step');
        steps.forEach(step => step.classList.remove('active', 'completed'));
    }

    updateLoadingStep(step, message) {
        document.getElementById('loadingStep').textContent = message;
        
        const steps = document.querySelectorAll('.step');
        
        // 更新步驟狀態
        steps.forEach((stepEl, index) => {
            stepEl.classList.remove('active');
            if (index < step - 1) {
                stepEl.classList.add('completed');
            } else if (index === step - 1) {
                stepEl.classList.add('active');
            }
        });
    }

    hideLoading() {
        document.getElementById('loadingSection').style.display = 'none';
    }

    displayResults(data) {
        if (!data.success) {
            this.showError('分析失敗', data.error || '無法分析書籍資料');
            return;
        }

        const book = data.book;
        const recommendationLevel = DataParser.generateRecommendation(book.doubanRating || 0);
        
        const resultHTML = `
            <div class="book-card">
                <div class="book-header">
                    <h2>${book.title || '未知書名'}</h2>
                    <div class="author-info">
                        <span class="author">${book.author || '未找到作者'}</span>
                    </div>
                </div>

                <div class="rating-section">
                    <div class="douban-rating">
                        <h3>⭐ 豆瓣評分</h3>
                        <div class="rating-display">
                            <span class="rating-number">${book.doubanRating || '未找到'}</span>
                            <span class="rating-scale">/10</span>
                        </div>
                    </div>
                    
                    <div class="recommendation">
                        <h3>💡 推薦程度</h3>
                        <span class="recommendation-level level-${this.getRecommendationClass(recommendationLevel)}">${recommendationLevel}</span>
                    </div>
                </div>

                <div class="book-analysis">
                    <div class="analysis-item">
                        <h3>💡 核心理念</h3>
                        <p>${book.mainIdeal || '未提供'}</p>
                    </div>

                    <div class="analysis-item">
                        <h3>📋 重點摘要</h3>
                        <ul>
                            ${book.summaries ? book.summaries.map(summary => `<li>${summary}</li>`).join('') : '<li>未提供摘要</li>'}
                        </ul>
                    </div>

                    <div class="analysis-item">
                        <h3>❓ 核心問題</h3>
                        <ul>
                            ${book.keyQuestions ? book.keyQuestions.map(question => `<li>${question}</li>`).join('') : '<li>未提供問題</li>'}
                        </ul>
                    </div>

                    <div class="analysis-item">
                        <h3>👶 給小朋友的解釋</h3>
                        <p class="simple-explanation">${book.simpleExplanation || '未提供簡單解釋'}</p>
                    </div>

                    <div class="analysis-item pareto-analysis">
                        <h3>🎯 2080法則：關鍵20%</h3>
                        <p class="pareto-content">${book.paretoAnalysis || '未提供2080分析'}</p>
                    </div>

                </div>

                <div class="data-source-info">
                    <div class="source-badges">
                        <span class="source-badge real-data">✅ 真實豆瓣資料</span>
                        <span class="source-badge ai-analysis">🤖 AI 智能分析</span>
                    </div>
                    <div class="external-links">
                        ${book.doubanUrl ? `
                            <a href="${book.doubanUrl}" target="_blank" rel="noopener" class="external-link">
                                🔗 查看豆瓣原始頁面
                            </a>
                        ` : `
                            <span class="no-link-info">
                                ⚠️ 未找到豆瓣原始頁面連結
                            </span>
                        `}
                    </div>
                </div>

                <div class="export-section">
                    <button onclick="app.exportToMarkdown()" class="export-btn">
                        💾 匯出 Markdown
                    </button>
                </div>
            </div>
        `;

        document.getElementById('resultsContent').innerHTML = resultHTML;
        document.getElementById('resultsSection').style.display = 'block';
        document.getElementById('errorSection').style.display = 'none';
    }

    getRecommendationClass(recommendation) {
        const classMap = {
            '非常推薦': 'excellent',
            '推薦': 'good',
            '可考慮': 'fair',
            '普通': 'average',
            '不推薦': 'poor',
            '無法判斷': 'unknown'
        };
        return classMap[recommendation] || 'unknown';
    }

    getConfidenceText(confidence) {
        const confidenceMap = {
            'high': '高',
            'medium': '中',
            'low': '低'
        };
        return confidenceMap[confidence] || '中';
    }

    showError(title, message) {
        document.getElementById('errorMessage').innerHTML = `
            <strong>${title}：</strong>${message}
        `;
        document.getElementById('errorSection').style.display = 'block';
        document.getElementById('resultsSection').style.display = 'none';
        document.getElementById('loadingSection').style.display = 'none';
    }

    async exportToMarkdown() {
        if (!searchState.bookData || !searchState.bookData.success) {
            alert('沒有可匯出的資料');
            return;
        }

        const book = searchState.bookData.book;
        const timestamp = new Date().toLocaleDateString('zh-TW');
        
        const filename = `${book.title || '未知書名'}_豆瓣評分_${timestamp}.md`;
        
        const markdownContent = `# ${book.title || '未知書名'}

**作者：** ${book.author || '未知作者'}  
**豆瓣評分：** ${book.doubanRating || '未找到'}/10  
**推薦程度：** ${DataParser.generateRecommendation(book.doubanRating || 0)}  
**查詢時間：** ${timestamp}  
**資料來源：** V2 版本 - 豆瓣真實數據

---

## 💡 核心理念
${book.mainIdeal || '未提供'}

## 📋 重點摘要
${book.summaries ? book.summaries.map((summary, index) => `${index + 1}. ${summary}`).join('\n') : '未提供摘要'}

## ❓ 核心問題
${book.keyQuestions ? book.keyQuestions.map((question, index) => `${index + 1}. ${question}`).join('\n') : '未提供問題'}

## 👶 給小朋友的解釋
${book.simpleExplanation || '未提供簡單解釋'}

## 🎯 2080法則：關鍵20%
${book.paretoAnalysis || '未提供2080分析'}

---

**備註：** 本分析基於豆瓣真實數據，經過 AI 智能整理
${book.doubanUrl ? `**豆瓣連結：** ${book.doubanUrl}` : ''}
`;

        this.downloadMarkdown(markdownContent, filename);
    }

    downloadMarkdown(content, filename) {
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        
        console.log('✅ Markdown 檔案已下載:', filename);
    }
}

// 設定相關函數
function toggleSettings() {
    const panel = document.getElementById('settingsPanel');
    const isVisible = panel.style.display !== 'none';
    panel.style.display = isVisible ? 'none' : 'block';
}

function toggleAIProvider() {
    const geminiRadio = document.getElementById('gemini-radio');
    const openaiRadio = document.getElementById('openai-radio');
    const geminiGroup = document.getElementById('geminiKeyGroup');
    const openaiGroup = document.getElementById('openaiKeyGroup');
    
    if (!geminiRadio || !openaiRadio || !geminiGroup || !openaiGroup) {
        console.error('❌ 找不到必要的 DOM 元素');
        return;
    }
    
    const provider = geminiRadio.checked ? 'gemini' : 'openai';
    
    if (provider === 'gemini') {
        geminiGroup.style.display = 'block';
        openaiGroup.style.display = 'none';
    } else {
        geminiGroup.style.display = 'none';
        openaiGroup.style.display = 'block';
    }
    
    searchState.selectedAI = provider;
    
    if (app) {
        app.updateUIState();
    }
}

async function saveSettings() {
    const tavilyKey = document.getElementById('tavilyApiKey').value.trim();
    const geminiKey = document.getElementById('geminiApiKey').value.trim();
    const openaiKey = document.getElementById('openaiApiKey').value.trim();
    const geminiRadio = document.getElementById('gemini-radio');
    const selectedProvider = geminiRadio.checked ? 'gemini' : 'openai';
    // 檢查必要的 API 金鑰
    const aiKey = selectedProvider === 'gemini' ? geminiKey : openaiKey;
    if (!tavilyKey || !aiKey) {
        const aiName = selectedProvider === 'gemini' ? 'Gemini' : 'OpenAI';
        alert(`❌ 請填入 Tavily 和 ${aiName} API 金鑰`);
        return;
    }

    console.log('⏳ 驗證 API 金鑰中...');

    try {
        // 驗證 API 金鑰
        const tavilyAPI = createTavilyAPI(tavilyKey);
        const aiAnalyzer = selectedProvider === 'gemini' 
            ? createGeminiAnalyzer(geminiKey)
            : createOpenAIAnalyzer(openaiKey);

        const [tavilyValid, aiValid] = await Promise.all([
            tavilyAPI.validateApiKey(),
            aiAnalyzer.validateApiKey()
        ]);

        if (!tavilyValid) {
            throw new Error('Tavily API 金鑰無效');
        }

        if (!aiValid) {
            const aiName = selectedProvider === 'gemini' ? 'Gemini' : 'OpenAI';
            throw new Error(`${aiName} API 金鑰無效`);
        }

        // 儲存到本地
        localStorage.setItem(CONFIG.storage.tavilyApiKey, tavilyKey);
        localStorage.setItem('bookRatingV2_aiProvider', selectedProvider);
        
        if (selectedProvider === 'gemini') {
            localStorage.setItem(CONFIG.storage.geminiApiKey, geminiKey);
        } else {
            localStorage.setItem(CONFIG.storage.openaiApiKey, openaiKey);
        }

        // 更新全域變數
        apiKeys.tavily = tavilyKey;
        if (selectedProvider === 'gemini') {
            apiKeys.gemini = geminiKey;
        } else {
            apiKeys.openai = openaiKey;
        }
        searchState.selectedAI = selectedProvider;

        // 更新應用程式實例
        app.updateAPIInstances();
        app.updateUIState();

        console.log('✅ 設定已儲存並驗證');
        alert('✅ 設定已儲存並驗證');

        setTimeout(() => {
            toggleSettings();
        }, 1000);

    } catch (error) {
        console.error('❌ API 驗證失敗:', error);
        alert(`❌ ${error.message}`);
    }
}

function clearSettings() {
    if (confirm('確定要清除所有 API 設定嗎？')) {
        localStorage.removeItem(CONFIG.storage.tavilyApiKey);
        localStorage.removeItem(CONFIG.storage.geminiApiKey);
        localStorage.removeItem(CONFIG.storage.openaiApiKey);
        localStorage.removeItem('bookRatingV2_aiProvider');
        
        document.getElementById('tavilyApiKey').value = '';
        document.getElementById('geminiApiKey').value = '';
        document.getElementById('openaiApiKey').value = '';
        document.getElementById('gemini-radio').checked = true;
        document.getElementById('openai-radio').checked = false;
        
        apiKeys.tavily = '';
        apiKeys.gemini = '';
        apiKeys.openai = '';
        searchState.selectedAI = 'gemini';
        
        app.toggleAIProvider();
        app.updateAPIInstances();
        app.updateUIState();
        
        console.log('🗑️ 設定已清除');
        alert('🗑️ 設定已清除');
    }
}

// 全域應用程式實例
let app;

// 當頁面載入完成時初始化
document.addEventListener('DOMContentLoaded', () => {
    app = new BookRatingV2();
    
    // 確保初始狀態正確
    setTimeout(() => {
        toggleAIProvider();
    }, 200);
});

// 防止未處理的 Promise 拒絕
window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ 未處理的 Promise 錯誤:', event.reason);
    event.preventDefault();
});