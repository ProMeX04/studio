

"use client"

import React from 'react';
import { useSettingsContext } from "@/contexts/SettingsContext"
import { useAuthContext } from "@/contexts/AuthContext"
import { Greeting } from "@/components/Greeting"
import { Clock } from "@/components/Clock"
import { Search } from "@/components/Search"
import { QuickLinks } from "@/components/QuickLinks"
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { LogOut } from 'lucide-react';

export default function LeftColumn() {
    const { visibility } = useSettingsContext();
    const { user, signOut } = useAuthContext();

    const getInitials = (name: string | null | undefined) => {
        if (!name) return 'AI';
        const names = name.split(' ');
        if (names.length > 1) {
            return names[0].charAt(0) + names[names.length - 1].charAt(0);
        }
        return name.charAt(0);
    };

    return (
        <div className="relative flex h-screen flex-col justify-center overflow-hidden p-4 sm:p-8 md:p-12">
            <div className="absolute top-0 left-0 right-0 p-4 sm:p-8 md:p-12 flex justify-between items-center gap-4">
                {visibility.greeting && <Greeting />}
                {user && (
                    <div className="flex items-center gap-3">
                        <Avatar>
                            <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? 'User'} />
                            <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                        </Avatar>
                        <Button variant="ghost" size="icon" onClick={signOut}>
                            <LogOut className="h-5 w-5" />
                        </Button>
                    </div>
                )}
            </div>

            <div className="flex flex-col items-center justify-center space-y-8 w-full max-w-xl mx-auto">
                {visibility.clock && <Clock />}
                {visibility.search && <Search />}
                {visibility.quickLinks && <QuickLinks />}
            </div>
        </div>
    );
}
