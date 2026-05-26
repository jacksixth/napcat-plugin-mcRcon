import { useState, useEffect } from 'react'
import type { ServerConfig } from '../types'
import { IconX } from './icons'

interface ServerFormModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (server: ServerConfig) => void
    initialData?: ServerConfig | null
}

export default function ServerFormModal({ isOpen, onClose, onSubmit, initialData }: ServerFormModalProps) {
    const [formData, setFormData] = useState<ServerConfig>({
        alias: '',
        host: '',
        port: '25565',
        rconPort: '25575',
        password: ''
    })

    useEffect(() => {
        if (initialData) {
            setFormData(initialData)
        } else {
            setFormData({
                alias: '',
                host: '',
                port: '25565',
                rconPort: '25575',
                password: ''
            })
        }
    }, [initialData, isOpen])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.alias.trim() || !formData.host.trim()) {
            return
        }
        onSubmit(formData)
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-scale-in">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {initialData ? '编辑服务器' : '添加服务器'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <IconX size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            服务器别名 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.alias}
                            onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
                            placeholder="例如：ATM10、GTNH、原版服"
                            className="input-field"
                        />
                        <p className="text-xs text-gray-400 mt-1">用于标识服务器的唯一名称</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            服务器地址 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            required
                            value={formData.host}
                            onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                            placeholder="例如：mc.example.com 或 192.168.1.100"
                            className="input-field"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                游戏端口
                            </label>
                            <input
                                type="text"
                                value={formData.port}
                                onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                                placeholder="25565"
                                className="input-field"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                RCON 端口
                            </label>
                            <input
                                type="text"
                                value={formData.rconPort}
                                onChange={(e) => setFormData({ ...formData, rconPort: e.target.value })}
                                placeholder="25575"
                                className="input-field"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                            RCON 密码
                        </label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="输入 RCON 密码（可选）"
                            className="input-field"
                        />
                        <p className="text-xs text-gray-400 mt-1">确保已在 server.properties 中启用 RCON，不填写则无法使用 RCON 功能</p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 btn btn-ghost"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            className="flex-1 btn btn-primary"
                        >
                            {initialData ? '保存修改' : '添加服务器'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
