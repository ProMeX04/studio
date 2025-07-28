
"use client"

import React, { useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import type { TheorySet, GenerateMindMapOutput } from "@/ai/schemas"
import { Skeleton } from "./ui/skeleton"
import { CheckCircle, Map, Menu, Plus, Minus, Share2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "./ui/scroll-area"

interface MindmapProps {
	theorySet: TheorySet | null
	chapterIndex: number
	isCurrentUnderstood: boolean
}

const MindMapNodeView: React.FC<{ node: GenerateMindMapOutput, level: number }> = ({ node, level }) => {
    const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first few levels
    const hasChildren = node.children && node.children.length > 0;

    const toggleExpansion = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (hasChildren) {
            setIsExpanded(!isExpanded);
        }
    };

    return (
        <li className={cn(
            "relative",
            level > 0 && "pl-8 pt-4", // Indent children
        )}>
            {/* Vertical line connecting to sibling/parent */}
            {level > 0 && <span className="absolute left-4 top-0 w-px h-full bg-border -translate-x-1/2"></span>}
            
            <div className="flex items-center gap-2">
                 {/* Horizontal line connecting to node */}
                {level > 0 && <span className="absolute left-4 top-[1.3rem] w-4 h-px bg-border -translate-y-1/2"></span>}

                {/* Node Content */}
                <div 
                    className={cn(
                        "relative flex items-center gap-2 p-2 rounded-lg bg-background border border-primary/50 cursor-pointer hover:border-primary transition-colors",
                        isExpanded && hasChildren && "border-primary"
                    )}
                    onClick={toggleExpansion}
                >
                    {hasChildren ? (
                        isExpanded ? <Minus className="h-4 w-4 text-primary shrink-0"/> : <Plus className="h-4 w-4 text-primary shrink-0"/>
                    ) : (
                        <Share2 className="h-4 w-4 text-muted-foreground shrink-0"/>
                    )}
                    <span className="font-medium">{node.label}</span>
                </div>
            </div>

            {hasChildren && isExpanded && (
                <ul className="pt-2">
                    {node.children?.map((child, index) => (
                        <MindMapNodeView key={index} node={child} level={level + 1} />
                    ))}
                </ul>
            )}
        </li>
    );
};


export function Mindmap({ theorySet, chapterIndex, isCurrentUnderstood }: MindmapProps) {
	const currentChapter = theorySet?.chapters?.[chapterIndex];
	const hasContent = !!currentChapter;
    const mindMapData = currentChapter?.mindMap;

	return (
		<div className="h-full w-full flex flex-col bg-transparent shadow-none border-none">
			<div className="flex-grow w-full flex items-center justify-center overflow-hidden">
				{hasContent ? (
					<div className="w-full h-full flex flex-col items-center">
                        <div className="relative w-full text-center pt-4">
                            <h1 className="text-4xl font-bold text-shadow bg-background/50 backdrop-blur-sm rounded-lg inline-block px-4 py-2">{currentChapter.title}</h1>
						    {isCurrentUnderstood && <CheckCircle className="absolute top-4 right-4 text-success w-8 h-8 bg-background rounded-full p-1" />}
                        </div>
						{mindMapData ? (
                            <ScrollArea className="w-full h-full p-8">
                                <ul className="flex flex-col items-start">
                                    <MindMapNodeView node={mindMapData} level={0} />
                                </ul>
                            </ScrollArea>
						) : (
							<div className="w-full h-full flex flex-col items-center justify-center p-8">
								<Skeleton className="w-full h-3/4" />
							</div>
						)}
					</div>
				) : (
					<Card className="w-full max-w-lg text-center bg-background/80 backdrop-blur-sm">
						<CardHeader>
							<div className="mx-auto bg-primary/10 p-4 rounded-full">
								<Map className="w-12 h-12 text-primary" />
							</div>
							<CardTitle className="mt-4 text-2xl">Khám phá với Sơ đồ tư duy</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-muted-foreground">
								Nhấn vào nút <strong className="text-foreground">Menu</strong> <Menu className="inline w-4 h-4" /> trên thanh công cụ, sau đó nhấn nút <Plus className="inline w-4 h-4" /> để AI tạo nội dung lý thuyết và sơ đồ tư duy cho bạn.
							</p>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}
