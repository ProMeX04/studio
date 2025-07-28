
"use client"

import React, { useState, useMemo } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import type { TheorySet, GenerateMindMapOutput, MindMapNode } from "@/ai/schemas"
import { Skeleton } from "./ui/skeleton"
import { CheckCircle, Map, Menu, Plus, Minus, Share2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "./ui/scroll-area"

interface MindmapProps {
	theorySet: TheorySet | null
	topic: string;
	chapterIndex: number
	isCurrentUnderstood: boolean
}

const MindMapNodeView: React.FC<{ node: MindMapNode, level: number }> = ({ node, level }) => {
    const [isExpanded, setIsExpanded] = useState(level < 2); // Auto-expand first few levels
    const hasChildren = node.children && node.children.length > 0;

    const toggleExpansion = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (hasChildren) {
            setIsExpanded(!isExpanded);
        }
    };

    return (
        <li className="relative">
             {level > 0 && <div className="absolute top-0 left-[-1rem] w-px h-full bg-border" />}
             {level > 0 && <div className="absolute top-6 left-[-1rem] w-4 h-px bg-border" />}

            <div 
                className={cn(
                    "relative flex items-center gap-2 p-2 rounded-lg bg-background border border-primary/50 cursor-pointer hover:border-primary transition-colors w-fit",
                    isExpanded && hasChildren && "border-primary",
                    level > 0 && "mt-4"
                )}
                onClick={toggleExpansion}
            >
                {hasChildren ? (
                    isExpanded ? <Minus className="h-4 w-4 text-primary shrink-0"/> : <Plus className="h-4 w-4 text-primary shrink-0"/>
                ) : (
                    <Share2 className="h-4 w-4 text-muted-foreground/50 shrink-0"/>
                )}
                <span className="font-medium">{node.label}</span>
            </div>

            {hasChildren && isExpanded && (
                <ul className="pl-8 pt-2">
                    {node.children?.map((child) => (
                        <MindMapNodeView key={child.id} node={child} level={level + 1} />
                    ))}
                </ul>
            )}
        </li>
    );
};


function buildTreeFromEdges(edges: { parent: string; child: string }[], rootLabel: string): MindMapNode | null {
    if (!edges || edges.length === 0) return null;

    const nodes: { [key: string]: MindMapNode } = {};

    // Create all nodes
    edges.forEach(edge => {
        if (!nodes[edge.parent]) {
            nodes[edge.parent] = { id: edge.parent, label: edge.parent, children: [] };
        }
        if (!nodes[edge.child]) {
            nodes[edge.child] = { id: edge.child, label: edge.child, children: [] };
        }
    });

    // Build the tree
    edges.forEach(edge => {
        // Ensure parent and child nodes exist
        if (nodes[edge.parent] && nodes[edge.child]) {
            // Prevent adding a node as a child of itself
            if (edge.parent !== edge.child) {
                 // Check if the child is already a child of the parent
                if (!nodes[edge.parent].children.some(c => c.id === edge.child)) {
                    nodes[edge.parent].children.push(nodes[edge.child]);
                }
            }
        }
    });

    // Find the root node. It can be the one specified or one that is never a child.
    let root = nodes[rootLabel];
    if (root) return root;

    const childNodes = new Set(edges.map(e => e.child));
    const rootCandidates = Object.keys(nodes).filter(nodeId => !childNodes.has(nodeId));
    
    return rootCandidates.length > 0 ? nodes[rootCandidates[0]] : null;
}


export function Mindmap({ theorySet, chapterIndex, isCurrentUnderstood }: MindmapProps) {
	const currentChapter = theorySet?.chapters?.[chapterIndex];
	const hasContent = !!currentChapter;
    const mindMapData = currentChapter?.mindMap;

    const mindMapTree = useMemo(() => {
        if (!mindMapData || !currentChapter?.title) return null;
        return buildTreeFromEdges(mindMapData.edges, currentChapter.title);
    }, [mindMapData, currentChapter?.title]);

	return (
		<div className="h-full w-full flex flex-col bg-transparent shadow-none border-none">
			<div className="flex-grow w-full flex items-center justify-center overflow-hidden">
				{hasContent ? (
					<div className="w-full h-full flex flex-col items-center">
                        <div className="relative w-full text-center pt-4">
                            <h1 className="text-4xl font-bold text-shadow bg-background/50 backdrop-blur-sm rounded-lg inline-block px-4 py-2">{currentChapter.title}</h1>
						    {isCurrentUnderstood && <CheckCircle className="absolute top-4 right-4 text-success w-8 h-8 bg-background rounded-full p-1" />}
                        </div>
						{mindMapTree ? (
                            <ScrollArea className="w-full h-full p-8">
                                <ul className="mindmap-tree">
                                    <MindMapNodeView node={mindMapTree} level={0} />
                                </ul>
                            </ScrollArea>
						) : (
							<div className="w-full h-full flex flex-col items-center justify-center p-8">
                                 {currentChapter.content ? (
                                    <Skeleton className="w-full h-3/4" />
                                 ) : (
                                    <p>Đang chờ tạo nội dung lý thuyết...</p>
                                 )}
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
