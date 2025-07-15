// Gemini AI 分析模組
class GeminiAnalyzer {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.endpoint = `${CONFIG.apis.gemini.endpoint}?key=${apiKey}`;
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
            console.log('🤖 開始 Gemini 分析...');
            
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: prompt
                        }]
                    }],
                    generationConfig: {
                        temperature: CONFIG.apis.gemini.temperature,
                        topK: 1,
                        topP: 1,
                        maxOutputTokens: CONFIG.apis.gemini.maxTokens,
                    }
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Gemini API 錯誤:', errorText);
                throw new Error(`Gemini 分析失敗: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Gemini 分析完成');
            
            return this.parseGeminiResponse(data);
            
        } catch (error) {
            console.error('❌ Gemini 分析失敗:', error);
            throw new Error(`AI 分析失敗: ${error.message}`);
        }
    }

    /**
     * 建構 Gemini 分析提示詞
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
   - 豆瓣評分（X.X/10 格式）
   - 評價人數

2. **內容分析**：
   - 書籍核心理念（100字內）
   - 五個重點摘要（每個50字內）
   - 三個核心問題
   - 給小朋友的一句話說明
   - 2080法則分析：這本書最關鍵的20%核心概念是什麼？

3. **評價整理**：
   - 豆瓣用戶評價摘要（僅摘錄真實找到的評論，沒找到請填「未找到」）
   - 推薦程度判斷（基於真實評分，沒評分則為「無法判斷」）

⚠️ **重要原則**：
- 只使用搜尋結果中的真實資訊，絕不編造或推測
- 豆瓣評分：只有在搜尋結果中明確找到數字評分時才填入，否則標示「未找到」
- 豆瓣用戶評價：只有在搜尋結果中找到真實用戶評論時才摘錄，否則標示「未找到」
- 其他分析內容（核心理念、摘要等）可基於書籍資訊進行整理
- 所有回覆內容請使用繁體中文

請以 JSON 格式回傳：
{
    "success": true,
    "book": {
        "title": "完整書名",
        "author": "作者姓名",
        "doubanRating": 7.8,
        "ratingCount": 1234,
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
        "doubanReviews": "豆瓣評價摘要",
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
     * 解析 Gemini 回應
     */
    parseGeminiResponse(data) {
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error('Gemini 回應格式錯誤');
        }

        const content = data.candidates[0].content;
        let responseText = '';

        if (content.parts && content.parts[0] && content.parts[0].text) {
            responseText = content.parts[0].text;
        } else {
            throw new Error('無法解析 Gemini 回應內容');
        }

        try {
            // 提取 JSON 部分
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('Gemini 回應中未找到有效的 JSON');
            }

            const result = JSON.parse(jsonMatch[0]);
            
            // 驗證回應結構
            if (!result.hasOwnProperty('success')) {
                throw new Error('Gemini 回應結構不正確');
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
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: 'test'
                        }]
                    }],
                    generationConfig: {
                        maxOutputTokens: 10,
                    }
                })
            });

            return response.ok;
        } catch (error) {
            console.error('❌ Gemini API Key 驗證失敗:', error);
            return false;
        }
    }
}

// 工具函數：建立 Gemini 分析器實例
function createGeminiAnalyzer(apiKey) {
    if (!apiKey) {
        throw new Error('請提供 Gemini API 金鑰');
    }
    return new GeminiAnalyzer(apiKey);
}