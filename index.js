const express = require('express')
const { createProxyMiddleware } = require('http-proxy-middleware')

const app = express()
const port = process.env.PORT || 9000

// 添加body解析中间件 - 移到最前面
app.use(express.json());

// 授权使用的用户列表
const users = ['wxid_tcxb05tu7um112','wxid2','wxid3']

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message
    });
});

app.use('/',createProxyMiddleware({
    target: 'https://api.siliconflow.cn',
    changeOrigin: true,
    pathRewrite: {
        '^/v1/chat/completions': '/chat/completions',
    },
    // 添加超时配置
    proxyTimeout: 50000,
    timeout: 50000,
    onProxyRes: function (proxyRes, req, res) {
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
        if (users.includes(req.headers['wxid'])) {
            // 正常返回响应
        }else{
            res.status(401).json({
                'error': 'Unauthorized',
                'message': '未授权的访问'
            });
        }
    },
    onProxyReq: function (proxyReq, req, res) {
        try {
            if (users.includes(req.headers['wxid'])) {
                // 验证API密钥是否存在
                const apiKey = process.env.SILICON_API_KEY;
                if (!apiKey) {
                    throw new Error('API Key not configured');
                }
                
                proxyReq.setHeader('Authorization', `Bearer ${apiKey}`);
                
                // 处理请求体
                if (req.body) {
                    const bodyStr = JSON.stringify(req.body);
                    const body = JSON.parse(bodyStr);
                    
                    // 设置默认模型
                    if (!body.model) {
                        body.model = 'deepseek-ai/DeepSeek-V3';
                    }
                    
                    // 写入修改后的请求体
                    const newBodyStr = JSON.stringify(body);
                    proxyReq.setHeader('Content-Length', Buffer.byteLength(newBodyStr));
                    proxyReq.write(newBodyStr);
                }
                
                // 移除不需要的头信息
                proxyReq.removeHeader('x-forwarded-for');
                proxyReq.removeHeader('x-real-ip');
            } else {
                proxyReq.setHeader('Authorization', 'Bearer invalid-key');
            }
        } catch (error) {
            console.error('Error in proxy request:', error);
            res.status(500).json({
                error: 'Proxy Error',
                message: error.message
            });
        }
    }
}));

// 添加OPTIONS请求处理
app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,wxid');
    res.sendStatus(200);
});

// 修改监听方式
module.exports = app

// 本地开发时使用
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Example app listening at http://localhost:${port}`)
    })
}
