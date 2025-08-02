import { NextRequest } from 'next/server';
import { withAuth, createSuccessResponse, createErrorResponse, type AuthenticatedRequest } from '@/lib/api-middleware';
import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { startGenerationSchema, validateRequest } from '@/lib/validation';

async function handler(req: AuthenticatedRequest) {
  if (req.method !== 'POST') {
    return createErrorResponse('Method not allowed', 405);
  }

  try {
    // Parse request body
    const body = await req.json();
    
    // Validate request
    const { error, value } = validateRequest(startGenerationSchema, body);
    if (error) {
      return createErrorResponse(`Validation error: ${error}`, 400);
    }

    const { topic, language, knowledgeLevel, learningGoal, learningStyle, tone } = value!;
    const userId = req.user!.uid;

    // Get Firestore instance
    const { adminDb } = getFirebaseAdmin();

    // Check if user already has content for this topic
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    if (userData?.topic === topic && userData?.flashcards) {
      return createSuccessResponse({
        message: 'Existing content found',
        jobId: userData.generationJobId || 'existing',
        status: 'completed'
      });
    }

    // Generate unique job ID
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Save generation job to database
    await adminDb.collection('generationJobs').doc(jobId).set({
      userId,
      topic,
      language,
      knowledgeLevel,
      learningGoal,
      learningStyle,
      tone,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Update user's current generation job
    await adminDb.collection('users').doc(userId).set({
      generationJobId: jobId,
      topic,
      language,
      updatedAt: new Date(),
    }, { merge: true });

    // Start background generation process
    // In production, this would trigger a background job/queue
    // For now, we'll simulate async processing
    processGenerationJob(jobId, {
      userId,
      topic,
      language,
      knowledgeLevel,
      learningGoal,
      learningStyle,
      tone
    });

    return createSuccessResponse({
      jobId,
      message: 'Generation job started',
      status: 'pending',
      estimatedTime: '2-5 minutes'
    });

  } catch (error) {
    console.error('Start generation error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}

// Background job processor (simulated)
async function processGenerationJob(jobId: string, params: any) {
  try {
    const { adminDb } = getFirebaseAdmin();
    
    // Update job status to processing
    await adminDb.collection('generationJobs').doc(jobId).update({
      status: 'processing',
      updatedAt: new Date(),
    });

    // Simulate content generation (replace with actual AI generation)
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Generate sample content (replace with actual generation logic)
    const generatedContent = await generateSampleContent(params);

    // Save generated content to user's document
    const contentToSave: any = {};
    
    // Only add fields that are not undefined
    if (generatedContent.flashcards !== undefined) {
      contentToSave.flashcards = generatedContent.flashcards;
    }
    if (generatedContent.quiz !== undefined) {
      contentToSave.quiz = generatedContent.quiz;
    }
    if (generatedContent.theory !== undefined) {
      contentToSave.theory = generatedContent.theory;
    }
    
    contentToSave.generatedAt = new Date();
    
    await adminDb.collection('users').doc(params.userId).set(contentToSave, { merge: true });

    // Update job status to completed
    await adminDb.collection('generationJobs').doc(jobId).update({
      status: 'completed',
      completedAt: new Date(),
      updatedAt: new Date(),
      result: {
        flashcardsCount: generatedContent.flashcards.length,
        quizCount: generatedContent.quiz.length,
        theoryChapters: generatedContent.theory.length,
      }
    });

    console.log(`✅ Generation job ${jobId} completed successfully`);

  } catch (error) {
    console.error(`❌ Generation job ${jobId} failed:`, error);
    
    // Update job status to failed
    const { adminDb } = getFirebaseAdmin();
    await adminDb.collection('generationJobs').doc(jobId).update({
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      updatedAt: new Date(),
    });
  }
}

// Sample content generator (replace with actual AI integration)
async function generateSampleContent(params: any) {
  const { topic, language, knowledgeLevel, learningGoal, learningStyle, tone } = params;
  
  return {
    flashcards: [
      {
        id: '1',
        question: `What is ${topic}?`,
        answer: `${topic} is an important concept in programming and software development.`,
        difficulty: knowledgeLevel || 'beginner',
      },
      {
        id: '2',
        question: `Why should I learn ${topic}?`,
        answer: `Learning ${topic} helps you build robust applications and understand programming fundamentals better.`,
        difficulty: knowledgeLevel || 'beginner',
      },
      {
        id: '3',
        question: `What are the main features of ${topic}?`,
        answer: `${topic} offers object-oriented programming, platform independence, and strong memory management.`,
        difficulty: 'intermediate',
      },
    ],
    quiz: [
      {
        id: '1',
        question: `Which of the following best describes ${topic}?`,
        options: ['A programming language', 'A database', 'An operating system', 'A web browser'],
        correctAnswer: 'A programming language',
        explanation: `${topic} is indeed a programming language used for building applications.`,
      },
      {
        id: '2',
        question: `${topic} is known for which key principle?`,
        options: ['Write once, run anywhere', 'Write everywhere, run once', 'Write fast, run slow', 'Write slow, run fast'],
        correctAnswer: 'Write once, run anywhere',
        explanation: `This principle means ${topic} code can run on any platform with a compatible virtual machine.`,
      },
    ],
    theory: [
      {
        id: '1',
        title: `Introduction to ${topic}`,
        content: `# Introduction to ${topic}\n\n${topic} is a powerful programming language that has been widely used for decades. In this chapter, we'll explore the fundamentals and core concepts.\n\n## What is ${topic}?\n\n${topic} is an object-oriented programming language that was designed to be platform-independent. This means you can write code once and run it on different operating systems.\n\n## Key Features\n\n- **Object-Oriented**: Everything in ${topic} is an object\n- **Platform Independent**: Write once, run anywhere (WORA)\n- **Secure**: Built-in security features\n- **Robust**: Strong memory management and error handling`,
        order: 1,
      },
      {
        id: '2',
        title: `Getting Started with ${topic}`,
        content: `# Getting Started with ${topic}\n\nNow that you understand what ${topic} is, let's dive into the basics of getting started.\n\n## Setting up your development environment\n\n1. Download and install the ${topic} Development Kit (JDK)\n2. Set up your IDE (Integrated Development Environment)\n3. Write your first program\n\n## Your First Program\n\n\`\`\`java\npublic class HelloWorld {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n\`\`\`\n\nThis simple program demonstrates the basic structure of a ${topic} application.`,
        order: 2,
      },
      {
        id: '3',
        title: `${topic} Syntax and Fundamentals`,
        content: `# ${topic} Syntax and Fundamentals\n\nUnderstanding the syntax is crucial for mastering ${topic}. Let's explore the key elements.\n\n## Variables and Data Types\n\n${topic} is a strongly-typed language, which means every variable must have a declared type.\n\n### Primitive Data Types:\n- \`int\`: Integer numbers\n- \`double\`: Floating-point numbers\n- \`boolean\`: True or false values\n- \`char\`: Single characters\n- \`String\`: Text (technically an object, not primitive)\n\n## Control Structures\n\n### Conditional Statements\n\`\`\`java\nif (condition) {\n    // code block\n} else {\n    // alternative code block\n}\n\`\`\`\n\n### Loops\n\`\`\`java\nfor (int i = 0; i < 10; i++) {\n    // repeat this block\n}\n\`\`\``,
        order: 3,
      },
    ],
  };
}

export const POST = withAuth(handler);
