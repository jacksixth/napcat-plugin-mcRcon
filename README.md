# Minecraft RCON 管理插件

通过 QQ 机器人管理 Minecraft 服务器，支持状态查询（Java / 基岩版）、RCON 命令执行、多服务器管理，提供 WebUI 可视化管理界面。

---

## 功能概览

### QQ 群聊命令

| 命令 | 说明 | 权限 |
|------|------|------|
| `服务器状态` | 快捷查询所有服务器状态（无需前缀） | 所有人 |
| `#mr help` | 查看帮助信息 | 所有人 |
| `#mr motd <host>:<port>` | 查询指定服务器状态（支持 Java / 基岩版） | 所有人 |
| `#mr server list` | 列出所有已配置的服务器及在线玩家 | 所有人 |
| `#mr rcon <alias> <命令>` | 向指定服务器发送 RCON 命令 | 管理员 |
| `#mr rcon ALL <命令>` | 向所有服务器广播 RCON 命令 | 管理员 |

> 命令前缀默认为 `#mr`，可在 WebUI 配置中修改。

### 核心特性

- **MOTD 服务器状态查询** — 支持 Java 版和基岩版 Minecraft 服务器，返回版本号、在线人数、MOTD 描述、服务器图标
- **RCON 远程命令执行** — 支持单服务器执行和 ALL 全服广播，管理员专属
- **多服务器管理** — 可配置多个 Minecraft 服务器，通过别名区分
- **WebUI 可视化管理** — 内嵌 React 前端面板，支持仪表盘、配置管理、服务器管理、群管理
- **分群启用控制** — 可按群单独开关插件功能
- **合并转发消息** — 服务器列表等长文本以合并转发卡片形式发送，简洁美观
- **并发控制** — 服务器列表查询和 RCON 命令执行均自带并发锁，防止重复触发
- **运行时统计** — 记录消息处理数量、运行时长等指标

---

## 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置服务器

插件安装后，在 NapCat WebUI 中打开本插件的「扩展页面」，进入「服务器管理」标签页，添加你的 Minecraft 服务器：

- **别名**：服务器的唯一标识（用于 `#mr rcon <alias>` 命令）
- **地址**：服务器 IP 或域名
- **游戏端口**：Java 版默认 25565，基岩版默认 19132
- **RCON 端口**：默认 25575
- **RCON 密码**：需与服务器 `server.properties` 中的 `rcon.password` 一致

> 使用 RCON 功能前，请确保 Minecraft 服务器已开启 RCON（`server.properties` 中设置 `enable-rcon=true`）。

### 3. 构建

```bash
# 完整构建（后端 + WebUI 前端，一步完成）
pnpm run build
```

构建产物在 `dist/` 目录下，将整个 `dist/` 文件夹放入 NapCat 的 `plugins/` 目录即可。

---

## 项目结构

```
napcat-plugin-mcRcon/
├── src/
│   ├── index.ts                 # 插件入口，生命周期钩子 + 路由注册
│   ├── config.ts                # 默认配置 & WebUI 配置 Schema
│   ├── types.ts                 # TypeScript 类型定义
│   ├── core/
│   │   └── state.ts             # 全局状态单例（配置、统计、定时器）
│   ├── handlers/
│   │   └── message-handler.ts   # QQ 消息处理（命令解析、RCON/MOTD/帮助）
│   ├── services/
│   │   ├── api-service.ts       # WebUI API 路由
│   │   ├── motd-service.ts      # MOTD 服务器查询（Java + 基岩版）
│   │   └── rcon-service.ts      # RCON 客户端封装
│   └── webui/                   # React + TailwindCSS 前端
│       └── src/
│           ├── pages/
│           │   ├── StatusPage.tsx    # 仪表盘
│           │   ├── ConfigPage.tsx    # 配置管理
│           │   ├── ServersPage.tsx   # 服务器管理
│           │   └── GroupsPage.tsx    # 群管理
│           ├── components/
│           │   ├── Sidebar.tsx
│           │   ├── Header.tsx
│           │   └── ServerFormModal.tsx
│           └── hooks/           # useStatus / useTheme / useToast
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 命令详解

### `服务器状态` — 快捷查询

直接发送「服务器状态」四个字（无需前缀），自动查询所有已配置服务器的状态，以合并转发消息展示。

### `#mr motd <host>:<port>` — 服务器探测

实时查询任意 Minecraft 服务器的基本信息。先尝试 Java 版协议，失败后自动回退到基岩版协议。

```
#mr motd mc.hypixel.net:25565
#mr motd play.example.com   （省略端口则默认 25565）
```

返回信息包括：服务器类型、版本号、在线人数、MOTD 描述、服务器图标。

### `#mr server list` — 服务器列表

列出所有已配置的服务器，每条包含：MOTD 信息、在线人数，并尝试通过 RCON 获取在线玩家名单。

