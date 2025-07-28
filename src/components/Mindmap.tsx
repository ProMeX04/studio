
"use client"

import React, { useMemo } from "react"
import ReactFlow, { MiniMap, Controls, Background, type Node, type Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import type { TheorySet, GenerateMindMapOutput } from "@/ai/schemas"
import { Skeleton } from "./ui/skeleton"
import { CheckCircle, Map, Menu, Plus } from "lucide-react"
import { getDb } from "@/lib/idb";
import { DagreLayout } from "@/lib/mindmap-layout";

interface MindmapProps {
	theorySet: TheorySet | null
	topic: string;
	chapterIndex: number;
	isCurrentUnderstood: boolean;
}


const layout = new DagreLayout();

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction: 'TB' | 'LR' = 'TB') => {
  const { nodes: layoutedNodes, edges: layoutedEdges } = layout.getLayoutedElements(
    nodes,
    edges,
    direction
  );

  return { nodes: layoutedNodes, edges: layoutedEdges };
};


export function Mindmap({ theorySet, chapterIndex, isCurrentUnderstood }: MindmapProps) {
	const currentChapter = theorySet?.chapters?.[chapterIndex];
	const hasContent = !!currentChapter;
    const mindMapData = currentChapter?.mindMap;

	const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
		if (!mindMapData || !Array.isArray(mindMapData.nodes) || !Array.isArray(mindMapData.edges)) {
			return { nodes: [], edges: [] };
		}
		const nodes = mindMapData.nodes.map(node => ({
			...node,
			position: { x: 0, y: 0 } // initial position
		}));
		return getLayoutedElements(nodes, mindMapData.edges);
	}, [mindMapData]);
	
	return (
		<div className="h-full w-full flex flex-col bg-transparent shadow-none border-none">
			<div className="flex-grow w-full flex items-center justify-center overflow-auto">
				{hasContent ? (
					<div className="w-full h-full relative">
						{mindMapData ? (
							<>
								<ReactFlow
									nodes={layoutedNodes}
									edges={layoutedEdges}
									fitView
									className="bg-transparent"
									proOptions={{ hideAttribution: true }}
								>
									<Controls />
									<MiniMap />
									<Background gap={16} />
								</ReactFlow>
								<div className="absolute top-4 left-4 right-4 text-center pointer-events-none">
									<h1 className="text-4xl font-bold text-shadow bg-background/50 backdrop-blur-sm rounded-lg inline-block px-4 py-2">{currentChapter.title}</h1>
								</div>
								{isCurrentUnderstood && <CheckCircle className="absolute top-4 right-4 text-success w-8 h-8 bg-background rounded-full p-1" />}
							</>
						) : (
							<div className="w-full h-full flex flex-col items-center justify-center">
								<h1 className="text-4xl font-bold mb-8 text-center">{currentChapter.title}</h1>
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
