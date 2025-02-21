const express = require('express')
const { createProxyMiddleware } = require('http-proxy-middleware')

const app = express()
const port = process.env.PORT || 9000

// 授权使用的用户列表
const users = ['wxid_tcxb05tu7um112','wxid2','wxid3']

app.use('/',createProxyMiddleware({
    target: 'https://api.siliconflow.cn',  // 修改为SiliconFlow的API地址
    changeOrigin: true,
    pathRewrite: {
        '^/v1/chat/completions': '/chat/completions',  // 路径重写，适配现有客户端
    },
    onProxyRes: function (proxyRes, req, res) {
        proxyRes.headers['Access-Control-Allow-Origin'] = '*';
        if (users.includes(req.headers['wxid'])) {
            // 什么都不用做，返回原始数据就行
        }else{
            res.json({
                'choices': [{
                    'message': {
                        'role': 'assistant',
                        'content': '未授权的访问'
                    }
                }]
            })
        }
    },
    onProxyReq: function (proxyReq, req, res) {
        if (users.includes(req.headers['wxid'])) {
            proxyReq.setHeader('Authorization', `Bearer ${process.env.SILICON_API_KEY}`);
            // 添加默认model参数（如果请求中没有）
            const bodyStr = req.body ? JSON.stringify(req.body) : '{}';
            const body = JSON.parse(bodyStr);
            if (!body.model) {
                body.model = 'deepseek-ai/DeepSeek-V3';  // 设置默认模型
                const newBodyStr = JSON.stringify(body);
                proxyReq.setHeader('Content-Length', Buffer.byteLength(newBodyStr));
                proxyReq.write(newBodyStr);
            }
            // 移除不需要的头信息
            proxyReq.removeHeader('x-forwarded-for');
            proxyReq.removeHeader('x-real-ip');
        }else{
            // 给个错误的key
            proxyReq.setHeader('Authorization', 'Bearer invalid-key');
        }
    }
}))

// 添加body解析中间件
app.use(express.json());

// 修改监听方式
module.exports = app

// 本地开发时使用
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Example app listening at http://localhost:${port}`)
    })
}
