const Button = ({ children, onClick, active = false }) => {
    return (
      <button
        onClick={onClick}
        className={`
          relative px-4 py-2 
          bg-white/10
          text-xs text-white
          transition-all duration-300
          hover:bg-white/20
          active:scale-95
          overflow-hidden
          rounded-lg
          ${active ? 'ring-1 ring-purple-400/50' : ''}
        `}
      >
        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-1 h-1 border-t border-l border-purple-400/60" />
        <div className="absolute top-0 right-0 w-1 h-1 border-t border-r border-purple-400/60" />
        <div className="absolute bottom-0 left-0 w-1 h-1 border-b border-l border-purple-400/60" />
        <div className="absolute bottom-0 right-0 w-1 h-1 border-b border-r border-purple-400/60" />
  
        {/* Content */}
        <span className="relative z-10">{children}</span>
      </button>
    );
  };

  export default Button;