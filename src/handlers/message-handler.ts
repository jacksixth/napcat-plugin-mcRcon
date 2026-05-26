/**
 * Minecraft RCON 消息处理器
 *
 * 处理接收到的 QQ 消息事件，包含：
 * - MOTD 服务器状态查询
 * - RCON 命令执行
 * - 玩家绑定/封禁/白名单管理
 * - 消息发送工具函数
 */

import type { OB11Message, OB11PostSendMsg } from "napcat-types/napcat-onebot"
import type { NapCatPluginContext } from "napcat-types/napcat-onebot/network/plugin/types"
import { pluginState } from "../core/state"
import { queryMotd } from "../services/motd-service"
import { sendRconCommand } from "../services/rcon-service"
import type { ServerConfig } from "../types"

// ==================== 常量 ====================

/** 合并转发消息中使用的机器人昵称 */
const BOT_NAME = "Bot"

// ==================== 并发控制标志 ====================

/** 是否正在查询服务器列表 */
let isListing = false

/** 是否正在执行 RCON 命令 */
let isSending = false

// ==================== 消息发送工具 ====================

/**
 * 发送回复消息（通用）
 */
export async function sendReply(
  ctx: NapCatPluginContext,
  event: OB11Message,
  message: OB11PostSendMsg["message"],
): Promise<boolean> {
  try {
    const params: OB11PostSendMsg = {
      message,
      message_type: event.message_type,
      ...(event.message_type === "group" && event.group_id
        ? { group_id: String(event.group_id) }
        : {}),
      ...(event.message_type === "private" && event.user_id
        ? { user_id: String(event.user_id) }
        : {}),
    }
    await ctx.actions.call(
      "send_msg",
      params,
      ctx.adapterName,
      ctx.pluginManager.config,
    )
    return true
  } catch (error) {
    pluginState.logger.error("发送消息失败:", error)
    return false
  }
}

/**
 * 发送群消息
 */
export async function sendGroupMessage(
  ctx: NapCatPluginContext,
  groupId: number | string,
  message: OB11PostSendMsg["message"],
): Promise<boolean> {
  try {
    const params: OB11PostSendMsg = {
      message,
      message_type: "group",
      group_id: String(groupId),
    }
    await ctx.actions.call(
      "send_msg",
      params,
      ctx.adapterName,
      ctx.pluginManager.config,
    )
    return true
  } catch (error) {
    pluginState.logger.error("发送群消息失败:", error)
    return false
  }
}

/**
 * 发送私聊消息
 */
export async function sendPrivateMessage(
  ctx: NapCatPluginContext,
  userId: number | string,
  message: OB11PostSendMsg["message"],
): Promise<boolean> {
  try {
    const params: OB11PostSendMsg = {
      message,
      message_type: "private",
      user_id: String(userId),
    }
    await ctx.actions.call(
      "send_msg",
      params,
      ctx.adapterName,
      ctx.pluginManager.config,
    )
    return true
  } catch (error) {
    pluginState.logger.error("发送私聊消息失败:", error)
    return false
  }
}

// ==================== 合并转发消息 ====================

/** 合并转发消息节点 */
export interface ForwardNode {
  type: "node"
  data: {
    nickname: string
    user_id?: string
    content: Array<{ type: string; data: Record<string, unknown> }>
  }
}

/**
 * 构建转发节点
 */
export function buildForwardNode(
  userId: string,
  nickname: string,
  content: Array<{ type: string; data: Record<string, unknown> }>,
): ForwardNode {
  return {
    type: "node",
    data: {
      user_id: userId,
      nickname,
      content,
    },
  }
}

/**
 * 构建图片消息段
 */
function buildImageSegment(
  favicon?: string,
): Array<{ type: string; data: Record<string, unknown> }> {
  if (!favicon) return []

  return [{ type: "image", data: { file: favicon } }]
}

/**
 * 发送合并转发消息
 */
