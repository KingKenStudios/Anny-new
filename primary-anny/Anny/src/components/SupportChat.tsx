import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, User, Bot, ShieldCheck, X, LifeBuoy, Zap, MessageSquare } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  doc, 
  setDoc, 
  limit,
  increment 
} from 'firebase/firestore';

interface Message {
  id: string;
  text: string;
  senderId: string;
  senderType: 'user' | 'admin' | 'system';
  timestamp: any;
}

interface SupportChatProps {
  chatId: string; // userId
  userEmail: string;
  userName: string;
  userPhotoURL?: string;
  isAdminView?: boolean;
  onClose?: () => void;
  type?: 'enterprise' | 'support';
}

export default function SupportChat({ chatId, userEmail, userName, userPhotoURL, isAdminView = false, onClose, type = 'support' }: SupportChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!chatId || !auth.currentUser) return;

    // Ensure chat document exists
    const chatRef = doc(db, 'support_chats', chatId);
    setDoc(chatRef, {
      userId: chatId,
      userEmail: userEmail || null,
      userName: userName || 'Neural Operator',
      userPhotoURL: userPhotoURL || null,
      type: type || 'support',
      status: 'active',
      lastUpdate: serverTimestamp()
    }, { merge: true }).catch(err => console.warn("Support session init error:", err));

    // Messages sync
    const msgsRef = collection(db, 'support_chats', chatId, 'messages');
    const q = query(msgsRef, limit(200));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      
      // Client-side sort to be safe about missing timestamps
      msgs.sort((a, b) => {
        const timeA = a.timestamp?.toMillis?.() || 0;
        const timeB = b.timestamp?.toMillis?.() || 0;
        return timeA - timeB;
      });
      
      setMessages(msgs);
      
      // Mark as read logic
      if (isAdminView) {
        setDoc(chatRef, { unreadCountAdmin: 0 }, { merge: true }).catch(() => {});
      } else {
        setDoc(chatRef, { unreadCountUser: 0 }, { merge: true }).catch(() => {});
      }
    }, (error) => {
      console.warn('SupportChat snapshot listener error:', error);
    });

    return () => unsubscribe();
  }, [chatId, isAdminView]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || !currentUser) return;

    const text = input.trim();
    setInput('');

    try {
      const msgsRef = collection(db, 'support_chats', chatId, 'messages');
      await addDoc(msgsRef, {
        text,
        senderId: currentUser.uid,
        senderType: isAdminView ? 'admin' : 'user',
        timestamp: serverTimestamp()
      });

      const chatRef = doc(db, 'support_chats', chatId);
      const updateData: any = {
        lastMessageText: text,
        lastMessageAt: serverTimestamp(),
        lastUpdate: serverTimestamp()
      };

      if (isAdminView) {
        updateData.unreadCountUser = increment(1);
      } else {
        updateData.unreadCountAdmin = increment(1);
      }

      await setDoc(chatRef, updateData, { merge: true });
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {isAdminView && userPhotoURL && userPhotoURL.length > 0 ? (
            <img 
              src={userPhotoURL} 
              alt={userName} 
              className="w-8 h-8 rounded-full border border-cyan-500/40 object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as any).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${chatId}`;
              }}
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
              {isAdminView ? <User className="w-4 h-4 text-cyan-400" /> : <ShieldCheck className="w-4 h-4 text-cyan-400" />}
            </div>
          )}
          <div>
            <p className="text-[10px] font-mono text-white/40 uppercase tracking-widest leading-none mb-1">
              {isAdminView ? 'User Signal' : 'Neural Support'}
            </p>
            <p className="text-xs font-bold text-white truncate max-w-[150px]">
              {isAdminView ? userName : (type === 'enterprise' ? 'Enterprise Advisor' : 'Anny Command')}
            </p>
          </div>
        </div>
        {onClose && (
          <div className="flex items-center gap-2">
            <button 
              onClick={onClose} 
              className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[8px] font-mono text-white/40 uppercase tracking-widest hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 transition-all active:scale-95 flex items-center gap-2"
            >
              <X className="w-3 h-3" />
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto space-y-4 custom-scrollbar"
      >
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
             <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center animate-pulse">
                <MessageSquare className="w-6 h-6 text-white/20" />
             </div>
             <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Secure Link Established. Initializing session...</p>
          </div>
        )}

        {messages.map((msg) => {
          if (msg.senderType === 'system') {
            return (
              <div key={msg.id} className="flex justify-center my-2">
                <div className="bg-white/5 border border-white/5 px-4 py-1.5 rounded-full">
                  <p className="text-[8px] font-mono text-white/30 uppercase tracking-[0.2em]">{msg.text}</p>
                </div>
              </div>
            );
          }
          const isMe = (isAdminView && msg.senderType === 'admin') || (!isAdminView && msg.senderType === 'user');
          const showAvatar = !isMe;

          return (
            <div 
              key={msg.id}
              className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              {!isMe && (
                <div className="w-6 h-6 shrink-0 mb-1 rounded-full overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center">
                  {msg.senderType === 'user' && userPhotoURL && userPhotoURL.length > 0 ? (
                    <img 
                      src={userPhotoURL} 
                      alt="" 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer" 
                      onError={(e) => {
                        (e.target as any).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${chatId}`;
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-cyan-500/10">
                       {msg.senderType === 'admin' ? <ShieldCheck className="w-3 h-3 text-cyan-400" /> : <User className="w-3 h-3 text-cyan-400" />}
                    </div>
                  )}
                </div>
              )}
              <div 
                className={`max-w-[75%] p-3 rounded-2xl text-xs leading-relaxed ${
                  isMe 
                    ? 'bg-cyan-500 text-black font-medium rounded-br-none' 
                    : 'bg-white/5 border border-white/10 text-white rounded-bl-none'
                }`}
              >
                {msg.text}
                <div className={`text-[8px] mt-1 opacity-40 font-mono uppercase ${isMe ? 'text-black' : 'text-white'}`}>
                  {msg.timestamp?.toDate ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="p-4 bg-white/5 border-t border-white/10">
        <div className="relative flex gap-2">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-cyan-500/50 transition-all font-mono"
          />
          <button 
            type="submit"
            disabled={!input.trim()}
            className="w-12 h-12 flex items-center justify-center bg-cyan-500 text-black rounded-xl hover:bg-cyan-400 disabled:opacity-30 transition-all shadow-lg"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
