import { useContext } from "react";
import { SocketContext } from "../Context";
import { BiSolidPhoneIncoming } from "react-icons/bi";

const Notifications = () => {
  const { answerCall, call, callAccepted } = useContext(SocketContext);

  return (
    <>
      {call.isReceivingCall && !callAccepted && (
        <div className="notification-container">
          <BiSolidPhoneIncoming className="notification-icon" size={25}/>
          <h3> {call.name === "" ? "Unknown person" : call.name} is calling</h3>
          <button className="btn-blue-grad" onClick={answerCall}>
            Accept
          </button>
        </div>
      )}
    </>
  );
};
export default Notifications;