export async function sendForwardMsg(
  ctx: NapCatPluginContext,
  target: number | string,
  isGroup: boolean,
  nodes: ForwardNode[],
): Promise<boolean> {
  try {
    const actionName = isGroup
      ? "send_group_forward_msg"
      : "send_private_forward_msg"
    const params: Record<string, unknown> = { message: nodes }
    if (isGroup) {
      params.group_id = String(target)
    } else {
      params.user_id = String(target)
    }
    await ctx.actions.call(
      actionName as "send_group_forward_msg",
      params as never,
      ctx.adapterName,
      ctx.pluginManager.config,
    )
    return true
  } catch (error) {
    pluginState.logger.error("发送合并转发消息失败:", error)
    return false
  }
}

/**
 * 根据消息事件自动判断群聊/私聊并发送合并转发消息
 */
async function sendForwardByMsgType(
  ctx: NapCatPluginContext,
  event: OB11Message,
  nodes: ForwardNode[],
): Promise<boolean> {
  if (event.message_type === "group" && event.group_id) {
    return sendForwardMsg(ctx, event.group_id, true, nodes)
  } else if (event.message_type === "private" && event.user_id) {
    return sendForwardMsg(ctx, event.user_id, false, nodes)
  }
  return false
}

// ==================== 权限检查 ====================

/**
 * 检查群聊中是否有管理员权限
 * 私聊消息默认返回 true
 */
export function isAdmin(event: OB11Message): boolean {
  if (event.message_type !== "group") return true
  const role = (event.sender as Record<string, unknown>)?.role
  return role === "admin" || role === "owner"
}

// ==================== 辅助函数 ====================

/**
 * 查找服务器配置
 */
function findServer(alias: string): ServerConfig | undefined {
  return pluginState.config.servers.find((s) => s.alias === alias)
}

/**
 * 解析 host:port 或 host port 格式
 */
function parseHostPort(args: string[]): { host: string; port: number } | null {
  if (args.length < 1) return null

  const firstArg = args[0]
  let host: string
  let port: number = 25565

  // 检查是否是 host:port 格式
  if (firstArg.includes(":")) {
    const parts = firstArg.split(":")
    host = parts[0]
    if (parts[1]) {
      port = parseInt(parts[1])
    }
  } else {
    host = firstArg
    if (args.length >= 2) {
      port = parseInt(args[1])
    }
  }

  if (isNaN(port) || port < 1 || port > 65535) {
    return null
  }

  return { host, port }
}

/**
 * 从 RCON list 命令的返回结果中提取玩家列表文本
 */
function extractPlayersText(listRes: string): string {
  // 尝试英文冒号分隔
  if (listRes.includes(":") && listRes.split(":").length > 1) {
    return listRes.split(":")[1].trim()
  }
  // 尝试中文冒号分隔
  if (listRes.includes("\uFF1A") && listRes.split("\uFF1A").length > 1) {
    return listRes.split("\uFF1A")[1].trim()
  }
  return ""
}

/**
 * #help - 显示帮助信息
 */
