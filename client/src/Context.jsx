import { createContext, useState, useRef, useEffect } from "react";
import { io } from "socket.io-client";
import Peer from "simple-peer";

const SocketContext = createContext();
const socket = io("http://localhost:8090/");

const ContextProvider = ({ children }) => {
  // Legacy 1-on-1 calling state
  const [msgs, setMsgs] = useState([]);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [call, setCall] = useState({});
  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  // Room-based calling state
  const [roomCode, setRoomCode] = useState("");
  const [inRoom, setInRoom] = useState(false);
  const [roomUsers, setRoomUsers] = useState([]);
  const [roomMessages, setRoomMessages] = useState([]);
  const [peers, setPeers] = useState(new Map()); // userId -> peer connection
  const [userVideos, setUserVideos] = useState(new Map()); // userId -> video ref
  const [userNames, setUserNames] = useState(new Map()); // userId -> name
  
  // Common state
  const [stream, setStream] = useState();
  const [name, setName] = useState("");
  const [me, setMe] = useState("");

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
        console.error("Error accessing media devices:", err);
      });

    socket.on("me", (id) => setMe(id));

    // Legacy 1-on-1 calling events
    socket.on("callUser", ({ from, name: callerName, signal }) => {
      setCall({ isReceivingCall: true, from, name: callerName, signal });
    });

    // Room events
    socket.on("roomCreated", ({ roomCode: newRoomCode, users }) => {
      setRoomCode(newRoomCode);
      setInRoom(true);
      setRoomUsers(users || []);
      // Store our own name
      setUserNames(prev => new Map(prev.set(me, name)));
    });

    socket.on("roomJoined", ({ roomCode: joinedRoomCode, users }) => {
      setRoomCode(joinedRoomCode);
      setInRoom(true);
      setRoomUsers(users);
      
      // Store user names
      users.forEach(user => {
        setUserNames(prev => new Map(prev.set(user.id, user.name)));
      });
      
      // Create peer connections for existing users (excluding self) after stream is ready
      // Delay to ensure stream is properly set up
      setTimeout(() => {
        users.forEach(user => {
          if (user.id !== me) {
            createPeerConnection(user.id, true);
          }
        });
      }, 1500);
    });

    socket.on("roomError", ({ message }) => {
      alert(`Room Error: ${message}`);
    });

    socket.on("userJoined", ({ userId, userName, totalUsers }) => {
      setRoomUsers(prev => [...prev, { id: userId, name: userName }]);
      setUserNames(prev => new Map(prev.set(userId, userName)));
      
      // Create peer connection for new user if we have stream
      if (stream && userId !== me) {
        setTimeout(() => createPeerConnection(userId, true), 1000);
      }
    });

    socket.on("userLeft", ({ userId, totalUsers }) => {
      setRoomUsers(prev => prev.filter(user => user.id !== userId));
      setUserNames(prev => {
        const newNames = new Map(prev);
        newNames.delete(userId);
        return newNames;
      });
      
      // Clean up peer connection
      const peer = peers.get(userId);
      if (peer) {
        peer.destroy();
        setPeers(prev => {
          const newPeers = new Map(prev);
          newPeers.delete(userId);
          return newPeers;
        });
      }
      
      // Clean up video ref
      setUserVideos(prev => {
        const newVideos = new Map(prev);
        newVideos.delete(userId);
        return newVideos;
      });
    });

    socket.on("signal", ({ signal, fromUserId }) => {
      console.log(`Received signal from ${fromUserId}`);
      const peer = peers.get(fromUserId);
      if (peer) {
        peer.signal(signal);
      } else {
        // Create peer connection for incoming signal (we are not the initiator)
        createPeerConnection(fromUserId, false, signal);
      }
    });

    socket.on("roomMessage", ({ message, userName, userId, timestamp }) => {
      setRoomMessages(prev => [...prev, {
        id: timestamp,
        data: message,
        userName,
        userId,
        isOwnMessage: false
      }]);
    });

    return () => {
      socket.off("me");
      socket.off("callUser");
      socket.off("roomCreated");
      socket.off("roomJoined");
      socket.off("roomError");
      socket.off("userJoined");
      socket.off("userLeft");
      socket.off("signal");
      socket.off("roomMessage");
    };
  }, [stream, peers, me, name, roomCode, userNames, roomUsers]);

  const createPeerConnection = (userId, initiator, initialSignal = null) => {
    // Don't create connection to self
    if (userId === me) return;
    
    // Don't create duplicate connections
    if (peers.has(userId)) {
      console.log(`Peer connection already exists for ${userId}`);
      return;
    }
    
    // Ensure we have stream before creating peer
    if (!stream) {
      console.warn(`No stream available for peer connection with ${userId}, retrying...`);
      setTimeout(() => createPeerConnection(userId, initiator, initialSignal), 500);
      return;
    }
    
    console.log(`Creating peer connection with ${userId}, initiator: ${initiator}`);
    
    const peer = new Peer({
      initiator,
      trickle: false,
      stream,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
    });

    peer.on("signal", (signal) => {
      console.log(`Sending signal to ${userId}`);
      socket.emit("signal", {
        roomCode,
        signal,
        targetUserId: userId
      });
    });

    peer.on("stream", (userStream) => {
      console.log(`Received stream from ${userId}`);
      // Create video ref for this user
      const videoRef = { current: null };
      setUserVideos(prev => new Map(prev.set(userId, videoRef)));
      
      // Set stream when ref is available with retry mechanism
      const setStreamWithRetry = (retries = 5) => {
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = userStream;
            videoRef.current.play().catch(err => {
              console.warn(`Failed to play video for ${userId}:`, err);
              if (retries > 0) {
                setStreamWithRetry(retries - 1);
              }
            });
          } else if (retries > 0) {
            setStreamWithRetry(retries - 1);
          }
        }, 100);
      };
      setStreamWithRetry();
    });

    peer.on("data", (data) => {
      const message = data.toString();
      const userName = userNames.get(userId) || roomUsers.find(u => u.id === userId)?.name || 'Unknown';
      setRoomMessages(prev => [...prev, {
        id: Date.now(),
        data: message,
        userName,
        userId,
        isOwnMessage: false
      }]);
    });

    peer.on("error", (err) => {
      console.error(`Peer connection error with ${userId}:`, err);
      // Clean up failed connection after a delay
      setTimeout(() => {
        setPeers(prev => {
          const newPeers = new Map(prev);
          newPeers.delete(userId);
          return newPeers;
        });
      }, 1000);
    });

    peer.on("connect", () => {
      console.log(`Connected to peer ${userId}`);
    });

    peer.on("close", () => {
      console.log(`Connection closed with peer ${userId}`);
      setPeers(prev => {
        const newPeers = new Map(prev);
        newPeers.delete(userId);
        return newPeers;
      });
    });

    if (initialSignal) {
      peer.signal(initialSignal);
    }

    setPeers(prev => new Map(prev.set(userId, peer)));
  };

  // Room functions
  const createRoom = () => {
    if (name.trim() === "") {
      alert("Please enter your name first");
      return;
    }
    socket.emit("createRoom", { userName: name });
  };

  const joinRoom = (code) => {
    if (name.trim() === "") {
      alert("Please enter your name first");
      return;
    }
    if (code.trim() === "") {
      alert("Please enter a room code");
      return;
    }
    socket.emit("joinRoom", { roomCode: code.toUpperCase(), userName: name });
  };

  const leaveRoom = () => {
    socket.emit("leaveRoom");
    
    // Clean up all peer connections
    peers.forEach(peer => peer.destroy());
    setPeers(new Map());
    setUserVideos(new Map());
    setUserNames(new Map());
    
    setInRoom(false);
    setRoomCode("");
    setRoomUsers([]);
    setRoomMessages([]);
  };

  const sendRoomMessage = (message) => {
    if (message.trim() === "") return;
    
    // Add to local messages
    setRoomMessages(prev => [...prev, {
      id: Date.now(),
      data: message,
      userName: name,
      userId: me,
      isOwnMessage: true
    }]);

    // Send to other users via socket
    socket.emit("roomMessage", { roomCode, message, userName: name });

    // Send to peers via WebRTC data channel
    peers.forEach(peer => {
      if (peer.connected) {
        peer.send(message);
      }
    });
  };

  // Legacy 1-on-1 calling functions
  const answerCall = () => {
    setCallAccepted(true);
    const peer = new Peer({ initiator: false, trickle: false, stream });
    peer.on("signal", (data) => {
      socket.emit("answerCall", { signal: data, to: call.from, receiverName: name });
    });
    peer.on("stream", (currentStream) => {
      if (userVideo.current) {
        userVideo.current.srcObject = currentStream;
      }
    });
    peer.on("data", addMessageToChat);
    peer.signal(call.signal);
    connectionRef.current = peer;
  };

  const callUser = (id) => {
    const peer = new Peer({ initiator: true, trickle: false, stream });
    peer.on("signal", (data) => {
      socket.emit("callUser", { userToCall: id, signalData: data, from: me, name });
    });
    peer.on("stream", (currentStream) => {
      if (userVideo.current) {
        userVideo.current.srcObject = currentStream;
      }
    });
    peer.on("data", addMessageToChat);

    socket.on("callAccepted", ({signal, to, receiverName}) => {
      setCallAccepted(true);
      setCall({isReceivingCall: false, from:to, name: receiverName, signal});
      peer.signal(signal);
    });
    connectionRef.current = peer;
  };

  const leaveCall = () => {
    setCallEnded(true);
    if (connectionRef.current) {
      connectionRef.current.destroy();
    }
    window.location.reload();
  };

  const sendMessage = (message) => {
    addMessageToChat(message, true);
    if (connectionRef.current) {
      connectionRef.current.send(message);
    }
  };

  const addMessageToChat = (data, isOwnMessage) => {
    isOwnMessage = isOwnMessage === undefined ? false : isOwnMessage;
    const msgReceived = data.toString();
    setMsgs((p) => {
      return [...p, {data: msgReceived, isOwnMessage, id:Date.now()}];
    });
  };

  return (
    <SocketContext.Provider
      value={{
        // Legacy 1-on-1 calling
        call,
        callAccepted,
        myVideo,
        userVideo,
        callEnded,
        msgs,
        callUser,
        leaveCall,
        answerCall,
        sendMessage,
        
        // Room-based calling
        roomCode,
        inRoom,
        roomUsers,
        roomMessages,
        userVideos,
        createRoom,
        joinRoom,
        leaveRoom: inRoom ? leaveRoom : leaveCall,
        sendRoomMessage,
        
        // Common
        stream,
        name,
        setName,
        me,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export { ContextProvider, SocketContext };
