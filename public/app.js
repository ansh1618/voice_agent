const fileUpload = document.getElementById('file-upload');
const uploadZone = document.getElementById('upload-zone');
const uploadText = document.getElementById('upload-text');
const micBtn = document.getElementById('mic-btn');
const statusText = document.getElementById('status-text');

let currentPdfFile = null;

// Ensure Speech API is supported
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognition) {
    statusText.innerText = "Error: Speech recognition not supported in this browser. Use Chrome or Edge.";
    statusText.style.color = "var(--danger)";
}

const recognition = new SpeechRecognition();
recognition.continuous = false;
recognition.interimResults = false;

function updateStep(stepNumber) {
    for (let i = 1; i <= 5; i++) {
        const circle = document.getElementById(`circle-${i}`);
        const label = document.getElementById(`label-${i}`);
        if (i <= stepNumber) {
            circle.classList.add('active');
            label.classList.add('active');
        } else {
            circle.classList.remove('active');
            label.classList.remove('active');
        }
    }
}

function resetPipeline() {
    setTimeout(() => {
        updateStep(0);
        statusText.innerText = "Ready for another question.";
    }, 2000);
}

// STEP 1: Upload Logic
uploadZone.addEventListener('click', () => fileUpload.click());

fileUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        currentPdfFile = file; // Store the actual file object
        uploadText.innerText = `${file.name} uploaded.`;
        statusText.innerText = "Tap the mic and ask your question.";
        uploadZone.style.borderColor = "var(--accent)";
    }
});

// STEP 2 & 3: Voice Capture
micBtn.addEventListener('click', () => {
    if (!currentPdfFile) {
        alert("Please upload a PDF document first.");
        return;
    }
    if (!SpeechRecognition) return;

    updateStep(1);
    recognition.start();
    micBtn.classList.add('recording');
    statusText.innerText = "Listening...";
});

recognition.onresult = async (event) => {
    micBtn.classList.remove('recording');
    const transcript = event.results[0][0].transcript;
    
    updateStep(2);
    statusText.innerText = `You: "${transcript}"`;

    // Send to Backend
    updateStep(3);
    statusText.innerText = `Analyzing document...`;
    
    await askBackend(transcript);
};

recognition.onerror = (event) => {
    micBtn.classList.remove('recording');
    statusText.innerText = `Microphone error: ${event.error}`;
    updateStep(0);
};

// Communicate with Node.js Server
async function askBackend(question) {
    const formData = new FormData();
    formData.append('pdf', currentPdfFile);
    formData.append('question', question);

    try {
        const response = await fetch('/api/ask', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();
        
        if (data.error) throw new Error(data.error);

        prepareAudio(data.answer);

    } catch (error) {
        console.error("Fetch Error:", error);
        statusText.innerText = "Error analyzing document. Check console.";
        updateStep(0);
    }
}

// STEP 4 & 5: Text to Speech
function prepareAudio(text) {
    updateStep(4);
    statusText.innerText = `Preparing audio...`;
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.onstart = () => {
        updateStep(5);
        statusText.innerText = `Claude: "${text}"`;
    };

    utterance.onend = () => {
        resetPipeline();
    };

    window.speechSynthesis.speak(utterance);
}
