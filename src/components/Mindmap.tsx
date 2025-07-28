
"use client"

import React from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import type { TheorySet, MindMapNode } from "@/ai/schemas"
import { ScrollArea } from "./ui/scroll-area"
import { Skeleton } from "./ui/skeleton"
import { CheckCircle, Map, Menu, Plus } from "lucide-react"

interface MindmapProps {
	theorySet: TheorySet | null
	topic: string;
	chapterIndex: number;
	isCurrentUnderstood: boolean;
}

const NodeComponent = ({ node, level = 0 }: { node: MindMapNode, level?: number }) => {
    const hasChildren = node.children && node.children.length > 0;
    
    return (
        <div className="relative pl-8">
            {/* Vertical connector line for all but the root */}
            {level > 0 && <div className="absolute top-0 left-4 w-px h-full bg-border -translate-x-1/2"></div>}
            
            {/* Node and horizontal connector */}
            <div className="flex items-center">
                {/* Horizontal connector */}
                {level > 0 && <div className="absolute top-1/2 left-0 w-8 h-px bg-border -translate-y-1/2"></div>}
                
                {/* The node itself */}
                <div className={`relative z-10 p-3 rounded-lg shadow-md border ${level === 0 ? 'bg-primary text-primary-foreground' : 'bg-background'}`}>
                    <p className="text-sm font-medium">{node.name}</p>
                </div>
            </div>

            {/* Children nodes */}
            {hasChildren && (
                <div className="pt-4 space-y-4">
                    {node.children!.map((child, index) => (
                        <NodeComponent key={index} node={child} level={level + 1} />
                    ))}
                </div>
            )}
        </div>
    );
};


export function Mindmap({ theorySet, chapterIndex, isCurrentUnderstood }: MindmapProps) {
	const currentChapter = theorySet?.chapters?.[chapterIndex];
	const hasContent = !!currentChapter;
    const mindMapData = currentChapter?.mindMap;

	return (
		<div className="h-full flex flex-col bg-transparent shadow-none border-none">
			<div className="flex-grow flex items-center justify-center overflow-auto p-4">
				{hasContent ? (
					<ScrollArea className="h-full w-full pr-4">
						<div className="w-full max-w-5xl mx-auto relative pt-4">
							<h1 className="text-4xl font-bold mb-8 text-center">{currentChapter.title}</h1>
							{isCurrentUnderstood && <CheckCircle className="absolute top-0 right-0 text-success w-6 h-6" />}
							
                            {mindMapData ? (
                                <div className="flex justify-center p-8">
                                    <NodeComponent node={mindMapData} />
                                </div>
                            ) : (
                                <div className="space-y-4 pt-4">
                                    <p className="text-center text-muted-foreground">Đang tạo sơ đồ tư duy...</p>
                                    <Skeleton className="h-12 w-3/4 mx-auto" />
                                    <div className="flex justify-around">
                                        <Skeleton className="h-24 w-1/4" />
                                        <Skeleton className="h-24 w-1/4" />
                                        <Skeleton className="h-24 w-1/4" />
                                    </div>
                                </div>
                            )}
						</div>
					</ScrollArea>
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
