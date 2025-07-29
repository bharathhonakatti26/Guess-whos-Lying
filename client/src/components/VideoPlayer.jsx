import React, { useContext, useEffect, useRef } from "react";
import { SocketContext } from "../Context";

function VideoPlayer() {
  const { 
    me, 
    name, 
    myVideo, 
    stream, 
    isInRoom,
    peers,
    roomUsers,
    // Legacy 1-on-1 support
    callAccepted, 
    userVideo, 
    callEnded, 
    call 
  } = useContext(SocketContext);

  useEffect(() => {
    if(myVideo && myVideo.current && stream){
      myVideo.current.srcObject = stream;
    }
  }, [stream]);

  if (isInRoom) {
    return (
      <div className="video-player-room-container">
        <h2 className="video-conference-title">Video Conference</h2>
        
        {/* Video Grid */}
        <div className="video-grid">
          {/* My Video */}
          <div className="video-slot">
            <div className="video-header">
              <h4 className="user-name-green">
                {name === "" ? `You` : `${name} (You)`}
              </h4>
              <h4 className="user-id-badge-green">
                ID: {me}
              </h4>
            </div>
            {/* {stream && (
              <video 
                className="video-element-green" 
                muted 
                ref={myVideo} 
                autoPlay 
                width="300" 
                height="200"
              />
            )} */}
          </div>

          {/* Other Users' Videos */}
          {peers.map((peer, index) => (
            <Video key={peer.peerID} peer={peer.peer} name={peer.name} />
          ))}

          {/* Empty slots for remaining users */}
          {Array.from({ length: Math.max(0, 5 - peers.length) }, (_, index) => (
            <div 
              key={`empty-${index}`} 
              className="video-slot"
            >
              <div className="video-header">
                <h4 className="user-name-waiting">Waiting for user...</h4>
              </div>
              <div className="empty-slot">
                <span className="empty-slot-text">Empty Slot</span>
              </div>
            </div>
          ))}
        </div>

        {/* Room status */}
        <div className="room-status">
          Connected users: {peers.length + 1}/6
        </div>
      </div>
    );
  }

  // Legacy 1-on-1 video display
  return (
    <div className="legacy-video-container">
      <div className="legacy-video-slot">
        <div className="legacy-video-header">
          <h4 className="user-name-default">{name === "" ? `You` : `${name} (You)`}</h4>
          <h4 className="user-id-badge-blue">
            ID: {me}
          </h4>
        </div>
        {/* {stream && <video className="legacy-video-element" muted ref={myVideo} autoPlay width="400" />} */}
      </div>
      {callAccepted && !callEnded && (
        <div className="legacy-video-slot">
          <div className="legacy-video-header">
            <h4 className="user-name-default">{call.name || "Unknown"}</h4>
          </div>
          {/* <video className="legacy-video-element" ref={userVideo} autoPlay width="400" /> */}
        </div>
      )}
    </div>
  );
}

const Video = ({ peer, name }) => {
  const ref = useRef();

  useEffect(() => {
    peer.on("stream", stream => {
      if (ref.current) {
        ref.current.srcObject = stream;
      }
    });
  }, [peer]);

  return (
    <div className="video-slot">
      <div className="video-header">
        <h4 className="user-name-blue">{name || "Unknown"}</h4>
      </div>
      <video 
        className="video-element-blue" 
        ref={ref} 
        autoPlay 
        width="300" 
        height="200"
      />
    </div>
  );
};

export default VideoPlayer;