### `#mr rcon <alias> <命令>` — RCON 执行

向指定服务器发送任意 RCON 命令（仅群管理员/群主可用）。

```
#mr rcon survival say 大家好
#mr rcon creative whitelist add PlayerName
#mr rcon survival ban BadPlayer 违规行为
```

### `#mr rcon ALL <命令>` — 全服广播

向所有已配置服务器发送同一条 RCON 命令，结果以合并转发消息汇总展示。

```
#mr rcon ALL say 服务器将在5分钟后重启
```

---

## WebUI 面板

插件内置 React 前端管理面板，通过 NapCat WebUI 侧边栏访问。

| 页面 | 功能 |
|------|------|
| 仪表盘 | 插件运行状态、处理消息数、运行时长 |
| 配置管理 | 全局开关、命令前缀、调试模式 |
| 服务器管理 | 增删改查 Minecraft 服务器配置 |
| 群管理 | 查看群列表，按群启用/禁用插件 |

---

## 开发

```bash
# 安装依赖
pnpm install

# 类型检查
pnpm run typecheck

# 完整构建
pnpm run build

# 开发模式（watch + 热重载，需安装 napcat-plugin-debug）
pnpm run dev

# 仅前端开发（实时预览）
pnpm run dev:webui
```

---

## 依赖

