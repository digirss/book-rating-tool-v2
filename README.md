# 📘 AI 書籍評分與推薦查詢工具 V2

## 🆕 V2 版本特色

V2 版本採用全新的技術架構，大幅提升資料準確性：

- **Tavily API**: 真實搜尋豆瓣讀書網站，獲取準確的書籍評分
- **Gemini AI**: 智能分析和整理搜尋結果
- **真實數據**: 不再依賴 AI 猜測，所有評分都來自實際豆瓣數據

## 🔧 技術架構

```
用戶輸入 → Tavily API 搜尋豆瓣 → 真實數據 → Gemini AI 分析 → 結構化結果
```

### 核心技術棧
- **前端**: 純 HTML5/CSS3/JavaScript (靜態部署)
- **搜尋引擎**: Tavily API (真實網頁搜尋)
- **AI 分析**: Google Gemini API
- **部署**: GitHub Pages

## 🎯 開發計劃

### Phase 1: 核心功能 (開發中)
- [ ] Tavily API 整合
- [ ] 豆瓣書籍搜尋
- [ ] Gemini 數據分析
- [ ] 基礎 UI 介面

### Phase 2: 用戶體驗
- [ ] 錯誤處理機制
- [ ] 載入狀態優化
- [ ] 搜尋結果驗證

### Phase 3: 進階功能
- [ ] 多重搜尋策略
- [ ] 同名書籍處理
- [ ] 批量書籍查詢

## 🆚 與 V1 版本比較

| 功能 | V1 版本 | V2 版本 |
|------|---------|---------|
| 數據來源 | AI 生成/猜測 | 真實豆瓣數據 |
| 準確性 | 中等 | 高 |
| 即時性 | 無 | 即時搜尋 |
| API 需求 | Gemini API | Tavily + Gemini API |

## 🚀 快速開始

### 1. 設定 API 金鑰
- Tavily API Key (用於搜尋)
- Gemini API Key (用於分析)

### 2. 本機開發
```bash
cd book-rating-tool-v2
python3 -m http.server 8000
```

## 📄 授權
MIT License

---
*實驗版本 - 專注於提供最準確的書籍評分數據*