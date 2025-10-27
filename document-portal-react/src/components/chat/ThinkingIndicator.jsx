import React from 'react';
import { Loader } from 'lucide-react';

const ThinkingIndicator = () => (
  <div className="flex items-center gap-2 text-text-muted animate-pulse">
    <Loader className="w-4 h-4 animate-spin" />
    <span className="text-sm">Thinking...</span>
  </div>
);

export default ThinkingIndicator;
