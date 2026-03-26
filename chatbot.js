const API_URL = "https://9router.vuhai.io.vn/v1/chat/completions";
const API_KEY = "sk-4bd27113b7dc78d1-lh6jld-f4f9c69f";
const MODEL = "ces-chatbot-gpt-5.4";

let chatHistory = [];
let systemPrompt = "";

async function initChatbot() {
    try {
        const res = await fetch('./chatbot_data.txt');
        let knowledgeBase = "";
        if (res.ok) {
            knowledgeBase = await res.text();
        }
        
        systemPrompt = `Bạn là Trợ lý Pháp lý AI trên website tra cứu Luật Đấu thầu.
Nhiệm vụ của bạn là hỗ trợ người dùng giải đáp các thắc mắc về Luật Đấu thầu dựa trên kiến thức pháp luật Việt Nam.

Cơ sở dữ liệu kiến thức của bạn:
${knowledgeBase}

Quy tắc giao tiếp bắt buộc:
1. Luôn chào hỏi thân thiện và kết thúc bằng cách mời họ đặt thêm câu hỏi.
2. Trả lời ngắn gọn, súc tích, trích dẫn rõ khoản/điều của Luật nếu có.
3. Không bịa đặt thông tin pháp lý.
4. BẠN PHẢI TRẢ LỜI ĐỊNH DẠNG MARKDOWN (sử dụng in đậm, danh sách...). Không dùng HTML.`;

        chatHistory = [{ role: 'system', content: systemPrompt }];
    } catch (e) {
        console.error("Không tải được cơ sở dữ liệu cho chatbot:", e);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    initChatbot();

    const toggleBtn = document.getElementById('chatbot-toggle');
    const closeBtn = document.getElementById('chatbot-close');
    const refreshBtn = document.getElementById('chatbot-refresh');
    const windowEl = document.getElementById('chatbot-window');
    const form = document.getElementById('chatbot-form');
    const input = document.getElementById('chatbot-input');
    const messagesEl = document.getElementById('chatbot-messages');
    const submitBtn = document.getElementById('chatbot-submit');

    // Toggle Chat Window
    toggleBtn.addEventListener('click', () => {
        windowEl.classList.toggle('hidden');
    });

    closeBtn.addEventListener('click', () => {
        windowEl.classList.add('hidden');
    });

    // Refresh Logic (Clear Chat History)
    refreshBtn.addEventListener('click', () => {
        const icon = refreshBtn.querySelector('span');
        icon.classList.add('animate-spin');
        setTimeout(() => icon.classList.remove('animate-spin'), 500);
        
        messagesEl.innerHTML = `
            <div class="flex flex-col gap-1 items-start">
                <div class="bg-white border border-gray-100 px-4 py-2.5 rounded-2xl rounded-tl-sm shadow-sm text-gray-800 max-w-[85%]">
                    <p>Xin chào! Lịch sử trò chuyện đã được làm mới. Tôi có thể giúp gì cho bạn hôm nay?</p>
                </div>
                <span class="text-[10px] text-gray-500 ml-1">Vừa xong</span>
            </div>
        `;
        chatHistory = [{ role: 'system', content: systemPrompt }];
    });

    // Submit Logic
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userMsg = input.value.trim();
        if (!userMsg) return;

        appendMessage('user', userMsg);
        input.value = '';
        submitBtn.disabled = true;

        chatHistory.push({ role: 'user', content: userMsg });

        const typingId = "typing-" + Date.now();
        appendTypingIndicator(typingId);

        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                },
                body: JSON.stringify({
                    model: MODEL,
                    messages: chatHistory,
                    temperature: 0.7
                })
            });

            const data = await response.json();
            document.getElementById(typingId)?.remove();

            if (data.choices && data.choices.length > 0) {
                const botMsg = data.choices[0].message.content;
                chatHistory.push({ role: 'assistant', content: botMsg });
                
                // Markdown to HTML via marked.js
                const htmlContent = marked.parse(botMsg);
                appendMessage('assistant', htmlContent, true);
            } else {
                appendMessage('assistant', "Lỗi xử lý yêu cầu phản hồi từ Server.");
            }
        } catch (error) {
            console.error(error);
            document.getElementById(typingId)?.remove();
            appendMessage('assistant', "Không thể kết nối đến máy chủ AI. Vui lòng kiểm tra mạng hoặc thử lại.");
        } finally {
            submitBtn.disabled = false;
            messagesEl.scrollTop = messagesEl.scrollHeight;
        }
    });

    // Helper functions
    function appendMessage(role, content, isHtml = false) {
        const div = document.createElement('div');
        div.className = "flex flex-col gap-1 " + (role === 'user' ? "items-end" : "items-start");
        
        const innerDiv = document.createElement('div');
        innerDiv.className = role === 'user' 
            ? "bg-primary text-white border border-primary px-4 py-2.5 rounded-2xl rounded-tr-sm shadow-sm max-w-[85%] break-words"
            : "bg-white border border-gray-100 px-4 py-2.5 rounded-2xl rounded-tl-sm shadow-sm text-gray-800 max-w-[85%] break-words prose prose-sm prose-p:leading-relaxed";
        
        if (isHtml) {
            innerDiv.innerHTML = content;
        } else {
            const p = document.createElement('p');
            p.textContent = content;
            innerDiv.appendChild(p);
        }

        const timeSpan = document.createElement('span');
        timeSpan.className = "text-[10px] text-gray-500 " + (role === 'user' ? "mr-1" : "ml-1");
        const now = new Date();
        timeSpan.textContent = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

        div.appendChild(innerDiv);
        div.appendChild(timeSpan);
        messagesEl.appendChild(div);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function appendTypingIndicator(id) {
        const div = document.createElement('div');
        div.id = id;
        div.className = "flex flex-col gap-1 items-start";
        div.innerHTML = `
            <div class="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm max-w-[85%]">
                <div class="flex gap-1.5">
                    <div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                    <div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.15s"></div>
                    <div class="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.3s"></div>
                </div>
            </div>
        `;
        messagesEl.appendChild(div);
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }
});
