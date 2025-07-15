// 數據解析和處理工具
class DataParser {
    
    /**
     * 解析豆瓣評分
     * @param {string} text - 包含評分的文字
     * @returns {Object} 解析出的評分資訊
     */
    static parseDoubanRating(text) {
        // 更全面的豆瓣評分格式匹配
        const ratingPatterns = [
            /(\d+\.?\d*)\s*分/g,          // 8.5分、8.5 分
            /評分\s*[:：]?\s*(\d+\.?\d*)/g, // 評分: 8.5、評分：8.5
            /评分\s*[:：]?\s*(\d+\.?\d*)/g, // 评分: 8.5、评分：8.5
            /(\d+\.?\d*)\s*\/\s*10/g,     // 8.5/10
            /(\d+\.?\d*)\s*\/\s*5/g,      // 4.3/5 (需要轉換)
            /豆瓣評分\s*[:：]?\s*(\d+\.?\d*)/g, // 豆瓣評分: 8.5
            /豆瓣评分\s*[:：]?\s*(\d+\.?\d*)/g, // 豆瓣评分: 8.5
            /(\d+\.?\d*)\s*星/g           // 4.5星 (需要轉換)
        ];
        
        for (const pattern of ratingPatterns) {
            const matches = text.match(pattern);
            if (matches && matches.length > 0) {
                // 提取數字部分
                const numberMatch = matches[0].match(/(\d+\.?\d*)/);
                if (numberMatch) {
                    let rating = parseFloat(numberMatch[1]);
                    
                    // 如果是 5 星制，轉換為 10 分制
                    if (matches[0].includes('/5') || matches[0].includes('星')) {
                        rating = rating * 2;
                    }
                    
                    if (rating >= 0 && rating <= 10) {
                        return {
                            found: true,
                            rating: rating,
                            isValid: true
                        };
                    }
                }
            }
        }
        
        return { found: false, rating: null, isValid: false };
    }

    /**
     * 解析評價人數
     * @param {string} text - 包含評價人數的文字
     * @returns {Object} 解析出的評價人數
     */
    static parseRatingCount(text) {
        // 更廣泛的評價人數格式匹配
        const countPatterns = [
            /(\d+)\s*人評價/g,           // 1234人評價
            /(\d+)\s*人评价/g,           // 1234人评价 (簡體)
            /\((\d+)人評價\)/g,         // (1234人評價)
            /\((\d+)人评价\)/g,         // (1234人评价)
            /(\d+)\s*人/g,              // 1234 人
            /(\d+)\s*個評分/g,          // 1234個評分
            /(\d+)\s*个评分/g,          // 1234个评分
            /(\d+)\s*評價/g,            // 1234評價
            /(\d+)\s*评价/g             // 1234评价
        ];
        
        for (const pattern of countPatterns) {
            const matches = text.match(pattern);
            if (matches && matches.length > 0) {
                // 提取數字部分
                const numberMatch = matches[0].match(/(\d+)/);
                if (numberMatch) {
                    const count = parseInt(numberMatch[1]);
                    if (count > 0) {
                        return {
                            found: true,
                            count: count,
                            isValid: true
                        };
                    }
                }
            }
        }
        
        return { found: false, count: null, isValid: false };
    }

    /**
     * 提取豆瓣書籍 URL
     * @param {Array} searchResults - 搜尋結果
     * @returns {string} 豆瓣書籍頁面 URL
     */
    static extractDoubanUrl(searchResults) {
        for (const result of searchResults) {
            if (result.url && result.url.includes('book.douban.com/subject/')) {
                return result.url;
            }
        }
        return null;
    }

    /**
     * 清理和標準化書名
     * @param {string} title - 原始書名
     * @returns {string} 清理後的書名
     */
    static cleanBookTitle(title) {
        return title
            .replace(/^\[.*?\]\s*/, '') // 移除開頭的 [分類] 標記
            .replace(/\s*\(豆瓣\).*$/, '') // 移除結尾的 (豆瓣) 等標記
            .replace(/\s*-\s*豆瓣.*$/, '') // 移除 - 豆瓣讀書 等後綴
            .trim();
    }

