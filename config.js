// V2 版本配置文件
const CONFIG = {
    // API 設定
    apis: {
        tavily: {
            endpoint: 'https://api.tavily.com/search',
            maxResults: 5
        },
        gemini: {
            endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
            maxTokens: 2048,
            temperature: 0.3
        },
        openai: {
            endpoint: 'https://api.openai.com/v1/chat/completions',
            model: 'gpt-4o-mini', // 注意：OpenAI 目前沒有 gpt-4.1-nano 模型
            maxTokens: 2048,
            temperature: 0.3
        }
    },
    
    // 搜尋設定
    search: {
        doubanSite: 'site:book.douban.com',
        timeout: 30000, // 30 秒超時
        retryAttempts: 2
    },
    
    // 本地儲存金鑰
    storage: {
        tavilyApiKey: 'bookRatingV2_tavilyKey',
        geminiApiKey: 'bookRatingV2_geminiKey',
        openaiApiKey: 'bookRatingV2_openaiKey'
    },
    
    // 版本資訊
    version: {
        number: '2.0.0',
        name: 'Tavily Integration',
        features: ['真實豆瓣數據', 'AI 智能分析', '準確評分']
    }
};

// 全域變數
let apiKeys = {
    tavily: '',
    gemini: '',
    openai: ''
};

let searchState = {
    isSearching: false,
    currentStep: 0,
    bookData: null,
    selectedAI: 'gemini' // 預設使用 Gemini
};