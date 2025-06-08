// app/page.js
'use client';
import { useState, useEffect, useRef, Fragment } from 'react';
import { motion } from 'framer-motion';
import Markdown from 'react-markdown';

export default function ChatApp() {
  const [apiKey, setApiKey] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState(['deepseek-ai/deepseek-llm-r1-chat']);
  const [selectedModel, setSelectedModel] = useState('deepseek-ai/deepseek-llm-r1-chat');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [maxTokens, setMaxTokens] = useState(2048);
  const abortController = useRef(null);
  const messageEndRef = useRef(null);
  const apiKeyRef = useRef(null);

  useEffect(() => {
    // Fetch from localStorage
    const storedApiKey = localStorage.getItem('openrouter_api_key');
    const storedModels = JSON.parse(localStorage.getItem('openrouter_models')) || ['deepseek-ai/deepseek-llm-r1-chat'];
    const storedModel = localStorage.getItem('openrouter_selected_model') || 'deepseek-ai/deepseek-llm-r1-chat';
    const storedSystemPrompt = localStorage.getItem('openrouter_system_prompt') || '';
    const storedMaxTokens = localStorage.getItem('openrouter_max_tokens') || 2048;
    
    if (storedApiKey) setApiKey(storedApiKey);
    if (storedModels) setModels(storedModels);
    if (storedModel) setSelectedModel(storedModel);
    if (storedSystemPrompt) setSystemPrompt(storedSystemPrompt);
    if (storedMaxTokens) setMaxTokens(parseInt(storedMaxTokens));
  }, []);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const addNewModel = () => {
    const newModel = prompt('Enter new model ID from OpenRouter:');
    if (newModel && !models.includes(newModel)) {
      const updatedModels = [...models, newModel];
      setModels(updatedModels);
      setSelectedModel(newModel);
      localStorage.setItem('openrouter_models', JSON.stringify(updatedModels));
    }
  };

  const saveSettings = () => {
    localStorage.setItem('openrouter_api_key', apiKey);
    localStorage.setItem('openrouter_selected_model', selectedModel);
    localStorage.setItem('openrouter_system_prompt', systemPrompt);
    localStorage.setItem('openrouter_max_tokens', maxTokens.toString());
    
    // Show confirmation message
    setMessages(prev => [...prev, {
      role: 'system',
      content: 'Settings saved locally!'
    }]);
  };

  const sendMessage = async () => {
    if (!input.trim() || !apiKey) return;
    
    const userMessage = { role: 'user', content: input };
    const updatedMessages = [...messages, userMessage, 
      { role: 'assistant', content: '', isGenerating: true }];
    
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    // Prepare request
    abortController.current = new AbortController();
    
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
            ...messages,
            userMessage
          ],
          max_tokens: maxTokens,
          stream: true
        }),
        signal: abortController.current.signal
      });

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let messageIndex = updatedMessages.length - 1;
      let fullResponse = '';
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const text = decoder.decode(value);
        const chunks = text.trim().split('\n').filter(chunk => chunk !== '');

        for (const chunk of chunks) {
          try {
            if (chunk === 'data: [DONE]') break;
            const json = JSON.parse(chunk.replace('data: ', ''));
            const token = json.choices?.[0]?.delta?.content || '';
            
            if (token) {
              fullResponse += token;
              setMessages(prev => {
                const newMessages = [...prev];
                if (newMessages[messageIndex]) {
                  newMessages[messageIndex].content = fullResponse;
                }
                return newMessages;
              });
            }
          } catch (err) {
            console.error('Stream error:', err);
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setMessages(prev => [...prev.slice(0, -1), { 
          role: 'error', 
          content: `Error: ${err.message}` 
        }]);
      }
    } finally {
      setIsLoading(false);
      setMessages(prev => prev.map(msg => 
        ({ ...msg, isGenerating: false })
      ));
      try {
        if (window.navigator.vibrate) window.navigator.vibrate(20);
      } catch (e) {}
    }
  };

  const stopResponse = () => {
    if (abortController.current) {
      abortController.current.abort();
      setIsLoading(false);
      setMessages(prev => prev.map(msg => 
        ({ ...msg, isGenerating: false })
      ));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isLoading) sendMessage();
  };

  return (
    <div className="container mx-auto px-3 py-6 max-w-4xl">
      {/* API Key Setup Modal */}
      {!apiKey && (
        <motion.div 
          className="fixed inset-0 bg-gray-900/80 backdrop-blur z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div 
            className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-2xl p-6 w-full max-w-md border border-gray-600"
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
          >
            <h2 className="text-2xl font-bold mb-4 bg-gradient-to-r from-beige-300 to-beige-500 bg-clip-text text-transparent">
              API Key Required
            </h2>
            <p className="mb-4">
              Get your free API key from{' '}
              <a 
                href="https://openrouter.ai" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-beige-400 underline hover:text-beige-300"
              >
                OpenRouter
              </a>{' '}
              to start chatting
            </p>
            <input
              type="password"
              ref={apiKeyRef}
              placeholder="Enter your API key"
              className="w-full p-3 rounded-lg bg-gray-700 text-white mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  if (apiKeyRef.current.value.trim()) {
                    setApiKey(apiKeyRef.current.value.trim());
                    localStorage.setItem('openrouter_api_key', apiKeyRef.current.value.trim());
                  }
                }}
                className="bg-beige-500 hover:bg-beige-600 text-gray-900 font-medium px-4 py-2 rounded-lg transition transform hover:scale-[1.02] active:scale-[0.98]"
              >
                Save API Key
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      <header className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <motion.h1 
          className="text-3xl font-bold bg-gradient-to-r from-beige-400 to-beige-300 bg-clip-text text-transparent"
          animate={{ 
            backgroundPosition: ['0% 50%', '100% 50%'],
          }}
          transition={{
            repeat: Infinity,
            repeatType: 'reverse',
            duration: 3
          }}
        >
          OpenChat
        </motion.h1>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <select 
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded-lg pl-3 pr-8 py-2 appearance-none focus:ring-2 focus:ring-beige-500 focus:outline-none animate-fadeInRight"
            >
              {models.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
            <div className="absolute right-2 top-0 bottom-0 flex items-center pointer-events-none">
              <ChevronIcon />
            </div>
          </div>
          
          <motion.button 
            onClick={addNewModel}
            className="bg-gray-700 px-3 py-2 rounded-lg border border-gray-600 hover:bg-gray-600 transition hover:text-beige-300 group"
            whileHover={{ rotate: 90 }}
            whileTap={{ scale: 0.9 }}
          >
            <PlusIcon />
          </motion.button>
        </div>
      </header>

      {/* Settings Panel */}
      <motion.div 
        className="rounded-2xl bg-gray-800/50 backdrop-blur-md mb-6 border border-gray-700 p-4 animate-fadeIn"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">System Prompt</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows="2"
              className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:ring-2 focus:ring-beige-500 focus:outline-none"
              placeholder="You are a helpful assistant..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Max Tokens: {maxTokens}
            </label>
            <input
              type="range"
              min="512"
              max="4096"
              step="128"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value))}
              className="w-full accent-beige-500"
            />
            <div className="flex justify-between text-gray-400 text-xs mt-1">
              <span>512</span>
              <span>2048</span>
              <span>4096</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Chat Messages */}
      <div className="rounded-2xl bg-gradient-to-b from-gray-800/50 to-gray-900/50 backdrop-blur-md border border-gray-700 p-4 mb-6 min-h-[60vh] max-h-[70vh] overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <motion.div 
              animate={{ 
                y: [0, -10, 0],
                rotate: [0, -5, 0, 5, 0]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <RobotIcon size={48} />
            </motion.div>
            <p className="mt-4">Send a message to start the conversation</p>
            <p className="text-sm text-gray-500 mt-2">
              Remember to add your OpenRouter API key
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {messages.map((message, index) => (
              <Fragment key={index}>
                <motion.div
                  className={`p-4 rounded-2xl ${
                    message.role === 'user' 
                      ? 'bg-gray-700/50 backdrop-blur-sm ml-16' 
                      : message.role === 'error'
                        ? 'bg-red-900/25 border border-red-700/50 backdrop-blur-sm'
                        : message.role === 'system'
                          ? 'bg-blue-900/25 border border-blue-700/50 backdrop-blur-sm text-center py-2'
                          : 'bg-gray-800/60 backdrop-blur-sm mr-16'
                  }`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <div className="flex items-start gap-2">
                    <div className={`flex-shrink-0 p-2 rounded-full ${
                      message.role === 'user' 
                        ? 'bg-beige-500 text-gray-900' 
                        : message.role === 'error' 
                          ? 'bg-red-500 text-white'
                          : message.role === 'system'
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-600 text-beige-300'
                    }`}>
                      {message.role === 'user' ? <UserIcon /> : 
                       message.role === 'error' ? <ErrorIcon /> :
                       message.role === 'system' ? <InfoIcon /> : 
                       <RobotIcon />}
                    </div>
                    <div className="flex-1 overflow-x-auto">
                      {message.role === 'user' || message.role === 'system' || message.role === 'error' ? (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      ) : (
                        <Markdown 
                          className="prose prose-invert prose-headings:text-beige-300 prose-code:text-yellow-200 max-w-none"
                          components={{
                            code({node, ...props}) {
                              return <code className="bg-gray-900/40 p-1 rounded" {...props} />;
                            }
                          }}
                        >
                          {message.content}
                        </Markdown>
                      )}
                    </div>
                    
                    {(message.role === 'user' || message.role === 'assistant') && (
                      <button 
                        className="text-gray-400 hover:text-white transition-colors"
                        onClick={() => navigator.clipboard.writeText(message.content)}
                        title="Copy to clipboard"
                      >
                        <CopyIcon />
                      </button>
                    )}
                  </div>
                </motion.div>
              
                {message.role === 'assistant' && message.isGenerating && (
                  <motion.div 
                    className="flex justify-center p-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <ThinkingPill />
                  </motion.div>
                )}
              </Fragment>
            ))}
            <div ref={messageEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <motion.form 
        onSubmit={handleSubmit}
        className="flex flex-wrap gap-2 items-end"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {apiKey && (
          <motion.button
            type="button"
            onClick={saveSettings}
            className="px-4 py-2 bg-gradient-to-r from-gray-600 to-gray-700 rounded-lg text-sm hover:from-gray-700 hover:to-gray-800 transition"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Save Settings
          </motion.button>
        )}
        
        <motion.div
          className="flex-1 min-w-[300px]"
          animate={{ 
            borderColor: isLoading ? '#ca8a04' : '#4b5563',
            boxShadow: isLoading ? '0 0 10px rgba(202, 138, 4, 0.5)' : 'none'
          }}
          transition={{ duration: 0.3 }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            rows={Math.min(4, Math.max(2, input.split('\n').length))}
            className="w-full p-3 rounded-lg bg-gray-700 text-white resize-none border border-gray-600 focus:ring-2 focus:ring-beige-500 focus:outline-none disabled:opacity-70"
            placeholder="Type your message..."
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
        </motion.div>
        
        {isLoading ? (
          <motion.button
            type="button"
            onClick={stopResponse}
            className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 px-5 py-3 rounded-lg font-medium transition"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Stop
          </motion.button>
        ) : (
          <motion.button
            type="submit"
            disabled={!input.trim()}
            className="bg-gradient-to-r from-beige-500 to-beige-600 text-gray-900 font-medium px-5 py-3 rounded-lg disabled:opacity-50"
            whileHover={input.trim() ? { scale: 1.05 } : {}}
            whileTap={input.trim() ? { scale: 0.95 } : {}}
          >
            Send
          </motion.button>
        )}
      </motion.form>
    </div>
  );
}

// UI Components
function ChevronIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
    </svg>
  );
}

function UserIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M11 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/>
      <path fillRule="evenodd" d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8-7a7 7 0 0 0-5.468 11.37C3.242 11.226 4.805 10 8 10s4.757 1.225 5.468 2.37A7 7 0 0 0 8 1z"/>
    </svg>
  );
}