    /**
     * 清理和標準化作者名
     * @param {string} author - 原始作者名
     * @returns {string} 清理後的作者名
     */
    static cleanAuthorName(author) {
        return author
            .replace(/^\[.*?\]\s*/, '') // 移除分類標記
            .replace(/\s*著\s*$/, '') // 移除「著」後綴
            .replace(/\s*\(.*?\)\s*$/, '') // 移除括號內容
            .trim();
    }

    /**
     * 驗證搜尋結果的相關性
     * @param {Object} searchResult - 單個搜尋結果
     * @param {string} targetTitle - 目標書名
     * @param {string} targetAuthor - 目標作者
     * @returns {Object} 相關性分析結果
     */
    static analyzeRelevance(searchResult, targetTitle, targetAuthor = '') {
        const title = searchResult.title.toLowerCase();
        const content = searchResult.content.toLowerCase();
        const targetTitleLower = targetTitle.toLowerCase();
        const targetAuthorLower = targetAuthor.toLowerCase();
        
        let relevanceScore = 0;
        let reasons = [];

        // 標題匹配
        if (title.includes(targetTitleLower)) {
            relevanceScore += 50;
            reasons.push('標題匹配');
        }

        // 內容匹配
        if (content.includes(targetTitleLower)) {
            relevanceScore += 30;
            reasons.push('內容包含書名');
        }

        // 作者匹配
        if (targetAuthor && content.includes(targetAuthorLower)) {
            relevanceScore += 20;
            reasons.push('作者匹配');
        }

        // URL 驗證（豆瓣書籍頁面）
        if (searchResult.url && searchResult.url.includes('book.douban.com/subject/')) {
            relevanceScore += 20;
            reasons.push('豆瓣書籍頁面');
        }

        // 評分資訊存在
        const ratingInfo = this.parseDoubanRating(content);
        if (ratingInfo.found && ratingInfo.isValid) {
            relevanceScore += 15;
            reasons.push('包含評分資訊');
        }

        return {
            score: Math.min(relevanceScore, 100), // 最高 100 分
            reasons: reasons,
            isRelevant: relevanceScore >= 60,
            isHighQuality: relevanceScore >= 80
        };
    }

    /**
     * 生成推薦程度
     * @param {number} rating - 評分 (0-10)
     * @returns {string} 推薦程度文字
     */
    static generateRecommendation(rating) {
        if (rating >= 8.5) return '非常推薦';
        if (rating >= 7.5) return '推薦';
        if (rating >= 6.5) return '可考慮';
        if (rating >= 5.5) return '普通';
        if (rating > 0) return '不推薦';
        return '無法判斷';
    }

    /**
     * 格式化搜尋結果摘要
     * @param {Object} bookData - 書籍資料
     * @returns {string} 格式化的摘要
     */
    static formatSearchSummary(bookData) {
        if (!bookData.success) {
            return `搜尋失敗：${bookData.error}`;
        }

        const book = bookData.book;
        let summary = `📖 ${book.title}`;
        
        if (book.author) {
            summary += ` / ${book.author}`;
        }
        
        if (book.doubanRating) {
            summary += ` / ⭐ ${book.doubanRating}/10`;
        }
        
        if (book.ratingCount) {
            summary += ` (${book.ratingCount}人評價)`;
        }

        return summary;
    }
}

// 工具函數
const DataUtils = {
    
    /**
     * 安全的 JSON 解析
     */
    safeJsonParse(jsonString, fallback = null) {
        try {
            return JSON.parse(jsonString);
        } catch (error) {
            console.warn('JSON 解析失敗:', error.message);
            return fallback;
        }
    },
    
    /**
     * 延遲執行
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    /**
     * 重試機制
     */
    async retry(fn, maxAttempts = 3, delayMs = 1000) {
        let lastError;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                console.warn(`嘗試 ${attempt}/${maxAttempts} 失敗:`, error.message);
                
                if (attempt < maxAttempts) {
                    await this.delay(delayMs * attempt);
                }
            }
        }
        
        throw lastError;
    }
};