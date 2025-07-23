
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Settings as SettingsIcon, CheckCircle, Upload, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from './ui/separator';
import type { ComponentVisibility } from '@/app/page';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { ThemeToggle } from './ThemeToggle';
import { getDb } from '@/lib/idb';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface SettingsProps {
  onSettingsSave: (settings: {
    topic: string;
    language: string;
    flashcardMax: number;
    quizMax: number;
    flashcardDisplayMax: number;
    quizDisplayMax: number;
  }) => void;
  onVisibilityChange: (visibility: ComponentVisibility) => void;
  onViewChange: (view: 'flashcards' | 'quiz') => void;
  onBackgroundChange: (background: string | null) => void;
  onUploadedBackgroundsChange: (backgrounds: string[]) => void;
  onFlashcardSettingsChange: (settings: { isRandom: boolean }) => void;
}

const languages = [
    { value: 'Vietnamese', label: 'Tiếng Việt' },
    { value: 'English', label: 'English' },
    { value: 'Spanish', label: 'Español' },
    { value: 'French', label: 'Français' },
    { value: 'German', label: 'Deutsch' },
    { value: 'Japanese', label: '日本語' },
    { value: 'Korean', label: '한국어' },
];

const MAX_UPLOADED_IMAGES = 6;

function GoogleIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="h-4 w-4">
            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
            <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
            <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.657-3.657-11.303-8H6.393c3.56,8.277,12.074,14,21.607,14L24,44z" />
            <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C42.012,35.536,44,30.228,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
        </svg>
    )
}

