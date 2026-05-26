/**
 * MOTD 服务模块
 * 查询 Minecraft 服务器状态（支持 Java 版和基岩版）
 */

import { pingJava, pingBedrock } from '@minescope/mineping';
import { pluginState } from '../core/state';

/**
 * MOTD 查询结果
 */
export interface MotdResult {
    /** 服务器类型 */
    type: 'java' | 'bedrock';
    /** 服务器版本 */
    version: string;
    /** 玩家信息 */
    players: {
        online: number;
        max: number;
    };
    /** 服务器描述 */
    description?: string;
    /** 服务器图标（base64 格式） */
    favicon?: string;
}

/**
 * 查询 Minecraft 服务器状态
 * 先尝试 Java 版协议，失败后再试基岩版
 * @param host 服务器地址
 * @param port 服务器端口（默认 25565）
 * @returns 服务器状态信息，失败返回 undefined
 */
export async function queryMotd(host: string, port: number = 25565): Promise<MotdResult | undefined> {
    try {
        pluginState.logger.debug(`[MOTD] 查询 Java 版: ${host}:${port}`);

        // 尝试 Java 版
        const javaStatus = await pingJava(host, {
            port,
            timeout: 5000,
        });

        if (javaStatus) {
            const description = typeof javaStatus.description === 'string'
                ? javaStatus.description
                : javaStatus.description?.text;

            pluginState.logger.debug(`[MOTD] Java 版查询成功`);

            return {
                type: 'java',
                version: javaStatus.version.name,
                players: {
                    online: javaStatus.players.online,
                    max: javaStatus.players.max,
                },
                description,
                favicon: javaStatus.favicon
                    ? 'base64://' + javaStatus.favicon.split(',')[1]
                    : undefined,
            };
        }
    } catch (error) {
        pluginState.logger.debug(`[MOTD] Java 版查询失败: ${error}`);
    }

    try {
        pluginState.logger.debug(`[MOTD] 查询基岩版: ${host}:${port}`);

        // 尝试基岩版
        const bedrockStatus = await pingBedrock(host, {
            port: port as number & { _brand: 'Port' },
            timeout: 5000 as number & { _brand: 'Timeout' },
        });

        if (bedrockStatus) {
            pluginState.logger.debug(`[MOTD] 基岩版查询成功`);

            return {
                type: 'bedrock',
                version: bedrockStatus.version.minecraftVersion,
                players: {
                    online: bedrockStatus.players.online,
                    max: bedrockStatus.players.max,
                },
            };
        }
    } catch (error) {
        pluginState.logger.debug(`[MOTD] 基岩版查询失败: ${error}`);
    }

    pluginState.logger.warn(`[MOTD] 查询失败: ${host}:${port}`);
    return undefined;
}
