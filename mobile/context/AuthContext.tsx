import React, { createContext, useMemo, useReducer } from 'react';
import AuthService from '../services/AuthService';

interface AuthContextType {
    signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    signUp: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
    signOut: () => Promise<void>;
    userToken: string | null;
    isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType>({
    signIn: async () => ({ success: false }),
    signUp: async () => ({ success: false }),
    signOut: async () => { },
    userToken: null,
    isLoading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [state, dispatch] = useReducer(
        (prevState: any, action: any) => {
            switch (action.type) {
                case 'RESTORE_TOKEN':
                    return {
                        ...prevState,
                        userToken: action.token,
                        isLoading: false,
                    };
                case 'SIGN_IN':
                    return {
                        ...prevState,
                        isSignout: false,
                        userToken: action.token,
                    };
                case 'SIGN_OUT':
                    return {
                        ...prevState,
                        isSignout: true,
                        userToken: null,
                    };
            }
        },
        {
            isLoading: true,
            isSignout: false,
            userToken: null,
        }
    );

    React.useEffect(() => {
        const bootstrapAsync = async () => {
            let userToken;
            try {
                userToken = await AuthService.getStoredToken();
            } catch (e) {
                console.error('Failed to restore session', e);
            }
            dispatch({ type: 'RESTORE_TOKEN', token: userToken });
        };

        bootstrapAsync();
    }, []);

    const authContext = useMemo(
        () => ({
            signIn: async (email: string, password: string) => {
                try {
                    const response = await AuthService.login(email, password);
                    await AuthService.storeToken(response.token);
                    dispatch({ type: 'SIGN_IN', token: response.token });
                    return { success: true };
                } catch (error: any) {
                    return { success: false, error: error.message };
                }
            },
            signUp: async (email: string, password: string, name: string) => {
                try {
                    const response = await AuthService.register(email, password, name);
                    await AuthService.storeToken(response.token);
                    dispatch({ type: 'SIGN_IN', token: response.token });
                    return { success: true };
                } catch (error: any) {
                    return { success: false, error: error.message };
                }
            },
            signOut: async () => {
                try {
                    await AuthService.logout();
                    await AuthService.clearToken();
                    dispatch({ type: 'SIGN_OUT' });
                } catch (error) {
                    console.error('Logout error:', error);
                }
            },
            userToken: state.userToken,
            isLoading: state.isLoading,
        }),
        [state.userToken, state.isLoading]
    );

    return (
        <AuthContext.Provider value={authContext}>
            {children}
        </AuthContext.Provider>
    );
};