async function handleHelp(
  ctx: NapCatPluginContext,
  event: OB11Message,
): Promise<void> {
  const prefix = pluginState.config.commandPrefix || "#mr"
  const helpList = [
    {
      cmd: `${prefix} motd <host>:<port>`,
      desc: "查询Minecraft服务器状态（支持Java/基岩版）",
    },
    { cmd: `${prefix} server list`, desc: "列出所有服务器信息（含在线玩家）" },
    {
      cmd: `${prefix} rcon <alias|ALL> <command>`,
      desc: "发送RCON命令（管理员专属）",
    },
  ]

  const lines = ["(｡･ω･｡) Minecraft 服务器管理插件命令列表\n"]
  lines.push("================================")

  helpList.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.cmd}`)
    lines.push(`   > ${item.desc}\n`)
  })

  lines.push("================================")
  lines.push(`提示：当前前缀为 ${prefix}`)
  lines.push("带<>的为必填参数，且无需输入符号<>")
  lines.push("管理命令需要管理员/主人权限")

  const selfId = pluginState.selfId || String(event.self_id)
  const nodes = [
    buildForwardNode(selfId, BOT_NAME, [
      { type: "text", data: { text: lines.join("\n") } },
    ]),
  ]

  await sendForwardByMsgType(ctx, event, nodes)
}

/**
 * #motd <host>:<port> - 查询服务器状态
 */
async function handleMotd(
  ctx: NapCatPluginContext,
  event: OB11Message,
  args: string[],
): Promise<void> {
  const prefix = pluginState.config.commandPrefix || "#mr"
  const parsed = parseHostPort(args)
  if (!parsed) {
    await sendReply(
      ctx,
      event,
      `(；′⌒\`) 无效的命令格式，请使用 ${prefix} motd <host>:<port>`,
    )
    return
  }

  const { host, port } = parsed

  // 验证主机名格式
  if (!/^[a-z0-9.-]+$/i.test(host)) {
    await sendReply(ctx, event, "(；′⌒`) 无效的主机名格式")
    return
  }

  const data = await queryMotd(host, port)

  if (data) {
    const msgList = []
    msgList.push({
      type: "text",
      data: { text: `${data.type} ${data.version}\n` },
    })
    if (data.favicon) {
      msgList.push(...buildImageSegment(data.favicon))
    }
    msgList.push({
      type: "text",
      data: { text: `${data.players.online}/${data.players.max}\n` },
    })
    if (data.description) {
      msgList.push({ type: "text", data: { text: `${data.description}\n` } })
    }
    await sendReply(ctx, event, msgList as OB11PostSendMsg["message"])
  } else {
    await sendReply(ctx, event, "(；′⌒`) 获取服务器状态失败，可能是服务器未开启。")
  }
}

/**
 * #server list - 列出所有服务器
 */
async function handleServerList(
  ctx: NapCatPluginContext,
  event: OB11Message,
): Promise<void> {
  if (isListing) {
    await sendReply(ctx, event, "(；′⌒`) 正在查询服务器详情，请耐心等待")
    return
  }

  const servers = pluginState.config.servers
  if (servers.length === 0) {
    await sendReply(ctx, event, "(；′⌒`) 服务器列表为空")
    return
  }

  isListing = true
  try {
    const selfId = pluginState.selfId || String(event.self_id)
    const nodes: ForwardNode[] = []

    for (const server of servers) {
      const msgList: Array<{ type: string; data: Record<string, unknown> }> = []
      msgList.push({
        type: "text",
        data: { text: `${server.alias} ${server.host}:${server.port}\n` },
      })

      try {
        const motd = await queryMotd(server.host, parseInt(server.port))
        if (motd) {
          if (motd.favicon) {
            msgList.push(...buildImageSegment(motd.favicon))
          }
          if (motd.description) {
            msgList.push({
              type: "text",
              data: { text: motd.description + "\n" },
            })
          }
          msgList.push({
            type: "text",
            data: {
              text: `服务器版本：${motd.type} ${motd.version}\n服务器人数:${motd.players.online}/${motd.players.max}\n`,
            },
          })

          // 尝试获取在线玩家列表
          try {
            const listRes = await sendRconCommand(server, "list")
            if (listRes) {
              const playersText = extractPlayersText(listRes)
              if (playersText) {
                msgList.push({
                  type: "text",
                  data: { text: `在线玩家：${playersText}\n` },
                })
              }
            }
          } catch (e: unknown) {
            const errMsg = e instanceof Error ? e.message : String(e)
            msgList.push({
              type: "text",
              data: { text: errMsg === '未填写rcon密码' ? '未填写rcon密码\n' : "获取在线玩家数据失败\n" },
            })
          }
        } else {
          msgList.push({
            type: "text",
            data: { text: "获取服务器信息失败，可能是服务器已关闭\n" },
          })
        }
      } catch {
        msgList.push({
          type: "text",
          data: { text: "获取服务器信息失败，可能是服务器已关闭\n" },
        })
      }

      nodes.push(buildForwardNode(selfId, BOT_NAME, msgList))
    }

    await sendForwardByMsgType(ctx, event, nodes)
  } finally {
    isListing = false
  }
}

/**
 * #rcon <alias|ALL> <command> - 发送 RCON 命令（管理员专属）
 */
