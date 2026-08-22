<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# 八中重开模拟器

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Run the app:
   `npm run dev`

游戏默认使用仓库内的离线事件数据，不需要 API 密钥。只有运行 `scripts/generate_events.js` 扩充事件时，才需要在服务端环境变量中设置 `DEEPSEEK_API_KEY`；不要把密钥写入前端代码或提交到仓库。

## AI 事件模式

主页点击“AI 模式设置”，填写一个 OpenAI 兼容的 Chat Completions 接口、模型名称和 API Key，测试连接后保存并开启即可。每周没有固定事件或支线事件时，游戏会根据当前属性和近期经历请求 2-3 个新事件；请求失败会自动回退到离线事件，不会卡住游戏。

配置保存在当前浏览器的 `localStorage`，不会写入游戏存档。由于浏览器会直接向你填写的地址发送 API Key，请只使用可信的 API 服务和设备，并确认该服务允许浏览器跨域请求。

常见地址示例：

- DeepSeek：`https://api.deepseek.com/chat/completions`
- OpenAI：`https://api.openai.com/v1/chat/completions`
- 其他兼容服务：填写其完整的 `/chat/completions` 地址，或填写服务根地址让游戏自动补全路径。
