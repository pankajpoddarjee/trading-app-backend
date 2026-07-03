const axios = require('axios');
const yahooFinance = require('yahoo-finance2');

// ✅ v3 initialization — create instance
const yf = yahooFinance.default ? new yahooFinance.default() : yahooFinance;

class YahooService {
  static async getFullQuote(symbol) {
    try {
      const quote = await yf.quote(symbol);
      return {
        price: quote.regularMarketPrice,
        change: quote.regularMarketChange,
        changePercent: quote.regularMarketChangePercent,
        previousClose: quote.regularMarketPreviousClose,
        high: quote.regularMarketDayHigh,
        low: quote.regularMarketDayLow,
        open: quote.regularMarketOpen,
        volume: quote.regularMarketVolume,
      };
    } catch (error) {
      console.error('Quote error:', error.message);
      return null;
    }
  }

  static async getChartData(symbol, range = '1mo') {
    try {
      let interval = '1d';
      const now = new Date();
      let period1 = new Date();
      
      if (range === '1d') { interval = '5m'; period1.setDate(now.getDate() - 1); }
      else if (range === '5d') { interval = '15m'; period1.setDate(now.getDate() - 5); }
      else if (range === '1mo') { interval = '1h'; period1.setDate(now.getDate() - 30); }
      else if (range === '3mo') { interval = '1d'; period1.setDate(now.getDate() - 90); }
      else if (range === '6mo') { interval = '1d'; period1.setDate(now.getDate() - 180); }
      else if (range === '1y') { interval = '1wk'; period1.setDate(now.getDate() - 365); }
      else { interval = '1d'; period1.setDate(now.getDate() - 30); }

      const result = await yf.chart(symbol, {
        period1: period1.toISOString().split('T')[0],
        interval: interval,
      });

      if (!result || !result.quotes) return [];
      return result.quotes
        .map(q => ({
          time: q.date.toISOString(),
          open: q.open,
          high: q.high,
          low: q.low,
          close: q.close,
          volume: q.volume,
        }))
        .filter(q => q.close !== null);
    } catch (error) {
      console.error('Chart error:', error.message);
      return [];
    }
  }

  static async searchSymbol(query) {
    try {
      const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=15&newsCount=0&enableFuzzyQuery=true`;
      
      console.log(`🔍 Fetching: ${url}`);
      const response = await axios.get(url);
      const data = response.data;
      
      if (!data.quotes || data.quotes.length === 0) {
        console.log(`❌ No results for: ${query}`);
        return [];
      }

      return data.quotes
        .filter(q => q.isYahooFinance === true)
        .filter(q => q.quoteType === 'EQUITY' || q.quoteType === 'ETF')
        .map(q => ({
          symbol: q.symbol,
          description: q.shortname || q.longname || q.symbol,
          exchange: q.exchange,
          type: q.quoteType,
        }))
        .slice(0, 15);
    } catch (error) {
      console.error('Search error:', error.message);
      return [];
    }
  }
}

module.exports = YahooService;