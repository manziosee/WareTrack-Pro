import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessagesSquare, Send, Search, ArrowLeft } from 'lucide-react';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import api from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useRealtime } from '@/context/RealtimeContext';
import { initials } from '@/utils/formatters';
import { statusLabel } from '@/utils/status';

const when = (d: string) => {
  const date = new Date(d);
  const today = new Date().toDateString() === date.toDateString();
  return today ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

/** Direct messages between team members, delivered live. */
export default function Messages() {
  const { user } = useAuth();
  const { socket } = useRealtime();
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [filter, setFilter] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<number>();

  const { data: convo, isLoading } = useQuery({
    queryKey: ['chat', 'conversations'],
    queryFn: async () => (await api.get('/chat/conversations', { params: { t: Date.now() } })).data,
    refetchInterval: 60_000,
  });
  const conversations: any[] = convo?.data || [];

  const { data: thread = [], isLoading: loadingThread } = useQuery({
    queryKey: ['chat', 'thread', activeId],
    queryFn: async () => (await api.get(`/chat/with/${activeId}`, { params: { t: Date.now() } })).data?.data || [],
    enabled: Boolean(activeId),
  });

  // Opening a thread marks it read on the server; refresh counts
  useEffect(() => {
    if (activeId) {
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      queryClient.invalidateQueries({ queryKey: ['badge', 'unreadMessages'] });
    }
  }, [activeId, thread.length, queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread.length, activeId]);

  useEffect(() => {
    if (!socket) return;
    const onMessage = (m: any) => {
      if (m.senderId === activeId) {
        queryClient.setQueryData(['chat', 'thread', activeId], (old: any[] = []) => [...old, m]);
        api.get(`/chat/with/${activeId}`, { params: { t: Date.now() } }).catch(() => undefined);
      }
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
      queryClient.invalidateQueries({ queryKey: ['badge', 'unreadMessages'] });
    };
    const onTyping = (d: { from: number }) => {
      if (d.from === activeId) {
        setTyping(true);
        window.clearTimeout(typingTimer.current);
        typingTimer.current = window.setTimeout(() => setTyping(false), 2500);
      }
    };
    socket.on('chat:message', onMessage);
    socket.on('chat:typing', onTyping);
    return () => {
      socket.off('chat:message', onMessage);
      socket.off('chat:typing', onTyping);
    };
  }, [socket, activeId, queryClient]);

  const send = async () => {
    const message = text.trim();
    if (!message || !activeId) return;
    setText('');
    const optimistic = { id: `tmp-${Date.now()}`, senderId: user?.id, receiverId: activeId, message, createdAt: new Date().toISOString() };
    queryClient.setQueryData(['chat', 'thread', activeId], (old: any[] = []) => [...old, optimistic]);
    const res = await api.post('/chat/send', { to: activeId, message });
    if (res.data?.success) {
      queryClient.setQueryData(['chat', 'thread', activeId], (old: any[] = []) => old.map((m) => (m.id === optimistic.id ? res.data.data : m)));
      queryClient.invalidateQueries({ queryKey: ['chat', 'conversations'] });
    } else {
      queryClient.setQueryData(['chat', 'thread', activeId], (old: any[] = []) => old.filter((m) => m.id !== optimistic.id));
      setText(message);
    }
  };

  const visible = useMemo(() => conversations.filter((c) => c.user.name.toLowerCase().includes(filter.toLowerCase())), [conversations, filter]);
  const active = conversations.find((c) => c.user.id === activeId);

  return (
    <div>
      <PageHeader title="Messages" subtitle="Chat with dispatch, drivers and the warehouse team" breadcrumbs={[{ label: 'Communication' }]} icon={<MessagesSquare className="h-5 w-5" />} />

      <div className="grid h-[calc(100vh-14rem)] min-h-[480px] grid-cols-1 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-soft md:grid-cols-[20rem_minmax(0,1fr)]">
        {/* Conversation list */}
        <aside className={`flex flex-col border-r border-gray-100 ${activeId ? 'hidden md:flex' : 'flex'}`}>
          <div className="border-b border-gray-100 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Find a person…" className="h-9 w-full rounded-xl border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm outline-none focus:bg-white" />
            </div>
          </div>
          <ul className="flex-1 overflow-y-auto">
            {isLoading && [0, 1, 2, 3].map((i) => <li key={i} className="p-3"><Skeleton className="h-12 w-full" /></li>)}
            {visible.map((c) => (
              <li key={c.user.id}>
                <button onClick={() => setActiveId(c.user.id)} className={`flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-gray-50 ${activeId === c.user.id ? 'bg-primary-50/70' : ''}`}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-accent-500 text-xs font-bold text-white">{initials(c.user.name)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className={`truncate text-sm ${c.unread ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>{c.user.name}</span>
                      {c.lastMessage && <span className="shrink-0 text-[10px] text-gray-400">{when(c.lastMessage.at)}</span>}
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-gray-500">{c.lastMessage ? `${c.lastMessage.mine ? 'You: ' : ''}${c.lastMessage.text}` : statusLabel(c.user.role)}</span>
                      {c.unread > 0 && <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent-500 px-1.5 text-[10px] font-bold text-white">{c.unread}</span>}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* Thread */}
        <section className={`flex min-w-0 flex-col ${activeId ? 'flex' : 'hidden md:flex'}`}>
          {!active ? (
            <div className="flex flex-1 items-center justify-center"><EmptyState title="Choose a conversation" description="Pick someone on the left to start chatting." /></div>
          ) : (
            <>
              <header className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
                <button onClick={() => setActiveId(null)} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 md:hidden" aria-label="Back"><ArrowLeft className="h-4 w-4" /></button>
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary-400 to-accent-500 text-xs font-bold text-white">{initials(active.user.name)}</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{active.user.name}</p>
                  <p className="text-xs text-gray-500">{typing ? <span className="text-accent-600">typing…</span> : statusLabel(active.user.role)}</p>
                </div>
              </header>
              <div className="flex-1 space-y-2 overflow-y-auto bg-gray-50/60 p-4">
                {loadingThread && <Skeleton className="h-16 w-2/3" />}
                {!loadingThread && thread.length === 0 && <p className="py-10 text-center text-sm text-gray-500">No messages yet. Say hello 👋</p>}
                {thread.map((m: any) => {
                  const mine = m.senderId === user?.id;
                  return (
                    <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm ${mine ? 'rounded-br-md bg-primary-500 text-white' : 'rounded-bl-md bg-white text-gray-800'}`}>
                        <p className="whitespace-pre-wrap break-words">{m.message}</p>
                        <p className={`mt-0.5 text-right text-[10px] ${mine ? 'text-white/70' : 'text-gray-400'}`}>{when(m.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex items-end gap-2 border-t border-gray-100 p-3">
                <textarea
                  value={text}
                  onChange={(e) => { setText(e.target.value); socket?.emit('chat:typing', { to: activeId }); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                  rows={1}
                  placeholder="Write a message…"
                  className="max-h-32 min-h-[2.5rem] flex-1 resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-primary-300 focus:ring-2 focus:ring-primary-100"
                />
                <button type="submit" disabled={!text.trim()} className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500 text-white shadow-glow transition hover:bg-primary-600 disabled:opacity-40" aria-label="Send"><Send className="h-4 w-4" /></button>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
