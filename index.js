// server.js
const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(express.json({ limit: '10kb' }));

// 简单CORS处理
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// 创建验证码挑战
app.post(["/cap/challenge", "/challenge"], async (req, res) => {
  try {
    const initializeCap = require('./cap.js');
    const cap = await initializeCap();
    const result = await cap.createChallenge();
    
    console.log(`[${new Date().toISOString()}] 挑战创建: ${result.token?.substring(0, 8)}...`);
    
    res.json(result);
  } catch (error) {
    console.error('创建挑战失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '服务器内部错误' 
    });
  }
});

// 验证解决方案
app.post(["/cap/redeem", "/redeem"], async (req, res) => {
  const { token, solutions } = req.body;
  
  if (!token || !solutions) {
    res.status(400);
    return res.json({ success: false });
  }
  
  try {
    const initializeCap = require('./cap.js');
    const cap = await initializeCap();
    const result = await cap.redeemChallenge({ token, solutions });
    
    console.log(`[${new Date().toISOString()}] 挑战验证: ${token.substring(0, 8)}..., 结果: ${result.success}`);
    
    res.json(result);
  } catch (error) {
    console.error('验证挑战失败:', error);
    console.error('错误详情:', error.stack);
    res.status(500).json({ 
      success: false, 
      error: '验证过程出错',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// 验证令牌
app.post(["/cap/validate", "/validate"], async (req, res) => {
  const { token, keepToken = false } = req.body;
  
  if (!token) {
    res.status(400);
    return res.json({ success: false });
  }
  
  try {
    const initializeCap = require('./cap.js');
    const cap = await initializeCap();
    const result = await cap.validateToken(token, { keepToken });
    res.json(result);
  } catch (error) {
    console.error('验证令牌失败:', error);
    res.status(500).json({ 
      success: false, 
      error: '验证令牌出错' 
    });
  }
});

// 健康检查
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString()
  });
});

// 首页
app.get('/', (req, res) => {
  res.send(`
    <h1>CAP验证码服务器</h1>
    <p>服务器运行正常</p>
    <p>可用接口：</p>
    <ul>
      <li>POST /challenge - 创建验证码挑战</li>
      <li>POST /redeem - 验证解决方案</li>
      <li>POST /validate - 验证令牌</li>
      <li>GET /health - 健康检查</li>
    </ul>
  `);
});

// 404 处理
app.use((req, res) => {
  console.log(`[${new Date().toISOString()}] 404: ${req.method} ${req.path}`);
  res.status(404).json({ 
    success: false, 
    error: '请求的资源不存在' 
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`
  ███████╗ ██████╗██████╗ ██╗██████╗ ████████╗███████╗██████╗
  ██╔════╝██╔════╝██╔══██╗██║██╔══██╗╚══██╔══╝██╔════╝██╔══██╗
  ███████╗██║     ██████╔╝██║██████╔╝   ██║   █████╗  ██████╔╝
  ╚════██║██║     ██╔═══╝ ██║██╔═══╝    ██║   ██╔══╝  ██╔══██╗
  ███████║╚██████╗██║     ██║██║        ██║   ███████╗██║  ██║
  ╚══════╝ ╚═════╝╚═╝     ╚═╝╚═╝        ╚═╝   ╚══════╝╚═╝  ╚═╝
  
  CAP服务器已启动：
  - 地址: http://localhost:${PORT}
  - 时间: ${new Date().toLocaleString()}
  - 存储目录: ./data/
  - 接口:
    POST /challenge 或 /cap/challenge - 创建挑战
    POST /redeem 或 /cap/redeem      - 验证解决方案
    POST /validate 或 /cap/validate  - 验证令牌
    GET  /health                    - 健康检查
  `);
});

module.exports = app;