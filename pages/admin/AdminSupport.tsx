import React, { useEffect, useState, useRef } from 'react';
import { api } from '@/services/api';
import { SupportTicket } from '@/types';
import {
    MessageSquare, Search, Loader2, Send,
    CheckCircle2, Clock, Filter, User, XCircle, AlertCircle
} from 'lucide-react';
import { formatDate } from '@/services/utils';
//import { formatDate } from '@/services/utils';

const AdminSupport: React.FC = () => {
    const [tickets, setTickets] = useState<any[]>([]); // Dùng any để chứa thêm thông tin profile
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
    const [filterStatus, setFilterStatus] = useState('ALL'); // ALL, OPEN, RESOLVED
    const [search, setSearch] = useState('');

    // Chat state
    const [replyContent, setReplyContent] = useState('');
    const [sending, setSending] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => { loadData(); }, []);

    // Auto scroll xuống cuối khi mở ticket hoặc có tin nhắn mới
    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [selectedTicket?.messages]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await api.admin.getAllTickets();
            setTickets(data);
        } finally {
            setLoading(false);
        }
    };

    const handleReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!replyContent.trim() || !selectedTicket) return;

        setSending(true);
        try {
            const updatedTicket = await api.admin.replyTicket(selectedTicket.id, replyContent);

            // Cập nhật lại danh sách tickets và ticket đang chọn
            setTickets(prev => prev.map(t => t.id === updatedTicket.id ? updatedTicket : t));
            setSelectedTicket(updatedTicket);
            setReplyContent('');
        } catch (err: any) {
            alert("Failed to send: " + err.message);
        } finally {
            setSending(false);
        }
    };

    const handleChangeStatus = async (status: string) => {
        if (!selectedTicket) return;
        try {
            await api.admin.updateTicketStatus(selectedTicket.id, status);

            // Update local state
            const updated = { ...selectedTicket, status };
            setTickets(prev => prev.map(t => t.id === selectedTicket.id ? updated : t));
            setSelectedTicket(updated);
        } catch (err) {
            console.error(err);
        }
    };

    // Filter Logic
    const filteredTickets = tickets.filter(t => {
        const matchSearch =
            t.subject.toLowerCase().includes(search.toLowerCase()) ||
            t.profiles?.email.toLowerCase().includes(search.toLowerCase()) ||
            t.id.includes(search);

        if (filterStatus === 'ALL') return matchSearch;
        if (filterStatus === 'OPEN') return matchSearch && (t.status === 'OPEN' || t.status === 'IN_PROGRESS');
        if (filterStatus === 'RESOLVED') return matchSearch && (t.status === 'RESOLVED' || t.status === 'CLOSED');
        return matchSearch;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'OPEN': return 'text-green-500 border-green-500/20 bg-green-500/5';
            case 'IN_PROGRESS': return 'text-blue-500 border-blue-500/20 bg-blue-500/5';
            case 'RESOLVED': return 'text-gray-500 border-gray-500/20 bg-gray-500/5';
            default: return 'text-gray-500';
        }
    };
    const formatTime = (dateString: string) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '';

            // Format hiển thị giờ:phút (VD: 14:30)
            return new Intl.DateTimeFormat('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }).format(date);
        } catch (e) {
            return '';
        }
    };

    return (
        <div className="h-[calc(100vh-100px)] flex flex-col animate-fade-in">
            {/* Header */}
            <div className="border-b border-white/10 pb-4 mb-4 flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-tight text-white">Support Center</h1>
                    <p className="text-gray-500 text-xs font-mono uppercase">User Assistance & Ticket Resolution</p>
                </div>
            </div>

            <div className="flex-1 flex gap-6 overflow-hidden">
                {/* Left: Ticket List */}
                <div className="w-1/3 flex flex-col gap-4 bg-[#111] border border-white/5 rounded-xl overflow-hidden">
                    {/* Search & Filter */}
                    <div className="p-4 border-b border-white/5 space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                            <input
                                type="text"
                                placeholder="Search ID, Subject, Email..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full bg-black border border-white/10 rounded-lg py-2 pl-9 pr-4 text-xs text-white focus:border-blue-500 outline-none"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setFilterStatus('ALL')} className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded border ${filterStatus === 'ALL' ? 'bg-white text-black border-white' : 'border-white/10 text-gray-500 hover:text-white'}`}>All</button>
                            <button onClick={() => setFilterStatus('OPEN')} className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded border ${filterStatus === 'OPEN' ? 'bg-green-600 text-white border-green-600' : 'border-white/10 text-gray-500 hover:text-white'}`}>Active</button>
                            <button onClick={() => setFilterStatus('RESOLVED')} className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded border ${filterStatus === 'RESOLVED' ? 'bg-gray-700 text-white border-gray-700' : 'border-white/10 text-gray-500 hover:text-white'}`}>Done</button>
                        </div>
                    </div>

                    {/* List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-gray-500" /></div>
                        ) : filteredTickets.length === 0 ? (
                            <div className="p-8 text-center text-gray-600 text-xs font-mono">No tickets found.</div>
                        ) : (
                            <div className="divide-y divide-white/5">
                                {filteredTickets.map(ticket => (
                                    <div
                                        key={ticket.id}
                                        onClick={() => setSelectedTicket(ticket)}
                                        className={`p-4 cursor-pointer transition hover:bg-white/5 ${selectedTicket?.id === ticket.id ? 'bg-white/5 border-l-2 border-blue-500' : 'border-l-2 border-transparent'}`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className={`text-[8px] px-2 py-0.5 rounded border font-black uppercase ${getStatusColor(ticket.status)}`}>{ticket.status}</span>
                                            <span className="text-[10px] text-gray-500 font-mono">{formatDate(ticket.updated_at)}</span>
                                        </div>
                                        <div className="font-bold text-sm text-white mb-1 truncate">{ticket.subject}</div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-[8px] font-bold text-white">
                                                {ticket.profiles?.name?.charAt(0).toUpperCase() || 'U'}
                                            </div>
                                            <span className="text-xs text-gray-400 truncate">{ticket.profiles?.email}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Chat Window */}
                <div className="flex-1 bg-[#111] border border-white/5 rounded-xl overflow-hidden flex flex-col">
                    {selectedTicket ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-4 border-b border-white/5 flex justify-between items-center bg-black/20">
                                <div>
                                    <h2 className="font-bold text-white text-lg">{selectedTicket.subject}</h2>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                        <span className="flex items-center gap-1"><User size={12} /> {selectedTicket.profiles?.name}</span>
                                        <span className="font-mono">ID: {selectedTicket.id}</span>
                                        <span className="uppercase font-bold text-yellow-500">{selectedTicket.category}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {selectedTicket.status !== 'RESOLVED' ? (
                                        <button onClick={() => handleChangeStatus('RESOLVED')} className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold uppercase flex items-center gap-2 transition">
                                            <CheckCircle2 size={14} /> Mark Resolved
                                        </button>
                                    ) : (
                                        <button onClick={() => handleChangeStatus('OPEN')} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs font-bold uppercase flex items-center gap-2 transition">
                                            <Clock size={14} /> Re-Open
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Chat Messages */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-black/50 custom-scrollbar">
                                {/* Info Alert */}
                                <div className="flex justify-center">
                                    <span className="text-[10px] bg-white/5 text-gray-500 px-3 py-1 rounded-full font-mono">
                                        Ticket Created: {formatDate(selectedTicket.created_at)}
                                    </span>
                                </div>

                                {selectedTicket.messages?.map((msg: any) => (
                                    <div key={msg.id} className={`flex ${msg.role === 'ADMIN' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[75%] ${msg.role === 'ADMIN' ? 'items-end' : 'items-start'} flex flex-col`}>
                                            <div className="flex items-center gap-2 mb-1 px-1">
                                                <span className={`text-[10px] font-bold uppercase ${msg.role === 'ADMIN' ? 'text-blue-500' : 'text-gray-400'}`}>
                                                    {msg.role === 'ADMIN' ? 'Aurora Support' : selectedTicket.profiles?.name}
                                                </span>
                                                <span className="text-[8px] text-gray-600 font-mono">{msg.created_at
                                                    ? new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false })
                                                    : ''}</span>
                                            </div>
                                            <div className={`p-3 rounded-2xl text-xs leading-relaxed ${msg.role === 'ADMIN'
                                                ? 'bg-blue-600 text-white rounded-tr-none'
                                                : 'bg-[#222] border border-white/10 text-gray-300 rounded-tl-none'
                                                }`}>
                                                {msg.content}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="p-4 bg-black/20 border-t border-white/5">
                                {selectedTicket.status === 'RESOLVED' ? (
                                    <div className="text-center p-2 bg-green-500/10 border border-green-500/20 rounded-lg text-green-500 text-xs font-bold uppercase">
                                        This ticket is marked as resolved. Re-open to reply.
                                    </div>
                                ) : (
                                    <form onSubmit={handleReply} className="relative">
                                        <input
                                            type="text"
                                            value={replyContent}
                                            onChange={e => setReplyContent(e.target.value)}
                                            placeholder="Type a response to the user..."
                                            className="w-full bg-black border border-white/10 rounded-xl py-3 pl-4 pr-12 text-xs text-white focus:border-blue-500 outline-none transition"
                                        />
                                        <button
                                            type="submit"
                                            disabled={sending || !replyContent.trim()}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition disabled:opacity-50"
                                        >
                                            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                                        </button>
                                    </form>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
                            <MessageSquare size={48} className="mb-2 opacity-20" />
                            <p className="text-xs font-mono uppercase">Select a ticket to view conversation</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminSupport;