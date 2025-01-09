import { NextRequest, NextResponse } from 'next/server';
import { Core } from '@/lib/core';

const aiCore = new Core(process.env.GEMINI_API_KEY || '');

const EVENTS_MAP = {
  'process-start': '🤖',
  'model-selection-start': '🔍',
  'model-selected': '✅',
  'processing-simple': '💭',
  'processing-complex': '🔄',
  'complex-analysis-start': '📊',
  'analysis-complete': '📈',
  'solution-generation-start': '⚙️',
  'reflection-start': '🤔',
  'improvement-start': '📝',
  'improvement-complete': '✨',
  'process-complete': '🎉',
  'process-error': '❌'
};

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  const customEncode = (chunk: string) => encoder.encode(chunk + '\n');

  try {
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Crear un TransformStream para eventos SSE
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    let isStreamClosed = false;

    // Función segura para escribir
    const safeWrite = async (data: string) => {
      if (!isStreamClosed) {
        try {
          await writer.write(customEncode(data));
        } catch (error) {
          console.error('Error writing to stream:', error);
        }
      }
    };

    // Función segura para cerrar
    const safeClose = async () => {
      if (!isStreamClosed) {
        isStreamClosed = true;
        try {
          await writer.close();
        } catch (error) {
          console.error('Error closing stream:', error);
        }
      }
    };

    // Configurar los event listeners
    Object.entries(EVENTS_MAP).forEach(([event, emoji]) => {
      aiCore.on(event, async (data) => {
        // Enviar el evento como ai_event
        await safeWrite(
          `event: ai_event\ndata: ${JSON.stringify({
            type: event,
            emoji,
            data,
            timestamp: Date.now()
          })}\n\n`
        );

        // Si es el proceso completo, enviar también la respuesta final
        if (event === 'process-complete') {
          await safeWrite(
            `data: ${JSON.stringify(data.response)}\n\n`
          );
          await safeClose();
        }
      });
    });

    // Procesar el mensaje
    aiCore.process(message).catch(async (error) => {
      await safeWrite(
        `event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`
      );
      await safeClose();
    });

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    });

  } catch (error) {
    console.error('AI Processing Error:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}