import React, { useState, useEffect, useRef } from 'react';
import { RetellWebClient } from 'retell-client-js-sdk';

const retellClient = new RetellWebClient(); // Outside the component
const TestRetell = () => {
    const [testStatus, setTestStatus] = useState("Testing...");
    const callActiveRef = useRef(false);

    useEffect(() => {
        let accessToken;

        const startAndStopCall = async () => {
            if (callActiveRef.current) { 
                console.log("Call already in progress, ignoring"); 
                return; 
            } 

            try {
                setTestStatus("Getting access token...");
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
                accessToken = data.accessToken;

                if (!accessToken) {
                    throw new Error("Access token not received from server.");
                }

                setTestStatus("Starting call...");
                console.log("Starting call with token:", accessToken); // Remove in production
                callActiveRef.current = true;
                await retellClient.startCall({ accessToken, audio: true, video: false });
                setTestStatus("Call started. Waiting 5 seconds...");
                console.log("Call started");


                retellClient.on("closed", () => {
                    setTestStatus("Call ended by closed event");
                    callActiveRef.current = false;
                });

                retellClient.on("error", (error) => {
                    console.error("Call Error:", error);
                    setTestStatus("Call Failed: " + error.message);
                    callActiveRef.current = false;
                });

                retellClient.on("transcription", (transcriptionData) => {
                    console.log("Transcription:", transcriptionData)
                });

                retellClient.on("localStream", (stream) => {
                    console.log("Local Stream received:", stream)
                });

                retellClient.on("remoteStream", (stream) => {
                    console.log("Remote Stream received:", stream)
                });

                setTimeout(async () => {
                    try {
                        setTestStatus("Stopping call...");
                        console.log("Stopping call");
                        await retellClient.stopCall(); // Or retellClient.disconnect()
                        console.log("Call stopped successfully");
                        setTestStatus("Call stopped successfully.");
                    } catch (stopError) {
                        console.error("Error stopping call:", stopError);
                        setTestStatus(`Error stopping call: ${stopError.message}`);
                    } finally {
                        callActiveRef.current = false;
                    }
                }, 5000);
            } catch (error) {
                console.error("Error in test:", error);
                setTestStatus(`Test failed: ${error.message}`);
                callActiveRef.current = false;
            }
        };

        startAndStopCall();

        return () => {
            console.log("Test component unmounted");
        };
    }, []);

    return <div>Test Retell SDK: {testStatus}</div>;
};

export default TestRetell;