import { useContext, useEffect, useState } from "react";
import { SocketContext } from "../Context";
import { BiSolidPhoneIncoming } from "react-icons/bi";

const Notifications = () => {
  const { answerCall, call, callAccepted, socket } = useContext(SocketContext);
  const [callerName, setCallerName] = useState("");

  useEffect(() => {
    if (call.isReceivingCall && call.from && socket) {
      // If call.name is provided, use it, otherwise try to get from server
      if (call.name) {
        setCallerName(call.name);
      } else {
        socket.emit("getUserName", { userCode: call.from }, (response) => {
          if (response.success && response.userName) {
            setCallerName(response.userName);
          } else {
            setCallerName(`User ${call.from}`);
          }
        });
      }
    }
  }, [call.isReceivingCall, call.from, call.name, socket]);

  return (
    <>
      {call.isReceivingCall && !callAccepted && (
        <div className="fixed border-2 border-indigo-400 shadow-md shadow-indigo-100 top-4 right-4 flex gap-4 p-3 rounded-xl justify-center w-max items-center">
          <BiSolidPhoneIncoming className=" fill-indigo-500" size={25}/>
          <h3>{callerName || "Unknown person"} is calling</h3>
          <button className="btn-blue-grad" onClick={answerCall}>
            Accept
          </button>
        </div>
      )}
    </>
  );
};
export default Notifications;
