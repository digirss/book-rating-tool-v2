// Tavily API 整合模組
class TavilyAPI {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.endpoint = CONFIG.apis.tavily.endpoint;
    }

    /**
     * 搜尋豆瓣書籍資料（漸進式搜尋）
     * @param {string} bookTitle - 書籍標題
     * @param {string} author - 作者（可選）
     * @returns {Promise<Object>} 搜尋結果
     */
    async searchDoubanBook(bookTitle, author = '') {
        // 第一輪：精準搜尋書籍主頁
        console.log('🔍 第一輪搜尋：book.douban.com');
        let searchResults = await this.performSearch(bookTitle, author, ['book.douban.com']);
        
        // 檢查是否找到評分資訊
        const hasRating = this.checkForRating(searchResults);
        
        if (!hasRating && searchResults.results.length > 0) {
            console.log('⚠️ 未找到評分，擴大搜尋範圍到 douban.com');
            // 第二輪：擴大搜尋範圍
            const expandedResults = await this.performSearch(bookTitle, author, ['douban.com']);
            
            // 合併結果，優先保留第一輪的精準結果
            searchResults = this.mergeSearchResults(searchResults, expandedResults);
        }
        
        console.log('✅ 搜尋完成，共找到', searchResults.results.length, '個結果');
        return searchResults;
    }

    /**
     * 執行單次搜尋
     * @param {string} bookTitle - 書籍標題
     * @param {string} author - 作者
     * @param {Array} domains - 搜尋域名
     * @returns {Promise<Object>} 搜尋結果
     */
    async performSearch(bookTitle, author, domains) {
        const query = this.buildSearchQuery(bookTitle, author);
        
        try {
            console.log('🔍 搜尋查詢:', query, '域名:', domains);
            
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    api_key: this.apiKey,
                    query: query,
                    search_depth: 'advanced',
                    include_answer: true,
                    include_domains: domains,
                    max_results: CONFIG.apis.tavily.maxResults
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Tavily API 錯誤:', errorText);
                throw new Error(`Tavily API 請求失敗: ${response.status}`);
            }

            const data = await response.json();
            return this.parseSearchResults(data);
            
        } catch (error) {
            console.error('❌ Tavily 搜尋失敗:', error);
            throw new Error(`豆瓣搜尋失敗: ${error.message}`);
        }
    }

    /**
     * 建構搜尋查詢字串
     */
    buildSearchQuery(bookTitle, author) {
        let query = `site:book.douban.com "${bookTitle}"`;
        
        if (author) {
            query += ` "${author}"`;
        }
        
        // 添加相關關鍵字以提高搜尋精確度
        query += ' 評分 書籍';
        
        return query;
    }

    /**
     * 解析搜尋結果
     */
    parseSearchResults(data) {
        if (!data.results || data.results.length === 0) {
            throw new Error('在豆瓣找不到相關書籍');
        }

        const results = data.results.map(result => ({
            title: result.title,
            url: result.url,
            content: result.content,
            score: result.score || 0
        }));

        // 按相關度排序
        results.sort((a, b) => b.score - a.score);

        return {
            query: data.query || '',
            answer: data.answer || '',
            results: results,
            searchTime: new Date().toISOString()
        };
    }

    /**
     * 檢查搜尋結果是否包含評分資訊
     * @param {Object} searchResults - 搜尋結果
     * @returns {boolean} 是否找到評分
     */
    checkForRating(searchResults) {
        if (!searchResults.results || searchResults.results.length === 0) {
            return false;
        }

        // 檢查所有結果的內容是否包含評分相關資訊
        for (const result of searchResults.results) {
            const content = result.content.toLowerCase();
            
            // 檢查常見的評分格式
            const ratingPatterns = [
                /\d+\.\d+\s*分/,           // X.X分
                /評分\s*[:：]?\s*\d+/,      // 評分: X
                /\d+\.\d+\s*\/\s*10/,      // X.X/10
                /\d+人評價/,              // X人評價
                /\d+\s*people\s*rated/    // X people rated
            ];
            
            if (ratingPatterns.some(pattern => pattern.test(content))) {
                console.log('✅ 找到評分資訊:', result.title);
                return true;
            }
        }
        
        console.log('⚠️ 未找到評分資訊');
        return false;
    }

    /**
     * 合併兩次搜尋結果
     * @param {Object} firstResults - 第一輪搜尋結果
     * @param {Object} secondResults - 第二輪搜尋結果
     * @returns {Object} 合併後的結果
     */
    mergeSearchResults(firstResults, secondResults) {
        // 優先保留第一輪的精準結果
        const mergedResults = [...firstResults.results];
        const existingUrls = new Set(firstResults.results.map(r => r.url));
        
        // 添加第二輪中不重複的結果
        for (const result of secondResults.results) {
            if (!existingUrls.has(result.url) && mergedResults.length < CONFIG.apis.tavily.maxResults) {
                mergedResults.push(result);
            }
        }
        
        // 按相關度重新排序
        mergedResults.sort((a, b) => (b.score || 0) - (a.score || 0));
        
        console.log('🔗 合併結果: 第一輪', firstResults.results.length, '個，第二輪新增', 
                   mergedResults.length - firstResults.results.length, '個');
        
        return {
            query: firstResults.query,
            answer: firstResults.answer || secondResults.answer,
            results: mergedResults,
            searchTime: new Date().toISOString()
        };
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
                    api_key: this.apiKey,
                    query: 'test',
                    max_results: 1
                })
            });

            return response.ok;
        } catch (error) {
            console.error('❌ Tavily API Key 驗證失敗:', error);
            return false;
        }
    }
}

// 工具函數：建立 Tavily API 實例
function createTavilyAPI(apiKey) {
    if (!apiKey) {
        throw new Error('請提供 Tavily API 金鑰');
    }
    return new TavilyAPI(apiKey);
}