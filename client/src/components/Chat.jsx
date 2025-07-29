import React, { useContext, useEffect, useRef, useState } from "react";
import { SocketContext } from "../Context";
import Message from "./Message";
import { LuSend } from "react-icons/lu";

function Chat() {
  const [message, setMessage] = useState("");
  const scrollDummyDiv = useRef(null);
  
  useEffect(() => {
    if (scrollDummyDiv.current) {
      scrollDummyDiv.current.scrollIntoView({ behavior: "smooth" });
    }
  });

  const { 
    msgs, 
    sendMessage, 
    isInRoom,
    // Legacy 1-on-1 support
    callAccepted, 
    callEnded 
  } = useContext(SocketContext);

  const messageList = msgs.length > 0 
    ? msgs.map(({ data, isOwnMessage, id, senderName }) => {
        return (
          <Message 
            key={id} 
            data={data} 
            isOwnMessage={isOwnMessage} 
            senderName={senderName}
          />
        );
      })
    : null;

  const handleSendMessage = () => {
    if (message.trim() !== "") {
      sendMessage(message);
      setMessage("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  // Show chat for room users or legacy 1-on-1 calls
  const showChat = isInRoom || (callAccepted && !callEnded);

  return (
    <>
      {showChat && (
        <div className="chat-container">
          {/* Chat Header */}
          <div className="chat-header">
            <h4 className="chat-title">
              {isInRoom ? "Room Chat" : "Chat"}
            </h4>
          </div>

          {/* Messages */}
          <div className="chat-messages">
            {messageList}
            <div ref={scrollDummyDiv}></div>
          </div>

          {/* Message Input */}
          <div className="chat-input-container">
            <input
              className="chat-input"
              type="text"
              placeholder="Type your message ✍️"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <button
              className="chat-send-button"
              onClick={handleSendMessage}
            >
              <span className="send-button-content">
                <LuSend />
                Send
              </span>
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default Chat;
