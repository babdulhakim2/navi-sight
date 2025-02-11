import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the Gemini API with your API key
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: Request) {
  try {
    const { image, prompt } = await request.json();

    // Remove the data URL prefix to get just the base64 data
    const base64Image = image.split(',')[1];

    // Initialize the model with system instruction
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.0-flash",
      systemInstruction: `You are a visual assistant for blind people. Your task is to:
1. Describe the scene in clear, concise language
2. Identify and read any text visible in the image
3. Warn about potential obstacles and their locations
4. Focus on important changes in the scene
5. Provide spatial awareness information
6. Use natural, conversational language
7. Be brief but informative
8. Return plain text only, no markdown or formatting
NOTE: THESE ARE SEQENTIAL FRAME, SO LOCALIZE THE CHANGES IN THE SCENE ON A RELATIVE`,
    });

    // Prepare the image part for the model
    const imagePart = {
      inlineData: {
        data: base64Image,
        mimeType: "image/jpeg"
      }
    };

    // Generate content from the image
    const result = await model.generateContent([
      prompt,
      imagePart
    ]);
    
    const response = await result.response;
    const text = response.text();

    return Response.json({ interpretation: text });
    
  } catch (error) {
    console.error('Error processing image with Gemini:', error);
    return Response.json(
      { error: 'Failed to process image' },
      { status: 500 }
    );
  }
}
