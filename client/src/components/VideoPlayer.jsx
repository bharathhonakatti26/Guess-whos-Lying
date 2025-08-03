import React, { useContext, useEffect, useRef, useState } from "react";
import { SocketContext } from "../Context";

// Individual user video component for rooms
const UserVideo = ({ userCode, userName, isOwnVideo = false }) => {
  const { userVideos, stream, me, socket } = useContext(SocketContext);
  const [displayName, setDisplayName] = useState(userName || `User ${userCode}`);
  const videoRef = useRef();

  useEffect(() => {
    if (!userName && userCode && !isOwnVideo && socket) {
      // Try to get the user name from server
      socket.emit("getUserName", { userCode }, (response) => {
        if (response.success && response.userName) {
          setDisplayName(response.userName);
        }
      });
    } else if (userName) {
      setDisplayName(userName);
    }
  }, [userName, userCode, isOwnVideo, socket]);

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
    <div className="user-video">
      <video
        ref={videoRef}
        autoPlay
        muted={isOwnVideo}
        className="video-element"
        style={{ minHeight: '200px' }}
      />
      <div className="video-label">
        {isOwnVideo ? `${userName || 'You'} (${me})` : displayName}
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
      <div className="video-container">
        <div 
          className={`video-grid ${
            gridCols === 1 ? 'cols-1' : 
            gridCols === 2 ? 'cols-2' : 
            'cols-3'
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
          <div className="waiting-message">
            Waiting for more participants... ({totalUsers}/6)
          </div>
        )}
      </div>
    );
  }

  // Legacy 1-on-1 video layout
  return (
    <div className="legacy-video-container">
      <div className="legacy-video-section">
        <div className="legacy-video-header">
          <h4 className="legacy-user-name">{name === "" ? `You` : `${name} (You)`}</h4>
          <h4 className="legacy-user-id">
            ID: {me}
          </h4>
        </div>
        {stream && (
          <video 
            className="legacy-video video-element" 
            muted 
            ref={myVideo} 
            autoPlay 
            width="400" 
          />
        )}
      </div>
      
      {callAccepted && !callEnded && (
        <div className="legacy-video-section">
          <div className="legacy-video-header">
            <h4 className="legacy-user-name">{call.name || "Unknown"}</h4>
          </div>
          <video 
            className="legacy-video video-element" 
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