function RobotIcon({ size = 16 }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} fill="currentColor" viewBox="0 0 16 16">
      <path d="M6 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5ZM3 8.062C3 6.76 4.235 5.756 5.53 5.63a2.46 2.46 0 0 1 4.94 0l1.148.033A2.31 2.31 0 0 1 13 7.561v.844a2.31 2.31 0 0 1-1.382 2.116c-.47.173-.866.337-1.116.53a.5.5 0 0 1-.53.047L1.794 10H1a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1h.5V8a2.5 2.5 0 0 1 2.5-2.5h9A2.5 2.5 0 0 1 15 8v.5z"/>
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
      <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
      <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#ef4444" viewBox="0 0 16 16">
      <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zM7 3.5C7 3.224 7.224 3 7.5 3h1c.276 0 .5.224.5.5V9c0 .276-.224.5-.5.5h-1C7.224 9.5 7 9.276 7 9V3.5zm1 10a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="#3b82f6" viewBox="0 0 16 16">
      <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
    </svg>
  );
}

function ThinkingPill() {
  return (
    <div className="flex items-center px-4 py-1.5 bg-gray-700/80 backdrop-blur rounded-full text-sm">
      <div className="h-2 w-2 bg-beige-500 rounded-full animate-pulse delay-0 mr-1"></div>
      <div className="h-2 w-2 bg-beige-500 rounded-full animate-pulse delay-100 mr-1"></div>
      <div className="h-2 w-2 bg-beige-500 rounded-full animate-pulse delay-200"></div>
      <span className="ml-2">Thinking...</span>
    </div>
  );
}
