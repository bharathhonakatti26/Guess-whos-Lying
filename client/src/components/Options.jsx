import React, { useContext, useState } from "react";
import { SocketContext } from "../Context";
import { BiSolidPhoneCall, BiSolidPhoneOff, BiPlus, BiLogIn, BiCopy } from "react-icons/bi";
import { CopyToClipboard } from "react-copy-to-clipboard";

function Options() {
  const { 
    me, 
    name, 
    setName, 
    isInRoom, 
    roomCode, 
    roomUsers,
    createRoom, 
    joinRoom, 
    leaveRoom,
    roomError,
    setRoomError,
    // Legacy 1-on-1 support
    callAccepted, 
    callEnded, 
    leaveCall, 
    callUser 
  } = useContext(SocketContext);
  
  const [idToCall, setIdToCall] = useState("");
  const [roomCodeToJoin, setRoomCodeToJoin] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isInRoom) {
    return (
      <div className="options-container">
        {/* Room Info */}
        <div className="room-info-container">
          <h3 className="room-title">Room: {roomCode}</h3>
          <div className="room-share-container">
            <span className="room-share-label">Share this code:</span>
            <CopyToClipboard text={roomCode} onCopy={handleCopy}>
              <button className="copy-button">
                <BiCopy />
                {copied ? "Copied!" : roomCode}
              </button>
            </CopyToClipboard>
          </div>
          <div className="room-players-count">
            Players in room: {roomUsers.length + 1}/6
          </div>
        </div>

        {/* Room Users */}
        <div className="users-container">
          <div className="user-badge-own">
            {name} (You)
          </div>
          {roomUsers.map(user => (
            <div key={user.id} className="user-badge-other">
              {user.name}
            </div>
          ))}
        </div>

        {/* Leave Room Button */}
        <button
          className="btn-red-grad"
          onClick={leaveRoom}
        >
          <span className="button-icon-content">
            <BiSolidPhoneOff />
            Leave Room
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="options-container">
      {/* Name Input */}
      <div className="input-group">
        <input
          className="input-field"
          placeholder="Your Name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      {/* Room Error */}
      {roomError && (
        <div className="error-message">
          {roomError}
          <button 
            onClick={() => setRoomError("")}
            className="error-close"
          >
            ×
          </button>
        </div>
      )}

      {/* Room Options */}
      <div className="room-section">
        <h3 className="section-title">Join a Room</h3>
        
        {/* Create Room */}
        <button
          className="btn-blue-grad"
          onClick={createRoom}
          disabled={!name.trim()}
        >
          <span className="button-icon-content">
            <BiPlus />
            Create New Room
          </span>
        </button>

        {/* Join Room */}
        <div className="input-with-button">
          <input
            className="input-field"
            placeholder="Enter Room Code"
            type="text"
            value={roomCodeToJoin}
            onChange={(e) => setRoomCodeToJoin(e.target.value.toUpperCase())}
            maxLength={6}
          />
          <button
            className="btn-blue-grad"
            onClick={() => joinRoom(roomCodeToJoin)}
            disabled={!name.trim() || !roomCodeToJoin.trim()}
          >
            <span className="button-icon-content">
              <BiLogIn />
              Join
            </span>
          </button>
        </div>
      </div>

      {/* Legacy 1-on-1 Call Support */}
      <div className="legacy-section">
        <h3 className="legacy-title">Or use legacy 1-on-1 calling</h3>
        {callAccepted && !callEnded ? (
          <button
            className="btn-red-grad"
            onClick={leaveCall}
          >
            <span className="button-icon-content">
              <BiSolidPhoneOff />
              End Call
            </span>
          </button>
        ) : (
          <div className="input-with-button">
            <input
              className="input-field"
              placeholder="User ID to call"
              type="text"
              value={idToCall}
              onChange={(e) => setIdToCall(e.target.value)}
            />
            <button
              className="btn-blue-grad"
              onClick={() => callUser(idToCall)}
              disabled={!idToCall.trim()}
            >
              <span className="button-icon-content">
                <BiSolidPhoneCall />
                Call
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Options;
