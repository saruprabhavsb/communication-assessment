import express from "express";
import http from "http";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.set("trust proxy", true);
app.use(express.json({ limit: "10mb" }));

// Helper to initialize Gemini client lazily
function getGenAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// 1. Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", mode: process.env.NODE_ENV || "development" });
});

// 1.5 Standardized AI Assessment Evaluation Endpoint
app.post("/api/assessment/evaluate", async (req, res) => {
  const { questionId, question, currentAnswer, answerType, timestamp } = req.body;

  if (!currentAnswer || typeof currentAnswer !== "string" || currentAnswer.trim().length === 0) {
    return res.status(400).json({ error: "currentAnswer is required for evaluation." });
  }

  const ai = getGenAIClient();

  if (!ai) {
    // Demo Fallback Evaluation
    const wordCount = currentAnswer.trim().split(/\s+/).length;
    const baseScore = Math.min(92, Math.max(55, 60 + Math.floor(wordCount / 2)));
    return res.json({
      score: baseScore,
      fluency: Math.min(100, baseScore + 2),
      grammar: Math.min(100, baseScore - 2),
      vocabulary: Math.min(100, baseScore - 4),
      clarity: Math.min(100, baseScore + 4),
      confidence: Math.min(100, baseScore - 1),
      professionalism: Math.min(100, baseScore + 3),
      strengths: [
        "Clear and direct expression of ideas.",
        "Good confidence and vocal structure.",
        "Relevant response addressing the question."
      ],
      weaknesses: [
        "Minor grammar inconsistencies in sentence transitions.",
        "Vocabulary can be elevated with industry-specific terminology."
      ],
      corrections: [
        {
          original: currentAnswer.length > 50 ? currentAnswer.slice(0, 50) + "..." : currentAnswer,
          better: `A polished version: "In response to '${question || "this question"}', I focus on structured delivery and clear outcomes."`,
          explanation: "Using structured introductory phrases creates a more professional impression."
        }
      ],
      recommendations: [
        "Practice using formal connecting adverbs like 'Furthermore' and 'Consequently'.",
        "Use concise, punchy sentences to maintain high listener engagement."
      ],
      isDemoFallback: true,
      demoLabel: "Demo AI Evaluation"
    });
  }

  try {
    const promptText = `You are an expert English Speech, Grammar & Interview Communication Evaluator.
Evaluate this student's response:

Question ID: ${questionId || "q_01"}
Question: "${question || "Tell me about yourself."}"
Answer Type: ${answerType || "voice"}
Submitted Timestamp: ${timestamp || new Date().toISOString()}

Student Answer: "${currentAnswer}"

Evaluate strictly on a 0-100 scale.
Return JSON with exact keys:
- score (0-100 aggregate)
- fluency (0-100)
- grammar (0-100)
- vocabulary (0-100)
- clarity (0-100)
- confidence (0-100)
- professionalism (0-100)
- strengths (array of 2-3 strings)
- weaknesses (array of 2 strings)
- corrections (array of objects with "original", "better", "explanation")
- recommendations (array of 2 actionable advice strings)`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER },
            fluency: { type: Type.INTEGER },
            grammar: { type: Type.INTEGER },
            vocabulary: { type: Type.INTEGER },
            clarity: { type: Type.INTEGER },
            confidence: { type: Type.INTEGER },
            professionalism: { type: Type.INTEGER },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            corrections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  original: { type: Type.STRING },
                  better: { type: Type.STRING },
                  explanation: { type: Type.STRING }
                },
                required: ["original", "better", "explanation"]
              }
            },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: [
            "score", "fluency", "grammar", "vocabulary", "clarity",
            "confidence", "professionalism", "strengths", "weaknesses",
            "corrections", "recommendations"
          ]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (error) {
    console.error("Gemini Assessment Eval Error:", error);
    res.json({
      score: 78,
      fluency: 80,
      grammar: 75,
      vocabulary: 72,
      clarity: 82,
      confidence: 79,
      professionalism: 81,
      strengths: [
        "Clear introduction and good enthusiasm.",
        "Good confidence throughout the response."
      ],
      weaknesses: [
        "Some grammar mistakes in conditional tenses.",
        "Limited technical vocabulary."
      ],
      corrections: [
        {
          original: currentAnswer,
          better: `Polished: "${currentAnswer} I look forward to contributing my expertise effectively."`,
          explanation: "The improved sentence adds a stronger professional conclusion."
        }
      ],
      recommendations: [
        "Practice professional vocabulary in daily speech.",
        "Use shorter and clearer sentences."
      ],
      isFallback: true,
      demoLabel: "Demo AI Evaluation"
    });
  }
});

