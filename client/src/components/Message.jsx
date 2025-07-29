import React from "react";

function Message({ data, isOwnMessage, senderName }) {
  return (
    <div className={`message-container ${isOwnMessage ? "message-container-end" : "message-container-start"}`}>
      {!isOwnMessage && senderName && (
        <span className="sender-name">
          {senderName}
        </span>
      )}
      <p className={isOwnMessage ? "ownMessage" : "othersMessage"}>
        {data}
      </p>
    </div>
  );
}

export default Message;
