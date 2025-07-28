
"use client"

import React from "react"
import { AppProvider, useAppContext } from "@/contexts/AppContext"
import LeftColumn from "@/components/LeftColumn"
import RightColumn from "@/components/RightColumn"
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Settings } from "@/components/Settings"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { PanelLeftOpen, PanelRightOpen } from "lucide-react"

function HomePageContent() {
	const { 
		isMounted, 
		backgroundImage, 
		visibility, 
		onVisibilityChange,
		onClearAllData,
		onBackgroundChange,
		uploadedBackgrounds,
		onUploadedBackgroundsChange,
	} = useAppContext()

	if (!isMounted) {
		return null
	}

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
		<main className="relative min-h-screen w-full">
			{backgroundImage && (
				<div
					className="absolute inset-0 bg-cover bg-center"
					style={{ backgroundImage: `url(${backgroundImage})` }}
				>
					<div className="absolute inset-0 bg-black/60"></div>
				</div>
			)}
			
			<div className="absolute top-0 left-0 p-4 sm:p-8 md:p-12 z-20">
                <Settings {...globalSettingsProps} scope="global" />
            </div>

			{!visibility.home && (
				<Button
					variant="outline"
					className="absolute left-4 top-1/2 -translate-y-1/2 z-30"
					onClick={() => onVisibilityChange({ ...visibility, home: true })}
				>
					<PanelLeftOpen className="h-4 w-4" />
				</Button>
			)}

			{!visibility.learn && (
				<Button
					variant="outline"
					className="absolute right-4 top-1/2 -translate-y-1/2 z-30"
					onClick={() => onVisibilityChange({ ...visibility, learn: true })}
				>
					<PanelRightOpen className="h-4 w-4" />
				</Button>
			)}

			<ResizablePanelGroup 
				direction="horizontal" 
				className="relative min-h-screen w-full"
			>
				<ResizablePanel 
					defaultSize={visibility.home ? 45 : 0}
					minSize={30}
					collapsible={true}
					collapsedSize={0}
					onCollapse={() => {
						onVisibilityChange({ ...visibility, home: false })
					}}
					onExpand={() => {
						onVisibilityChange({ ...visibility, home: true })
					}}
					className={cn(!visibility.home && "min-w-0")}
				>
					<LeftColumn />
				</ResizablePanel>

				<ResizableHandle className="bg-transparent" />
				
				<ResizablePanel 
					defaultSize={visibility.learn ? 55 : 0}
					minSize={30}
					collapsible={true}
					collapsedSize={0}
					onCollapse={() => {
						onVisibilityChange({ ...visibility, learn: false })
					}}
					onExpand={() => {
						onVisibilityChange({ ...visibility, learn: true })
					}}
					className={cn(!visibility.learn && "min-w-0")}
				>
					<RightColumn />
				</ResizablePanel>
			</ResizablePanelGroup>
		</main>
	)
}

export default function Home() {
	return (
		<AppProvider>
			<HomePageContent />
		</AppProvider>
	)
}
