import React, { useContext, useState } from "react";
import { SocketContext } from "../Context";
import { BiSolidPhoneCall, BiSolidPhoneOff } from "react-icons/bi";
import { MdContentCopy, MdGroups, MdExitToApp } from "react-icons/md";

function Options() {
  const { 
    me, 
    callAccepted, 
    name, 
    setName, 
    callEnded, 
    leaveCall, 
    callUser,
    currentRoom,
    roomUsers,
    isHost,
    createRoom,
    joinRoom,
    leaveRoom
  } = useContext(SocketContext);
  
  const [idToCall, setIdToCall] = useState("");
  const [roomCodeToJoin, setRoomCodeToJoin] = useState("");
  const [showLegacyCall, setShowLegacyCall] = useState(false);

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert(`Copied: ${text}`);
  };

  const handleCreateRoom = () => {
    if (!name.trim()) {
      alert("Please enter your name first");
      return;
    }
    createRoom(name);
  };

  const handleJoinRoom = () => {
    if (!name.trim()) {
      alert("Please enter your name first");
      return;
    }
    if (!roomCodeToJoin.trim()) {
      alert("Please enter a room code");
      return;
    }
    joinRoom(roomCodeToJoin, name);
  };

  if (currentRoom) {
    return (
      <div className="room-info">
        <div className="room-header">
          <h3 className="room-title">Room: {currentRoom}</h3>
          <p className="room-details">Your ID: {me}</p>
          <p className="room-details">
            Participants: {roomUsers.length}/6
          </p>
          {isHost && (
            <p className="host-indicator">🏆 You are the host</p>
          )}
        </div>
        
        <div className="room-controls">
          <button
            className="btn-blue-grad btn-flex-center"
            onClick={() => copyToClipboard(currentRoom)}
          >
            <MdContentCopy />
            Copy Room Code
          </button>
          <button
            className="btn-red-grad btn-flex-center"
            onClick={leaveRoom}
          >
            <MdExitToApp />
            Leave Room
          </button>
        </div>
        
        <div className="room-users">
          {roomUsers.map((user, index) => (
            <div key={user.userCode} className={`user-item ${user.isHost ? 'host' : ''}`}>
              <span className="user-name">{user.userName || `User ${user.userCode}`}</span>
              {user.isHost && <span className="host-crown">👑 Host</span>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="options-container">
      {/* User Information */}
      <div className="user-info">
        <p className="user-info-label">Your ID:</p>
        <div className="user-info-id">
          <span className="user-id">{me}</span>
          {me && (
            <button
              className="copy-button"
              onClick={() => copyToClipboard(me)}
            >
              <MdContentCopy size={16} />
            </button>
          )}
        </div>
      </div>

      {callAccepted && !callEnded ? (
        <button
          className="btn-red-grad"
          onClick={leaveCall}
        >
          <span className="btn-flex-center">
            <BiSolidPhoneOff />
            End Call
          </span>
        </button>
      ) : (
        <>
          {/* Name Input */}
          <input
            className="input-field"
            placeholder="Your Name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {/* Room Options */}
          <div className="room-options">
            <h3 className="room-title-header">
              <MdGroups />
              6-Person Room
            </h3>
            
            <button
              className="btn-green-grad"
              onClick={handleCreateRoom}
            >
              Create New Room
            </button>
            
            <div className="join-room-container">
              <input
                className="join-room-input"
                placeholder="Room Code (6 digits)"
                type="text"
                value={roomCodeToJoin}
                onChange={(e) => setRoomCodeToJoin(e.target.value)}
                maxLength={6}
              />
              <button
                className="btn-blue-grad"
                onClick={handleJoinRoom}
              >
                Join Room
              </button>
            </div>
          </div>

          {/* Legacy 1-on-1 Call Option */}
          <div className="legacy-section">
            <button
              className="legacy-toggle"
              onClick={() => setShowLegacyCall(!showLegacyCall)}
            >
              {showLegacyCall ? "Hide" : "Show"} 1-on-1 Call Option
            </button>
            
            {showLegacyCall && (
              <div className="legacy-call-container">
                <input
                  className="legacy-input"
                  placeholder="User ID to call (4 digits)"
                  type="text"
                  value={idToCall}
                  onChange={(e) => setIdToCall(e.target.value)}
                  maxLength={4}
                />
                <button
                  className="btn-blue-grad"
                  onClick={() => callUser(idToCall)}
                >
                  <span className="btn-flex-center">
                    <BiSolidPhoneCall />
                    Call
                  </span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default Options;
