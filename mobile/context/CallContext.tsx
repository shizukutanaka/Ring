import React, { createContext, useState, useContext } from 'react';

interface CallContextType {
    activeCall: any | null;
    initiateCall: (recipientId: string) => Promise<void>;
    endCall: () => Promise<void>;
}

export const CallContext = createContext<CallContextType>({
    activeCall: null,
    initiateCall: async () => { },
    endCall: async () => { },
});

export const useCall = () => useContext(CallContext);

export const CallProvider = ({ children }: { children: React.ReactNode }) => {
    const [activeCall, setActiveCall] = useState<any | null>(null);

    const initiateCall = async (recipientId: string) => {
        // Placeholder for actual WebRTC call initiation logic
        console.log('Initiating call to', recipientId);
        setActiveCall({ id: 'call-' + Date.now(), recipientId, status: 'connecting' });
    };

    const endCall = async () => {
        console.log('Ending call');
        setActiveCall(null);
    };

    return (
        <CallContext.Provider value={{ activeCall, initiateCall, endCall }}>
            {children}
        </CallContext.Provider>
    );
};
