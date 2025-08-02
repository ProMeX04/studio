import { NextRequest } from 'next/server';
import { withOptionalAuth, createSuccessResponse, createErrorResponse, type AuthenticatedRequest } from '@/lib/api-middleware';
import { getFirebaseAdmin } from '@/lib/firebase-admin';

async function handler(req: AuthenticatedRequest) {
  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    const body = await req.json();
    const { query, limit = 10, offset = 0 } = body;

    if (!query || typeof query !== 'string') {
      return createErrorResponse('Query parameter is required', 400);
    }

    const { adminDb } = getFirebaseAdmin();

    // Search public topics
    // For now, we'll create some sample data
    // In production, you'd implement proper search with Algolia or similar
    const sampleTopics = [
      {
        id: 'topic_1',
        topic: 'React Hooks',
        language: 'Vietnamese',
        chapterCount: 5,
        flashcardCount: 25,
        questionCount: 30,
        description: 'Learn React Hooks from basics to advanced',
        tags: ['react', 'javascript', 'frontend'],
        difficulty: 'intermediate',
        estimatedTime: '2 hours',
        isPublic: true,
        createdBy: 'system',
        createdAt: new Date('2024-01-01'),
        downloads: 1250,
      },
      {
        id: 'topic_2',
        topic: 'Lịch sử La Mã',
        language: 'Vietnamese',
        chapterCount: 8,
        flashcardCount: 40,
        questionCount: 50,
        description: 'Tìm hiểu lịch sử đế chế La Mã cổ đại',
        tags: ['lịch sử', 'la mã', 'cổ đại'],
        difficulty: 'beginner',
        estimatedTime: '3 hours',
        isPublic: true,
        createdBy: 'system',
        createdAt: new Date('2024-01-15'),
        downloads: 890,
      },
      {
        id: 'topic_3',
        topic: 'Machine Learning Basics',
        language: 'English',
        chapterCount: 10,
        flashcardCount: 60,
        questionCount: 75,
        description: 'Introduction to Machine Learning concepts',
        tags: ['machine learning', 'ai', 'python'],
        difficulty: 'advanced',
        estimatedTime: '5 hours',
        isPublic: true,
        createdBy: 'system',
        createdAt: new Date('2024-02-01'),
        downloads: 2100,
      },
    ];

    // Filter topics based on search query
    const filteredTopics = sampleTopics.filter(topic => {
      const searchTerm = query.toLowerCase();
      return (
        topic.topic.toLowerCase().includes(searchTerm) ||
        topic.description.toLowerCase().includes(searchTerm) ||
        topic.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    });

    // Apply pagination
    const paginatedTopics = filteredTopics.slice(offset, offset + limit);

    return createSuccessResponse({
      results: paginatedTopics,
      total: filteredTopics.length,
      limit,
      offset,
      hasMore: offset + limit < filteredTopics.length,
    });

  } catch (error) {
    console.error('Search public topics error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

export { handler as POST };
