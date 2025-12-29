
import React, { useState, useEffect, useRef } from 'react';
import { api } from '../services/api';
import { SupportTicket, TicketMessage } from '../types';
import { 
  MessageSquare, Plus, Search, Loader2, X, Send, 
  AlertCircle, CheckCircle2, Clock, Filter, ChevronRight, User
} from 'lucide-react';

const Support: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  
  // New Ticket Form
  const [newSubject, setNewSubject] = useState('');
  const [newCategory, setNewCategory] = useState<SupportTicket['category']>('TECHNICAL');
  const [newContent, setNewContent] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadData(); }, []);
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedTicket?.messages]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.support.getTickets();
      setTickets(data);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject || !newContent) return;
    setIsSubmitting(true);
    try {
      await api.support.createTicket({
        subject: newSubject,
        category: newCategory,
        messages: [{ content: newContent } as any]
      });
      setShowNewModal(false);
      setNewSubject('');
      setNewContent('');
      await loadData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedTicket) return;
    setIsSubmitting(true);
    try {
      const updated = await api.support.addMessage(selectedTicket.id, newMessage);
      if (updated) setSelectedTicket({ ...updated });
      setNewMessage('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filtered = tickets.filter(t => 
    t.subject.toLowerCase().includes(search.toLowerCase()) || 
    t.id.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'text-blue-500 border-blue-500/20 bg-blue-500/5';
      case 'IN_PROGRESS': return 'text-yellow-500 border-yellow-500/20 bg-yellow-500/5';
      case 'RESOLVED': return 'text-green-500 border-green-500/20 bg-green-500/5';
      default: return 'text-gray-500 border-white/5 bg-white/5';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto h-[calc(100vh-140px)] flex flex-col">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-white/5 pb-4">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Communications</h1>
          <p className="text-gray-600 font-mono text-[10px] uppercase tracking-widest opacity-60">Technical & Operational Liaison</p>
        </div>
        <button onClick={() => setShowNewModal(true)} className="px-5 py-2.5 bg-blue-600 text-white font-black uppercase hover:bg-white hover:text-black transition-all shadow-lg flex items-center gap-2 text-[10px] rounded-xl tracking-widest">
          <Plus size={16} /> New Transmission
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden gap-6">
        {/* Ticket List */}
        <div className={`w-full lg:w-96 flex flex-col gap-4 ${selectedTicket ? 'hidden lg:flex' : 'flex'}`}>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-700 group-focus-within:text-blue-500 transition-colors" size={14} />
            <input 
              type="text" 
              placeholder="FILTER LEDGER..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
              className="w-full bg-surface border border-white/5 rounded-xl py-3 pl-10 pr-4 text-[10px] font-mono focus:border-blue-500 transition-all outline-none uppercase placeholder:text-gray-800" 
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {loading ? (
              Array(4).fill(0).map((_, i) => <div key={i} className="h-24 bg-surface border border-white/5 rounded-2xl animate-pulse"></div>)
            ) : filtered.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center border border-white/5 border-dashed rounded-2xl opacity-20">
                <MessageSquare size={32} className="mb-2" />
                <p className="text-[10px] font-mono uppercase">No Active Channels</p>
              </div>
            ) : (
              filtered.map(ticket => (
                <div 
                  key={ticket.id} 
                  onClick={() => setSelectedTicket(ticket)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer group ${selectedTicket?.id === ticket.id ? 'bg-blue-600/5 border-blue-500/50' : 'bg-surface border-white/5 hover:border-white/10'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[9px] font-mono text-blue-500 font-bold">{ticket.id}</span>
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded border uppercase tracking-tighter ${getStatusColor(ticket.status)}`}>
                      {ticket.status}
                    </span>
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-tight mb-3 line-clamp-1 group-hover:text-blue-400 transition-colors">{ticket.subject}</h3>
                  <div className="flex justify-between items-center text-[9px] font-mono text-gray-600 uppercase">
                    <span>{ticket.category}</span>
                    <span>{new Date(ticket.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat / Detail View */}
        <div className={`flex-1 flex flex-col bg-surface border border-white/5 rounded-2xl overflow-hidden shadow-xl ${!selectedTicket ? 'hidden lg:flex' : 'flex'}`}>
          {selectedTicket ? (
            <>
              <div className="p-5 border-b border-white/5 bg-black/40 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <button onClick={() => setSelectedTicket(null)} className="lg:hidden p-2 text-gray-500 hover:text-white"><ChevronRight className="rotate-180" size={20} /></button>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-blue-500">{selectedTicket.subject}</h3>
                    <p className="text-[9px] font-mono text-gray-600 uppercase mt-1">Status: {selectedTicket.status} // ID: {selectedTicket.id}</p>
                  </div>
                </div>
                <div className="hidden md:flex gap-2">
                  <div className={`text-[8px] font-black px-3 py-1 rounded-full uppercase border ${selectedTicket.priority === 'HIGH' ? 'border-red-500/20 text-red-500' : 'border-white/10 text-gray-600'}`}>
                    PRIO: {selectedTicket.priority}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[#080808]">
                {selectedTicket.messages.map((msg, idx) => (
                  <div key={msg.id} className={`flex ${msg.role === 'USER' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                    <div className={`max-w-[80%] flex flex-col ${msg.role === 'USER' ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-2 mb-1.5 px-1">
                        <span className="text-[9px] font-mono text-gray-700 uppercase">{msg.senderName}</span>
                        <span className="text-[8px] font-mono text-gray-800">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div className={`p-4 rounded-2xl text-xs leading-relaxed ${msg.role === 'USER' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white/5 border border-white/5 text-gray-300 rounded-tl-none'}`}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="p-4 bg-black/40 border-t border-white/5">
                <div className="relative">
                  <input 
                    type="text" 
                    value={newMessage} 
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="ENTER TRANSMISSION..."
                    className="w-full bg-black border border-white/10 rounded-xl py-4 pl-6 pr-16 text-xs focus:border-blue-500 outline-none transition placeholder:text-gray-900" 
                  />
                  <button 
                    type="submit" 
                    disabled={isSubmitting || !newMessage.trim()} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg hover:bg-white hover:text-black transition-all disabled:opacity-20"
                  >
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center opacity-30 grayscale">
              <div className="p-6 bg-white/5 rounded-full mb-6">
                <MessageSquare size={64} />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tighter mb-2">Communication Terminal</h3>
              <p className="text-xs font-mono uppercase tracking-[0.2em] max-w-xs leading-relaxed">Select a channel from the ledger to initialize interface.</p>
            </div>
          )}
        </div>
      </div>

      {/* New Ticket Modal */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/40">
              <h3 className="font-bold uppercase tracking-widest text-[10px] text-blue-500">Initialize Support Session</h3>
              <button onClick={() => setShowNewModal(false)}><X size={18} className="text-gray-500 hover:text-white" /></button>
            </div>
            <form onSubmit={handleCreateTicket} className="p-8 space-y-6">
              <div className="space-y-1">
                <label className="text-[9px] font-mono text-gray-700 uppercase tracking-widest ml-1">Transmission Subject</label>
                <input type="text" value={newSubject} onChange={e => setNewSubject(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-xs focus:border-blue-500 outline-none" placeholder="e.g. Asset Ingestion Failure" required />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-gray-700 uppercase tracking-widest ml-1">Category</label>
                  <select value={newCategory} onChange={e => setNewCategory(e.target.value as any)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-[10px] uppercase font-black tracking-widest focus:border-blue-500 outline-none">
                    <option value="TECHNICAL">Technical</option>
                    <option value="FINANCIAL">Financial</option>
                    <option value="DISTRIBUTION">Distribution</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-mono text-gray-700 uppercase tracking-widest ml-1">Priority</label>
                  <select value={newPriority} onChange={e => setNewPriority(e.target.value as any)} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-[10px] uppercase font-black tracking-widest focus:border-blue-500 outline-none">
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-mono text-gray-700 uppercase tracking-widest ml-1">Payload Content</label>
                <textarea 
                  value={newContent} 
                  onChange={e => setNewContent(e.target.value)} 
                  className="w-full h-32 bg-black border border-white/10 rounded-xl px-4 py-3 text-xs focus:border-blue-500 outline-none" 
                  placeholder="Describe the anomaly..." 
                  required
                />
              </div>

              <button type="submit" disabled={isSubmitting || !newSubject || !newContent} className="w-full py-4 bg-blue-600 text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-xl shadow-xl flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-30">
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Commit Transmission'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Support;
