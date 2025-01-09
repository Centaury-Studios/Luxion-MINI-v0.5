'use client';
import React, { useState, useRef, useEffect } from 'react';
import {
  FiSend, FiSearch,
  FiMaximize2, FiMinimize2,
  FiCopy, FiTrash2, FiEdit,
} from 'react-icons/fi';
import { TbLoader2 } from "react-icons/tb";

import {
  RiRobot2Line, RiUser3Line, RiFileCodeLine,
} from 'react-icons/ri';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';

interface AIEvent {
  type: string;
  emoji: string;
  data: any;
  timestamp: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface AIDebugState {
  events: AIEvent[];
  status: 'idle' | 'processing' | 'complete' | 'error';
  currentModel?: string;
  processingTime?: number;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '¡Hola! ¿En qué puedo ayudarte hoy?', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [debugState, setDebugState] = useState<AIDebugState>({
    events: [],
    status: 'idle'
  });
  const [showDebug, setShowDebug] = useState(true);
  const eventsEndRef = useRef<HTMLDivElement>(null);
  const [tokenCount, setTokenCount] = useState(0);
// Actualizar en el handleSubmit cuando recibimos la respuesta
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = (ref: React.RefObject<HTMLDivElement>) => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  };


  const handleCopy = async (content: string) => {
    await navigator.clipboard.writeText(content);
    // Mostrar notificación de copiado
  };

  const [error, setError] = useState<string | null>(null);
// Mostrar mensajes de error en la UI
  useEffect(() => {
    scrollToBottom(eventsEndRef);
  }, [debugState.events]);

  useEffect(() => {
    scrollToBottom(messagesEndRef);
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || debugState.status === 'processing') return;
    setIsStreaming(true);

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setDebugState(prev => ({
      ...prev,
      status: 'processing',
      events: []
    }));

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: input }),
      });

      if (!response.ok) throw new Error('Network response was not ok');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No reader available');

      // Dentro de handleSubmit, reemplazar el manejo de eventos:

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      if (line.startsWith('event: ai_event')) {
        // Esperar la siguiente línea que contiene los datos
        continue;
      }

      if (line.startsWith('data: ')) {
        const dataMatch = line.match(/^data: (.+)$/);
        if (!dataMatch) continue;

        const data = JSON.parse(dataMatch[1]);
        console.log('Received data:', data); // Para debug

        // Si el dato tiene type, es un evento de debug
        if (data.type && data.emoji) {
          setDebugState(prev => ({
            ...prev,
            events: [...prev.events, {
              type: data.type,
              emoji: data.emoji,
              data: data.data,
              timestamp: data.timestamp
            }]
          }));
        }
        // Si tiene text, es la respuesta final
        else if (data.text) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: data.text,
            timestamp: Date.now()
          }]);
          setDebugState(prev => ({
            ...prev,
            status: 'complete',
            currentModel: data.modelUsed,
            processingTime: data.metrics?.processingTime
          }));
        }
      }
    } catch (error) {
      console.error('Error processing event:', error);
    }
  }
}

    } catch (error) {
      console.error('Error:', error);
      setDebugState(prev => ({
        ...prev,
        status: 'error'
      }));
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="border-b border-border p-4">
          <div className="flex items-center justify-end">
            <button
              onClick={() => setShowDebug(!showDebug)}
              className="p-2 hover:bg-secondary rounded-lg"
            >
              {showDebug ? <FiMinimize2 /> : <FiMaximize2 />}
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex items-start space-x-2 ${message.role === 'user' ? 'justify-end' : ''
                }`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                  <RiRobot2Line className="w-4 h-4" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-lg p-3 ${message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary'
                  }`}
              >
                <ReactMarkdown
                  components={{
                    code: ({ node, inline, className, children, ...props }) => {
                      if (inline) {
                        return (
                          <code className="bg-accent px-1 py-0.5 rounded" {...props}>
                            {children}
                          </code>
                        );
                      }
                      return (
                        <SyntaxHighlighter
                          language="javascript"
                          className="!bg-accent !p-4 !rounded-lg"
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      );
                    }
                  }}
                >
                  {message.content}
                </ReactMarkdown>
                {message.role === 'assistant' && (
                  <div className="flex space-x-2 mt-2">
                    <button className="text-xs text-muted-foreground hover:text-foreground">
                      <FiCopy className="w-3 h-3" />
                    </button>
                    <button className="text-xs text-muted-foreground hover:text-foreground">
                      <FiEdit className="w-3 h-3" />
                    </button>
                    <button className="text-xs text-muted-foreground hover:text-foreground">
                      <FiTrash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <RiUser3Line className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        {isStreaming && (
          <div className="flex justify-center">
            <div className="bg-secondary px-4 py-2 rounded-lg animate-pulse">
              Generando respuesta...
            </div>
          </div>
        )}
        {/* Input Area */}
        <div className="border-t border-border p-4">
          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Escribe un mensaje..."
                  className="w-full bg-secondary rounded-lg px-4 py-2 pr-10 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  rows={1}
                  disabled={debugState.status === 'processing'}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
                <button
                  type="button"
                  className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
                >
                  <RiFileCodeLine className="w-5 h-5" />
                </button>
              </div>
              <button type="submit" disabled={isStreaming} className="...">
  {isStreaming ? (
    <div className="animate-spin">
      <TbLoader2 className="w-4 h-4" />
    </div>
  ) : (
    <FiSend className="w-4 h-4" />
  )}
</button>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Presiona Enter para enviar</span>
              <span>Status: {debugState.status}</span>
            </div>
          </form>
        </div>
      </div>

      {/* Debug Panel */}
      <div
        className={`border-l border-border transition-all duration-300 ${showDebug ? 'w-96' : 'w-0'
          } overflow-hidden`}
      >
        <div className="h-full flex flex-col bg-background">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">Debug Panel</h3>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {debugState.events.map((event, index) => (
              <div
                key={index}
                className="p-3 bg-secondary rounded-lg space-y-2"
              >
                <div className="flex items-center gap-2">
                  <span>{event.emoji}</span>
                  <span className="font-medium text-sm">{event.type}</span>
                </div>
                <pre className="text-xs bg-background p-2 rounded overflow-x-auto">
                  {JSON.stringify(event.data, null, 2)}
                </pre>
              </div>
            ))}
            <div ref={eventsEndRef} />
          </div>

          <div className="border-t border-border p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <span className="font-medium">{debugState.status}</span>
              </div>
              {debugState.currentModel && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Model:</span>
                  <span className="font-medium">{debugState.currentModel}</span>
                </div>
              )}
              {debugState.processingTime && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time:</span>
                  <span className="font-medium">
                    {(debugState.processingTime / 1000).toFixed(2)}s
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}