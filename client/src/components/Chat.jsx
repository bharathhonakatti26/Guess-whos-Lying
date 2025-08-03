import React, { useContext, useEffect, useRef, useState } from "react";
import { SocketContext } from "../Context";
import Message from "./Message";
import { BiSend } from "react-icons/bi";
import { LuSend } from "react-icons/lu";

// Room Message Component
const RoomMessage = ({ message, userName, userCode, timestamp, isOwnMessage }) => {
  const [displayName, setDisplayName] = useState(userName || `User ${userCode}`);
  const { socket } = useContext(SocketContext);

  useEffect(() => {
    if (!userName && userCode && socket) {
      // Try to get the user name from server
      socket.emit("getUserName", { userCode }, (response) => {
        if (response.success && response.userName) {
          setDisplayName(response.userName);
        }
      });
    } else if (userName) {
      setDisplayName(userName);
    }
  }, [userName, userCode, socket]);

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`message-container ${isOwnMessage ? "own" : "other"}`}>
      <div
        className={`message-bubble ${
          isOwnMessage ? "own" : "other"
        }`}
      >
        {!isOwnMessage && (
          <div className="message-sender">
            {displayName}
          </div>
        )}
        <div className="message-text">{message}</div>
        <div className={`message-time ${isOwnMessage ? "own" : "other"}`}>
          {formatTime(timestamp)}
        </div>
      </div>
    </div>
  );
};

// Chat works for both P2P connections (legacy) and room connections
function Chat() {
  const [message, setMessage] = useState("");
  const scrollDummyDiv = useRef(null);
  
  const { 
    msgs, 
    callAccepted, 
    callEnded, 
    sendMessage,
    currentRoom,
    roomMessages,
    sendRoomMessage
  } = useContext(SocketContext);

  useEffect(() => {
    if (scrollDummyDiv.current) {
      scrollDummyDiv.current.scrollIntoView({ behavior: "smooth" });
    }
  });

  const handleSendMessage = () => {
    if (message.trim() === "") return;
    
    if (currentRoom) {
      sendRoomMessage(message);
    } else if (callAccepted && !callEnded) {
      sendMessage(message);
    }
    
    setMessage("");
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  // Show chat if in a room or in a 1-on-1 call
  const showChat = currentRoom || (callAccepted && !callEnded);
  
  if (!showChat) return null;

  // Render messages based on context (room vs 1-on-1)
  const messageList = currentRoom
    ? roomMessages.map((msg, index) => (
        <RoomMessage
          key={index}
          message={msg.message}
          userName={msg.userName}
          userCode={msg.userCode}
          timestamp={msg.timestamp}
          isOwnMessage={msg.isOwnMessage}
        />
      ))
    : msgs.length > 0
    ? msgs.map(({ data, isOwnMessage, id }) => (
        <Message key={id} data={data} isOwnMessage={isOwnMessage} />
      ))
    : null;

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {currentRoom && (
          <div className="chat-room-header">
            Room Chat
          </div>
        )}
        {messageList}
        <div ref={scrollDummyDiv}></div>
      </div>
      
      <div className="chat-input-container">
        <input
          className="chat-input"
          type="text"
          placeholder={currentRoom ? "Type a message to the room ✍️" : "Type your message ✍️"}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <button
          className="btn-primary"
          onClick={handleSendMessage}
        >
          <span className="btn-flex-center">
            <LuSend />
            Send
          </span>
        </button>
      </div>
    </div>
  );
}

export default Chat;
