require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const port = process.env.PORT || 3003;

// Initialize Google Gen AI client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.use(cors());
app.use(express.static('public'));

// Setup Multer for handling file uploads (stored in memory)
const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/ask', upload.single('pdf'), async (req, res) => {
    try {
        const question = req.body.question;
        const fileBuffer = req.file?.buffer;

        if (!question || !fileBuffer) {
            return res.status(400).json({ error: "Missing PDF or question" });
        }

        console.log(`Processing question: "${question}"`);

        // Convert the PDF buffer into the format required by Gemini
        const documentPart = {
            inlineData: {
                data: fileBuffer.toString("base64"),
                mimeType: "application/pdf"
            }
        };

        const prompt = `You are a helpful Q&A assistant. Read the attached document and answer the user's question based strictly on the provided text. Keep your answer concise and easy to read aloud.\n\nQuestion: ${question}`;

        // Query Gemini 1.5 Flash (Great for fast, free text/document tasks)
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [prompt, documentPart],
            config: {
                maxOutputTokens: 500,
            }
        });

        const answerText = response.text;
        
        console.log("Answer generated successfully from Gemini.");
        res.json({ answer: answerText });

    } catch (error) {
        console.error("Backend Error:", error);
        res.status(500).json({ error: "An error occurred while processing your request with Gemini." });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});