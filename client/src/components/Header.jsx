import React, { useContext } from "react";
import { SocketContext } from "../Context";

function Header() {
  const { inRoom, roomCode } = useContext(SocketContext);
  
  return (
    <div className="bg-gradient-to-b from-indigo-300 via-30% via-blue-200 text-center text-2xl font-light p-4">
      <div>
        Multi-Player Video <b>Chat</b>
      </div>
      {inRoom && (
        <div className="text-sm font-normal mt-1 text-indigo-800">
          Room: <span className="font-mono font-bold">{roomCode}</span>
        </div>
      )}
    </div>
  );
}

export default Header;
