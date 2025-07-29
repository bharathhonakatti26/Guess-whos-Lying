import React, { useContext, useState } from "react";
import { SocketContext } from "../Context";
import { BiSolidPhoneCall, BiSolidPhoneOff } from "react-icons/bi";
import { MdMeetingRoom, MdExitToApp } from "react-icons/md";
import { FiCopy } from "react-icons/fi";
import { CopyToClipboard } from "react-copy-to-clipboard";

function Options() {
  const { 
    me, 
    callAccepted, 
    name, 
    setName, 
    callEnded, 
    leaveCall, 
    callUser,
    // Room-based calling
    inRoom,
    roomCode,
    roomUsers,
    createRoom,
    joinRoom,
    leaveRoom
  } = useContext(SocketContext);
  
  const [idToCall, setIdToCall] = useState("");
  const [roomCodeToJoin, setRoomCodeToJoin] = useState("");
  const [showLegacyCall, setShowLegacyCall] = useState(false);

  // If in a room, show room controls
  if (inRoom) {
    return (
      <div className="flex flex-col gap-4 mt-2 justify-center items-center">
        <div className="flex flex-col items-center gap-2 p-4 border-2 border-green-200 rounded-xl bg-green-50">
          <h3 className="text-lg font-semibold text-green-800">Room Active</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-green-700">Room Code:</span>
            <span className="font-mono text-lg font-bold text-green-800 bg-white px-3 py-1 rounded border">
              {roomCode}
            </span>
            <CopyToClipboard text={roomCode}>
              <button className="p-2 text-green-700 hover:text-green-900 hover:bg-green-100 rounded">
                <FiCopy size={16} />
              </button>
            </CopyToClipboard>
          </div>
          <p className="text-sm text-green-600">
            {roomUsers.length} / 6 participants
          </p>
        </div>
        
        <button
          className="btn-red-grad"
          onClick={leaveRoom}
        >
          <span className="flex gap-2 justify-center items-center">
            <MdExitToApp />
            Leave Room
          </span>
        </button>
      </div>
    );
  }

  // If in a legacy call, show call controls
  if (callAccepted && !callEnded) {
    return (
      <div className="flex gap-2 mt-2 justify-center">
        <button
          className="btn-red-grad"
          onClick={leaveCall}
        >
          <span className="flex gap-2 justify-center items-center">
            <BiSolidPhoneOff />
            End Call
          </span>
        </button>
      </div>
    );
  }

  // Main options screen
  return (
    <div className="flex flex-col gap-4 mt-2 justify-center items-center max-w-md mx-auto">
      {/* Name input */}
      <input
        className="w-full px-4 py-2 border rounded-md outline-blue-400 shadow-inner"
        placeholder="Your Name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      {/* Room options */}
      <div className="w-full space-y-3">
        <h3 className="text-center text-lg font-semibold text-gray-700">
          Room-Based Video Call (up to 6 people)
        </h3>
        
        <button
          className="w-full btn-blue-grad"
          onClick={createRoom}
        >
          <span className="flex gap-2 justify-center items-center">
            <MdMeetingRoom />
            Create New Room
          </span>
        </button>

        <div className="flex gap-2">
          <input
            className="flex-1 px-4 py-2 border rounded-md outline-blue-400 shadow-inner"
            placeholder="Enter Room Code"
            type="text"
            value={roomCodeToJoin}
            onChange={(e) => setRoomCodeToJoin(e.target.value.toUpperCase())}
            maxLength={6}
          />
          <button
            className="btn-blue-grad"
            onClick={() => joinRoom(roomCodeToJoin)}
          >
            Join
          </button>
        </div>
      </div>

      {/* Divider */}
      <div className="w-full flex items-center gap-3">
        <div className="flex-1 h-px bg-gray-300"></div>
        <span className="text-sm text-gray-500">OR</span>
        <div className="flex-1 h-px bg-gray-300"></div>
      </div>

      {/* Legacy 1-on-1 calling */}
      <div className="w-full space-y-3">
        <button
          className="text-sm text-blue-600 hover:text-blue-800 underline"
          onClick={() => setShowLegacyCall(!showLegacyCall)}
        >
          {showLegacyCall ? "Hide" : "Show"} 1-on-1 Calling (Legacy)
        </button>

        {showLegacyCall && (
          <div className="flex gap-2">
            <input
              className="flex-1 px-4 py-2 border rounded-md outline-blue-400 shadow-inner"
              placeholder="User ID to call"
              type="text"
              value={idToCall}
              onChange={(e) => setIdToCall(e.target.value)}
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
    </div>
  );
}

export default Options;
