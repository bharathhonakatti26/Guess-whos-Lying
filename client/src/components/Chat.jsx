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
    <div className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} mb-2`}>
      <div
        className={`max-w-xs px-3 py-2 rounded-lg ${
          isOwnMessage
            ? "bg-blue-500 text-white"
            : "bg-gray-200 text-gray-800"
        }`}
      >
        {!isOwnMessage && (
          <div className="text-xs font-semibold mb-1">
            {displayName}
          </div>
        )}
        <div className="text-sm">{message}</div>
        <div className={`text-xs mt-1 ${isOwnMessage ? "text-blue-100" : "text-gray-500"}`}>
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
    <div className="absolute bottom-0 w-full">
      <div className="flex flex-col gap-2 p-3 px-5 max-h-72 sm:max-h-52 md:max-h-48 overflow-auto bg-white bg-opacity-95">
        {currentRoom && (
          <div className="text-center text-xs text-gray-500 border-b pb-2 mb-2">
            Room Chat
          </div>
        )}
        {messageList}
        <div ref={scrollDummyDiv}></div>
      </div>
      
      <div className="flex w-full justify-center border bg-slate-50 p-3">
        <input
          className="w-full p-2 px-4 py-2 border rounded-md outline-blue-400 shadow-inner"
          type="text"
          placeholder={currentRoom ? "Type a message to the room ✍️" : "Type your message ✍️"}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
        />
        <button
          className="ml-2 px-4 py-2 bg-gradient-to-tr from-indigo-600 to-blue-500 text-white shadow-lg shadow-indigo-300 rounded-md font-semibold text-sm active:from-indigo-700 active:to-blue-600"
          onClick={handleSendMessage}
        >
          <span className="flex gap-2 justify-center items-center">
            <LuSend />
            Send
          </span>
        </button>
      </div>
    </div>
  );
}

export default Chat;
