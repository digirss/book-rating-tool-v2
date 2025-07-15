// OpenAI API 分析模組
class OpenAIAnalyzer {
    constructor(apiKey) {
        this.apiKey = apiKey;
        
        // 使用預設配置以防 CONFIG 未載入
        const defaultConfig = {
            endpoint: 'https://api.openai.com/v1/chat/completions',
            model: 'gpt-4o-mini', // 注意：OpenAI 目前沒有 gpt-4.1-nano，使用 gpt-4o-mini
            maxTokens: 2048,
            temperature: 0.3
        };
        
        // 檢查 CONFIG 並使用預設值
        if (CONFIG && CONFIG.apis && CONFIG.apis.openai) {
            this.endpoint = CONFIG.apis.openai.endpoint;
            this.model = CONFIG.apis.openai.model;
            console.log('✅ 使用 CONFIG 中的 OpenAI 設定');
        } else {
            console.warn('⚠️ 使用預設 OpenAI 配置');
            this.endpoint = defaultConfig.endpoint;
            this.model = defaultConfig.model;
        }
        
        console.log('✅ OpenAI API 初始化:', {
            endpoint: this.endpoint,
            model: this.model
        });
    }

    /**
     * 分析豆瓣搜尋結果並結構化輸出
     * @param {Object} tavilyResults - Tavily 搜尋結果
     * @param {string} bookTitle - 原始書名
     * @param {string} author - 原始作者
     * @returns {Promise<Object>} 結構化的書籍資料
     */
    async analyzeBookData(tavilyResults, bookTitle, author = '') {
        const prompt = this.buildAnalysisPrompt(tavilyResults, bookTitle, author);
        
        try {
            console.log('🤖 開始 OpenAI GPT-4o-mini 分析...');
            
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [{
                        role: 'user',
                        content: prompt
                    }],
                    max_tokens: (CONFIG && CONFIG.apis && CONFIG.apis.openai) ? CONFIG.apis.openai.maxTokens : 2048,
                    temperature: (CONFIG && CONFIG.apis && CONFIG.apis.openai) ? CONFIG.apis.openai.temperature : 0.3
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ OpenAI API 錯誤:', errorText);
                throw new Error(`OpenAI 分析失敗: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ OpenAI 分析完成');
            
            return this.parseOpenAIResponse(data);
            
        } catch (error) {
            console.error('❌ OpenAI 分析失敗:', error);
            throw new Error(`AI 分析失敗: ${error.message}`);
        }
    }

    /**
     * 建構 OpenAI 分析提示詞
     */
    buildAnalysisPrompt(tavilyResults, bookTitle, author) {
        const searchContent = tavilyResults.results
            .map(result => `標題: ${result.title}\n內容: ${result.content}\nURL: ${result.url}`)
            .join('\n\n---\n\n');

        return `請基於以下豆瓣搜尋結果，分析並整理「${bookTitle}」${author ? `（作者：${author}）` : ''}的書籍資訊：

📊 **豆瓣搜尋結果**：
${searchContent}

🎯 **分析要求**：
請用繁體中文回覆所有內容。從上述真實的豆瓣搜尋結果中提取並整理以下資訊，如果某項資訊在搜尋結果中找不到，請標註「未找到」，但請務必嘗試基於已有資訊進行分析：

1. **基本資訊**：
   - 完整書名
   - 作者姓名
   - 豆瓣評分（X.X/10 格式）：仔細尋找如「8.9」、「8.9分」的數字
   - 評價人數：**特別注意尋找數字+人评价的組合**，如「7800人评价」、「1234人评价」等

2. **內容分析**：
   - 書籍核心理念（100字內）
   - 五個重點摘要（每個50字內）
   - 三個核心問題
   - 給小朋友的一句話說明
   - 2080法則分析：這本書最關鍵的20%核心概念是什麼？

3. **評價整理**：
   - 推薦程度判斷（基於真實評分，沒評分則為「無法判斷」）

⚠️ **重要原則**：
- 只使用搜尋結果中的真實資訊，絕不編造或推測
- 豆瓣評分：仔細尋找如「8.9分」、「8.9 分」、「豆瓣评分 8.9」等格式，找到才填入
- 評價人數：**非常重要**！仔細尋找如「7800人评价」、「7800人評價」、「(7800人评价)」等格式，這是關鍵數據，請務必仔細查找。**如果真的找不到，請在 JSON 中設為 null 或省略 ratingCount 欄位，不要設為文字如「未找到」**
- 注意簡體中文：豆瓣使用簡體中文，如「评价」、「评分」等
- 其他分析內容（核心理念、摘要等）可基於書籍資訊進行整理
- 所有回覆內容請使用繁體中文

請以 JSON 格式回傳：
{
    "success": true,
    "book": {
        "title": "完整書名",
        "author": "作者姓名",
        "doubanRating": 7.8,
        "ratingCount": 1234,  // 如果找不到評價人數，請設為 null 或省略此欄位
        "doubanUrl": "豆瓣連結",
        "mainIdeal": "書籍核心理念",
        "summaries": [
            "重點1", "重點2", "重點3", "重點4", "重點5"
        ],
        "keyQuestions": [
            "問題1", "問題2", "問題3"
        ],
        "simpleExplanation": "給小朋友的說明",
        "paretoAnalysis": "根據2080法則，這本書最關鍵的20%核心概念",
        "recommendation": "推薦程度"
    },
    "dataSource": "豆瓣書籍頁面",
    "searchTime": "${tavilyResults.searchTime}",
    "confidence": "high/medium/low"
}

只有在搜尋結果完全無關或完全無法解析時，才回傳失敗狀態：
{
    "success": false,
    "error": "具體錯誤原因",
    "suggestions": ["建議1", "建議2"]
}`;
    }

    /**
     * 解析 OpenAI 回應
     */
    parseOpenAIResponse(data) {
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('OpenAI 回應格式錯誤');
        }

        const message = data.choices[0].message;
        let responseText = '';

        if (message.content) {
            responseText = message.content;
        } else {
            throw new Error('無法解析 OpenAI 回應內容');
        }

        try {
            // 提取 JSON 部分
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('OpenAI 回應中未找到有效的 JSON');
            }

            const result = JSON.parse(jsonMatch[0]);
            
            // 驗證回應結構
            if (!result.hasOwnProperty('success')) {
                throw new Error('OpenAI 回應結構不正確');
            }

            return result;
            
        } catch (parseError) {
            console.error('❌ JSON 解析失敗:', parseError);
            console.log('🔍 原始回應:', responseText);
            throw new Error('AI 回應格式錯誤，無法解析');
        }
    }

    /**
     * 驗證 API Key 是否有效
     */
    async validateApiKey() {
        try {
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [{
                        role: 'user',
                        content: 'test'
                    }],
                    max_tokens: 10
                })
            });

            return response.ok;
        } catch (error) {
            console.error('❌ OpenAI API Key 驗證失敗:', error);
            return false;
        }
    }
}

// 工具函數：建立 OpenAI 分析器實例
function createOpenAIAnalyzer(apiKey) {
    if (!apiKey) {
        throw new Error('請提供 OpenAI API 金鑰');
    }
    return new OpenAIAnalyzer(apiKey);
}