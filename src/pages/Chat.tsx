import React, { useEffect, useState, useRef } from 'react';
import { usePlanAccess } from '../hooks/usePlanAccess';
import { supabase } from '../lib/supabase';
import { useAuth } from '../AuthContext';
import { Message, UserProfile } from '../types';
import { Send, User, ChevronLeft, Search, MessageSquare } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { Check, CheckCircle2, Smile, Paperclip } from 'lucide-react';

const Chat: React.FC = () => {
  const { profile, loading: authLoading } = useAuth();
  const { subscription: planSub, loading: planLoading } = usePlanAccess();
  const { recipientId } = useParams<{ recipientId: string }>();
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [recipient, setRecipient] = useState<UserProfile | null>(null);
  const [contacts, setContacts] = useState<UserProfile[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch contacts
  useEffect(() => {
    if (!profile) return;

    const fetchContacts = async () => {
      try {
        let query = supabase.from('profiles').select('*');
        
        if (profile.role === 'personal') {
          query = query.eq('personal_id', profile.uid);
        } else if (profile.personalId) {
          query = query.eq('uid', profile.personalId);
        } else {
          setContacts([]);
          return;
        }

        const { data, error } = await query;
        if (error) throw error;
        
        if (data) {
          const mapped = data.map(c => ({
            uid: c.uid,
            name: c.name,
            email: c.email,
            role: c.role,
            personalId: c.personal_id,
            photoUrl: c.photo_url,
            createdAt: c.created_at
          }));
          setContacts(mapped as UserProfile[]);

          // Fetch unread counts
          const { data: unreadData } = await supabase
            .from('messages')
            .select('sender_id')
            .eq('receiver_id', profile.uid)
            .eq('is_read', false);
          
          const counts: Record<string, number> = {};
          unreadData?.forEach(m => {
            counts[m.sender_id] = (counts[m.sender_id] || 0) + 1;
          });
          setUnreadCounts(counts);

          // Auto-select personal trainer if student has only one contact (the personal)
          if (profile.role === 'student' && !recipientId && mapped.length > 0) {
            navigate(`/chat/${mapped[0].uid}`);
          }
        } else {
          setContacts([]);
        }
      } catch (err) {
        console.error('Error fetching contacts:', err);
        setContacts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, [profile, recipientId, navigate]);

  // Fetch recipient info
  useEffect(() => {
    const fetchRecipient = async () => {
      if (!recipientId) {
        setRecipient(null);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('uid', recipientId)
          .single();
        
        if (error) throw error;
        
        if (data) {
          setRecipient({
            uid: data.uid,
            name: data.name,
            email: data.email,
            role: data.role,
            personalId: data.personal_id,
            photoUrl: data.photo_url,
            createdAt: data.created_at
          } as UserProfile);
        } else {
          setRecipient(null);
        }
      } catch (err) {
        console.error('Error fetching recipient:', err);
        setRecipient(null);
      }
    };
    fetchRecipient();
  }, [recipientId]);

  // Fetch messages
  useEffect(() => {
    if (!profile || !recipientId) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${profile.uid},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${profile.uid})`)
        .order('timestamp', { ascending: true });

      if (data) {
        const mapped = data.map(m => ({
          id: m.id,
          senderId: m.sender_id,
          receiverId: m.receiver_id,
          text: m.text,
          timestamp: m.timestamp,
          is_read: m.is_read
        }));
        setMessages(mapped as Message[]);
      }
    };

    fetchMessages();

    // Real-time subscription
    const subscription = supabase
      .channel('messages_changes')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages'
      }, (payload) => {
        const m = payload.new;
        if ((m.sender_id === profile.uid && m.receiver_id === recipientId) ||
            (m.sender_id === recipientId && m.receiver_id === profile.uid)) {
          fetchMessages();
        }
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [profile, recipientId]);

  // Mark as read
  useEffect(() => {
    if (!profile || !recipientId) return;

    const markAsRead = async () => {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('sender_id', recipientId)
        .eq('receiver_id', profile.uid)
        .eq('is_read', false);
      
      setUnreadCounts(prev => ({ ...prev, [recipientId]: 0 }));
    };

    markAsRead();
  }, [profile, recipientId, messages]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !recipientId || !newMessage.trim()) return;

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: profile.uid,
          receiver_id: recipientId,
          text: newMessage,
          timestamp: new Date().toISOString()
        });
      
      if (error) throw error;
      setNewMessage('');
    } catch (error: any) {
      console.error('Error sending message:', error);
    }
  };

  const formatMessageDate = (timestamp: any) => {
    try {
      if (!timestamp) return '...';
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return '...';
      if (isToday(date)) return 'Hoje';
      if (isYesterday(date)) return 'Ontem';
      return format(date, "d 'de' MMMM", { locale: ptBR });
    } catch {
      return '...';
    }
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  if (loading || authLoading || planLoading || !profile) {
    return (
      <div className="h-[calc(100vh-120px)] flex items-center justify-center bg-zinc-900 border border-zinc-800 rounded-3xl">
        <div className="text-zinc-500 animate-pulse">Carregando mensagens...</div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)] flex bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
      {/* Contacts Sidebar */}
      <div className={cn(
        "w-full md:w-80 border-r border-zinc-800 flex flex-col bg-zinc-950/50",
        recipientId ? "hidden md:flex" : "flex"
      )}>
        <div className="p-6 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white mb-4">
            {profile.role === 'personal' ? 'Meus Alunos' : 'Seu Personal'}
          </h2>
          {profile.role === 'personal' && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input 
                type="text" 
                placeholder="Buscar aluno..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-orange-600 transition-colors"
              />
            </div>
          )}
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/50">
          {filteredContacts.length > 0 ? filteredContacts.map((contact) => (
            <button
              key={contact.uid}
              onClick={() => navigate(`/chat/${contact.uid}`)}
              className={cn(
                "w-full p-4 flex items-center gap-4 hover:bg-zinc-800/30 transition-colors text-left",
                recipientId === contact.uid ? "bg-orange-600/10 border-r-2 border-orange-600" : ""
              )}
            >
              <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden shrink-0">
                {contact.photoUrl ? (
                  <img src={contact.photoUrl} alt={contact.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-zinc-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white truncate">{contact.name}</h3>
                <p className="text-xs text-zinc-500 truncate capitalize">{contact.role === 'personal' ? 'Personal Trainer' : 'Aluno'}</p>
              </div>
              {unreadCounts[contact.uid] > 0 && (
                <div className="w-5 h-5 bg-orange-600 rounded-full flex items-center justify-center">
                  <span className="text-[10px] font-black text-white">{unreadCounts[contact.uid]}</span>
                </div>
              )}
            </button>
          )) : (
            <div className="p-12 text-center text-zinc-600">
              <p className="text-sm">Nenhum contato disponível.</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col bg-zinc-900/50",
        !recipientId ? "hidden md:flex items-center justify-center" : "flex"
      )}>
        {recipientId ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-zinc-800 flex items-center gap-4 bg-zinc-950/30">
              <button onClick={() => navigate('/chat')} className="md:hidden text-zinc-500">
                <ChevronLeft />
              </button>
              <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center overflow-hidden">
                {recipient?.photoUrl ? (
                  <img src={recipient.photoUrl} alt={recipient.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-zinc-500" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-white leading-tight">{recipient?.name}</h3>
                <p className="text-[10px] text-green-500 font-black uppercase tracking-widest">Online</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-zinc-900/10">
              {messages.map((msg, index) => {
                const isMine = msg.senderId === profile?.uid;
                const prevMsg = index > 0 ? messages[index - 1] : null;
                const showDate = !prevMsg || formatMessageDate(prevMsg.timestamp) !== formatMessageDate(msg.timestamp);

                return (
                  <React.Fragment key={msg.id}>
                    {showDate && (
                      <div className="flex justify-center my-4">
                        <span className="bg-zinc-800/80 backdrop-blur-sm text-[10px] font-black text-zinc-400 px-4 py-1 rounded-full uppercase tracking-widest border border-zinc-700/50 shadow-sm">
                          {formatMessageDate(msg.timestamp)}
                        </span>
                      </div>
                    )}
                    <div className={cn(
                      "flex flex-col max-w-[85%] group relative",
                      isMine ? "ml-auto items-end" : "mr-auto items-start"
                    )}>
                      <div className={cn(
                        "px-4 py-2.5 rounded-2xl text-[14px] shadow-sm relative",
                        isMine 
                          ? "bg-orange-600 text-white rounded-tr-none ml-6" 
                          : "bg-zinc-800 text-zinc-100 rounded-tl-none mr-6 border border-zinc-700/50"
                      )}>
                        
                        <p className="leading-relaxed">{msg.text}</p>
                        
                        <div className="flex items-center justify-end gap-1.5 mt-1 opacity-70">
                          <span className="text-[9px] font-bold">
                            {msg.timestamp ? (() => {
                              try {
                                const date = new Date(msg.timestamp);
                                return isNaN(date.getTime()) ? '' : format(date, 'HH:mm');
                              } catch { return ''; }
                            })() : ''}
                          </span>
                          {isMine && (
                            <div className="flex">
                              {(msg as any).is_read ? (
                                <CheckCircle2 className="w-3 h-3 text-blue-400" />
                              ) : (
                                <Check className="w-3 h-3 text-white/50" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-zinc-800 bg-zinc-950/50 backdrop-blur-md">
              <div className="flex items-center gap-2 max-w-4xl mx-auto">
                <div className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-full flex items-center px-4 py-1 transition-all focus-within:border-orange-600/50 focus-within:ring-2 focus-within:ring-orange-600/10">
                  <button type="button" className="p-2 text-zinc-500 hover:text-orange-500 transition-colors">
                    <Smile className="w-5 h-5" />
                  </button>
                  <input 
                    type="text" 
                    placeholder="Mensagem..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="flex-1 bg-transparent border-none py-3 px-2 text-white text-[15px] focus:outline-none placeholder:text-zinc-600"
                  />
                  <button type="button" className="p-2 text-zinc-500 hover:text-orange-500 transition-colors rotate-45">
                    <Paperclip className="w-5 h-5" />
                  </button>
                </div>
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center text-white hover:bg-orange-700 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale shadow-lg shadow-orange-600/30"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-zinc-800 rounded-3xl flex items-center justify-center mx-auto">
              <MessageSquare className="w-10 h-10 text-zinc-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Suas Conversas</h3>
              <p className="text-zinc-500">Selecione um contato para começar a conversar.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
