
import React from 'react';

interface MessageBubbleProps {
  sender: string;
  text: string;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ sender, text }) => {
  return (
    <div className="mb-4">
      <p className="font-bold text-sm text-foreground mb-1">{sender}</p>
      <div className="bg-card p-3 rounded-lg">
        <p className="text-sm text-foreground whitespace-pre-wrap">{text}</p>
      </div>
    </div>
  );
};

export default MessageBubble;
