
"use client"

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { useAuthContext } from '@/contexts/AuthContext';

export function Login() {
    const { signInWithGoogle, loading } = useAuthContext();

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4">
            <Card className="w-full max-w-md text-center p-8 bg-background/80 backdrop-blur-sm animate-in fade-in duration-500">
                <CardHeader className="p-0 mb-6">
                    <div className="flex items-center justify-center gap-4 mb-4">
                        <Sparkles className="w-12 h-12 text-primary" />
                    </div>
                    <CardTitle className="text-3xl font-bold">
                        Chào mừng đến với AI Tab Mới
                    </CardTitle>
                    <CardDescription className="text-lg mt-2">
                        Đăng nhập bằng Google để bắt đầu hành trình học tập của bạn.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Button 
                        onClick={signInWithGoogle} 
                        disabled={loading}
                        className="w-full h-12 text-base"
                    >
                        {loading ? 'Đang tải...' : 'Đăng nhập bằng Google'}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
