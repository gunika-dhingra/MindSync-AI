import { NextRequest, NextResponse } from 'next/server';

interface FeedbackRequest {
  message: string;
  schedule: any;
  energyProfile: any;
  conversationHistory: any[];
}

export async function POST(request: NextRequest) {
  let requestData: FeedbackRequest | null = null;
  
  try {
    requestData = await request.json();
    
    if (!requestData) {
      throw new Error('Invalid request data');
    }

    const { message, schedule, energyProfile, conversationHistory } = requestData;

    // Prepare the context for the AI
    const context = {
      userMessage: message,
      currentSchedule: schedule,
      currentProfile: energyProfile,
      previousMessages: conversationHistory.slice(-5) // Last 5 messages for context
    };

    // Call the backend AI service
    const response = await fetch('http://localhost:8000/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(context),
    });

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      response: data.response,
      hasUpdates: data.hasUpdates || false,
      updatedSchedule: data.updatedSchedule || null,
      updatedProfile: data.updatedProfile || null,
      suggestions: data.suggestions || []
    });

  } catch (error) {
    console.error('Error in feedback API:', error);
    
    // Fallback response if backend is unavailable or request parsing failed
    const fallbackData = requestData || { 
      message: 'I understand your feedback.', 
      schedule: null, 
      energyProfile: 'balanced', 
      conversationHistory: [] 
    };
    const fallbackResponse = generateFallbackResponse(fallbackData);
    
    return NextResponse.json(fallbackResponse);
  }
}

function generateFallbackResponse(requestData: FeedbackRequest) {
  const { message } = requestData;
  const lowerMessage = message.toLowerCase();

  // Simple pattern matching for common feedback
  if (lowerMessage.includes('too hard') || lowerMessage.includes('difficult') || lowerMessage.includes('challenging')) {
    return {
      response: "I understand some tasks felt too challenging. I can help adjust the difficulty level or break down complex tasks into smaller, more manageable pieces. Would you like me to suggest some modifications?",
      hasUpdates: false,
      suggestions: [
        "Break down complex tasks into smaller subtasks",
        "Adjust energy requirements for difficult tasks",
        "Reschedule challenging tasks to your peak energy times"
      ]
    };
  }

  if (lowerMessage.includes('too easy') || lowerMessage.includes('simple') || lowerMessage.includes('boring')) {
    return {
      response: "It sounds like some tasks might not be challenging enough for you. I can help increase the complexity or suggest additional tasks that match your skill level better. What would you like to add or modify?",
      hasUpdates: false,
      suggestions: [
        "Add more complex variations of existing tasks",
        "Increase the scope of simple tasks",
        "Suggest additional related tasks"
      ]
    };
  }

  if (lowerMessage.includes('time') || lowerMessage.includes('schedule') || lowerMessage.includes('timing')) {
    return {
      response: "I hear you have feedback about the timing or scheduling. Could you be more specific about which time slots worked well and which didn't? This will help me better understand your energy patterns.",
      hasUpdates: false,
      suggestions: [
        "Adjust task timing based on energy levels",
        "Reschedule tasks to better time slots",
        "Modify break intervals"
      ]
    };
  }

  if (lowerMessage.includes('add') || lowerMessage.includes('include') || lowerMessage.includes('new')) {
    return {
      response: "I'd be happy to help you add new tasks to your schedule! Please tell me what specific tasks or activities you'd like to include, and I'll find the best time slots for them based on your energy profile.",
      hasUpdates: false,
      suggestions: [
        "Add new tasks to existing schedule",
        "Create recurring task patterns",
        "Suggest complementary activities"
      ]
    };
  }

  // Default response
  return {
    response: "Thank you for your feedback! I'm here to help you refine your schedule. Could you be more specific about what aspects of the schedule you'd like to improve? For example, were any tasks too challenging, too easy, or scheduled at the wrong time?",
    hasUpdates: false,
    suggestions: [
      "Adjust task difficulty levels",
      "Modify timing and scheduling",
      "Add or remove tasks",
      "Update energy profile preferences"
    ]
  };
}