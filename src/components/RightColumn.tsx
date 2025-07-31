

"use client"

import React from "react"
import { useAuthContext } from "@/contexts/AuthContext"
import { useSettingsContext } from "@/contexts/SettingsContext"
import { ApiKeyGuide } from "@/components/ApiKeyGuide"
import { Learn } from "@/components/Learn"
import { Login } from "@/components/Login"
import { Loader } from "lucide-react"

export default function RightColumn() {
	const { user, loading } = useAuthContext();
	const { visibility, hasCompletedOnboarding } = useSettingsContext()

	if (!visibility.learn) {
		return null
	}
	
	if (loading) {
		return (
			<div className="flex h-full w-full items-center justify-center">
				<Loader className="h-8 w-8 animate-spin" />
			</div>
		)
	}

	return (
		<div className="relative flex flex-col h-screen overflow-hidden">
			<div className="flex flex-col w-full h-full">
				{!user ? (
					<Login />
				) : hasCompletedOnboarding ? (
					<Learn />
				) : (
					<ApiKeyGuide />
				)}
			</div>
		</div>
	)
}
