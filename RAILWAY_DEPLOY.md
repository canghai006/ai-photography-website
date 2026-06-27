# Railway 部署说明

这个项目已经适配 Railway 单服务部署：Express 后端会托管 `dist` 前端静态文件，同时提供 `/api` 接口和 `/uploads` 图片访问。

数据库使用部署在同一服务持久化卷上的 SQLite，保存用户账号、加密后的密码、登录会话、照片、AI 分析结果、作品集和点赞记录。登录会话使用 HttpOnly Cookie。

## 1. Railway 配置

在 Railway 新建项目后，选择从 GitHub 仓库部署。

需要添加这些 Variables：

```text
ARK_API_KEY=你的火山引擎 Ark API Key
ARK_MODEL=你的 Ark 模型 Endpoint ID
ARK_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
STORAGE_DIR=/data
```

不要手动设置 `PORT`，Railway 会自动提供。

## 2. 持久化存储

在 Railway 服务里创建一个 Volume，并挂载到：

```text
/data
```

项目会把数据保存到：

```text
/data/app.db
/data/uploads/
```

这样重新部署后，SQLite 数据库和上传图片不会丢。

## 3. 构建和启动

Railway 会读取 `railway.json`：

```text
Build Command: npm ci && npm run build
Start Command: npm start
Healthcheck: /api/health
```

## 4. GitHub 提交

如果当前文件夹还不是 Git 仓库，可以在项目根目录执行：

```powershell
git init
git add .
git commit -m "Prepare Railway deployment"
```

然后在 GitHub 创建一个空仓库，按 GitHub 页面提示添加远程仓库并推送：

```powershell
git remote add origin 你的仓库地址
git branch -M main
git push -u origin main
```

## 5. 获取公网地址

部署成功后，在 Railway 的服务页面打开 Networking，点击 Generate Domain，就会得到类似：

```text
https://your-app.up.railway.app
```