export function Settings({ onSettingsSave, onVisibilityChange, onViewChange, onBackgroundChange, onUploadedBackgroundsChange, onFlashcardSettingsChange }: SettingsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [topic, setTopic] = useState('');
  const [view, setView] = useState<'flashcards' | 'quiz'>('flashcards');
  const [language, setLanguage] = useState('Vietnamese');
  const [flashcardMax, setFlashcardMax] = useState(50);
  const [quizMax, setQuizMax] = useState(50);
  const [flashcardDisplayMax, setFlashcardDisplayMax] = useState(10);
  const [quizDisplayMax, setQuizDisplayMax] = useState(10);
  const [flashcardIsRandom, setFlashcardIsRandom] = useState(false);
  const [visibility, setVisibility] = useState<ComponentVisibility>({
    clock: true,
    greeting: true,
    search: true,
    quickLinks: true,
    learn: true,
  });
  const [selectedBackground, setSelectedBackground] = useState<string | null>(null);
  const [uploadedBackgrounds, setUploadedBackgrounds] = useState<string[]>([]);
  const { user, signInWithGoogle, signOut, loading: authLoading } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadSettings = useCallback(async () => {
    if (!authLoading) {
      const db = await getDb(user?.uid);
      const savedTopic = (await db.get('data', 'topic'))?.data as string || 'Lịch sử La Mã';
      const savedView = (await db.get('data', 'view'))?.data as 'flashcards' | 'quiz' || 'flashcards';
      const savedLanguage = (await db.get('data', 'language'))?.data as string || 'Vietnamese';
      const savedFlashcardMax = (await db.get('data', 'flashcardMax'))?.data as number || 50;
      const savedQuizMax = (await db.get('data', 'quizMax'))?.data as number || 50;
      const savedFlashcardDisplayMax = (await db.get('data', 'flashcardDisplayMax'))?.data as number || 10;
      const savedQuizDisplayMax = (await db.get('data', 'quizDisplayMax'))?.data as number || 10;
      const savedFlashcardIsRandom = (await db.get('data', 'flashcardIsRandom'))?.data as boolean || false;
      const savedVisibility = (await db.get('data', 'visibility'))?.data as ComponentVisibility;
      const savedBg = (await db.get('data', 'background'))?.data as string | null;
      const savedUploadedBgs = (await db.get('data', 'uploadedBackgrounds'))?.data as string[] || [];
      
      setTopic(savedTopic);
      setView(savedView);
      setLanguage(savedLanguage);
      setFlashcardMax(savedFlashcardMax);
      setQuizMax(savedQuizMax);
      setFlashcardDisplayMax(savedFlashcardDisplayMax);
      setQuizDisplayMax(savedQuizDisplayMax);
      setFlashcardIsRandom(savedFlashcardIsRandom);
      setVisibility(savedVisibility ?? {
        clock: true,
        greeting: true,
        search: true,
        quickLinks: true,
        learn: true,
      });
      setSelectedBackground(savedBg);
      setUploadedBackgrounds(savedUploadedBgs);
    }
  }, [authLoading, user?.uid]);

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen, loadSettings]);

  const handleVisibilitySwitch = (component: keyof ComponentVisibility, checked: boolean) => {
    const newVisibility = { ...visibility, [component]: checked };
    setVisibility(newVisibility);
    onVisibilityChange(newVisibility);
  };

  const handleViewChange = (newView: 'flashcards' | 'quiz') => {
    setView(newView);
    onViewChange(newView);
  }

  const handleFlashcardRandomToggle = (isRandom: boolean) => {
    setFlashcardIsRandom(isRandom);
    onFlashcardSettingsChange({ isRandom });
  }
  
  const handleSelectBackground = (url: string) => {
    setSelectedBackground(url);
    onBackgroundChange(url);
  };

  const handleBackgroundUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        const newUploadedBgs = [result, ...uploadedBackgrounds].slice(0, MAX_UPLOADED_IMAGES);
        setUploadedBackgrounds(newUploadedBgs);
        onUploadedBackgroundsChange(newUploadedBgs);
        handleSelectBackground(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveBackground = () => {
    setSelectedBackground(null);
    onBackgroundChange(null);
  };

  const handleFinalSave = () => {
     onSettingsSave({
      topic,
      language,
      flashcardMax: Number(flashcardMax),
      quizMax: Number(quizMax),
      flashcardDisplayMax: Number(flashcardDisplayMax),
      quizDisplayMax: Number(quizDisplayMax),
    });
    setIsOpen(false);
  }

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <SettingsIcon className="h-5 w-5" />
          <span className="sr-only">Cài đặt</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="max-h-[100vh] w-[400px] sm:max-w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Cài đặt</SheetTitle>
        </SheetHeader>
        <div className="grid gap-6 py-4">
           <Separator />
            <div className="space-y-4">
                <Label className="font-medium text-foreground">Tài khoản</Label>
                <div className="pl-4">
                    {authLoading ? (
                        <p>Đang tải...</p>
                    ) : user ? (
                        <div className="flex items-center gap-4">
                            <Avatar>
                                <AvatarImage src={user.photoURL ?? undefined} alt={user.displayName ?? 'User'} />
                                <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                                <span className="font-semibold">{user.displayName}</span>
                                <span className="text-sm text-muted-foreground">{user.email}</span>
                            </div>
                            <Button variant="outline" size="sm" onClick={signOut} className="ml-auto">Đăng xuất</Button>
                        </div>
                    ) : (
                        <Button variant="outline" onClick={signInWithGoogle}>
                           <GoogleIcon />
                            Đăng nhập với Google
                        </Button>
                    )}
                </div>
            </div>
            <Separator />
            <div className="space-y-2">
                <Label className="font-medium text-foreground">Giao diện</Label>
                 <div className="pl-10">
                    <ThemeToggle />
                </div>
            </div>
          <Separator />
          <div className="space-y-4">
            <Label className="font-medium text-foreground">Hình nền</Label>
            <div className='flex items-center gap-2'>
                <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />
                    Tải ảnh lên
                </Button>
                <Button variant="ghost" size="icon" onClick={handleRemoveBackground} aria-label="Xóa hình nền">
                  <Trash2 className="h-4 w-4" />
                </Button>
            </div>
             <input
              type="file"
              ref={fileInputRef}
              onChange={handleBackgroundUpload}
              className="hidden"
              accept="image/*"
            />
            <div className="grid grid-cols-3 gap-2">
                {uploadedBackgrounds.map((bg, index) => (
                    <div key={`uploaded-${index}`} className="relative cursor-pointer group" onClick={() => handleSelectBackground(bg)}>
                         <Image src={bg} alt={`Uploaded background ${index + 1}`} width={100} height={60} className={cn("rounded-md object-cover aspect-video", selectedBackground === bg && 'ring-2 ring-primary ring-offset-2 ring-offset-background')} />
                        {selectedBackground === bg && <CheckCircle className="absolute top-1 right-1 h-5 w-5 text-primary bg-background rounded-full" />}
                    </div>
                ))}
            </div>
          </div>
          <Separator />
           <div className="space-y-4">
            <Label className="font-medium text-foreground">Cài đặt học tập</Label>
             <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="topic" className="text-right">
                Chủ đề
                </Label>
                <Input
                id="topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="col-span-3"
                placeholder="ví dụ: Lịch sử La Mã"
                />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="language" className="text-right">
                Ngôn ngữ
                </Label>
                <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Chọn một ngôn ngữ" />
                    </SelectTrigger>
                    <SelectContent>
                        {languages.map((lang) => (
                            <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <Tabs value={view} onValueChange={(value) => handleViewChange(value as 'flashcards' | 'quiz')} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="flashcards">Flashcard</TabsTrigger>
                <TabsTrigger value="quiz">Trắc nghiệm</TabsTrigger>
              </TabsList>
              <TabsContent value="flashcards" className="space-y-4 pt-4">
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="flashcardIsRandom" className="text-right">
                    Ngẫu nhiên
                    </Label>
                    <div className="col-span-3">
                        <Switch
                            id="flashcardIsRandom"
                            checked={flashcardIsRandom}
                            onCheckedChange={handleFlashcardRandomToggle}
                        />
                    </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="flashcardMax" className="text-right">
                    Số lượng tối đa
                    </Label>
                    <Input
                    id="flashcardMax"
                    type="number"
                    value={flashcardMax}
                    onChange={(e) => setFlashcardMax(Number(e.target.value))}
                    className="col-span-3"
                    placeholder="ví dụ: 50"
                    />
                </div>
                 <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="flashcardDisplayMax" className="text-right">
                    Số lượng hiển thị
                    </Label>
                    <Input
                    id="flashcardDisplayMax"
                    type="number"
                    value={flashcardDisplayMax}
                    onChange={(e) => setFlashcardDisplayMax(Number(e.target.value))}
                    className="col-span-3"
                    placeholder="ví dụ: 10"
                    />
                </div>
              </TabsContent>
              <TabsContent value="quiz" className="space-y-4 pt-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="quizMax" className="text-right">
                    Số lượng tối đa
                    </Label>
                    <Input
                    id="quizMax"
                    type="number"
                    value={quizMax}
                    onChange={(e) => setQuizMax(Number(e.target.value))}
                    className="col-span-3"
                    placeholder="ví dụ: 50"
                    />
                </div>
              </TabsContent>
            </Tabs>
          </div>
           <Separator />
            <div className="space-y-2">
                <Label className="font-medium text-foreground">Thành phần hiển thị</Label>
                <div className="grid grid-cols-2 gap-x-4 gap-y-4 pl-10">
                    <div className="flex items-center space-x-2">
                        <Switch id="clock-visible" checked={visibility.clock} onCheckedChange={(c) => handleVisibilitySwitch('clock', c)} />
                        <Label htmlFor="clock-visible">Đồng hồ</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Switch id="greeting-visible" checked={visibility.greeting} onCheckedChange={(c) => handleVisibilitySwitch('greeting', c)} />
                        <Label htmlFor="greeting-visible">Lời chào</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Switch id="search-visible" checked={visibility.search} onCheckedChange={(c) => handleVisibilitySwitch('search', c)} />
                        <Label htmlFor="search-visible">Tìm kiếm</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Switch id="quicklinks-visible" checked={visibility.quickLinks} onCheckedChange={(c) => handleVisibilitySwitch('quickLinks', c)} />
                        <Label htmlFor="quicklinks-visible">Liên kết nhanh</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Switch id="learn-visible" checked={visibility.learn} onCheckedChange={(c) => handleVisibilitySwitch('learn', c)} />
                        <Label htmlFor="learn-visible">Phần học tập</Label>
                    </div>
                </div>
            </div>
        </div>
        <SheetFooter>
          <SheetClose asChild>
            <Button type="button" variant="secondary">
              Hủy
            </Button>
          </SheetClose>
          <Button onClick={handleFinalSave}>Lưu thay đổi</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