| 包 | 用途 |
|------|------|
| [`@minescope/mineping`](https://www.npmjs.com/package/@minescope/mineping) | Minecraft 服务器 MOTD 查询（Java + 基岩版） |
| [`rcon-client`](https://www.npmjs.com/package/rcon-client) | Minecraft RCON 协议客户端 |
| [`napcat-types`](https://www.npmjs.com/package/napcat-types) | NapCat 插件类型定义 |

---

## License

GPL-3.0

### 内置 API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/info` | 获取插件信息 |
| GET | `/status` | 获取运行状态、配置、统计 |
| GET | `/config` | 获取当前配置 |
| POST | `/config` | 保存配置（合并更新） |
| GET | `/groups` | 获取群列表（含启用状态） |
| POST | `/groups/:id/config` | 更新单个群配置 |
| POST | `/groups/bulk-config` | 批量更新群配置 |

### 前端调用方式

```javascript
// 无认证 API 请求
const url = `/api/plugin/${PLUGIN_NAME}${path}`;
const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options
});
```

## 📝 编码约定

### ESM 模块规范

- `package.json` 中 `type: "module"`
- 构建目标 `ESNext`，输出 `.mjs`

### 状态访问模式

```typescript
import { pluginState } from '../core/state';

// 读取配置
const config = pluginState.config;

// 记录日志（三级别）
pluginState.log('info', '消息内容');
pluginState.log('warn', '警告内容');
pluginState.log('error', '错误内容', error);
pluginState.logDebug('调试信息'); // 仅 debug 模式输出

// 配置操作
pluginState.setConfig(ctx, { key: value });       // 合并更新
pluginState.replaceConfig(ctx, fullConfig);        // 完整替换
pluginState.updateGroupConfig(ctx, groupId, cfg);  // 更新群配置
pluginState.isGroupEnabled(groupId);               // 检查群启用状态

// 调用 OneBot API
await pluginState.callApi('send_group_msg', { group_id, message });

// 统计
pluginState.incrementProcessedCount();
```

### 消息发送模式

```typescript
import {
    sendGroupMessage, sendPrivateMessage, sendGroupForwardMsg,
    setMsgEmojiLike, uploadGroupFile,
    textSegment, imageSegment, atSegment, replySegment, buildForwardNode
} from '../handlers/message-handler';

// 发送群消息（带回复）
await sendGroupMessage(ctx, groupId, [
    replySegment(messageId),
    textSegment('消息内容')
]);

// 合并转发消息
const nodes = [
    buildForwardNode('10001', 'Bot', [textSegment('第一条')]),
    buildForwardNode('10001', 'Bot', [textSegment('第二条')]),
];
await sendGroupForwardMsg(ctx, groupId, nodes);

// 表情回复
await setMsgEmojiLike(ctx, messageId, '76');

// 上传群文件
await uploadGroupFile(ctx, groupId, '/path/to/file.zip', 'file.zip');
```

### API 响应格式

```typescript
// 成功响应
res.json({ code: 0, data: { ... } });

// 错误响应
res.status(500).json({ code: -1, message: '错误描述' });
```

## 🤖 AI 辅助开发

项目内置了 NapCat API 的 Apifox MCP Server 配置（`.vscode/mcp.json`），在 VS Code 中配合 AI 助手（如 GitHub Copilot）使用时，可以直接查询 NapCat 的完整 API 文档。

### 使用方式

1. 使用 VS Code 打开本项目
2. 确保已安装 [GitHub Copilot](https://marketplace.visualstudio.com/items?itemName=GitHub.copilot) 扩展
3. 打开 Copilot Chat，MCP Server 会自动启动
4. 在对话中即可让 AI 查询 NapCat API 接口信息，例如：
   - *"NapCat 有哪些发送消息的 API？"*
   - *"获取群列表的接口参数是什么？"*
   - *"帮我调用 send_group_msg 发送一条群消息"*

> MCP 配置位于 `.vscode/mcp.json`，使用 `apifox-mcp-server` 连接 NapCat 的 API 文档站点，无需额外配置。

## 🚀 CI/CD 自动发布

项目内置了两个 GitHub Actions 工作流：

### 1. 自动构建发布（`release.yml`）

推送 `v*` 格式的 tag 即可自动构建并创建 GitHub Release。

```bash
git tag v1.0.0
git push origin v1.0.0
```

也可在 GitHub Actions 页面手动触发，可选填版本号。

**基础自定义：**
- 修改 `release.yml` 中的 `PLUGIN_NAME` 为你的插件名称
- 默认 Release Note 模板位于 `.github/prompt/default.md`

#### 🤖 AI 生成 Release Note（可选）

支持接入任意兼容 OpenAI 格式的 AI API，自动根据 git commit 记录生成结构化的 Release Note。

**配置方式：** 在插件仓库 **Settings > Secrets and variables > Actions** 中添加以下 Secrets：

| Secret | 必填 | 说明 |
|--------|------|------|
| `AI_API_URL` | ✅ | 兼容 OpenAI 格式的 API 地址（如 `https://api.openai.com/v1/chat/completions`） |
| `AI_API_KEY` | ✅ | 对应的 API 密钥 |
| `AI_MODEL` | ❌ | 模型名称，默认 `gpt-4o-mini` |

**工作逻辑：**
- ✅ 配置了 `AI_API_URL` + `AI_API_KEY` → 自动调用 AI 生成 Release Note
- ❌ 未配置或 AI 调用失败 → 自动回退到默认模板（`.github/prompt/default.md`）或 commit log
- AI 调用失败不会阻断发布流程，始终保证 Release 正常创建

**自定义 AI Prompt：** 创建 `.github/prompt/ai-release-note.md` 文件即可覆盖默认的 system prompt，支持 `{VERSION}` 占位符。

> 💡 不配置任何 AI 相关的 Secret，发布流程与之前完全一致，无任何影响。

### 2. 自动更新插件索引（`update-index.yml`）

Release 发布后，会自动向 [napcat-plugin-index](https://github.com/NapNeko/napcat-plugin-index) 提交 PR 更新插件索引，**无需手动编辑 `plugins.v4.json`**。

**完整流程：**

```
push tag → release.yml 构建发布 → update-index.yml 自动提交 PR → 索引仓库 CI 自动审核 → 维护者合并
```

**配置步骤：**

1. **填写 `package.json` 中的插件元信息**（CI 会自动读取）：
   ```json
   {
     "name": "napcat-plugin-your-name",
     "plugin": "你的插件显示名",
     "version": "1.0.0",
     "description": "插件描述",
     "author": "你的名字",
     "napcat": {
       "tags": ["工具"],
       "minVersion": "4.14.0",
       "homepage": "https://github.com/username/napcat-plugin-your-name"
     }
   }
   ```

   `napcat` 字段说明：

   | 字段 | 说明 | 默认值 |
   |------|------|--------|
   | `tags` | 插件标签数组，用于分类 | `["工具"]` |
   | `minVersion` | 支持的最低 NapCat 版本 | `"4.14.0"` |
   | `homepage` | 插件主页 URL | 仓库地址 |

2. **配置仓库 Secret**：在插件仓库 Settings > Secrets and variables > Actions 中添加：
   - `INDEX_PAT`：一个有 `public_repo` 权限的 GitHub Personal Access Token，用于向索引仓库提交 PR

3. **修改 `update-index.yml`**（可选）：如果索引仓库不是 `NapNeko/napcat-plugin-index`，修改 `INDEX_REPO` 环境变量

> 💡 配置完成后，每次发布新版本只需 `git tag v1.x.x && git push origin v1.x.x`，一切自动完成！

## 📦 部署

### 方式一：一键部署（推荐开发时使用）

确保 NapCat 端已安装并启用 `napcat-plugin-debug` 插件，然后：

```bash
pnpm run deploy
```

这会自动构建，`napcatHmrPlugin` 在构建完成后自动复制 `dist/` 到远程插件目录并触发热重载。

### 方式二：手动部署

将 `dist/` 目录的内容复制到 NapCat 的插件目录即可。

> 💡 使用 CI/CD 自动发布后，可直接从 GitHub Release 下载 zip 包解压到 `plugins` 目录。

## 📄 许可证

MIT License
