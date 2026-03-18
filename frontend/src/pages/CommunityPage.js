import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import AppHeader from '../components/layout/AppHeader';
import styles from './CommunityPage.module.css';

const CommunityPage = () => {
  const { user } = useAuth();
  const { communityMessages, sendMessage, socket, onlineCount } = useSocket();
  const [text, setText]           = useState('');
  const [isAnon, setIsAnon]       = useState(false);
  const [typing, setTyping]       = useState([]);
  const [typingTimer, setTypingTimer] = useState(null);
  const bottomRef = useRef(null);

  // Auto-scroll to latest
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [communityMessages]);

  // Typing indicator
  useEffect(() => {
    if (!socket) return;
    socket.on('user_typing', ({ userId, userName }) => {
      setTyping((prev) => {
        if (prev.find((t) => t.userId === userId)) return prev;
        return [...prev, { userId, userName }];
      });
    });
    socket.on('user_stop_typing', ({ userId }) => {
      setTyping((prev) => prev.filter((t) => t.userId !== userId));
    });
    return () => {
      socket.off('user_typing');
      socket.off('user_stop_typing');
    };
  }, [socket]);

  const handleInput = (e) => {
    setText(e.target.value);
    if (socket) {
      socket.emit('typing', { isAnonymous: isAnon });
      clearTimeout(typingTimer);
      setTypingTimer(setTimeout(() => socket.emit('stop_typing'), 2000));
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    sendMessage(text.trim(), isAnon);
    setText('');
    if (socket) socket.emit('stop_typing');
  };

  const timeStr = (d) => {
    const dt = new Date(d);
    return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isOwn = (msg) => msg.userId && msg.userId === user?._id?.toString();

  return (
    <div className={styles.page}>
      <AppHeader title="Community Safety Chat" showBack />

      {/* Online bar */}
      <div className={styles.onlineBar}>
        <div className={styles.onlineDot} />
        <span>{onlineCount} women online · Stay connected, stay safe</span>
      </div>

      {/* Notice */}
      <div className={styles.notice}>
        🛡️ This is a safe space. Share safety tips, request help, or report suspicious activity. Be kind and supportive.
      </div>

      {/* Messages */}
      <div className={styles.messages}>
        {communityMessages.length === 0 && (
          <div className={styles.emptyChat}>
            <span>💬</span>
            <p>No messages yet. Be the first to share a safety update!</p>
          </div>
        )}

        {communityMessages.map((msg) => {
          const own = isOwn(msg);
          return (
            <div key={msg.id} className={`${styles.msgRow} ${own ? styles.msgRowOwn : ''}`}>
              {!own && (
                <div className={styles.msgAvatar}>
                  {msg.isAnonymous ? '?' : msg.userName?.charAt(0) || '?'}
                </div>
              )}
              <div className={`${styles.bubble} ${own ? styles.bubbleOwn : ''}`}>
                {!own && (
                  <span className={styles.senderName}>
                    {msg.isAnonymous ? 'Anonymous' : msg.userName}
                  </span>
                )}
                <p className={styles.msgText}>{msg.text}</p>
                <span className={styles.msgTime}>{timeStr(msg.timestamp)}</span>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {typing.length > 0 && (
          <div className={styles.typingIndicator}>
            <div className={styles.typingDots}>
              <div /><div /><div />
            </div>
            <span>
              {typing.map((t) => t.userName).join(', ')}
              {typing.length === 1 ? ' is' : ' are'} typing...
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className={styles.inputArea}>
        <div className={styles.anonRow}>
          <label className={styles.anonLabel} onClick={() => setIsAnon((v) => !v)}>
            <div className={`${styles.miniToggle} ${isAnon ? styles.miniToggleOn : ''}`}>
              <div className={styles.miniKnob} />
            </div>
            <span>Anonymous</span>
          </label>
        </div>
        <form onSubmit={handleSend} className={styles.inputRow}>
          <input
            className={styles.chatInput}
            placeholder="Share a safety update..."
            value={text}
            onChange={handleInput}
            maxLength={500}
          />
          <button className={styles.sendBtn} type="submit" disabled={!text.trim()}>
            ➤
          </button>
        </form>
      </div>
    </div>
  );
};

export default CommunityPage;
