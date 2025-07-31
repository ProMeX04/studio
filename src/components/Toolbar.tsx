
"use client"

import React from 'react';
import { cn } from "@/lib/utils";
import { toolbarRegistry } from '@/components/ToolbarRegistry';
import type { ToolbarItemConfig } from '@/app/types';

interface ToolbarProps {
    config: ToolbarItemConfig[];
    className?: string;
}

export function Toolbar({ config, className }: ToolbarProps) {
    return (
        <div className={cn(
            "flex flex-wrap items-center justify-center gap-2 bg-background/30 backdrop-blur-sm p-2 rounded-md",
            className
        )}>
            {config.map(({ id, component: componentName, props }) => {
                const Component = toolbarRegistry[componentName];
                if (!Component) {
                    console.warn(`Toolbar component "${componentName}" not found in registry.`);
                    return null;
                }
                return <Component key={id} {...props} />;
            })}
        </div>
    );
}