// 1.8 AI Group Discussion Evaluation Endpoint
app.post("/api/gd/eval", async (req, res) => {
  const { topicTitle, userSpeech, category, difficulty } = req.body;

  if (!userSpeech || typeof userSpeech !== "string") {
    return res.status(400).json({ error: "userSpeech transcript is required." });
  }

  const ai = getGenAIClient();

  if (!ai) {
    return res.json({
      overall: 82,
      clarity: 84,
      fluency: 80,
      confidence: 83,
      vocabulary: 81,
      relevance: 85,
      logicalStructure: 82,
      arguments: 80,
      professionalCommunication: 84,
      strengths: [
        "Clear, structured argument supporting your key point.",
        "Respectful and diplomatic tone suitable for group discussions.",
        "Direct relevance to the topic under discussion."
      ],
      weaknesses: [
        "Could include more specific real-world examples or data points.",
        "Transitions between opening points could be smoother."
      ],
      suggestions: [
        "Use phrases like 'Building on that point...' or 'To look at another perspective...'",
        "State your position clearly in the first 10 seconds of speaking."
      ],
      betterVocabulary: ["Substantiate", "Paradigm shift", "Counterargument", "Pragmatic"],
      betterOpeningSentence: `In analyzing "${topicTitle || "this topic"}", it is vital to weigh long-term societal impact against immediate economic benefits.`,
      betterConclusion: "In conclusion, a balanced, multi-stakeholder strategy will yield the most sustainable outcome.",
      isDemoFallback: true,
      demoLabel: "Demo AI Evaluation"
    });
  }

  try {
    const promptText = `Evaluate this student's Group Discussion (GD) speaking performance.
GD Topic: "${topicTitle || "Group Discussion Topic"}"
Category: ${category || "General"}
Difficulty: ${difficulty || "Intermediate"}
Student Spoken Contribution: "${userSpeech}"

Evaluate on 0-100 scale and return JSON with keys:
- overall, clarity, fluency, confidence, vocabulary, relevance, logicalStructure, arguments, professionalCommunication (integers 0-100)
- strengths (array of 3 strings)
- weaknesses (array of 2 strings)
- suggestions (array of 2 strings)
- betterVocabulary (array of 4 advanced GD terms)
- betterOpeningSentence (string)
- betterConclusion (string)`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overall: { type: Type.INTEGER },
            clarity: { type: Type.INTEGER },
            fluency: { type: Type.INTEGER },
            confidence: { type: Type.INTEGER },
            vocabulary: { type: Type.INTEGER },
            relevance: { type: Type.INTEGER },
            logicalStructure: { type: Type.INTEGER },
            arguments: { type: Type.INTEGER },
            professionalCommunication: { type: Type.INTEGER },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
            betterVocabulary: { type: Type.ARRAY, items: { type: Type.STRING } },
            betterOpeningSentence: { type: Type.STRING },
            betterConclusion: { type: Type.STRING }
          },
          required: [
            "overall", "clarity", "fluency", "confidence", "vocabulary",
            "relevance", "logicalStructure", "arguments", "professionalCommunication",
            "strengths", "weaknesses", "suggestions", "betterVocabulary",
            "betterOpeningSentence", "betterConclusion"
          ]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (error) {
    console.error("Gemini GD Eval Error:", error);
    res.json({
      overall: 80,
      clarity: 82,
      fluency: 78,
      confidence: 80,
      vocabulary: 79,
      relevance: 84,
      logicalStructure: 80,
      arguments: 78,
      professionalCommunication: 82,
      strengths: ["Clear delivery", "Relevant arguments"],
      weaknesses: ["Needs more specific statistics", "Pacing can be slightly more steady"],
      suggestions: ["Structure argument as: Stance -> Evidence -> Impact"],
      betterVocabulary: ["Catalyst", "Inherent", "Mitigate"],
      betterOpeningSentence: `To kick off our discussion on "${topicTitle}", I'd like to highlight two key factors.`,
      betterConclusion: "To wrap up, reaching a consensus requires considering both innovation and risk management.",
      isFallback: true,
      demoLabel: "Demo AI Evaluation"
    });
  }
});

