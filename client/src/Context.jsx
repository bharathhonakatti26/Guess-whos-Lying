import { createContext, useState, useRef, useEffect } from "react";
import { io } from "socket.io-client";
import Peer from "simple-peer";

const SocketContext = createContext();
const socket = io("http://localhost:8090/");

const ContextProvider = ({ children }) => {
  const [msgs, setMsgs] = useState([]); 
  const [stream, setStream] = useState();
  const [name, setName] = useState("");
  const [me, setMe] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [isInRoom, setIsInRoom] = useState(false);
  const [roomUsers, setRoomUsers] = useState([]);
  const [peers, setPeers] = useState([]);
  const [roomError, setRoomError] = useState("");
  
  const myVideo = useRef();
  const peersRef = useRef([]);

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

    // Room events
    socket.on("roomCreated", ({ roomCode }) => {
      setRoomCode(roomCode);
      setIsInRoom(true);
      setRoomError("");
    });

    socket.on("roomJoined", ({ roomCode, users }) => {
      setRoomCode(roomCode);
      setIsInRoom(true);
      setRoomUsers(users);
      setRoomError("");
      
      // Create peers for existing users
      const peers = [];
      users.forEach(user => {
        const peer = createPeer(user.id, socket.id, stream);
        peersRef.current.push({
          peerID: user.id,
          peer,
          name: user.name
        });
        peers.push({
          peerID: user.id,
          peer,
          name: user.name
        });
      });
      setPeers(peers);
    });

    socket.on("userJoined", ({ userId, name, allUsers }) => {
      setRoomUsers(allUsers);
      const peer = addPeer(userId, stream);
      peersRef.current.push({
        peerID: userId,
        peer,
        name
      });
      setPeers(users => [...users, { peerID: userId, peer, name }]);
    });

    socket.on("signal", ({ callerID, signal }) => {
      const peer = addPeer(callerID, stream);
      peer.signal(signal);
    });

    socket.on("receiving returned signal", ({ id, signal }) => {
      const item = peersRef.current.find(p => p.peerID === id);
      if (item) {
        item.peer.signal(signal);
      }
    });

    socket.on("userLeft", ({ userId, allUsers }) => {
      setRoomUsers(allUsers);
      const peerObj = peersRef.current.find(p => p.peerID === userId);
      if (peerObj) {
        peerObj.peer.destroy();
      }
      const peers = peersRef.current.filter(p => p.peerID !== userId);
      peersRef.current = peers;
      setPeers(peers);
    });

    socket.on("roomError", ({ message }) => {
      setRoomError(message);
    });

    socket.on("receiveMessage", ({ message, senderName, senderId }) => {
      addMessageToChat(message, false, senderName);
    });

    return () => {
      socket.off("me");
      socket.off("roomCreated");
      socket.off("roomJoined");
      socket.off("userJoined");
      socket.off("signal");
      socket.off("receiving returned signal");
      socket.off("userLeft");
      socket.off("roomError");
      socket.off("receiveMessage");
    };
  }, [stream]);

  function createPeer(userToSignal, callerID, stream) {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
    });

    peer.on("signal", signal => {
      socket.emit("signal", { userToSignal, callerID, signal });
    });

    peer.on("data", (data) => {
      // Handle data from peer if needed
    });

    return peer;
  }

  function addPeer(incomingSignal, stream) {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
    });

    peer.on("signal", signal => {
      socket.emit("returning signal", { signal, callerID: incomingSignal });
    });

    peer.on("data", (data) => {
      // Handle data from peer if needed
    });

    return peer;
  }

  const createRoom = () => {
    if (name.trim()) {
      socket.emit("createRoom", { name });
    }
  };

  const joinRoom = (code) => {
    if (name.trim() && code.trim()) {
      socket.emit("joinRoom", { roomCode: code.toUpperCase(), name });
    }
  };

  const leaveRoom = () => {
    // Destroy all peer connections
    peersRef.current.forEach(({ peer }) => peer.destroy());
    peersRef.current = [];
    setPeers([]);
    setIsInRoom(false);
    setRoomCode("");
    setRoomUsers([]);
    setMsgs([]);
    window.location.reload();
  };

  const sendMessage = (message) => {
    addMessageToChat(message, true, name);
    socket.emit("sendMessage", { roomCode, message, senderName: name });
  };

  const addMessageToChat = (data, isOwnMessage, senderName) => {
    const msgReceived = data.toString();
    setMsgs((prev) => {
      return [...prev, {
        data: msgReceived, 
        isOwnMessage: isOwnMessage || false, 
        senderName: senderName || "Unknown",
        id: Date.now() + Math.random()
      }];
    });
  };

  // Legacy support for 1-on-1 calls
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [call, setCall] = useState({});
  const userVideo = useRef();
  const connectionRef = useRef();

  const answerCall = () => {
    setCallAccepted(true);
    const peer = new Peer({ initiator: false, trickle: false, stream });
    peer.on("signal", (data) => {
      socket.emit("answerCall", { signal: data, to: call.from, receiverName: name });
    });
    peer.on("stream", (currentStream) => {
      userVideo.current.srcObject = currentStream;
    });
    peer.on("data", (data) => addMessageToChat(data, false));
    peer.signal(call.signal);
    connectionRef.current = peer;
  };

  const callUser = (id) => {
    const peer = new Peer({ initiator: true, trickle: false, stream });
    peer.on("signal", (data) => {
      socket.emit("callUser", { userToCall: id, signalData: data, from: me, name });
    });
    peer.on("stream", (currentStream) => {
      userVideo.current.srcObject = currentStream;
    });
    peer.on("data", (data) => addMessageToChat(data, false));

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

  useEffect(() => {
    socket.on("callUser", ({ from, name: callerName, signal }) => {
      setCall({ isReceivingCall: true, from, name: callerName, signal });
    });
  }, []);

  return (
    <SocketContext.Provider
      value={{
        // New room functionality
        isInRoom,
        roomCode,
        roomUsers,
        peers,
        createRoom,
        joinRoom,
        leaveRoom,
        roomError,
        setRoomError,
        
        // Video and messaging
        myVideo,
        stream,
        name,
        setName,
        me,
        msgs,
        sendMessage,
        
        // Legacy 1-on-1 support
        call,
        callAccepted,
        userVideo,
        callEnded,
        callUser,
        answerCall,
        leaveCall,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export { ContextProvider, SocketContext };
