
"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
    getAuth, 
    onAuthStateChanged, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut as firebaseSignOut,
    User
} from 'firebase/auth';
import { isFirebaseInitialized, auth as firebaseAuth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    isFirebaseConfigured: boolean;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuthContext() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuthContext must be used within an AuthProvider');
    }
    return context;
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const isFirebaseConfigured = isFirebaseInitialized();
    const { toast } = useToast();

    useEffect(() => {
        if (!isFirebaseConfigured) {
            setLoading(false);
            return;
        }
        const unsubscribe = onAuthStateChanged(firebaseAuth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [isFirebaseConfigured]);

    const signInWithGoogle = async () => {
        if (!isFirebaseConfigured) {
            toast({
                title: 'Lỗi cấu hình',
                description: 'Firebase chưa được cấu hình. Vui lòng kiểm tra file .env.local.',
                variant: 'destructive',
            });
            return;
        }
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(firebaseAuth, provider);
            toast({
                title: 'Đăng nhập thành công',
                description: 'Chào mừng bạn đã trở lại!',
            });
        } catch (error) {
            console.error("Lỗi đăng nhập Google:", error);
            toast({
                title: 'Lỗi đăng nhập',
                description: 'Đã có lỗi xảy ra trong quá trình đăng nhập. Vui lòng thử lại.',
                variant: 'destructive',
            });
        }
    };

    const signOut = async () => {
        if (!isFirebaseConfigured) return;
        try {
            await firebaseSignOut(firebaseAuth);
            toast({
                title: 'Đã đăng xuất',
                description: 'Hẹn gặp lại bạn!',
            });
        } catch (error) {
            console.error("Lỗi đăng xuất:", error);
            toast({
                title: 'Lỗi đăng xuất',
                description: 'Đã có lỗi xảy ra. Vui lòng thử lại.',
                variant: 'destructive',
            });
        }
    };

    const value = {
        user,
        loading,
        isFirebaseConfigured,
        signInWithGoogle,
        signOut,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