// 1.9 AI Image Speaking Evaluation Endpoint
app.post("/api/image-speaking/eval", async (req, res) => {
  const { topicName, imageDescription, currentAnswer, level, hasAudio } = req.body;

  if (!currentAnswer || typeof currentAnswer !== "string" || currentAnswer.trim().length === 0) {
    return res.status(400).json({ error: "currentAnswer is required and cannot be empty." });
  }

  const trimmedAnswer = currentAnswer.trim();
  const ai = getGenAIClient();

  if (!ai) {
    // Intelligent Fallback Logic
    const wordCount = trimmedAnswer.split(/\s+/).length;
    const isShort = wordCount < 10;
    const baseScore = Math.min(94, Math.max(62, 70 + Math.floor(wordCount / 2)));
    
    // Check for common real mistakes in student speech
    const detectedMistakes: { original: string; corrected: string; explanation: string }[] = [];
    
    if (/\bpeople is\b/i.test(trimmedAnswer)) {
      detectedMistakes.push({
        original: "people is",
        corrected: "people are",
        explanation: "'People' is a plural noun, so use 'are' instead of 'is'."
      });
    }
    if (/\bthere is many\b/i.test(trimmedAnswer)) {
      detectedMistakes.push({
        original: "there is many",
        corrected: "there are many",
        explanation: "'Many' refers to plural items, so use 'there are'."
      });
    }
    if (/\bthey is\b/i.test(trimmedAnswer)) {
      detectedMistakes.push({
        original: "they is",
        corrected: "they are",
        explanation: "'They' is a plural pronoun, requiring 'are'."
      });
    }
    if (/\bwaiting train\b/i.test(trimmedAnswer)) {
      detectedMistakes.push({
        original: "waiting train",
        corrected: "waiting for the train",
        explanation: "The verb 'wait' requires the preposition 'for' when specifying the target."
      });
    }

    const betterVocab = [
      { word: "A large crowd", meaning: "A big gathering of people", example: "A large crowd is gathered in the scene." },
      { word: "Bustling environment", meaning: "Full of activity and energy", example: "The image depicts a bustling environment." },
      { word: "Prominent feature", meaning: "A key noticeable detail", example: "The prominent feature of the picture is the bright lighting." }
    ];

    const improved = `In this image depicting ${topicName || "the scene"}, we can observe a vibrant environment. ${
      trimmedAnswer.length > 20 ? trimmedAnswer : "People are engaged in activities while the background displays rich details."
    } Overall, the image captures an active and well-defined atmosphere.`;

    return res.json({
      overallScore: isShort ? Math.max(60, baseScore - 12) : baseScore,
      fluency: isShort ? 65 : Math.min(100, baseScore + 2),
      grammar: detectedMistakes.length > 0 ? 72 : Math.min(100, baseScore),
      vocabulary: Math.min(100, baseScore + 3),
      clarity: Math.min(100, baseScore + 4),
      confidence: Math.min(100, baseScore - 2),
      imageRelevance: Math.min(100, baseScore + 5),
      pronunciation: hasAudio ? Math.min(100, baseScore + 1) : null,
      strengths: [
        `Identified key elements related to ${topicName || "the topic"}.`,
        "Direct and clear response to the image prompt.",
        "Good effort in describing the visual scene."
      ],
      mistakes: detectedMistakes,
      betterVocabulary: betterVocab,
      improvedAnswer: improved,
      recommendations: [
        detectedMistakes.length > 0 ? "Practice Subject-Verb Agreement" : "Expand descriptive adjectives",
        "Try 2-Minute Speaking Practice to build fluency",
        "Focus on preposition usage when describing spatial relationships"
      ],
      isDemoFallback: true
    });
  }

  try {
    const promptText = `You are an English communication evaluator. Evaluate only the user's current answer for the provided image-speaking task. Do not assume information that the user did not say. Identify actual grammar and vocabulary mistakes. Do not invent mistakes. Give level-appropriate corrections and actionable feedback.

Image Topic: "${topicName || "General Topic"}"
Level: "${level || "Intermediate"}"
Image Scene Description: "${imageDescription || "A scene showing everyday activities."}"
User's Current Answer: "${trimmedAnswer}"
Has Audio Recording: ${hasAudio ? "Yes" : "No"}

Evaluate strictly on a 0-100 scale:
- overallScore (weighted aggregate 0-100)
- fluency (0-100)
- grammar (0-100)
- vocabulary (0-100)
- clarity (0-100)
- confidence (0-100)
- imageRelevance (0-100)
- pronunciation (${hasAudio ? "integer 0-100" : "must be null"})

Return structured JSON with keys:
- overallScore (integer)
- fluency (integer)
- grammar (integer)
- vocabulary (integer)
- clarity (integer)
- confidence (integer)
- imageRelevance (integer)
- pronunciation (${hasAudio ? "integer 0-100" : "null"})
- strengths (array of 2-3 specific feedback strings)
- mistakes (array of objects with "original", "corrected", "explanation" for real grammar/syntax errors in user's text. If no mistakes, return empty array)
- betterVocabulary (array of objects with "word", "meaning", "example")
- improvedAnswer (a natural improved version of the user's answer appropriate for the English level)
- recommendations (array of 2-3 topic recommendations e.g. "Practice Subject-Verb Agreement", "Learn Workplace Vocabulary")`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overallScore: { type: Type.INTEGER },
            fluency: { type: Type.INTEGER },
            grammar: { type: Type.INTEGER },
            vocabulary: { type: Type.INTEGER },
            clarity: { type: Type.INTEGER },
            confidence: { type: Type.INTEGER },
            imageRelevance: { type: Type.INTEGER },
            pronunciation: { type: Type.INTEGER, nullable: true },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            mistakes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  original: { type: Type.STRING },
                  corrected: { type: Type.STRING },
                  explanation: { type: Type.STRING }
                },
                required: ["original", "corrected", "explanation"]
              }
            },
            betterVocabulary: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  meaning: { type: Type.STRING },
                  example: { type: Type.STRING }
                },
                required: ["word", "meaning", "example"]
              }
            },
            improvedAnswer: { type: Type.STRING },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: [
            "overallScore", "fluency", "grammar", "vocabulary", "clarity",
            "confidence", "imageRelevance", "strengths", "mistakes",
            "betterVocabulary", "improvedAnswer", "recommendations"
          ]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    if (!hasAudio) {
      parsed.pronunciation = null;
    }
    res.json(parsed);
  } catch (error) {
    console.error("Gemini Image Speaking Eval Error:", error);
    res.json({
      overallScore: 80,
      fluency: 78,
      grammar: 76,
      vocabulary: 82,
      clarity: 84,
      confidence: 80,
      imageRelevance: 85,
      pronunciation: null,
      strengths: [
        "Described key visual elements accurately.",
        "Good overall tone and attempt."
      ],
      mistakes: [],
      betterVocabulary: [
        { word: "Prominent", meaning: "Particularly noticeable", example: "The central figure is prominent." }
      ],
      improvedAnswer: `In this photograph of ${topicName || "the scene"}, we can observe a detailed setting with people and objects clearly visible.`,
      recommendations: ["Practice sentence expansion", "Review prepositions"],
      isFallback: true
    });
  }
});

