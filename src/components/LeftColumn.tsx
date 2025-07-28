
"use client"

import React from 'react';
import { useAppContext } from "@/contexts/AppContext"
import { Settings } from "@/components/Settings"
import { Greeting } from "@/components/Greeting"
import { Clock } from "@/components/Clock"
import { Search } from "@/components/Search"
import { QuickLinks } from "@/components/QuickLinks"

export default function LeftColumn() {
    const { 
        visibility, 
        onVisibilityChange, 
        onClearAllData, 
        onBackgroundChange, 
        uploadedBackgrounds, 
        onUploadedBackgroundsChange, 
        backgroundImage 
    } = useAppContext();

    const globalSettingsProps = {
        onClearAllData,
        onVisibilityChange,
        onBackgroundChange,
        onUploadedBackgroundsChange,
        visibility,
        uploadedBackgrounds,
        currentBackgroundImage: backgroundImage,
    };

    return (
        <div className="relative flex h-screen flex-col justify-center overflow-hidden">
            <div className="absolute top-0 left-0 right-0 p-4 sm:p-8 md:p-12 flex justify-start items-center gap-4">
                <Settings {...globalSettingsProps} scope="global" />
                {visibility.greeting && <Greeting />}
            </div>

            <div className="flex flex-col items-center justify-center space-y-8 w-full max-w-xl mx-auto p-4 sm:p-8 md:p-12">
                {visibility.clock && <Clock />}
                {visibility.search && <Search />}
                {visibility.quickLinks && <QuickLinks />}
            </div>
        </div>
    );
}
