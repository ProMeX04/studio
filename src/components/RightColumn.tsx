
"use client"

import React from "react"
import { useAuthContext } from "@/contexts/AuthContext"
import { useSettingsContext } from "@/contexts/SettingsContext"
import { ApiKeyGuide } from "@/components/ApiKeyGuide"
import { Learn } from "@/components/Learn"
import { Login } from "@/components/Login"
import { Loader, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"

function FirebaseConfigError() {
    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4">
            <Card className="w-full max-w-lg text-center p-8 bg-destructive/10 border-destructive">
                <CardHeader className="p-0 mb-6">
                    <div className="flex items-center justify-center gap-4 mb-4">
                        <AlertTriangle className="w-12 h-12 text-destructive" />
                    </div>
                    <CardTitle className="text-2xl font-bold text-destructive">
                        Lỗi Cấu hình Firebase
                    </CardTitle>
                    <CardDescription className="text-lg mt-2 text-destructive/80">
                        Không thể kết nối đến Firebase. Vui lòng kiểm tra lại các biến môi trường trong file `.env.local` của bạn và chắc chắn rằng bạn đã khởi động lại máy chủ Next.js.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0 text-left bg-background/50 rounded-lg p-4">
                    <p className="text-sm font-mono">
                        1. Sao chép `\.env.local.example` thành `\.env.local`.<br />
                        2. Điền các giá trị từ dự án Firebase của bạn.<br />
                        3. Chạy lại `npm run dev`.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}


export default function RightColumn() {
	const { user, loading, isFirebaseConfigured } = useAuthContext();
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

    if (!isFirebaseConfigured) {
        return <FirebaseConfigError />;
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
