/**
 * RCON 服务模块
 * 封装 Minecraft RCON 客户端连接和命令发送
 */

import { Rcon } from 'rcon-client';
import type { ServerConfig } from '../types';
import { pluginState } from '../core/state';

/**
 * 发送 RCON 命令到指定服务器
 * @param server 服务器配置
 * @param command 要执行的命令
 * @returns 命令执行结果
 */
export async function sendRconCommand(
    server: ServerConfig,
    command: string
): Promise<string> {
    const rcon = new Rcon({
        host: server.host,
        port: parseInt(server.rconPort),
        password: server.password,
        timeout: 5000,
    });

    try {
        pluginState.logger.debug(`[RCON] 连接到 ${server.alias} (${server.host}:${server.rconPort})`);

        // 建立连接
        if (!rcon.authenticated) {
            await rcon.connect();
        }

        pluginState.logger.debug(`[RCON] 发送命令: ${command}`)

        // 发送命令并获取响应
        const response = await rcon.send(command);

        pluginState.logger.debug(`[RCON] 响应: ${response}`);

        return response;
    } catch (error) {
        pluginState.logger.error(`[RCON] ${server.alias} 执行命令失败:`, error);
        throw new Error(`RCON 错误: ${error}`);
    } finally {
        // 确保连接关闭
        if (rcon.authenticated) {
            await rcon.end();
        }
        pluginState.logger.debug(`[RCON] 连接已关闭`);
    }
}

/**
 * RCON 命令执行结果
 */
export interface RconResult {
    alias: string;
    result?: string;
    error?: string;
}