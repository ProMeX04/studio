
"use client"

import React, { useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { TheorySet } from "@/ai/schemas"
import { ScrollArea } from "./ui/scroll-area"
import { Skeleton } from "./ui/skeleton"
import { CheckCircle, Podcast as PodcastIcon, Menu, Plus, PlayCircle } from "lucide-react"

interface PodcastProps {
	theorySet: TheorySet | null
	topic: string;
	chapterIndex: number;
	isCurrentUnderstood: boolean;
}

export function Podcast({ theorySet, chapterIndex, isCurrentUnderstood }: PodcastProps) {
	const currentChapter = theorySet?.chapters?.[chapterIndex];
	const hasContent = !!currentChapter;
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        // Pause and reset audio when chapter changes
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    }, [chapterIndex]);


	return (
		<div className="h-full flex flex-col bg-transparent shadow-none border-none">
			<div className="flex-grow flex items-center justify-center overflow-y-auto pb-4">
				{hasContent ? (
					<ScrollArea className="h-full w-full pr-4">
						<div className="w-full max-w-5xl mx-auto relative pt-4">
							<h1 className="text-4xl font-bold mb-4 text-center">{currentChapter.title}</h1>
							<p className="text-lg text-muted-foreground text-center mb-8">Podcast cho chương này</p>
							
                            {isCurrentUnderstood && <CheckCircle className="absolute top-0 right-0 text-success w-6 h-6" />}

                            {currentChapter.audioDataUri ? (
                                <div className="mb-8 sticky top-0 z-10 bg-background/80 backdrop-blur-sm p-2 rounded-lg">
                                    <audio ref={audioRef} controls src={currentChapter.audioDataUri} className="w-full">
                                        Trình duyệt của bạn không hỗ trợ thẻ audio.
                                    </audio>
                                </div>
                            ) : (
                                <div className="mb-8 flex flex-col items-center justify-center p-4 border border-dashed rounded-lg">
                                    <Skeleton className="h-10 w-full" />
                                    <p className="text-sm text-muted-foreground mt-2">Đang tạo âm thanh...</p>
                                </div>
                            )}

							<div className="prose dark:prose-invert max-w-none text-lg space-y-4">
								{currentChapter.podcastScript ? (
									currentChapter.podcastScript.split('\n').map((line, index) => {
                                        if (!line.trim()) return null;
                                        const parts = line.split(':');
                                        const speaker = parts[0]?.trim();
                                        const dialogue = parts.slice(1).join(':').trim();

                                        const isHost = speaker === 'Người dẫn chương trình';

                                        return (
                                            <div key={index} className={`flex ${isHost ? 'justify-start' : 'justify-end'}`}>
                                                <div className={`p-4 rounded-lg max-w-[80%] ${isHost ? 'bg-secondary' : 'bg-primary text-primary-foreground'}`}>
                                                    <p className="font-bold mb-1">{speaker}</p>
                                                    <p className="my-0">{dialogue}</p>
                                                </div>
                                            </div>
                                        );
                                    })
								) : (
									<div className="space-y-4 pt-4">
										<Skeleton className="h-8 w-3/4" />
										<Skeleton className="h-6 w-full" />
										<Skeleton className="h-6 w-full" />
										<Skeleton className="h-6 w-5/6" />
									</div>
								)}
							</div>
						</div>
					</ScrollArea>
				) : (
					<Card className="w-full max-w-lg text-center bg-background/80 backdrop-blur-sm">
						<CardHeader>
							<div className="mx-auto bg-primary/10 p-4 rounded-full">
								<PodcastIcon className="w-12 h-12 text-primary" />
							</div>
							<CardTitle className="mt-4 text-2xl">Học qua Podcast</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-muted-foreground">
								Nhấn vào nút <strong className="text-foreground">Menu</strong> <Menu className="inline w-4 h-4" /> trên thanh công cụ, sau đó nhấn nút <Plus className="inline w-4 h-4" /> để AI tạo nội dung lý thuyết và podcast cho bạn.
							</p>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}