async function handleRcon(
  ctx: NapCatPluginContext,
  event: OB11Message,
  args: string[],
): Promise<void> {
  if (!isAdmin(event)) {
    await sendReply(ctx, event, "(；′⌒`) 你没有权限使用该命令")
    return
  }

  if (isSending) {
    await sendReply(ctx, event, "(；′⌒`) 已有命令正在执行，请等待当前命令完成")
    return
  }

  if (args.length < 2) {
    await sendReply(ctx, event, "(；′⌒`) 请指定服务器别名和命令")
    return
  }

  const alias = args[0]
  const command = args.slice(1).join(" ")

  isSending = true

  try {
    if (alias === "ALL") {
      const servers = pluginState.config.servers
      const selfId = pluginState.selfId || String(event.self_id)
      const nodes: ForwardNode[] = []

      for (const server of servers) {
        const msgList: Array<{ type: string; data: Record<string, unknown> }> =
          []
        msgList.push({
          type: "text",
          data: { text: `${server.alias} 执行命令：${command}\n` },
        })

        try {
          const res = await sendRconCommand(server, command)
          msgList.push({
            type: "text",
            data: { text: `(≧▽≦) 执行结果：${res}\n` },
          })
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error)
          msgList.push({
            type: "text",
            data: { text: errMsg === '未填写rcon密码' ? '未填写rcon密码\n' : `(；′⌒\`) 执行失败: ${error}\n` },
          })
        }

        nodes.push(buildForwardNode(selfId, BOT_NAME, msgList))
      }

      await sendForwardByMsgType(ctx, event, nodes)
    } else {
      const server = findServer(alias)
      if (!server) {
        const aliases = pluginState.config.servers
          .map((s) => s.alias)
          .join(", ")
        await sendReply(
          ctx,
          event,
          `(；′⌒\`) 不存在该服务器，当前存在服务器: ${aliases}`,
        )
        return
      }

      try {
        const res = await sendRconCommand(server, command)
        await sendReply(ctx, event, `(≧▽≦) ${server.alias} 执行成功：${res}`)
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error)
        await sendReply(ctx, event, errMsg === '未填写rcon密码' ? `(；′⌒\`) ${server.alias} 未填写rcon密码` : `(；′⌒\`) ${server.alias} 执行失败: ${error}`)
      }
    }
  } finally {
    isSending = false
  }
}

// ==================== 消息处理主函数 ====================

/**
 * 消息处理主函数
 */
export async function handleMessage(
  ctx: NapCatPluginContext,
  event: OB11Message,
): Promise<void> {
  try {
    const rawMessage = event.raw_message || ""
    const messageType = event.message_type
    const groupId = event.group_id
    const userId = event.user_id

    pluginState.logger.debug(
      `收到消息: ${rawMessage} | 类型: ${messageType}`,
    )

    // 群消息：检查该群是否启用
    if (messageType === "group" && groupId) {
      if (!pluginState.isGroupEnabled(String(groupId))) return
    }

    // 特殊处理：直接发送"服务器状态"触发查询（无需前缀）
    if (rawMessage.trim() === "服务器状态") {
      await handleServerList(ctx, event)
      pluginState.incrementProcessed()
      return
    }

    // 检查命令前缀
    const prefix = pluginState.config.commandPrefix || "#"
    if (!rawMessage.startsWith(prefix)) return

    // 解析命令参数
    const args = rawMessage.slice(prefix.length).trim().split(/\s+/)
    const subCommand = args[0]?.toLowerCase() || ""

    // 命令分发
    switch (subCommand) {
      case "help":
      case "帮助":
        await handleHelp(ctx, event)
        break

      case "motd":
        await handleMotd(ctx, event, args.slice(1))
        break

      case "server": {
        const subSubCommand = args[1]?.toLowerCase() || ""
        if (subSubCommand === "list") {
          await handleServerList(ctx, event)
        } else {
          await sendReply(
            ctx,
            event,
            `(；′⌒\`) 未知子命令，请使用 ${prefix} help 查看帮助`,
          )
        }
        break
      }

      case "rcon":
      case "发送命令":
        await handleRcon(ctx, event, args.slice(1))
        break

      default:
        // 未知命令
        break
    }

    // 增加处理计数
    pluginState.incrementProcessed()
  } catch (error) {
    pluginState.logger.error("处理消息时出错:", error)
  }
}
