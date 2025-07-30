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
      <div className="flex flex-col gap-4 mt-4 p-4 bg-gray-50 rounded-lg">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-800">Room: {currentRoom}</h3>
          <p className="text-sm text-gray-600">Your ID: {me}</p>
          <p className="text-sm text-gray-600">
            Participants: {roomUsers.length}/6 {isHost && "(You are the host)"}
          </p>
        </div>
        
        <div className="flex gap-2 justify-center">
          <button
            className="btn-blue-grad flex items-center gap-2"
            onClick={() => copyToClipboard(currentRoom)}
          >
            <MdContentCopy />
            Copy Room Code
          </button>
          <button
            className="btn-red-grad flex items-center gap-2"
            onClick={leaveRoom}
          >
            <MdExitToApp />
            Leave Room
          </button>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          {roomUsers.map((user, index) => (
            <div key={user.userCode} className="bg-white p-2 rounded border">
              <span className="font-medium">{user.userName || `User ${user.userCode}`}</span>
              {user.isHost && <span className="text-blue-600 ml-1">(Host)</span>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 mt-4">
      {/* User Information */}
      <div className="text-center p-3 bg-blue-50 rounded-lg">
        <p className="text-sm text-gray-600">Your ID:</p>
        <div className="flex items-center justify-center gap-2">
          <span className="text-2xl font-bold text-blue-600">{me}</span>
          {me && (
            <button
              className="p-1 text-blue-600 hover:bg-blue-100 rounded"
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
          <span className="flex gap-2 justify-center items-center">
            <BiSolidPhoneOff />
            End Call
          </span>
        </button>
      ) : (
        <>
          {/* Name Input */}
          <input
            className="px-4 py-2 border rounded-md outline-blue-400 shadow-inner"
            placeholder="Your Name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {/* Room Options */}
          <div className="flex flex-col gap-3">
            <h3 className="text-lg font-semibold text-center flex items-center justify-center gap-2">
              <MdGroups />
              6-Person Room
            </h3>
            
            <button
              className="btn-green-grad"
              onClick={handleCreateRoom}
            >
              Create New Room
            </button>
            
            <div className="flex gap-2">
              <input
                className="px-4 py-2 border rounded-md outline-blue-400 shadow-inner flex-1"
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
          <div className="mt-6 pt-4 border-t border-gray-200">
            <button
              className="text-sm text-gray-500 hover:text-gray-700 mb-2"
              onClick={() => setShowLegacyCall(!showLegacyCall)}
            >
              {showLegacyCall ? "Hide" : "Show"} 1-on-1 Call Option
            </button>
            
            {showLegacyCall && (
              <div className="flex gap-2">
                <input
                  className="px-4 py-2 border rounded-md outline-blue-400 shadow-inner flex-1"
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
                  <span className="flex gap-2 justify-center items-center">
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
