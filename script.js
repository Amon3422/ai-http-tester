const { use } = require("react")

//State Management
let state = {
    payloads:[],
    currentRequest:'',
    history:[],
    injectionPoints:[]
}

//DOM Management
const chatInput = document.getElementById("chatInput")
const askAiBtn = document.getElementById("askAiBtn")
const chatMessages = document.getElementById("chatMessages")
const requestEditor = document.getElementById("requestEditor")
const payloadSelect = document.getElementById("payloadSelect")
const sendRequestBtn = document.getElementById("sendRequestBtn");
const analyzeBtn = document.getElementById('analyzeBtn');
const historyTableBody = document.getElementById('historyTableBody');
const analysisResult = document.getElementById('analysisResult');

//Event Listeners
askAiBtn.addEventListener('click', handleAskAI)
chatInput.addEventListener('keypress', (e) => {
    if(e.key === 'Enter') handleAskAI()
})

//Initialize
console.log('AI HTTP Tester initialized');
console.log('Ready to start testing!');

//Function
function handleAskAI(){
    const userMessage = chatInput.value.trim()
    if(!userMessage) return;

    //Add user message to chat
    addChatMessage("user", userMessage)
    chatInput.value=''
}

// Helper function to add messages to chat
function addChatMessage(type, message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    const prefix = type === 'user' ? 'You' : 'AI';
    messageDiv.innerHTML = `<strong>${prefix}:</strong> ${escapeHtml(message)}`;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}