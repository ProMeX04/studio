
"use client"

import React, { ReactNode } from 'react';
import { cn } from "@/lib/utils";
import type { ToolbarItemConfig } from '@/app/types';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings } from '@/components/Settings';
import { AdvancedVoiceChat } from '@/components/AdvancedVoiceChat';
import { CheckCircle, Award, ChevronLeft, ChevronRight } from 'lucide-react';

// --- Individual Toolbar Components ---

const SelectView = ({ value, onValueChange }: { value: string, onValueChange: (v: string) => void }) => (
    <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-[150px] h-9">
            <SelectValue placeholder="Chọn chế độ" />
        </SelectTrigger>
        <SelectContent>
            <SelectItem value="theory">Lý thuyết</SelectItem>
            <SelectItem value="flashcards">Flashcard</SelectItem>
            <SelectItem value="quiz">Trắc nghiệm</SelectItem>
        </SelectContent>
    </Select>
);

const NavControls = ({ onPrev, onNext, isDisabled, isPrevDisabled, isNextDisabled, label }: any) => (
    <div className="flex items-center gap-1">
        <Button onClick={onPrev} disabled={isDisabled || isPrevDisabled} variant="outline" size="icon" className="h-9 w-9">
            <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground w-24 text-center px-2">{label}</span>
        <Button onClick={onNext} disabled={isDisabled || isNextDisabled} variant="outline" size="icon" className="h-9 w-9">
            <ChevronRight className="h-4 w-4" />
        </Button>
    </div>
);

const CustomComponent = ({ children }: { children: ReactNode }) => <>{children}</>;

// --- Component Registry ---

const toolbarRegistry: { [key: string]: React.ComponentType<any> } = {
    'SelectView': SelectView,
    'NavControls': NavControls,
    'Settings': Settings,
    'AdvancedVoiceChat': AdvancedVoiceChat,
    'Custom': CustomComponent,
};


// --- Main Toolbar Component ---

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
