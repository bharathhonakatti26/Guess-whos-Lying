import React, { useContext, useEffect, useRef } from "react";
import { SocketContext } from "../Context";

// Individual user video component for rooms
const UserVideo = ({ userCode, userName, isOwnVideo = false }) => {
  const { userVideos, stream, me } = useContext(SocketContext);
  const videoRef = useRef();

  useEffect(() => {
    if (isOwnVideo && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    } else if (!isOwnVideo) {
      // Register this video element for the user
      userVideos.current.set(userCode, videoRef);
      
      return () => {
        userVideos.current.delete(userCode);
      };
    }
  }, [userCode, stream, isOwnVideo, userVideos]);

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        muted={isOwnVideo}
        className="w-full h-full object-cover video-element"
        style={{ minHeight: '200px' }}
      />
      <div className="absolute bottom-2 left-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-sm">
        {isOwnVideo ? `${userName || 'You'} (${me})` : `User ${userCode}`}
      </div>
    </div>
  );
};

function VideoPlayer() {
  const { 
    me, 
    name, 
    callAccepted, 
    myVideo, 
    userVideo, 
    callEnded, 
    stream, 
    call,
    currentRoom,
    roomUsers
  } = useContext(SocketContext);

  useEffect(() => {
    if (myVideo && myVideo.current && stream) {
      myVideo.current.srcObject = stream;
    }
  }, [stream, myVideo]);

  // Room video layout
  if (currentRoom) {
    const totalUsers = roomUsers.length;
    const gridCols = totalUsers <= 2 ? 1 : totalUsers <= 4 ? 2 : 3;
    
    return (
      <div className="w-full max-w-6xl mx-auto p-4">
        <div 
          className={`grid gap-4 ${
            gridCols === 1 ? 'grid-cols-1' : 
            gridCols === 2 ? 'grid-cols-1 md:grid-cols-2' : 
            'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
          }`}
        >
          {/* My video */}
          <UserVideo 
            userCode={me} 
            userName={name} 
            isOwnVideo={true} 
          />
          
          {/* Other users' videos */}
          {roomUsers
            .filter(user => user.userCode !== me)
            .map(user => (
              <UserVideo 
                key={user.userCode}
                userCode={user.userCode}
                userName={user.userName}
                isOwnVideo={false}
              />
            ))
          }
        </div>
        
        {totalUsers < 6 && (
          <div className="text-center mt-4 text-gray-500 text-sm">
            Waiting for more participants... ({totalUsers}/6)
          </div>
        )}
      </div>
    );
  }

  // Legacy 1-on-1 video layout
  return (
    <div className="flex justify-center gap-3">
      <div className="flex flex-col gap-1">
        <div className="flex items-baseline gap-2">
          <h4 className="text-sm font-medium">{name === "" ? `You` : `${name} (You)`}</h4>
          <h4 className="font-mono text-xs text-gray-700 bg-gradient-to-r from-indigo-200 to-blue-100 px-2 rounded">
            ID: {me}
          </h4>
        </div>
        {stream && (
          <video 
            className="rounded-xl video-element" 
            muted 
            ref={myVideo} 
            autoPlay 
            width="400" 
          />
        )}
      </div>
      
      {callAccepted && !callEnded && (
        <div className="flex flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <h4 className="text-sm font-medium">{call.name || "Unknown"}</h4>
          </div>
          <video 
            className="rounded-xl video-element" 
            ref={userVideo} 
            autoPlay 
            width="400" 
          />
        </div>
      )}
    </div>
  );
}

export default VideoPlayer;
