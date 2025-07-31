"use client"

import React from "react"
import {
	PanelLeftOpen,
	PanelRightOpen,
	ChevronLeft,
	ChevronRight,
	Award,
	CheckCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Settings } from "@/components/Settings"
import { AdvancedVoiceChat } from "@/components/AdvancedVoiceChat"
import { useAppContext, ToolbarItem } from "@/contexts/AppContext"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { Settings } from "@/components/Settings"
import { AdvancedVoiceChat } from "@/components/AdvancedVoiceChat"

// Hàm render một mục trong thanh công cụ
const renderToolbarItem = (item: ToolbarItem) => {
	return <React.Fragment key={item.id}>{item.component}</React.Fragment>
}

export function Toolbar() {
	const { toolbarItems } = useAppContext()

	const leftItems = toolbarItems
		.filter((item) => item.area === "left")
		.sort((a, b) => a.order - b.order)
	const centerItems = toolbarItems
		.filter((item) => item.area === "center")
		.sort((a, b) => a.order - b.order)
	const rightItems = toolbarItems
		.filter((item) => item.area === "right")
		.sort((a, b) => a.order - b.order)

	return (
		<div className="absolute bottom-0 left-0 right-0 flex justify-between items-center p-2 z-40">
			<div className="flex-1 flex justify-start">
				<div className="flex items-center gap-2 bg-background/30 backdrop-blur-sm p-2 rounded-md">
					{leftItems.map(renderToolbarItem)}
				</div>
			</div>

			<div className="flex-shrink-0">
				<div className="flex flex-wrap items-center justify-center gap-2 bg-background/30 backdrop-blur-sm p-2 rounded-md">
					{centerItems.map(renderToolbarItem)}
				</div>
			</div>

			<div className="flex-1 flex justify-end">
				<div className="flex items-center gap-2 bg-background/30 backdrop-blur-sm p-2 rounded-md">
					{rightItems.map(renderToolbarItem)}
				</div>
			</div>
		</div>
	)
}
