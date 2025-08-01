
"use client"

import { useState, useEffect } from "react"
import { Plus, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
	DialogFooter,
	DialogClose,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "./ui/form"
import { cn } from "@/lib/utils"

interface QuickLink {
	id: number
	name: string
	url: string
}

const linkSchema = z.object({
	name: z.string().min(1, "Tên là bắt buộc"),
	url: z.string().url("Vui lòng nhập một URL hợp lệ"),
})

const MAX_LINKS = 20 // Giới hạn số lượng links

const defaultLinks: QuickLink[] = [
	{ id: 1, name: "GitHub", url: "https://github.com" },
	{ id: 2, name: "YouTube", url: "https://youtube.com" },
	{ id: 3, name: "Gmail", url: "https://gmail.com" },
	{ id: 4, name: "Firebase", url: "https://firebase.google.com" },
]

export function QuickLinks() {
	const [links, setLinks] = useState<QuickLink[]>([])
	const [isDialogOpen, setIsDialogOpen] = useState(false)
	const [editingLink, setEditingLink] = useState<QuickLink | null>(null)

	const form = useForm<z.infer<typeof linkSchema>>({
		resolver: zodResolver(linkSchema),
		defaultValues: { name: "", url: "" },
	})

	useEffect(() => {
		try {
			const storedLinks = localStorage.getItem("quickLinks")
			if (storedLinks) {
				setLinks(JSON.parse(storedLinks))
			} else {
				setLinks(defaultLinks)
			}
		} catch (error) {
			console.error(
				"Could not parse quick links from localStorage",
				error
			)
			setLinks(defaultLinks)
		}
	}, [])

	useEffect(() => {
		if (links.length > 0) {
			localStorage.setItem("quickLinks", JSON.stringify(links))
		}
	}, [links])

	const handleEdit = (link: QuickLink) => {
		setEditingLink(link)
		form.reset({ name: link.name, url: link.url })
		setIsDialogOpen(true)
	}

	const handleDelete = (id: number) => {
		setLinks(links.filter((link) => link.id !== id))
	}

	const openAddDialog = () => {
		setEditingLink(null)
		form.reset({ name: "", url: "" })
		setIsDialogOpen(true)
	}

	const onSubmit = (values: z.infer<typeof linkSchema>) => {
		if (editingLink) {
			setLinks(
				links.map((l) =>
					l.id === editingLink.id ? { ...l, ...values } : l
				)
			)
		} else {
			// Kiểm tra giới hạn số lượng
			if (links.length >= MAX_LINKS) {
				alert(`Chỉ có thể thêm tối đa ${MAX_LINKS} liên kết!`)
				return
			}
			setLinks([...links, { ...values, id: Date.now() }])
		}
		setIsDialogOpen(false)
	}

	const getIconForLink = (link: QuickLink) => {
		const lowerUrl = link.url.toLowerCase()
		if (lowerUrl.includes("github.com")) {
			return (
				<svg
					role="img"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
				>
					<title>GitHub</title>
					<path
						d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"
						fill="#181717"
					/>
				</svg>
			)
		}
		if (lowerUrl.includes("youtube.com")) {
			return (
				<svg
					role="img"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
					className="h-6 w-6"
				>
					<title>YouTube</title>
					<path
						d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
						fill="#FF0000"
					/>
				</svg>
			)
		}
		if (
			lowerUrl.includes("gmail.com") ||
			lowerUrl.includes("mail.google.com")
		) {
			return (
				<svg
					role="img"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
					className="h-6 w-6"
				>
					<title>Gmail</title>
					<path
						d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.71L12 16.64l-6.545-4.93v9.292H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.908 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"
						fill="#EA4335"
					/>
				</svg>
			)
		}
		if (lowerUrl.includes("firebase.google.com")) {
			return (
				<svg
					role="img"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
					className="h-6 w-6"
				>
					<title>Firebase</title>
					<path
						d="M4.213 15.548 3.03 5.41a.208.208 0 0 1 .25-.233l6.572 1.571a.208.208 0 0 1 .157.304l-3.32 5.419 2.286-1.32a.208.208 0 0 1 .26.039l2.747 3.42a.208.208 0 0 1-.165.341l-6.93-.456a.208.208 0 0 1-.19-.275zm15.424-7.235-8.54 15.65a.208.208 0 0 1-.366.01L7.1 18.067l7.55 4.36a.208.208 0 0 0 .285-.173L20.2 3.992a.208.208 0 0 0-.363-.279zM3.44.331.024 12.83a.208.208 0 0 0 .278.221L14.47 7.57a.208.208 0 0 0 .088-.35L3.841.34a.208.208 0 0 0-.401-.009z"
						fill="#FFCA28"
					/>
				</svg>
			)
		}
		try {
			const { hostname } = new URL(link.url)
			return (
				<img
					src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=32`}
					alt={`${link.name} favicon`}
					className="h-6 w-6"
				/>
			)
		} catch (e) {
			return (
				<img
					src={`https://www.google.com/s2/favicons?domain=example.com&sz=32`}
					alt={`${link.name} favicon`}
					className="h-6 w-6"
				/>
			)
		}
	}

	return (
		<div className="flex flex-wrap justify-center gap-3 w-full max-w-4xl mx-auto">
			{links.map((link) => (
				<div
					key={link.id}
					className="group relative bg-background/70 backdrop-blur-sm rounded-lg h-24 w-24 flex flex-col"
				>
					<a
						href={link.url}
						className="flex flex-col items-center justify-center gap-2 rounded-lg transition-colors h-full p-2 min-h-[96px]"
					>
						<div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary">
							<div className="w-6 h-6 flex items-center justify-center">
								{getIconForLink(link)}
							</div>
						</div>
						<span
							className="text-xs font-medium truncate w-full text-center leading-tight"
							style={{ textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}
							title={link.name}
						>
							{link.name}
						</span>
					</a>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100"
							>
								<MoreHorizontal className="h-3 w-3" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent>
							<DropdownMenuItem onSelect={() => handleEdit(link)}>
								<Pencil className="mr-2 h-4 w-4" /> Sửa
							</DropdownMenuItem>
							<DropdownMenuItem
								onSelect={() => handleDelete(link.id)}
								className="text-destructive"
							>
								<Trash2 className="mr-2 h-4 w-4" /> Xóa
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			))}
			<Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
				<DialogTrigger asChild>
					<div
						className="flex flex-col items-center justify-center gap-2 rounded-lg transition-colors h-24 w-24 cursor-pointer bg-background/70 backdrop-blur-sm p-2 min-h-[96px]"
						onClick={openAddDialog}
					>
						<div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary">
							<Plus className="h-4 w-4 text-muted-foreground" />
						</div>
						<span className="text-xs font-medium text-center leading-tight">
							Thêm liên kết
						</span>
					</div>
				</DialogTrigger>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>
							{editingLink ? "Sửa liên kết" : "Thêm liên kết mới"}
						</DialogTitle>
					</DialogHeader>
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							className="space-y-4"
						>
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Tên</FormLabel>
										<FormControl>
											<Input
												placeholder="ví dụ: Google"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="url"
								render={({ field }) => (
									<FormItem>
										<FormLabel>URL</FormLabel>
										<FormControl>
											<Input
												placeholder="https://google.com"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<DialogFooter>
								<DialogClose asChild>
									<Button type="button" variant="secondary">
										Hủy
									</Button>
								</DialogClose>
								<Button type="submit">Lưu</Button>
							</DialogFooter>
						</form>
					</Form>
				</DialogContent>
			</Dialog>
		</div>
	)
}
