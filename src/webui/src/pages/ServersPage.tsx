import { useState, useEffect, useCallback } from 'react'
import { noAuthFetch } from '../utils/api'
import { showToast } from '../hooks/useToast'
import type { ServerConfig, PluginConfig } from '../types'
import { IconServer, IconPlus, IconEdit, IconTrash, IconSearch, IconRefresh, IconCheck, IconX } from '../components/icons'
import ServerFormModal from '../components/ServerFormModal'

export default function ServersPage() {
    const [servers, setServers] = useState<ServerConfig[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingServer, setEditingServer] = useState<ServerConfig | null>(null)

    const fetchServers = useCallback(async () => {
        setLoading(true)
        try {
            const res = await noAuthFetch<PluginConfig>('/config')
            if (res.code === 0 && res.data) {
                setServers(res.data.servers || [])
            }
        } catch {
            showToast('获取服务器列表失败', 'error')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchServers() }, [fetchServers])

    const handleAddServer = async (server: ServerConfig) => {
        // 检查别名是否重复
        if (servers.some(s => s.alias === server.alias)) {
            showToast(`服务器 "${server.alias}" 已存在`, 'error')
            return false
        }

        try {
            const updatedServers = [...servers, server]
            await saveServers(updatedServers)
            showToast('服务器添加成功', 'success')
            return true
        } catch {
            showToast('添加失败', 'error')
            return false
        }
    }

    const handleUpdateServer = async (server: ServerConfig) => {
        try {
            const updatedServers = servers.map(s =>
                s.alias === editingServer?.alias ? server : s
            )
            await saveServers(updatedServers)
            showToast('服务器更新成功', 'success')
            return true
        } catch {
            showToast('更新失败', 'error')
            return false
        }
    }

    const handleDeleteServer = async (alias: string) => {
        if (!confirm(`确定要删除服务器 "${alias}" 吗？`)) {
            return
        }

        try {
            const updatedServers = servers.filter(s => s.alias !== alias)
            await saveServers(updatedServers)
            showToast('服务器已删除', 'success')
        } catch {
            showToast('删除失败', 'error')
        }
    }

    const saveServers = async (updatedServers: ServerConfig[]) => {
        const res = await noAuthFetch<PluginConfig>('/config')
        if (res.code !== 0 || !res.data) {
            throw new Error('获取配置失败')
        }

        const updatedConfig = { ...res.data, servers: updatedServers }
        const saveRes = await noAuthFetch('/config', {
            method: 'POST',
            body: JSON.stringify(updatedConfig),
        })

        if (saveRes.code !== 0) {
            throw new Error('保存配置失败')
        }

        setServers(updatedServers)
    }

    const openAddModal = () => {
        setEditingServer(null)
        setIsModalOpen(true)
    }

    const openEditModal = (server: ServerConfig) => {
        setEditingServer(server)
        setIsModalOpen(true)
    }

    const handleSubmit = (server: ServerConfig) => {
        if (editingServer) {
            handleUpdateServer(server)
        } else {
            handleAddServer(server)
        }
    }

    const filtered = servers.filter(s => {
        if (!search) return true
        const q = search.toLowerCase()
        return s.alias.toLowerCase().includes(q) ||
               s.host.toLowerCase().includes(q)
    })

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 empty-state">
                <div className="flex flex-col items-center gap-3">
                    <div className="loading-spinner text-primary" />
                    <div className="text-gray-400 text-sm">加载服务器列表中...</div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* 工具栏 */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 animate-fade-in-down">
                <div className="relative flex-1 w-full sm:max-w-xs">
                    <IconSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        className="input-field pl-9"
                        placeholder="搜索服务器名称或地址..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button className="btn btn-ghost text-xs" onClick={fetchServers}>
                        <IconRefresh size={13} />
                        刷新
                    </button>
                    <button className="btn btn-primary text-xs" onClick={openAddModal}>
                        <IconPlus size={13} />
                        添加服务器
                    </button>
                </div>
            </div>

            {/* 统计 */}
            <p className="text-xs text-gray-400">
                共 {servers.length} 个服务器
                {search && `，搜索到 ${filtered.length} 个`}
            </p>

            {/* 服务器列表 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
                {filtered.map((server) => (
                    <div key={server.alias} className="card p-5 hover-lift animate-fade-in-up">
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                                    <IconServer size={20} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                                        {server.alias}
                                    </h3>
                                    <p className="text-xs text-gray-400">{server.host}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2 text-xs">
                            <div className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-700/50">
                                <span className="text-gray-500">游戏端口</span>
                                <span className="font-mono text-gray-700 dark:text-gray-300">{server.port}</span>
                            </div>
                            <div className="flex items-center justify-between py-1.5 border-b border-gray-100 dark:border-gray-700/50">
                                <span className="text-gray-500">RCON 端口</span>
                                <span className="font-mono text-gray-700 dark:text-gray-300">{server.rconPort}</span>
                            </div>
                            <div className="flex items-center justify-between py-1.5">
                                <span className="text-gray-500">密码状态</span>
                                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                    <IconCheck size={12} />
                                    已设置
                                </span>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/50">
                            <button
                                className="flex-1 btn btn-ghost text-xs"
                                onClick={() => openEditModal(server)}
                            >
                                <IconEdit size={13} />
                                编辑
                            </button>
                            <button
                                className="flex-1 btn btn-danger text-xs"
                                onClick={() => handleDeleteServer(server.alias)}
                            >
                                <IconTrash size={13} />
                                删除
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {filtered.length === 0 && (
                <div className="py-12 text-center empty-state card">
                    <IconServer size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-400 text-sm mb-1">
                        {search ? '没有匹配的服务器' : '暂无服务器配置'}
                    </p>
                    {!search && (
                        <button className="btn btn-primary text-xs mt-3" onClick={openAddModal}>
                            <IconPlus size={13} />
                            添加第一个服务器
                        </button>
                    )}
                </div>
            )}

            {/* 表单模态框 */}
            <ServerFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={handleSubmit}
                initialData={editingServer}
            />
        </div>
    )
}
