const express = require('express');
const https = require('https');
const querystring = require('querystring');
const router = express.Router();

const AMAP_BASE = 'restapi.amap.com';

function forwardGetRequest(pathname, params) {
  return new Promise((resolve, reject) => {
    const qs = querystring.stringify(params);
    const options = {
      hostname: AMAP_BASE,
      path: `${pathname}?${qs}`,
      method: 'GET',
      headers: {
        'User-Agent': 'mymap-server-proxy/1.0',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve(parsed);
        } catch (e) {
          // 如果返回不是 json，则原样返回字符串
          resolve({ raw: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });
    req.end();
  });
}

// 联想输入
router.get('/inputtips', async (req, res, next) => {
  try {
    const key = process.env.AMAP_KEY;
    const { keywords, type = '', city = '', citylimit = 'false' } = req.query;
    if (!key) return res.status(500).json({ success: false, message: 'AMAP_KEY 未配置' });
    if (!keywords) return res.status(400).json({ success: false, message: 'keywords required' });

    const params = { key, keywords, type, city, citylimit };
    const data = await forwardGetRequest('/v3/assistant/inputtips', params);
    res.json({ success: true, data });
  } catch (err) {
    // 开发环境直接返回错误详情，便于调试
    if (process.env.NODE_ENV !== 'production') {
      return res.status(500).json({ success: false, message: err.message, stack: err.stack });
    }
    next(err);
  }
});

// 关键字 POI 搜索
router.get('/place-text', async (req, res, next) => {
  try {
    const key = process.env.AMAP_KEY;
    const {
      keywords,
      city = '',
      citylimit = 'false',
      types = '',
      offset = 20,
      page = 1,
    } = req.query;
    if (!key) return res.status(500).json({ success: false, message: 'AMAP_KEY 未配置' });
    if (!keywords) return res.status(400).json({ success: false, message: 'keywords required' });

    const params = { key, keywords, city, citylimit, types, offset, page };
    const data = await forwardGetRequest('/v3/place/text', params);
    res.json({ success: true, data });
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      return res.status(500).json({ success: false, message: err.message, stack: err.stack });
    }
    next(err);
  }
});

module.exports = router;
