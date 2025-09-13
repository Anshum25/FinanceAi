import React from 'react';
import { motion } from 'framer-motion';

interface FinanceAILogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const FinanceAILogo: React.FC<FinanceAILogoProps> = ({ size = 'md', showText = true, className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  const textSizeClasses = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl'
  };

  return (
    <motion.div 
      className={`flex items-center space-x-3 ${className}`}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.2 }}
    >
      <div className="relative">
        <motion.div 
          className={`${sizeClasses[size]} gradient-primary rounded-xl flex items-center justify-center shadow-lg`}
          whileHover={{ rotate: 5 }}
          transition={{ duration: 0.2 }}
        >
          <svg 
            viewBox="0 0 24 24" 
            fill="none" 
            className="w-6 h-6 text-primary-foreground"
          >
            <path 
              d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <circle cx="12" cy="12" r="2" fill="currentColor" />
          </svg>
        </motion.div>
        <motion.div 
          className="absolute -inset-1 gradient-primary rounded-xl blur opacity-30"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </div>
      
      {showText && (
        <div className="hidden sm:block">
          <motion.h1 
            className={`${textSizeClasses[size]} font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            FinanceAI
          </motion.h1>
          <motion.p 
            className="text-xs text-muted-foreground -mt-1"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            Your AI Financial Assistant
          </motion.p>
        </div>
      )}
    </motion.div>
  );
};

export default FinanceAILogo;