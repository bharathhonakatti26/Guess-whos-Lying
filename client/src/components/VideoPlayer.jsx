import React, { useContext, useEffect, useState } from "react";
import { SocketContext } from "../Context";

// Component for rendering other users' videos
function UserVideo({ user, userVideos }) {
  const videoRef = userVideos.get(user.id);
  const [hasStream, setHasStream] = useState(false);

  useEffect(() => {
    // Update video element when ref changes
    const video = videoRef?.current;
    if (video && video.srcObject) {
      video.play().catch(console.error);
      setHasStream(true);
    } else {
      setHasStream(false);
    }
  }, [videoRef]);

  return (
    <div className="flex flex-col gap-1 w-full max-w-sm">
      <div className="flex items-baseline gap-2">
        <h4 className="text-sm font-medium truncate">{user.name || 'Unknown User'}</h4>
        <h4 className="font-mono text-xs text-gray-700 bg-gradient-to-r from-indigo-200 to-blue-100 px-2 rounded">
          ID: {user.id.slice(-4)}
        </h4>
      </div>
      <div className="relative bg-gray-800 rounded-xl overflow-hidden aspect-video min-h-[200px] video-container">
        <video 
          className="w-full h-full object-cover other-video" 
          ref={(el) => {
            if (el && videoRef && !videoRef.current) {
              videoRef.current = el;
              // Auto-play when element is mounted
              if (el.srcObject) {
                el.play().catch(console.error);
                setHasStream(true);
              }
            }
          }}
          autoPlay 
          playsInline
          muted={false}
        />
        {!hasStream && (
          <div className="video-loading">
            <span>Connecting...</span>
          </div>
        )}
      </div>
    </div>
  );
}

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
    // Room-based calling
    inRoom,
    roomUsers,
    userVideos
  } = useContext(SocketContext);

  useEffect(() => {
    if (myVideo && myVideo.current && stream) {
      myVideo.current.srcObject = stream;
    }
  }, [stream, myVideo]);

  // Room-based video layout
  if (inRoom) {
    return (
      <div className="w-full max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4 justify-items-center">
          {/* My video */}
          <div className="flex flex-col gap-1 w-full max-w-sm">
            <div className="flex items-baseline gap-2">
              <h4 className="text-sm font-medium truncate">{name === "" ? `You` : `${name} (You)`}</h4>
              <h4 className="font-mono text-xs text-gray-700 bg-gradient-to-r from-indigo-200 to-blue-100 px-2 rounded">
                ID: {me.slice(-4)}
              </h4>
            </div>
            <div className="relative bg-gray-800 rounded-xl overflow-hidden aspect-video min-h-[200px]">
              {stream && (
                <video 
                  className="w-full h-full object-cover my-video" 
                  muted 
                  ref={myVideo} 
                  autoPlay 
                  playsInline
                />
              )}
              {!stream && (
                <div className="w-full h-full flex items-center justify-center text-white">
                  <span className="text-sm">Camera Loading...</span>
                </div>
              )}
            </div>
          </div>

          {/* Other users' videos */}
          {roomUsers
            .filter(user => user.id !== me)
            .map((user) => {
              return (
                <UserVideo 
                  key={user.id} 
                  user={user} 
                  userVideos={userVideos}
                />
              );
            })}
        </div>
      </div>
    );
  }

  // Legacy 1-on-1 video layout
  return (
    <div className="flex justify-center gap-4 p-4 flex-wrap">
      <div className="flex flex-col gap-1 w-full max-w-md">
        <div className="flex items-baseline gap-2">
          <h4 className="text-sm font-medium">{name === "" ? `You` : `${name} (You)`}</h4>
          <h4 className="font-mono text-xs text-gray-700 bg-gradient-to-r from-indigo-200 to-blue-100 px-2 rounded">
            ID: {me.slice(-4)}
          </h4>
        </div>
        <div className="relative bg-gray-800 rounded-xl overflow-hidden aspect-video min-h-[250px]">
          {stream && (
            <video 
              className="w-full h-full object-cover my-video" 
              muted 
              ref={myVideo} 
              autoPlay 
              playsInline
            />
          )}
          {!stream && (
            <div className="w-full h-full flex items-center justify-center text-white">
              <span className="text-sm">Camera Loading...</span>
            </div>
          )}
        </div>
      </div>
      {callAccepted && !callEnded && (
        <div className="flex flex-col gap-1 w-full max-w-md">
          <div className="flex items-baseline gap-2">
            <h4 className="text-sm font-medium">{call.name || "Unknown"}</h4>
          </div>
          <div className="relative bg-gray-800 rounded-xl overflow-hidden aspect-video min-h-[250px]">
            <video 
              className="w-full h-full object-cover other-video" 
              ref={userVideo} 
              autoPlay 
              playsInline
              muted={false}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoPlayer;
