import React, { createContext, useState, useRef, useEffect } from "react";
import { io } from "socket.io-client";
import Peer from "simple-peer";

const SocketContext = createContext();
<<<<<<< HEAD

=======
const socket = io("http://localhost:8090");
>>>>>>> dd81abf913b56b2591cfb37ed805cba89e585c85
const ContextProvider = ({ children }) => {
  const [msgs, setMsgs] = useState([]); // [... {data: 'Hi', isOwnMessage: true/false, id} ] Lets the <Chat/> know whether the message is our or is received from the other peer
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [stream, setStream] = useState();
  const [name, setName] = useState("");
  
  // Socket connection state
  const [socket, setSocket] = useState(null);
  
  // Function to set name locally (for UI)
  const setUserName = (newName) => {
    setName(newName);
    // Don't send to server immediately - only when creating/joining room
  };

  // Function to send name to server (called only when needed)
  const sendUserNameToServer = (userName) => {
    if (userName.trim() && me && socket) {
      socket.emit("setUserName", { userName });
    }
  };
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
    // Create socket connection
    const newSocket = io("http://localhost:8090");
    setSocket(newSocket);

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
    
    newSocket.on("me", (userCode) => setMe(userCode)); // Now receives 4-digit code
    
    // Legacy 1-on-1 calling
    newSocket.on("callUser", ({ from, name: callerName, signal }) => {
      setCall({ isReceivingCall: true, from, name: callerName, signal });
    });
    
    // Room events
    newSocket.on("roomCreated", ({ roomCode, userCode, userName, isHost, participants }) => {
      setCurrentRoom(roomCode);
      setIsHost(isHost);
      setRoomUsers([{ userCode, userName, isHost }]);
    });
    
    newSocket.on("roomJoined", ({ roomCode, userCode, userName, roomUsers, participants, isHost }) => {
      setCurrentRoom(roomCode);
      setIsHost(isHost);
      setRoomUsers(roomUsers.map(user => ({ 
        userCode: user.userCode, 
        userName: user.userName, 
        isHost: user.isHost 
      })));
      
      // Load previous messages for this room
      loadRoomMessages(roomCode);
    });
    
    newSocket.on("userJoined", ({ userCode, userName, roomUsers, participants }) => {
      setRoomUsers(roomUsers.map(user => ({ 
        userCode: user.userCode, 
        userName: user.userName, 
        isHost: user.isHost 
      })));
      
      // Initiate peer connection with new user if I'm already in room
      if (currentRoom && userCode !== me) {
        createPeerConnection(userCode, true);
      }
    });
    
<<<<<<< HEAD
    newSocket.on("userLeft", ({ userCode, userName }) => {
      setRoomUsers(prev => prev.filter(user => user.userCode !== userCode));
=======
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
>>>>>>> dd81abf913b56b2591cfb37ed805cba89e585c85
      
      // Clean up peer connection
      if (peerConnections.current.has(userCode)) {
        peerConnections.current.get(userCode).destroy();
        peerConnections.current.delete(userCode);
        userVideos.current.delete(userCode);
      }
    });
    
<<<<<<< HEAD
    newSocket.on("newHost", ({ hostUserCode, hostUserName }) => {
      // Update room users to reflect new host
      setRoomUsers(prev => prev.map(user => ({
        ...user,
        isHost: user.userCode === hostUserCode
      })));
      
      // Update my host status
      setIsHost(hostUserCode === me);
      
      // Show notification about new host
      if (hostUserCode !== me) {
        alert(`${hostUserName || `User ${hostUserCode}`} is now the host`);
      } else {
        alert("You are now the host of this room");
      }
    });
    
    newSocket.on("signal", ({ userCode, signal, roomCode }) => {
=======
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
>>>>>>> dd81abf913b56b2591cfb37ed805cba89e585c85
      if (roomCode === currentRoom) {
        if (peerConnections.current.has(userCode)) {
          peerConnections.current.get(userCode).signal(signal);
        } else {
          createPeerConnection(userCode, false, signal);
        }
      }
    });
    
    newSocket.on("roomMessage", ({ message, userName, userCode, timestamp }) => {
      setRoomMessages(prev => [...prev, { 
        message, 
        userName, 
        userCode, 
        timestamp,
        isOwnMessage: userCode === me 
      }]);
    });
    
    newSocket.on("roomError", ({ message }) => {
      alert(message);
    });
    
    return () => {
      // Cleanup on unmount
      peerConnections.current.forEach(peer => peer.destroy());
<<<<<<< HEAD
      newSocket.off("me");
      newSocket.off("callUser");
      newSocket.off("roomCreated");
      newSocket.off("roomJoined");
      newSocket.off("userJoined");
      newSocket.off("userLeft");
      newSocket.off("newHost");
      newSocket.off("signal");
      newSocket.off("roomMessage");
      newSocket.off("roomError");
      newSocket.disconnect();
=======
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
>>>>>>> dd81abf913b56b2591cfb37ed805cba89e585c85
    };
  }, []); // Empty dependency array to run only once

  // Create peer connection for room users
  const createPeerConnection = (userCode, initiator, incomingSignal = null) => {
    if (!socket) return;
    
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
    if (socket) {
      // Send name to server only when creating room
      sendUserNameToServer(userName);
      socket.emit("createRoom", { userName });
    }
  };
  
  const joinRoom = (roomCode, userName) => {
    if (socket) {
      // Send name to server only when joining room
      sendUserNameToServer(userName);
      socket.emit("joinRoom", { roomCode, userName });
    }
  };
  
  const leaveRoom = () => {
    if (socket) {
      socket.emit("leaveRoom");
    }
    
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
    if (currentRoom && socket) {
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
    if (!socket) return;
    
    // Send name to server only when answering a call
    sendUserNameToServer(name);
    
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
    if (!socket) return;
    
    // Send name to server only when making a call
    sendUserNameToServer(name);
    
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
        setName: setUserName,
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
        socket, // Export socket from state
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};
export { ContextProvider, SocketContext };
