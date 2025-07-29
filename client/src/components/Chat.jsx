import React, { useContext, useEffect, useRef, useState } from "react";
import { SocketContext } from "../Context";
import Message from "./Message";
import { LuSend } from "react-icons/lu";

function Chat() {
  const [message, setMessage] = useState("");
  const scrollDummyDiv = useRef(null);
  
  const { 
    msgs, 
    callAccepted, 
    callEnded, 
    sendMessage,
    // Room-based messaging
    inRoom,
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
    
    if (inRoom) {
      sendRoomMessage(message);
    } else {
      sendMessage(message);
    }
    setMessage("");
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  // Room-based chat
  if (inRoom) {
    const roomMessageList = roomMessages.length > 0
      ? roomMessages.map((msg) => (
          <RoomMessage 
            key={msg.id} 
            data={msg.data} 
            userName={msg.userName}
            isOwnMessage={msg.isOwnMessage} 
          />
        ))
      : null;

    return (
      <div className="absolute bottom-0 w-full">
        <div className="flex flex-col gap-2 p-3 px-5 max-h-72 sm:max-h-52 md:max-h-48 overflow-auto">
          {roomMessageList}
          <div ref={scrollDummyDiv}></div>
        </div>
        <div className="flex w-full justify-center border bg-slate-50 p-3">
          <input
            className="w-full p-2 px-4 py-2 border rounded-md outline-blue-400 shadow-inner"
            type="text"
            placeholder="Type your message ✍️"
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

  // Legacy 1-on-1 chat
  const messageList = msgs.length > 0
    ? msgs.map(({ data, isOwnMessage, id }) => (
        <Message key={id} data={data} isOwnMessage={isOwnMessage} />
      ))
    : null;

  return (
    <>
      {callAccepted && !callEnded && (
        <div className="absolute bottom-0 w-full">
          <div className="flex flex-col gap-2 p-3 px-5 max-h-72 sm:max-h-52 md:max-h-48 overflow-auto">
            {messageList}
            <div ref={scrollDummyDiv}></div>
          </div>
          <div className="flex w-full justify-center border bg-slate-50 p-3">
            <input
              className="w-full p-2 px-4 py-2 border rounded-md outline-blue-400 shadow-inner"
              type="text"
              placeholder="Type your message ✍️"
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
      )}
    </>
  );
}

// Component for room messages (includes sender name)
function RoomMessage({ data, userName, isOwnMessage }) {
  return (
    <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
      {!isOwnMessage && (
        <span className="text-xs text-gray-500 mb-1 px-1">{userName}</span>
      )}
      <p className={isOwnMessage ? "ownMessage" : "othersMessage"}>{data}</p>
    </div>
  );
}

export default Chat;
