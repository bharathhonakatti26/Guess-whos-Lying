import React, { createContext, useState, useRef, useEffect } from "react";
import { io } from "socket.io-client";
import Peer from "simple-peer";

const SocketContext = createContext();
const socket = io("http://localhost:8090");
const ContextProvider = ({ children }) => {
  const [msgs, setMsgs] = useState([]); // [... {data: 'Hi', isOwnMessage: true/false, id} ] Lets the <Chat/> know whether the message is our or is received from the other peer
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [stream, setStream] = useState();
  const [name, setName] = useState("");
  const [call, setCall] = useState({});
  const [me, setMe] = useState(""); // This will now be a 4-digit code

  // Room states
  const [currentRoom, setCurrentRoom] = useState(null);
  const [roomUsers, setRoomUsers] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [roomMessages, setRoomMessages] = useState([]);

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  // Room video management
  const peerConnections = useRef(new Map()); // userCode -> peer connection
  const userVideos = useRef(new Map()); // userCode -> video element ref

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((currentStream) => {
        setStream(currentStream);
        if (myVideo.current) {
          myVideo.current.srcObject = currentStream;
        }
      })
      .catch((err) => {
        console.error(err);
      });

    socket.on("me", (userCode) => setMe(userCode)); // Now receives 4-digit code

    // Legacy 1-on-1 calling
    socket.on("callUser", ({ from, name: callerName, signal }) => {
      setCall({ isReceivingCall: true, from, name: callerName, signal });
    });

    // Room events
    socket.on("roomCreated", ({ roomCode, userCode, userName, isHost, participants }) => {
      setCurrentRoom(roomCode);
      setIsHost(isHost);
      setRoomUsers([{ userCode, userName, isHost }]);
    });

    socket.on("roomJoined", ({ roomCode, userCode, userName, roomUsers, participants, isHost }) => {
      setCurrentRoom(roomCode);
      setIsHost(isHost);
      setRoomUsers(roomUsers.map(user => ({ 
        userCode: user.userCode, 
        userName: userName, 
        isHost: user.isHost 
      })));
      
      // Load previous messages for this room
      loadRoomMessages(roomCode);
    });

    socket.on("userJoined", ({ userCode, userName, roomUsers, participants }) => {
      setRoomUsers(roomUsers.map(user => ({ 
        userCode: user.userCode, 
        userName: userName, 
        isHost: user.isHost 
      })));

      // Initiate peer connection with new user if I'm already in room
      if (currentRoom && userCode !== me) {
        createPeerConnection(userCode, true);
      }
    });

    socket.on("userLeft", ({ userCode, roomUsers, participants }) => {
      // Update room users with the new list from server
      if (roomUsers) {
        setRoomUsers(roomUsers.map(user => ({ 
          userCode: user.userCode, 
          userName: user.userName || name, 
          isHost: user.isHost 
        })));
      } else {
        // Fallback to just removing the user
        setRoomUsers(prev => prev.filter(user => user.userCode !== userCode));
      }

      // Clean up peer connection
      if (peerConnections.current.has(userCode)) {
        peerConnections.current.get(userCode).destroy();
        peerConnections.current.delete(userCode);
        userVideos.current.delete(userCode);
      }
    });
    socket.on("hostTransferred", ({ newHostUserCode, message }) => {
      // Update host status if I'm the new host
      if (newHostUserCode === me) {
        setIsHost(true);
        alert(message);
      }
      
      // Update room users to reflect new host
      setRoomUsers(prev => prev.map(user => ({
        ...user,
        isHost: user.userCode === newHostUserCode
      })));
    });
    
    socket.on("roomUpdated", ({ roomCode, roomUsers, participants }) => {
      if (roomCode === currentRoom) {
        setRoomUsers(roomUsers.map(user => ({ 
          userCode: user.userCode, 
          userName: user.userName || name, 
          isHost: user.isHost 
        })));
      }
    });
    
    socket.on("signal", ({ userCode, signal, roomCode }) => {
      if (roomCode === currentRoom) {
        if (peerConnections.current.has(userCode)) {
          peerConnections.current.get(userCode).signal(signal);
        } else {
          createPeerConnection(userCode, false, signal);
        }
      }
    });

    socket.on("roomMessage", ({ message, userName, userCode, timestamp }) => {
      setRoomMessages(prev => [...prev, { 
        message, 
        userName, 
        userCode, 
        timestamp,
        isOwnMessage: userCode === me 
      }]);
    });

    socket.on("roomError", ({ message }) => {
      alert(message);
    });

    return () => {
      // Cleanup on unmount
      peerConnections.current.forEach(peer => peer.destroy());
      socket.off("me");
      socket.off("callUser");
      socket.off("roomCreated");
      socket.off("roomJoined");
      socket.off("userJoined");
      socket.off("userLeft");
      socket.off("hostTransferred");
      socket.off("roomUpdated");
      socket.off("signal");
      socket.off("roomMessage");
      socket.off("roomError");
    };
  }, [currentRoom, me]);

  // Create peer connection for room users
  const createPeerConnection = (userCode, initiator, incomingSignal = null) => {
    const peer = new Peer({
      initiator,
      trickle: false,
      stream: stream,
    });

    peer.on("signal", (signal) => {
      socket.emit("signal", { userCode, signal, roomCode: currentRoom });
    });

    peer.on("stream", (remoteStream) => {
      // Store the remote stream for this user
      const videoElement = userVideos.current.get(userCode);
      if (videoElement && videoElement.current) {
        videoElement.current.srcObject = remoteStream;
      }
    });

    peer.on("error", (err) => {
      console.error("Peer connection error:", err);
    });

    if (incomingSignal) {
      peer.signal(incomingSignal);
    }

    peerConnections.current.set(userCode, peer);
    return peer;
  };

  // Room functions
  const createRoom = (userName) => {
    socket.emit("createRoom", { userName });
  };

  const joinRoom = (roomCode, userName) => {
    socket.emit("joinRoom", { roomCode, userName });
  };

  const leaveRoom = () => {
    socket.emit("leaveRoom");

    // Clean up all peer connections
    peerConnections.current.forEach(peer => peer.destroy());
    peerConnections.current.clear();
    userVideos.current.clear();

    setCurrentRoom(null);
    setRoomUsers([]);
    setRoomMessages([]);
    setIsHost(false);
  };

  const sendRoomMessage = (message) => {
    if (currentRoom) {
      socket.emit("roomMessage", { roomCode: currentRoom, message, userName: name });
    }
  };
  
  // Load previous messages when joining a room
  const loadRoomMessages = async (roomCode) => {
    try {
      const response = await fetch(`http://localhost:8090/api/rooms/${roomCode}/messages`);
      if (response.ok) {
        const data = await response.json();
        const formattedMessages = data.messages.map(msg => ({
          ...msg,
          isOwnMessage: msg.userCode === me
        }));
        setRoomMessages(formattedMessages);
      }
    } catch (error) {
      console.error("Error loading room messages:", error);
      // Don't show error to user, just start with empty messages
      setRoomMessages([]);
    }
  };

  // Legacy 1-on-1 functions
  const answerCall = () => {
    setCallAccepted(true);
    const peer = new Peer({ initiator: false, trickle: false, stream });
    peer.on("signal", (data) => {
      socket.emit("answerCall", { signal: data, to: call.from, receiverName: name });
    });
    peer.on("stream", (currentStream) => {
      userVideo.current.srcObject = currentStream;
    });
    peer.on("data", addMessageToChat);
    peer.signal(call.signal);
    connectionRef.current = peer;
  };

  const callUser = (userCodeToCall) => {
    const peer = new Peer({ initiator: true, trickle: false, stream });
    peer.on("signal", (data) => {
      socket.emit("callUser", { userToCall: userCodeToCall, signalData: data, from: me, name });
    });
    peer.on("stream", (currentStream) => {
      userVideo.current.srcObject = currentStream;
    });
    peer.on("data", addMessageToChat);

    socket.on("callAccepted", ({signal, to, receiverName}) => {
      setCallAccepted(true);
      setCall({isReceivingCall: false, from:to, name: receiverName, signal})
      peer.signal(signal);
    });
    connectionRef.current = peer;
  };

  const leaveCall = () => {
    setCallEnded(true);
    connectionRef.current.destroy();
    window.location.reload();
  };

  const sendMessage = (message) => {
    addMessageToChat(message, true);
    connectionRef.current.send(message);
  };

  const addMessageToChat = (data /* message */, isOwnMessage) => {
    isOwnMessage = isOwnMessage === undefined ? false : isOwnMessage;
    const msgReceived = data.toString();
    setMsgs((p) => {
      return [...p, {data: msgReceived, isOwnMessage, id:Date.now()}];
    });
  };

  return (
    <SocketContext.Provider
      value={{
        // Legacy 1-on-1 values
        call,
        callAccepted,
        myVideo,
        userVideo,
        stream,
        name,
        setName,
        callEnded,
        me,
        msgs,
        callUser,
        leaveCall,
        answerCall,
        sendMessage,

        // Room values and functions
        currentRoom,
        roomUsers,
        isHost,
        roomMessages,
        createRoom,
        joinRoom,
        leaveRoom,
        sendRoomMessage,
        loadRoomMessages,
        peerConnections,
        userVideos,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
export { ContextProvider, SocketContext };