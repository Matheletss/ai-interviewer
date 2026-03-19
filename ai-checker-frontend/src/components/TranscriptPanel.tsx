
import React from 'react';
import { X } from 'lucide-react';
import MessageBubble from './MessageBubble';
import { ScrollArea } from "@/components/ui/scroll-area";

interface TranscriptMessage {
  sender: string;
  text: string;
}

interface TranscriptPanelProps {
  messages: TranscriptMessage[];
}

const TranscriptPanel: React.FC<TranscriptPanelProps> = ({ messages }) => {
  return (
    <div className="w-full md:w-80 lg:w-[350px] bg-secondary/30 flex flex-col h-full rounded-r-lg border-l">
      <header className="p-4 border-b flex justify-between items-center flex-shrink-0">
        <h2 className="font-semibold text-foreground">Live Transcript</h2>
        <button className="text-muted-foreground hover:text-foreground transition-colors">
          <X size={20} />
        </button>
      </header>
      <ScrollArea className="flex-grow p-4">
        <div className="flex flex-col gap-4">
            {messages.map((msg, index) => (
              <MessageBubble key={index} sender={msg.sender} text={msg.text} />
            ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default TranscriptPanel;
