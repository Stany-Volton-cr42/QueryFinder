import { useState, useRef, useEffect } from "react";
import "./App.css";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import * as pdfjsLib from "pdfjs-dist/webpack";

function App() {
  // State management for dark mode and chat application
  const [darkMode, setDarkMode] = useState(() => {
    // Check localStorage or system preference for initial dark mode state
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark' ||
      (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  // State management for chat application
  const [chatHistory, setChatHistory] = useState([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [generatingAnswer, setGeneratingAnswer] = useState(false);
  const [uploadedContent, setUploadedContent] = useState(""); // File content state

  // Update dark mode in local storage and apply theme
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Reference for auto-scrolling chat container
  const chatContainerRef = useRef(null);

  // Auto-scroll effect for chat container
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory, generatingAnswer]);

  // Generate AI response and update chat history
  async function generateAnswer(e, clickedQuestion) {
    if (e) e.preventDefault();

    const currentQuestion = clickedQuestion || question.trim();
    if (!currentQuestion && !uploadedContent) return; // Ensure something is sent

    setGeneratingAnswer(true);
    setQuestion(""); // Clear input immediately after sending

    // Update chat history with current question
    setChatHistory((prev) => [
      ...prev,
      { type: "question", content: currentQuestion || "Using uploaded file content" },
    ]);

    try {
      // Prepare context by combining uploaded content with question
      const context = uploadedContent
        ? `${uploadedContent}\n\nQuestion: ${currentQuestion}`
        : currentQuestion;

      console.log("Sending context to API:", context);

      // Send request to Gemini API
      const response = await axios({
        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${import.meta.env.VITE_API_GENERATIVE_LANGUAGE_CLIENT
          }`,
        method: "post",
        data: {
          contents: [{ parts: [{ text: context }] }],
        },
      });

      const aiResponse = response.data.candidates[0].content.parts[0].text;

      // Update chat history with AI response
      setChatHistory((prev) => [...prev, { type: "answer", content: aiResponse }]);
      setAnswer(aiResponse);
    } catch (error) {
      console.error("Error during API request:", error);
      setAnswer("Sorry - Something went wrong. Please try again!");
    }
    setGeneratingAnswer(false);
  }

  // Handle file upload for PDF and text files
  async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    // Parse PDF file content
    if (file.type === "application/pdf") {
      reader.onload = async (e) => {
        const pdfData = new Uint8Array(e.target.result);
        const pdf = await pdfjsLib.getDocument(pdfData).promise;

        let textContent = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const text = await page.getTextContent();
          textContent += text.items.map((item) => item.str).join(" ") + "\n";
        }

        // Save parsed PDF content
        setUploadedContent(textContent.trim());
        setChatHistory((prev) => [
          ...prev,
          { type: "info", content: `Uploaded file: ${file.name}` },
        ]);

        console.log("Parsed PDF content:", textContent.trim());
      };
      reader.readAsArrayBuffer(file);
    }
    // Parse plain text file content
    else if (file.type === "text/plain") {
      reader.onload = (e) => {
        const textContent = e.target.result;
        setUploadedContent(textContent.trim());
        setChatHistory((prev) => [
          ...prev,
          { type: "info", content: `Uploaded file: ${file.name}` },
        ]);

        console.log("Parsed Text content:", textContent.trim());
      };
      reader.readAsText(file);
    } else {
      alert("Unsupported file type. Please upload a PDF or text file.");
    }
  }

  // Main application render method
  return (
    <div className={`fixed inset-0 ${darkMode
      ? 'bg-gradient-to-r from-gray-900 to-gray-800 text-white'
      : 'bg-gradient-to-r from-blue-50 to-blue-100'}`}>
      <div className="h-full max-w-4xl mx-auto flex flex-col p-3">
        {/* Application header section with dark mode toggle */}
        <header className="text-center py-4 relative">
          <a
            href="https://query-finder-swart.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <h1 className={`text-4xl font-bold ${darkMode
              ? 'text-blue-300 hover:text-blue-200'
              : 'text-blue-500 hover:text-blue-600'} transition-colors`}>
              Query Finder AI
            </h1>
          </a>

          {/* Dark mode toggle button */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`absolute top-4 right-0 p-2 rounded-full 
              ${darkMode
                ? 'bg-gray-700 text-white hover:bg-gray-600'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'} 
              transition-colors duration-300`}
          >
            {darkMode ? '🌞' : '🌙'}
          </button>
        </header>

        {/* Scrollable chat container with dark mode styles */}
        <div
          ref={chatContainerRef}
          className={`flex-1 overflow-y-auto mb-4 rounded-lg shadow-lg p-4 hide-scrollbar ${darkMode
            ? 'bg-gray-800 text-white'
            : 'bg-white text-black'
            }`}
        >
          {/* Welcome/initial screen */}
          {chatHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <div className={`rounded-xl p-8 max-w-2xl ${darkMode
                ? 'bg-gray-700 text-white'
                : 'bg-blue-50 text-black'
                }`}>
                <h2 className={`text-2xl font-bold mb-4 ${darkMode
                  ? 'text-blue-300'
                  : 'text-blue-600'
                  }`}>
                  Welcome to Query Finder AI 👋
                </h2>
                <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  I'm here to help you with anything you'd like to know. You can ask me about:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  <button
                    className={`p-4 rounded-lg shadow-sm cursor-pointer ${darkMode
                      ? 'bg-gray-600 text-white hover:bg-gray-500'
                      : 'bg-white text-black hover:bg-gray-50'}`}
                    onClick={() => generateAnswer(null, "General knowledge")}
                  >
                    <span className="text-blue-500">💡</span> General knowledge
                  </button>
                  <button
                    className={`p-4 rounded-lg shadow-sm cursor-pointer ${darkMode
                      ? 'bg-gray-600 text-white hover:bg-gray-500'
                      : 'bg-white text-black hover:bg-gray-50'}`}
                    onClick={() => generateAnswer(null, "Technical questions")}
                  >
                    <span className="text-blue-500">🔧</span> Technical questions
                  </button>
                  <button
                    className={`p-4 rounded-lg shadow-sm cursor-pointer ${darkMode
                      ? 'bg-gray-600 text-white hover:bg-gray-500'
                      : 'bg-white text-black hover:bg-gray-50'}`}
                    onClick={() => generateAnswer(null, "Writing assistance")}
                  >
                    <span className="text-blue-500">📝</span> Writing assistance
                  </button>
                  <button
                    className={`p-4 rounded-lg shadow-sm cursor-pointer ${darkMode
                      ? 'bg-gray-600 text-white hover:bg-gray-500'
                      : 'bg-white text-black hover:bg-gray-50'}`}
                    onClick={() => generateAnswer(null, "Problem solving")}
                  >
                    <span className="text-blue-500">🤔</span> Problem solving
                  </button>
                </div>
                <p className={`mt-6 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Just type your question below and press Enter or click Send!
                </p>
              </div>
            </div>
          ) : (
            
            // Chat history rendering with dark mode classes
            chatHistory.map((chat, index) => (
              <div key={index} className={`mb-4 ${chat.type === "question" ? "text-right" : "text-left"}`}>
                <div
                  className={`inline-block max-w-[80%] p-4 rounded-lg ${chat.type === "question"
                    ? (darkMode
                      ? "bg-blue-700 text-white rounded-br-none"
                      : "bg-blue-500 text-white rounded-br-none")
                    : chat.type === "info"
                      ? (darkMode
                        ? "bg-gray-700 text-yellow-300 rounded"
                        : "bg-yellow-100 text-gray-800 rounded")
                      : (darkMode
                        ? "bg-gray-700 text-white rounded-bl-none"
                        : "bg-gray-100 text-gray-800 rounded-bl-none")
                    }`}
                >
                  <div className={`${chat.type === "answer" ? "space-y-3" : ""}`}>
                    {chat.type === "answer" && (
                      chat.content.split("\n\n").map((paragraph, i) => (
                        <div key={i}>
                          {paragraph.split("\n").map((line, j) => (
                            <p key={j} className={`${j === 0 && i === 0 ? "font-bold" : ""}`}>
                              {/* Use custom component for bold text */}
                              <ReactMarkdown
                                className="" // Remove unnecessary class
                                components={{
                                  strong: ({ children }) => (
                                    <span className="font-bold">{children}</span>
                                  ),
                                }}
                              >
                                {line.trim()}
                              </ReactMarkdown>
                            </p>
                          ))}
                        </div>
                      ))
                    )}
                    {chat.type !== "answer" && (
                      <ReactMarkdown
                        className="prose prose-invert max-w-none"
                        components={{
                          p: ({ children }) => <p className="mb-1">{children}</p>,
                          strong: ({ children }) => (
                            <span className="font-bold">{children}</span>
                          ),
                        }}
                      >
                        {chat.content}
                      </ReactMarkdown>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}

          {/* Thinking indicator with dark mode classes */}
          {generatingAnswer && (
            <div className="text-left">
              <div className={`inline-block p-3 rounded-lg animate-pulse ${darkMode
                ? 'bg-gray-700 text-white'
                : 'bg-gray-100 text-black'
                }`}>
                Thinking...
              </div>
            </div>
          )}
        </div>

        {/* Input form with dark mode classes */}
        <form
          onSubmit={(e) => generateAnswer(e)}
          className={`rounded-lg shadow-lg p-4 ${darkMode
            ? 'bg-gray-800 text-white'
            : 'bg-white text-black'
            }`}
        >
          {/* Uploaded content preview with dark mode classes */}
          {uploadedContent && (
            <div className={`mb-4 p-3 rounded text-sm ${darkMode
              ? 'bg-gray-700 text-yellow-300 border-yellow-700'
              : 'bg-yellow-50 text-yellow-800 border-yellow-200'
              } border`}>
              Uploaded File Content: {uploadedContent.slice(0, 100)}...
            </div>
          )}

          {/* Question input and send button with dark mode classes */}
          <div className="flex gap-2 p-5">
            <textarea
              required
              className={`flex-1 rounded resize-none p-3 ${darkMode
                ? 'bg-gray-700 text-white border-gray-600 focus:border-blue-600 focus:ring-blue-600'
                : 'bg-white text-black border-gray-300 focus:border-blue-400 focus:ring-blue-400'
                } border focus:ring-1`}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask anything..."
              rows={Math.max(2, Math.min(6, (question.match(/\n/g) || []).length + 1))}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  generateAnswer(e);
                }
              }}
            ></textarea>
            <button
              type="submit"
              disabled={generatingAnswer}
              className={`px-6 py-3 rounded-lg p-1 ${generatingAnswer
                ? (darkMode
                  ? 'bg-gray-700 text-gray-500'
                  : 'bg-blue-300 text-white')
                : (darkMode
                  ? 'bg-blue-700 text-white hover:bg-blue-600'
                  : 'bg-blue-500 text-white hover:bg-blue-600')
                }`}
            >
              {generatingAnswer ? "Generating..." : "Send"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;