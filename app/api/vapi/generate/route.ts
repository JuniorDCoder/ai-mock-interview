import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { getRandomInterviewCover } from '@/lib/utils';
import { db } from '@/firebase/admin';

// Queue to store pending interview generation requests
const pendingRequests = new Map();

export async function GET(request: Request) {
    const url = new URL(request.url);
    const interviewId = url.searchParams.get('id');

    if (!interviewId) {
        return Response.json({ success: false, error: "No interview ID provided" }, { status: 400 });
    }

    if (pendingRequests.has(interviewId)) {
        const status = pendingRequests.get(interviewId);

        if (status.completed) {
            const result = { ...status.result };
            pendingRequests.delete(interviewId);
            return Response.json(result, { status: 200 });
        } else {
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

    if (!type || !role || !level || !techstack || !amount || !userid) {
         // ... (your existing missing fields check)
        const missingFields = [];
        if (!type) missingFields.push('type');
        if (!role) missingFields.push('role');
        if (!level) missingFields.push('level');
        if (!techstack) missingFields.push('techstack');
        if (!amount) missingFields.push('amount');
        if (!userid) missingFields.push('userid');

        console.error("Missing fields:", missingFields);
        return Response.json(
            { success: false, error: `Missing required fields: ${missingFields.join(', ')}` },
            { status: 400 }
        );
    }

    // You might not need the pendingRequests map for this direct flow
    // as the POST will now wait for completion
    // The GET endpoint pattern might need adjustment depending on desired behavior

    console.log("Starting synchronous processing for interview...");

    try {
        const processResult = await processInterview("sync_request", requestBody); // Using a placeholder ID or adjusting processInterview signature
        console.log("Interview processing completed successfully:", processResult);

        // Return success response after successful processing and write
        return Response.json({
            success: true,
            status: 'completed', // Status is now completed in this request cycle
            documentId: processResult.documentId, // Get doc ID from result
            message: "Interview questions generated and stored successfully"
        }, { status: 200 }); // Return 200 OK as the job is done
    } catch (error) {
        console.error("Error processing interview:", error);
        // Return error response if processing or write failed
        return Response.json({
            success: false,
            status: 'failed',
            error: "Internal server error: " + (error instanceof Error ? error.message : String(error))
        }, { status: 500 }); // Return 500 Internal Server Error
    }
}

interface InterviewParams {
    type: string;
    role: string;
    level: string;
    techstack: string | string[];
    amount: number;
    userid: string;
}

async function processInterview(interviewId: string, params: InterviewParams) {
    console.log(`Processing interview with ID: ${interviewId}`);
    const { type, role, level, techstack, amount, userid } = params;

    try {
        console.log(`Generating questions for ${role} (${level}) with focus on ${type}`);

        // Verify Firebase connection
        try {
            const testDoc = await db.collection('system').doc('test').get();
            console.log("Firebase connection verified:", testDoc.exists ? "Test document exists" : "Test document doesn't exist, but connection is working");
        } catch (dbError) {
            console.error("Firebase connection error:", dbError);
            throw new Error(`Firebase connection failed: ${dbError instanceof Error ? dbError.message : String(dbError)}`);
        }

        const { text: questions } = await generateText({
            model: google('gemini-2.0-flash-001'),
            prompt: `Prepare questions for a job interview.
                The job role is ${role}.
                The job experience level is ${level}.
                The tech stack used in the job is: ${techstack}.
                The focus between behavioural and technical questions should lean towards: ${type}.
                The amount of questions required is: ${amount}.
                Please return only the questions, without any additional text.
                Return the questions formatted like this:
                ["Question 1", "Question 2", "Question 3"]
            `
        });

        console.log("Raw AI response:", questions);

        let parsedQuestions;
        try {
            parsedQuestions = JSON.parse(questions);
            if (!Array.isArray(parsedQuestions)) {
                throw new Error("Questions are not in array format");
            }
        } catch (error) {
            console.error("Error parsing questions:", error);
            throw new Error("Invalid questions format: " + (error instanceof Error ? error.message : String(error)));
        }

        const interview = {
            role,
            type,
            level,
            techstack: typeof techstack === 'string' ? techstack.split(',').map(item => item.trim()) : techstack,
            questions: parsedQuestions,
            userId: userid,
            finalized: true,
            coverImage: getRandomInterviewCover(),
            createdAt: new Date().toISOString()
        };

        console.log("Document to be stored:", interview);

        const docRef = await db.collection('interviews').add(interview);
        console.log("Document stored successfully with ID:", docRef.id);

        pendingRequests.set(interviewId, {
            completed: true,
            result: {
                success: true,
                message: "Interview questions generated and stored successfully",
                documentId: docRef.id
            },
            params: params
        });

        return { documentId: docRef.id };
    } catch (error) {
        console.error("Error in processing:", error);

        pendingRequests.set(interviewId, {
            completed: true,
            result: {
                success: false,
                error: "Internal server error: " + (error instanceof Error ? error.message : String(error))
            },
            params: params
        });

        throw error;
    }
}