// 2. Speaking Evaluation API
app.post("/api/eval/speaking", async (req, res) => {
  const { prompt, transcript, timeSpentSeconds } = req.body;

  if (!transcript || typeof transcript !== "string" || transcript.trim().length === 0) {
    return res.status(400).json({ error: "Transcript or text response is required." });
  }

  const ai = getGenAIClient();

  if (!ai) {
    // Demo Fallback Evaluation
    const wordCount = transcript.trim().split(/\s+/).length;
    const baseScore = Math.min(92, Math.max(55, 60 + Math.floor(wordCount / 2)));
    return res.json({
      fluency: Math.min(100, baseScore + 2),
      grammar: Math.min(100, baseScore - 3),
      vocabulary: Math.min(100, baseScore + 1),
      clarity: Math.min(100, baseScore + 4),
      confidence: Math.min(100, baseScore - 1),
      professionalism: Math.min(100, baseScore + 3),
      overall: baseScore,
      strengths: [
        "Good core structure and clear expression of ideas.",
        "Addressed the topic prompt directly with relevant details.",
        "Maintained steady pace throughout the response."
      ],
      weaknesses: [
        "Slight hesitation on complex transitions.",
        "Could expand vocabulary range with formal business synonyms."
      ],
      suggestions: [
        "Practice using transition words like 'Furthermore', 'Consequently', and 'In summary'.",
        "Record yourself daily to build natural speaking flow and pacing.",
        "Vary sentence lengths to create a more dynamic vocal delivery."
      ],
      isDemoFallback: true
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `You are an expert English Speech & Communication Evaluator for students and job candidates.
Evaluate the following spoken response given for the prompt.

Prompt: "${prompt || "Tell us about yourself and your career goals."}"
Candidate Response: "${transcript}"
Time Taken: ${timeSpentSeconds || 60} seconds.

Assess strictly on a 0-100 scale for each metric:
- fluency: Smoothness, speech pace, lack of unnatural pauses
- grammar: Sentence correctness, proper tenses, prepositions
- vocabulary: Word choice, precision, professional terms used
- clarity: How easily understood, crispness of thought
- confidence: Assertive tone, decisive language
- professionalism: Tone appropriateness for workplace or interview
- overall: Weighted aggregate score (0-100)

Return JSON with exact keys:
fluency, grammar, vocabulary, clarity, confidence, professionalism, overall, strengths (array of 3 strings), weaknesses (array of 2-3 strings), suggestions (array of 3 actionable advice strings).`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fluency: { type: Type.INTEGER },
            grammar: { type: Type.INTEGER },
            vocabulary: { type: Type.INTEGER },
            clarity: { type: Type.INTEGER },
            confidence: { type: Type.INTEGER },
            professionalism: { type: Type.INTEGER },
            overall: { type: Type.INTEGER },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: [
            "fluency", "grammar", "vocabulary", "clarity", "confidence",
            "professionalism", "overall", "strengths", "weaknesses", "suggestions"
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (error) {
    console.error("Gemini Speaking Eval Error:", error);
    // Return friendly structured fallback if API fails
    res.json({
      fluency: 78,
      grammar: 75,
      vocabulary: 76,
      clarity: 82,
      confidence: 80,
      professionalism: 81,
      overall: 79,
      strengths: [
        "Good structural organization and key points covered.",
        "Direct response to prompt questions.",
        "Clear tone and understandable articulation."
      ],
      weaknesses: [
        "Minor grammatical errors in complex sentence structures.",
        "Opportunity to use more professional vocabulary."
      ],
      suggestions: [
        "Practice sentence connector phrases to blend thoughts seamlessly.",
        "Review subject-verb agreement in complex sentences.",
        "Try re-recording after reading a sample answer aloud."
      ],
      isFallback: true
    });
  }
});

// 3. AI Communication Coach Chat API
app.post("/api/coach/chat", async (req, res) => {
  const { messages, userMessage } = req.body;

  if (!userMessage || typeof userMessage !== "string") {
    return res.status(400).json({ error: "userMessage is required." });
  }

  const ai = getGenAIClient();

  if (!ai) {
    // Intelligent local fallback
    let replyText = "That's a great observation! Working on your daily speaking practice is key to building conversational fluency.";
    let grammarCorrection = undefined;
    let improvedVersion = undefined;

    const lower = userMessage.toLowerCase();
    if (lower.includes("introduce") || lower.includes("tell me about yourself")) {
      replyText = "When introducing yourself in an interview, use the Present-Past-Future framework:\n1. What you do currently\n2. Key past experiences/achievements\n3. What you aim to achieve next!";
      improvedVersion = "Hello! I am a final-year student passionate about software engineering and problem-solving, with experience building web applications.";
    } else if (lower.includes("grammar") || lower.includes("correct")) {
      replyText = "Here is a quick rule: Always align your subject and verb in number. For example: 'She goes' vs 'They go'.";
      grammarCorrection = "Make sure your tenses match the time context of your sentence.";
    } else if (lower.includes("interview") || lower.includes("hr")) {
      replyText = "In HR interviews, answer behavioral questions using the STAR technique (Situation, Task, Action, Result). It keeps your response crisp and structured!";
    }

    return res.json({
      reply: replyText,
      grammarCorrection,
      improvedVersion,
      isDemoFallback: true
    });
  }

  try {
    const formattedHistory = (messages || []).slice(-6).map((m: { sender: string; text: string }) => {
      return `${m.sender === "user" ? "Student" : "Coach"}: ${m.text}`;
    }).join("\n");

    const promptText = `Context / Previous Chat:
${formattedHistory}

Student Message: "${userMessage}"

You are an expert, friendly English Communication Coach for college students and job seekers.
Rules:
1. Correct any grammar mistakes in the student's message politely.
2. Explain grammar or vocabulary mistakes simply and clearly.
3. Suggest an improved professional sentence option if applicable.
4. Encourage the user and keep responses conversational, structured, and easy to digest.
5. Provide realistic examples when helpful.

Format response as JSON with:
- reply (main response string)
- grammarCorrection (optional string if user made a grammar error)
- improvedVersion (optional polished professional sentence rephrase)`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: promptText,
      config: {
        systemInstruction: "You are an encouraging and articulate AI English Communication Coach. Help learners speak and write with confidence.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING },
            grammarCorrection: { type: Type.STRING },
            improvedVersion: { type: Type.STRING },
          },
          required: ["reply"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (error) {
    console.error("Gemini Coach Chat Error:", error);
    res.json({
      reply: "I noticed your question! Keeping sentences clear and concise is always effective in professional communication. What specific topic would you like to practice next?",
      isFallback: true
    });
  }
});

// 4. Interview Evaluation API
app.post("/api/eval/interview", async (req, res) => {
  const { category, question, answer } = req.body;

  if (!answer || typeof answer !== "string") {
    return res.status(400).json({ error: "Answer text is required." });
  }

  const ai = getGenAIClient();

  if (!ai) {
    return res.json({
      score: 82,
      structureScore: 80,
      relevanceScore: 85,
      professionalismScore: 82,
      whatYouDidWell: [
        "Maintained professional tone and clear organization.",
        "Directly addressed the core interview prompt.",
        "Demonstrated positive attitude and growth mindset."
      ],
      whatToImprove: [
        "Include more concrete metrics or specific examples.",
        "Structure the response clearly using the STAR framework."
      ],
      betterStructure: "Situation -> Task -> Action taken -> Positive Result achieved.",
      sampleAnswer: `When faced with this situation, I first analyzed the key objectives. I collaborated with my team to outline actionable steps, implemented the necessary solutions, and achieved a 20% improvement in efficiency.`,
      isDemoFallback: true
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `Evaluate the following interview response.
Category: ${category || "General HR Interview"}
Interview Question: "${question}"
Candidate Answer: "${answer}"

Provide a thorough evaluation including:
- score (0-100 overall)
- structureScore (0-100)
- relevanceScore (0-100)
- professionalismScore (0-100)
- whatYouDidWell (array of 3 points)
- whatToImprove (array of 2 points)
- betterStructure (short summary of optimal response outline)
- sampleAnswer (exemplary professional answer for this exact question)`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER },
            structureScore: { type: Type.INTEGER },
            relevanceScore: { type: Type.INTEGER },
            professionalismScore: { type: Type.INTEGER },
            whatYouDidWell: { type: Type.ARRAY, items: { type: Type.STRING } },
            whatToImprove: { type: Type.ARRAY, items: { type: Type.STRING } },
            betterStructure: { type: Type.STRING },
            sampleAnswer: { type: Type.STRING },
          },
          required: [
            "score", "structureScore", "relevanceScore", "professionalismScore",
            "whatYouDidWell", "whatToImprove", "betterStructure", "sampleAnswer"
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (error) {
    console.error("Gemini Interview Eval Error:", error);
    res.json({
      score: 78,
      structureScore: 75,
      relevanceScore: 80,
      professionalismScore: 80,
      whatYouDidWell: [
        "Relevant points addressed clearly.",
        "Polite and professional language used."
      ],
      whatToImprove: [
        "Elaborate with specific personal examples.",
        "Use active action verbs."
      ],
      betterStructure: "State main point -> Provide real example -> Summarize key takeaway.",
      sampleAnswer: `I approach this challenge by prioritizing clear communication and structured planning to deliver quality outcomes.`,
      isFallback: true
    });
  }
});

// 5. Full AI Interview Next Question Generator
app.post("/api/interview/next-question", async (req, res) => {
  const { interviewType, difficulty, history } = req.body;

  const ai = getGenAIClient();

  if (!ai) {
    const fallbackQuestions = [
      "Can you describe a challenging scenario you navigated in your recent work or academic studies?",
      "How do you ensure clear communication when working with team members from different backgrounds?",
      "What steps do you take to continuously learn and upgrade your skills in your field?",
      "Where do you see yourself contributing the most value in our organization over the coming year?"
    ];
    const questionIndex = Math.min(fallbackQuestions.length - 1, (history || []).length);
    return res.json({
      nextQuestion: fallbackQuestions[questionIndex] || "Is there anything else you would like to highlight about your professional experience?",
      isDemoFallback: true
    });
  }

  try {
    const formattedHistory = (history || []).map((h: { question: string; answer: string }) => {
      return `Interviewer: ${h.question}\nCandidate: ${h.answer}`;
    }).join("\n\n");

    const promptText = `You are a professional ${interviewType || "HR"} interviewer conducting a ${difficulty || "Intermediate"} level interview.
Conversation history so far:
${formattedHistory || "Interview just started."}

Based on the candidate's previous response, ask a natural, realistic follow-up question or transition to the next interview topic.
Rules:
- Keep the question concise, direct, and conversational (1-2 sentences).
- If the candidate's previous answer was brief, ask them to elaborate on a specific point.
- Maintain a polite, professional interviewer tone.

Return JSON with key: "nextQuestion"`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            nextQuestion: { type: Type.STRING }
          },
          required: ["nextQuestion"]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (error) {
    console.error("Gemini Next Question Error:", error);
    res.json({
      nextQuestion: "That is very helpful. Moving forward, how do you handle tight deadlines or sudden priorities in a project?",
      isFallback: true
    });
  }
});

// 6. Full AI Interview Final Evaluation API
app.post("/api/eval/full-interview", async (req, res) => {
  const { interviewType, difficulty, durationMinutes, conversation } = req.body;

  if (!conversation || !Array.isArray(conversation) || conversation.length === 0) {
    return res.status(400).json({ error: "Conversation transcript is required." });
  }

  const ai = getGenAIClient();

  if (!ai) {
    return res.json({
      fluency: 84,
      grammar: 81,
      vocabulary: 80,
      pronunciation: 85,
      clarity: 86,
      confidence: 82,
      relevance: 88,
      professionalism: 85,
      communication: 84,
      overall: 84,
      strengths: [
        "Articulate responses with direct alignment to interview questions.",
        "Positive energy and calm, confident tone throughout the session.",
        "Clear logical progression when explaining project experiences."
      ],
      areasToImprove: [
        "Incorporate more quantitative metrics when describing achievements.",
        "Refine transition phrases between sentence blocks for smoother flow."
      ],
      aiRecommendation: "Great interview performance! Practice incorporating concrete project metrics (e.g. 'improved performance by 25%') to make your answers even more persuasive.",
      betterSentences: [
        {
          original: "I worked on a website and fixed bugs.",
          better: "I developed responsive web components and resolved critical performance bottlenecks, improving site load time."
        }
      ],
      isDemoFallback: true
    });
  }

  try {
    const formattedTranscript = conversation.map((c: { question: string; answer: string }, i: number) => {
      return `Q${i + 1}: ${c.question}\nA${i + 1}: ${c.answer}`;
    }).join("\n\n");

    const promptText = `Evaluate this complete ${interviewType || "HR"} interview session.
Difficulty: ${difficulty || "Intermediate"}
Duration: ${durationMinutes || 10} minutes

Interview Transcript:
${formattedTranscript}

Evaluate strictly on a 0-100 scale for:
- fluency, grammar, vocabulary, pronunciation, clarity, confidence, relevance, professionalism, communication, overall

Provide JSON output with exact keys:
fluency, grammar, vocabulary, pronunciation, clarity, confidence, relevance, professionalism, communication, overall,
strengths (array of 3 strings),
areasToImprove (array of 2-3 strings),
aiRecommendation (string of comprehensive summary advice),
betterSentences (array of objects with keys "original" and "better")`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fluency: { type: Type.INTEGER },
            grammar: { type: Type.INTEGER },
            vocabulary: { type: Type.INTEGER },
            pronunciation: { type: Type.INTEGER },
            clarity: { type: Type.INTEGER },
            confidence: { type: Type.INTEGER },
            relevance: { type: Type.INTEGER },
            professionalism: { type: Type.INTEGER },
            communication: { type: Type.INTEGER },
            overall: { type: Type.INTEGER },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            areasToImprove: { type: Type.ARRAY, items: { type: Type.STRING } },
            aiRecommendation: { type: Type.STRING },
            betterSentences: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  original: { type: Type.STRING },
                  better: { type: Type.STRING }
                },
                required: ["original", "better"]
              }
            }
          },
          required: [
            "fluency", "grammar", "vocabulary", "pronunciation", "clarity", "confidence",
            "relevance", "professionalism", "communication", "overall",
            "strengths", "areasToImprove", "aiRecommendation"
          ]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (error) {
    console.error("Gemini Full Interview Eval Error:", error);
    res.json({
      fluency: 80,
      grammar: 78,
      vocabulary: 77,
      pronunciation: 82,
      clarity: 83,
      confidence: 80,
      relevance: 85,
      professionalism: 82,
      communication: 81,
      overall: 81,
      strengths: [
        "Structured answers addressing key points.",
        "Maintained respectful and clear delivery."
      ],
      areasToImprove: [
        "Elaborate with specific personal project details.",
        "Vary vocabulary range."
      ],
      aiRecommendation: "Good job! Focus on practicing STAR method framing for behavioral questions.",
      isFallback: true
    });
  }
});

// 7. Roleplay Conversation & Turn Feedback API
app.post("/api/roleplay/chat", async (req, res) => {
  const { situationTitle, roleName, userTurnText, history } = req.body;

  if (!userTurnText || typeof userTurnText !== "string") {
    return res.status(400).json({ error: "userTurnText is required." });
  }

  const ai = getGenAIClient();

  if (!ai) {
    // Demo Fallback Response
    return res.json({
      aiResponse: `That is very clear! In this ${situationTitle || "situation"}, what would be your next step or preference?`,
      turnFeedback: {
        grammarCorrection: userTurnText.toLowerCase().includes("i am go") ? "Correction: Use 'I am going' instead of 'I am go'." : "Grammar looks solid for this turn!",
        betterSentence: `An improved version: "Thank you. ${userTurnText} I am looking forward to moving to the next step."`,
        pronunciationFeedback: "Good articulation on key words. Focus on smooth vowel sounds.",
        vocabularySuggestion: "Try using 'appreciate' instead of 'like', or 'assist' instead of 'help'.",
        fluencyScore: 82,
        confidenceScore: 85
      },
      isDemoFallback: true
    });
  }

  try {
    const formattedHistory = (history || []).map((h: { speaker: string; text: string }) => `${h.speaker}: ${h.text}`).join("\n");

    const promptText = `You are playing the role of '${roleName || "Interviewer"}' in a real-life English conversation roleplay scenario titled '${situationTitle || "Job Interview"}'.
    
Conversation History:
${formattedHistory || "Starting conversation."}

User just said: "${userTurnText}"

Perform TWO tasks in your JSON response:
1. Provide a natural, polite, in-character next response ("aiResponse"). Keep it 1-3 sentences long to prompt the user to continue speaking.
2. Provide constructive learning feedback on the user's turn ("turnFeedback"):
   - grammarCorrection: Brief note on any grammar error or "Grammar is accurate!"
   - betterSentence: A polished, natural native English version of what the user tried to say
   - pronunciationFeedback: Tip on pronouncing words or cadence in this response
   - vocabularySuggestion: 1-2 advanced or natural vocabulary words suitable for this context
   - fluencyScore: Integer 0-100 score for this turn
   - confidenceScore: Integer 0-100 score for this turn

Return JSON with exact keys: aiResponse, turnFeedback (object with grammarCorrection, betterSentence, pronunciationFeedback, vocabularySuggestion, fluencyScore, confidenceScore).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            aiResponse: { type: Type.STRING },
            turnFeedback: {
              type: Type.OBJECT,
              properties: {
                grammarCorrection: { type: Type.STRING },
                betterSentence: { type: Type.STRING },
                pronunciationFeedback: { type: Type.STRING },
                vocabularySuggestion: { type: Type.STRING },
                fluencyScore: { type: Type.INTEGER },
                confidenceScore: { type: Type.INTEGER }
              },
              required: ["grammarCorrection", "betterSentence", "pronunciationFeedback", "vocabularySuggestion", "fluencyScore", "confidenceScore"]
            }
          },
          required: ["aiResponse", "turnFeedback"]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (error) {
    console.error("Gemini Roleplay Chat Error:", error);
    res.json({
      aiResponse: "Thank you for sharing that. Could you tell me a bit more about your background?",
      turnFeedback: {
        grammarCorrection: "Good effort!",
        betterSentence: userTurnText,
        pronunciationFeedback: "Keep your pace steady.",
        vocabularySuggestion: "Practice using connective adverbs.",
        fluencyScore: 80,
        confidenceScore: 80
      },
      isFallback: true
    });
  }
});

// 8. Image-Based Speaking Practice Evaluation API ("See -> Think -> Speak")
app.post("/api/image-speaking/eval", async (req, res) => {
  const { imageName, userSpeech } = req.body;

  if (!userSpeech || typeof userSpeech !== "string") {
    return res.status(400).json({ error: "userSpeech transcript is required." });
  }

  const ai = getGenAIClient();

  if (!ai) {
    return res.json({
      userAnswer: userSpeech,
      grammarCorrections: "Minor tense alignment check. Otherwise clear and understandable.",
      betterVersion: `In this scene of a ${imageName || "busy location"}, I can observe multiple people actively engaged in daily activities.`,
      usefulVocabulary: [
        { word: "Bustling", meaning: "Full of energetic activity and movement." },
        { word: "Pedestrian", meaning: "A person walking along a street." },
        { word: "Vibrant", meaning: "Full of energy and life." },
        { word: "Stall / Kiosk", meaning: "A small open counter or shop." },
        { word: "Commute", meaning: "Travel back and forth regularly." }
      ],
      scores: {
        grammar: 82,
        vocabulary: 78,
        fluency: 80,
        pronunciation: 84,
        sentenceFormation: 81
      },
      modelAnswer: `In this image depicting a ${imageName || "scene"}, we can see a dynamic environment filled with people. In the foreground, several individuals are moving around, while in the background, shopfronts and architecture create a vibrant backdrop. The atmosphere appears lively and organized.`,
      isDemoFallback: true
    });
  }

  try {
    const promptText = `You are an English language speaking tutor evaluating an image description spoken by a student.
Scene / Image Topic: "${imageName || "Marketplace / Public Scene"}"
Student Spoken Description: "${userSpeech}"

Perform a complete feedback evaluation with:
- userAnswer: exact student speech
- grammarCorrections: detailed corrections or praise for correct syntax
- betterVersion: a polished natural rephrase of what the student said
- usefulVocabulary: array of 5 to 8 objects each with "word" and "meaning" related to describing this scene
- scores: object with integer scores 0-100 for grammar, vocabulary, fluency, pronunciation, sentenceFormation
- modelAnswer: a comprehensive 3-5 sentence model description of the scene that the student can practice reading aloud.

Return JSON with exact structure matching these keys.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: promptText,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            userAnswer: { type: Type.STRING },
            grammarCorrections: { type: Type.STRING },
            betterVersion: { type: Type.STRING },
            usefulVocabulary: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  meaning: { type: Type.STRING }
                },
                required: ["word", "meaning"]
              }
            },
            scores: {
              type: Type.OBJECT,
              properties: {
                grammar: { type: Type.INTEGER },
                vocabulary: { type: Type.INTEGER },
                fluency: { type: Type.INTEGER },
                pronunciation: { type: Type.INTEGER },
                sentenceFormation: { type: Type.INTEGER }
              },
              required: ["grammar", "vocabulary", "fluency", "pronunciation", "sentenceFormation"]
            },
            modelAnswer: { type: Type.STRING }
          },
          required: ["userAnswer", "grammarCorrections", "betterVersion", "usefulVocabulary", "scores", "modelAnswer"]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (error) {
    console.error("Gemini Image Speaking Eval Error:", error);
    res.json({
      userAnswer: userSpeech,
      grammarCorrections: "Clear description!",
      betterVersion: userSpeech,
      usefulVocabulary: [{ word: "Atmosphere", meaning: "The feel or mood of a place." }],
      scores: { grammar: 80, vocabulary: 80, fluency: 80, pronunciation: 80, sentenceFormation: 80 },
      modelAnswer: "This image shows a scene with people going about their daily routine.",
      isFallback: true
    });
  }
});


// Vite & Static file serving setup
async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== "production") {
    const isHmrDisabled = process.env.DISABLE_HMR === "true";

    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: "0.0.0.0",
        port: 3000,
        hmr: isHmrDisabled
          ? false
          : {
              server: httpServer,
            },
      },
      appType: "spa",
    });

    app.use(vite.middlewares);

    if (isHmrDisabled) {
      httpServer.on("upgrade", (_req, socket) => {
        socket.write(
          "HTTP/1.1 400 Bad Request\r\n" +
          "Connection: close\r\n" +
          "Content-Type: text/plain\r\n\r\n" +
          "WebSocket connections are disabled."
        );
        socket.destroy();
      });
    }
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
