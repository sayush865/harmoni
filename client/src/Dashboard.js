import React, { useState, useEffect, useRef } from 'react';
import './Dashboard.css';
import { RetellWebClient } from 'retell-client-js-sdk';

const retellClient = new RetellWebClient();

const Dashboard = ({ user }) => {
    const [callStatus, setCallStatus] = useState("Idle");
    const remoteAudioRef = useRef(null);
    const localAudioTrack = useRef(null);
    const callActiveRef = useRef(false);
    const callStartTime = useRef(null);
    const [messages, setMessages] = useState([]);
    const [currentUtterance, setCurrentUtterance] = useState({ agent: "", user: "" });
    const [, forceUpdate] = useState({});

    const startCall = async () => {
        if (callActiveRef.current) return;

        try {
            setCallStatus("Connecting...");
            const agentId = process.env.REACT_APP_RETELL_AGENT_ID;
            if (!agentId) throw new Error("Retell Agent ID not found.");

            const response = await fetch('/api/create-call', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agentId }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error ${response.status}`);
            }
            const data = await response.json();
            const accessToken = data.accessToken;
            if (!accessToken) throw new Error("Access token not received.");

            setCallStatus("Starting Call...");
            callActiveRef.current = true;
            await retellClient.startCall({ accessToken, audio: true, video: false });
            setCallStatus("In Call");
            callStartTime.current = Date.now();

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const audioTrack = stream.getAudioTracks()[0];
                localAudioTrack.current = audioTrack;

                retellClient.on("connected", async () => {
                    try {
                        await retellClient.publish(audioTrack);
                        console.log("Published local audio track");
                    } catch (error) {
                        console.error("Error publishing track:", error);
                        setCallStatus("Error publishing track: " + error.message);
                    }
                });
            } catch (publishError) {
                console.error("Error getting or publishing local audio:", publishError);
                setCallStatus("Error getting audio: " + publishError.message);
            }

            retellClient.on("update", (update) => {
                if (update?.transcript && Array.isArray(update.transcript)) {
                    update.transcript.forEach(segment => {
                        if (segment?.content) {
                            setMessages(prevMessages => {
                                const lastMessage = prevMessages.length > 0 ? prevMessages[prevMessages.length - 1] : null;
                                if (lastMessage && lastMessage.role === segment.role) {
                                    return prevMessages.map((message, index) => {
                                        if (index === prevMessages.length - 1) {
                                            return { ...message, content: message.content + segment.content };
                                        }
                                        return message;
                                    });
                                } else {
                                    return [...prevMessages, { role: segment.role, content: segment.content }];
                                }
                            });
                        }
                    });
                }
            });

            retellClient.on("closed", () => {
                setCallStatus("Call Ended");
                endCallCleanup();
            });

            retellClient.on("error", (error) => {
                console.error("Retell Error:", error);
                setCallStatus("Call Error: " + error.message);
                endCallCleanup();
            });

            retellClient.on("remoteStream", (stream) => {
                if (remoteAudioRef.current) {
                    remoteAudioRef.current.srcObject = stream;
                }
            });

        } catch (error) {
            console.error("Error starting call:", error);
            setCallStatus(`Call failed: ${error.message}`);
            endCallCleanup();
        }
    };

    const endCall = async () => {
        if (callActiveRef.current) {
            try {
                setCallStatus("Ending call...");
                await retellClient.stopCall();
            } catch (error) {
                console.error("Error ending call:", error);
                setCallStatus(`Error ending call: ${error.message}`);
            } finally {
                endCallCleanup();
            }
        }
    };

    const endCallCleanup = () => {
        setCallStatus("Idle");
        callActiveRef.current = false;
        callStartTime.current = null;
        setMessages([]);
        setCurrentUtterance({ agent: "", user: "" });
        if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
        if (localAudioTrack.current) {
            localAudioTrack.current.stop();
        }
    };

    useEffect(() => {
        let intervalId;
        if (callActiveRef.current) {
            intervalId = setInterval(() => {
                forceUpdate({});
            }, 1000);
        }
        return () => {
            clearInterval(intervalId);
            retellClient.off("closed");
            retellClient.off("remoteStream");
            retellClient.off("error");
            retellClient.off("update");
            retellClient.off("connected");
            if (localAudioTrack.current) {
                localAudioTrack.current.stop();
            }
        };
    }, [callActiveRef.current]);

    const formatTime = (milliseconds) => {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        const formattedSeconds = (seconds % 60).toString().padStart(2, '0');
        const formattedMinutes = (minutes % 60).toString().padStart(2, '0');
        const formattedHours = (hours % 24).toString().padStart(2, '0');

        return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
    };

    const calculateCallDuration = () => {
        if (!callStartTime.current || !callActiveRef.current) return '00:00:00';
        const now = Date.now();
        const elapsedTime = now - callStartTime.current;
        return formatTime(elapsedTime);
    };

    const displayMessages = () => {
        return messages.map((message, index) => (
            <div key={index} className={`message ${message.role}`}>
                <span className="message-role">{message.role.charAt(0).toUpperCase() + message.role.slice(1)}: </span><span className="message-content">{message.content}</span>
            </div>
        ));
    };

    return (
        <div className="dashboard">
            <h1>Dashboard</h1>
            {user && <p>Welcome, {user.name}!</p>}
            <audio ref={remoteAudioRef} autoPlay playsInline />
            <div className="call-controls">
                {!callActiveRef.current ? (
                    <button onClick={startCall}>Start Call</button>
                ) : (
                    <>
                        <button onClick={endCall}>End Call</button>
                        <span>Call Duration: {calculateCallDuration()}</span>
                    </>
                )}
            </div>
            <div className="transcription-box">
                {displayMessages()}
            </div>
            <p>Call Status: {callStatus}</p>
        </div>
    );
};

export default Dashboard;