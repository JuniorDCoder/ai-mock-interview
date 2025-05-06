// 1. First create a file at: /pages/api/vapi/generate.ts

import { generateText } from 'ai'
import { google } from '@ai-sdk/google'
import { getRandomInterviewCover } from '@/lib/utils'
import { db } from '@/firebase/admin'

// Queue to store pending interview generation requests
const pendingRequests = new Map();

export async function GET(request: Request) {
    // Get the interview ID from the URL params
    const url = new URL(request.url);
    const interviewId = url.searchParams.get('id');
    
    if (!interviewId) {
        return Response.json({ success: false, error: "No interview ID provided" }, { status: 400 });
    }

    // Check if we have a result for this ID
    if (pendingRequests.has(interviewId)) {
        const status = pendingRequests.get(interviewId);
        
        if (status.completed) {
            // If completed, return the result and clean up
            const result = { ...status.result };
            pendingRequests.delete(interviewId);
            return Response.json(result, { status: 200 });
        } else {
            // If still processing, return processing status
            return Response.json({ 
                success: true, 
                status: 'processing',
                message: "Your interview is still being generated" 
            }, { status: 202 });
        }
    }

    return Response.json({ 
        success: false, 
        error: "Interview not found" 
    }, { status: 404 });
}

export async function POST(request: Request) {
    console.log("API endpoint called");
    
    let requestBody;
    try {
        requestBody = await request.json();
        console.log("Request body:", requestBody);
    } catch (error) {
        console.error("Invalid JSON input:", error);
        return Response.json(
            { success: false, error: "Invalid JSON input" },
            { status: 400 }
        );
    }

    const { type, role, level, techstack, amount, userid } = requestBody;

    // Validate required fields (basic validation)
    if (!type || !role || !level || !techstack || !amount || !userid) {
        return Response.json(
            { success: false, error: "Missing required fields" },
            { status: 400 }
        );
    }

    // Generate a unique ID for this request
    const interviewId = `interview_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    // Add to pending requests
    pendingRequests.set(interviewId, {
        completed: false,
        result: null,
        params: requestBody
    });
    
    // Start processing in the background
    processInterview(interviewId, requestBody).catch(error => {
        console.error("Error processing interview:", error);
        // Update pending request with error
        if (pendingRequests.has(interviewId)) {
            pendingRequests.set(interviewId, {
                completed: true,
                result: { success: false, error: "Processing failed" },
                params: requestBody
            });
        }
    });
    
    // Immediately return a success response with the ID
    return Response.json({ 
        success: true, 
        status: 'accepted',
        interviewId: interviewId,
        message: "Interview generation started" 
    }, { status: 202 });
}

// Background processing function
interface InterviewParams {
    type: string;
    role: string;
    level: string;
    techstack: string | string[];
    amount: number;
    userid: string;
}

async function processInterview(interviewId: string, params: InterviewParams) {
    const { type, role, level, techstack, amount, userid } = params;
    
    try {
        console.log(`Generating questions for ${role} (${level}) with focus on ${type}`);
        
        const { text: questions } = await generateText({
            model: google('gemini-2.0-flash-001'),
            prompt: `Prepare questions for a job interview.
                The job role is ${role}.
                The job experience level is ${level}.
                The tech stack used in the job is: ${techstack}.
                The focus between behavioural and technical questions should lean towards: ${type}.
                The amount of questions required is: ${amount}.
                Please return only the questions, without any additional text.
                The questions are going to be read by a voice assistant so do not use "/" or "*" or any other special characters which might break the voice assistant.
                Return the questions formatted like this:
                ["Question 1", "Question 2", "Question 3"]
                
                Thank you! <3
            `
        });
    
        console.log("Generated Questions:", questions);
        
        let parsedQuestions;
        try {
            parsedQuestions = JSON.parse(questions);
        } catch (parseError) {
            console.error("Failed to parse questions:", parseError);
            parsedQuestions = [questions];
        }
    
        const interview = {
            role,
            type,
            level,
            techstack: typeof techstack === 'string' ? techstack.split(',') : techstack,
            questions: parsedQuestions,
            userId: userid,
            finalized: true,
            coverImage: getRandomInterviewCover(),
            createdAt: new Date().toISOString()
        };
        
        console.log("Document to be stored:", interview);
    
        const docRef = await db.collection('interviews').add(interview);
        console.log("Document stored successfully with ID:", docRef.id);
        
        // Update pending request with success result
        pendingRequests.set(interviewId, {
            completed: true,
            result: { 
                success: true, 
                message: "Interview questions generated and stored successfully",
                documentId: docRef.id
            },
            params: params
        });
    } catch (error) {
        console.error("Error in processing:", error);
        
        // Update pending request with error result
        pendingRequests.set(interviewId, {
            completed: true,
            result: { 
                success: false, 
                error: "Internal server error: " + (error instanceof Error ? error.message : String(error)) 
            },
            params: params
        });
    }
}