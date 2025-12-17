"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { ChevronLeft } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { INITIAL_MESSAGES } from "../config/constants";
import { ChatInput } from "./_components/chat-input";
import { ChatMessage } from "./_components/chat-message";

export default function ChatPage() {
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const processedToolCallsRef = useRef<Set<string>>(new Set());
  
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    messages.forEach((message) => {
      if (message.parts) {
        message.parts.forEach((part) => {
          
          if (part.type === "tool-createCheckoutSession" && "output" in part) {
            
            const toolCallId = `${message.id}-${part.toolCallId}`;
            
            if (processedToolCallsRef.current.has(toolCallId)) {
              return;
            }
            
            const output = part.output as any;
            
            if (output?.success && output?.url) {
              
              processedToolCallsRef.current.add(toolCallId);
              
              setTimeout(() => {
                window.location.href = output.url;
              }, 1500);
            } 
          }
        });
      }
    });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      sendMessage({
        text: message,
      });
      setMessage("");
    }
  };

  const isLoading = status === "streaming" || status === "submitted";

  return (
    <div className="relative flex h-screen w-full flex-col overflow-hidden rounded-[20px] bg-background">
      <div className="flex w-full items-center justify-between pb-0 pl-5 pr-5 pt-6">
        <Link href="/">
          <ChevronLeft className="size-6 shrink-0" />
        </Link>
        <Link href={"/"}>
          <Image src="/logo.svg" alt="Aparatus" width={100} height={26.09} />
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto pb-24 [&::-webkit-scrollbar]:hidden">
        {messages.length === 0
          ? INITIAL_MESSAGES.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))
          : messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)}
        <div ref={messagesEndRef} />
      </div>

      <ChatInput
        input={message}
        onChange={(e) => setMessage(e.target.value)}
        onSubmit={handleSubmit}
        isLoading={isLoading}
      />
    </div>
  );
}