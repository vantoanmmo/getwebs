const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const axios = require('axios');

// Thêm stealth plugin để tránh bị phát hiện
puppeteer.use(StealthPlugin());

module.exports = async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing URL parameter' });
  }

  try {
    // Kiểm tra xem URL có cần render JS không
    const needsBrowser = url.includes('dynamic') || url.includes('cloudflare');
    
    if (needsBrowser) {
      // Cấu hình Puppeteer với proxy
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage'
        ],
      });

      const page = await browser.newPage();
      
      // Đặt User-Agent ngẫu nhiên
      const userAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
      ];
      const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
      await page.setUserAgent(randomUserAgent);

      // Thêm delay ngẫu nhiên trước khi request
      await page.waitForTimeout(Math.random() * 3000);

      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 15000
      });

      // Lấy nội dung HTML
      const content = await page.content();
      await browser.close();

      return res.status(200).json({ 
        success: true,
        content: content.substring(0, 500) + '...' // Giới hạn kết quả trả về
      });
    } else {
      // Dùng Axios với proxy cho trang đơn giản
      const response = await axios.get(url, {
        proxy: {
          host: process.env.PROXY_URL.split('@')[1].split(':')[0],
          port: parseInt(process.env.PROXY_URL.split(':')[2]),
          auth: {
            username: process.env.PROXY_URL.split('//')[1].split(':')[0],
            password: process.env.PROXY_URL.split(':')[1].split('@')[0]
          }
        }
      });
      
      return res.status(200).json({ 
        success: true,
        content: response.data.substring(0, 500) + '...'
      });
    }
  } catch (error) {
    console.error('Crawl error:', error);
    return res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};