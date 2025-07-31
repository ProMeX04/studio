
"use client"

import React from 'react';
import { cn } from "@/lib/utils";

interface ToolbarProps {
    components: React.ReactNode[];
    className?: string;
}

export function Toolbar({ components, className }: ToolbarProps) {
    return (
        <div className={cn(
            "flex flex-wrap items-center justify-center gap-2 bg-background/30 backdrop-blur-sm p-2 rounded-md",
            className
        )}>
            {components.map((component, index) => (
                <React.Fragment key={index}>
                    {component}
                </React.Fragment>
            ))}
        </div>
    );
}
