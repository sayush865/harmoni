import React, { useState, useEffect, useRef } from 'react';
import { RetellWebClient } from 'retell-client-js-sdk';

const retellClient = new RetellWebClient();

const MinimalRetellTest = () => {
    const [messages, setMessages] = useState([]);
    const [currentUtterance, setCurrentUtterance] = useState({ agent: "" });
    const [callStatus, setCallStatus] = useState("Idle");
    const localAudioTrack = useRef(null);

    useEffect(() => {
        const startCall = async () => {
            try {
                setCallStatus("Connecting...");
                const agentId = process.env.REACT_APP_RETELL_AGENT_ID;
                if (!agentId) {
                    throw new Error("Retell Agent ID not found in environment variables.");
                }
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
                if (!accessToken) {
                    throw new Error("Access token not received from server.");
                }

                setCallStatus("Starting Call...");
                await retellClient.startCall({ accessToken, audio: true, video: false });
                setCallStatus("In Call");

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
                    console.log("UPDATE EVENT:", update);
                    if (update?.transcript && Array.isArray(update.transcript)) {
                        setCurrentUtterance(prev => {
                            let newAgentContent = prev.agent || "";
                            let newUserContent = prev.user || "";
                
                            update.transcript.forEach(segment => {
                                if (segment?.content) {
                                    if (segment.role === 'agent') {
                                        const newContent = segment.content.startsWith(newAgentContent) ? segment.content.substring(newAgentContent.length) : segment.content;
                                        newAgentContent += newContent;
                                    } else if (segment.role === 'user') {
                                        const newContent = segment.content.startsWith(newUserContent) ? segment.content.substring(newUserContent.length) : segment.content;
                                        newUserContent += newContent;
                                    }
                                }
                            });
                            return { agent: newAgentContent, user: newUserContent };
                        });
                    }
                });

                retellClient.on("agent_stop_talking", () => {
                    console.log("agent_stop_talking", currentUtterance.agent);
                    if (currentUtterance.agent?.trim()) {
                        setMessages(prev => [...prev, { role: "agent", content: currentUtterance.agent.trim() }]);
                    }
                    setCurrentUtterance({ agent: "" });
                });

                retellClient.on("closed", () => {
                    setCallStatus("Call Ended");
                });

                retellClient.on("error", (error) => {
                    console.error("Retell Error:", error);
                    setCallStatus("Call Error: " + error.message);
                });

            } catch (error) {
                console.error("Error starting call:", error);
                setCallStatus("Call Failed: " + error.message);
            }
        };

        startCall();

        return () => {
            retellClient.stopCall();
            retellClient.off("update");
            retellClient.off("agent_stop_talking");
            retellClient.off("closed");
            retellClient.off("error");
            retellClient.off("connected");
            if (localAudioTrack.current) {
                localAudioTrack.current.stop();
            }
        };
    }, []);

    return (
        <div>
            <h2>Minimal Retell Test</h2>
            <p>Call Status: {callStatus}</p>
            <div style={{ border: '1px solid black', padding: '10px', margin: '10px' }}>
                {messages.map((m, i) => <div key={i}>{m.role}: {m.content}</div>)}
            </div>
        </div>
    );
};

export default MinimalRetellTest;